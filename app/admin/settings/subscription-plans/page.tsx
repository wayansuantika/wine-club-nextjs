'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { formatIdrCompactMillions, formatPointsCompact, type SubscriptionPlan } from '@/lib/subscriptionPlan';

type FormMode = 'create' | 'edit' | null;

interface FormData {
  code: string;
  name: string;
  shortName: string;
  amount: number;
  pointsPerMonth: number;
  bonusPoints: number;
  description: string;
  benefitsText: string;
}

export default function AdminPlansPage() {
  const router = useRouter();
  const { user, token, loadAuth, clearAuth } = useAuthStore();

  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    shortName: '',
    amount: 0,
    pointsPerMonth: 0,
    bonusPoints: 0,
    description: '',
    benefitsText: ''
  });

  useEffect(() => {
    loadAuth();
    setAuthChecked(true);
  }, [loadAuth]);

  useEffect(() => {
    if (!authChecked) return;

    if (!token) {
      router.push('/login');
      return;
    }

    const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      toast.error('Admin access required');
      router.push('/profile');
      return;
    }

    fetchPlans();
  }, [authChecked, token, user, router]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/api/admin/subscription/plans');
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to load subscription plans');
        return;
      }

      setPlans(data.plans || []);
    } catch (error) {
      console.error('Plans fetch error:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  const initialFormData: FormData = {
    code: '',
    name: '',
    shortName: '',
    amount: 0,
    pointsPerMonth: 0,
    bonusPoints: 0,
    description: '',
    benefitsText: ''
  };

  const handleCreate = () => {
    setFormMode('create');
    setEditingCode(null);
    setFormData({ ...initialFormData });
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setFormMode('edit');
    setEditingCode(plan.code);
    setFormData({
      code: plan.code,
      name: plan.name,
      shortName: plan.shortName,
      amount: plan.amount,
      pointsPerMonth: plan.pointsPerMonth,
      bonusPoints: plan.bonusPoints,
      description: plan.description,
      benefitsText: plan.benefits.join('\n')
    });
  };

  const handleCancel = () => {
    setFormMode(null);
    setEditingCode(null);
    setFormData({ ...initialFormData });
  };

  const handleSave = async () => {
    // Validate
    if (!formData.code.trim()) {
      toast.error('Plan code is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!formData.shortName.trim()) {
      toast.error('Short name is required');
      return;
    }
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (formData.pointsPerMonth <= 0) {
      toast.error('Points per month must be greater than 0');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const benefits = formData.benefitsText
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    if (benefits.length === 0) {
      toast.error('Please add at least one benefit');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        shortName: formData.shortName.trim(),
        amount: Math.round(formData.amount),
        pointsPerMonth: Math.round(formData.pointsPerMonth),
        bonusPoints: Math.round(formData.bonusPoints),
        description: formData.description.trim(),
        benefits
      };

      if (formMode === 'create') {
        const response = await apiCall(`/api/admin/subscription/plans/${formData.code.toUpperCase()}`, {
          method: 'POST',
          body: JSON.stringify({ code: formData.code.toUpperCase(), ...payload })
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error || 'Failed to create subscription plan');
          return;
        }

        toast.success('Subscription plan created successfully');
        setFormMode(null);
        setFormData({ ...initialFormData });
        fetchPlans();
      } else if (formMode === 'edit' && editingCode) {
        const response = await apiCall(`/api/admin/subscription/plans/${editingCode}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error || 'Failed to update subscription plan');
          return;
        }

        toast.success('Subscription plan updated successfully');
        setFormMode(null);
        setEditingCode(null);
        setFormData({ ...initialFormData });
        fetchPlans();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save subscription plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete this plan? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiCall(`/api/admin/subscription/plans/${code}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to delete subscription plan');
        return;
      }

      toast.success('Subscription plan deleted successfully');
      fetchPlans();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete subscription plan');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const previewBenefits = formData.benefitsText
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
            <p className="text-white/70 text-sm">Manage all subscription plans</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Back to Admin
            </Link>
            <button
              onClick={handleLogout}
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-white text-center py-12">Loading plans...</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Plans List */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-primary-700 dark:text-primary-400">Available Plans</h2>
                  {!formMode && (
                    <button
                      onClick={handleCreate}
                      className="gradient-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      + New Plan
                    </button>
                  )}
                </div>

                {plans.length === 0 ? (
                  <p className="text-neutral-600 dark:text-neutral-400 text-center py-8">No plans found</p>
                ) : (
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div key={plan.code} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{plan.name}</h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{plan.description}</p>
                            <div className="flex items-center gap-4 text-sm font-semibold">
                              <span className="text-primary-600 dark:text-primary-400">{formatIdrCompactMillions(plan.amount)}/mo</span>
                              <span className="text-accent-600 dark:text-accent-400">
                                {formatPointsCompact(plan.pointsPerMonth)} pts
                              </span>
                              {plan.bonusPoints > 0 && (
                                <span className="text-green-600 dark:text-green-400">
                                  +{formatPointsCompact(plan.bonusPoints)} bonus
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(plan)}
                              disabled={formMode !== null || isDeleting}
                              className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(plan.code)}
                              disabled={formMode !== null || isDeleting || plans.length === 1}
                              className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form or Info */}
            <div className="lg:col-span-1">
              {formMode ? (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 sticky top-4">
                  <h2 className="text-lg font-bold text-primary-700 dark:text-primary-400 mb-4">
                    {formMode === 'create' ? 'Create New Plan' : 'Edit Plan'}
                  </h2>

                  <div className="space-y-3 mb-6">
                    {formMode === 'create' && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Plan Code
                        </label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                          placeholder="PLAN_CODE"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Short Name
                      </label>
                      <input
                        type="text"
                        value={formData.shortName}
                        onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Amount (IDR)
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Points / Month
                      </label>
                      <input
                        type="number"
                        value={formData.pointsPerMonth}
                        onChange={(e) => setFormData({ ...formData, pointsPerMonth: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Bonus Points
                      </label>
                      <input
                        type="number"
                        value={formData.bonusPoints}
                        onChange={(e) => setFormData({ ...formData, bonusPoints: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Benefits (one per line)
                      </label>
                      <textarea
                        value={formData.benefitsText}
                        onChange={(e) => setFormData({ ...formData, benefitsText: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-mono"
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-accent-50 dark:bg-accent-900/20 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-accent-700 dark:text-accent-300 mb-2">Preview</p>
                    <div className="text-sm font-bold text-primary-600 dark:text-primary-400 mb-1">
                      {formatIdrCompactMillions(formData.amount || 0)}
                    </div>
                    <div className="text-xs text-accent-600 dark:text-accent-400 mb-2">
                      {formatPointsCompact(formData.pointsPerMonth || 0)} pts
                      {formData.bonusPoints > 0 && ` + ${formatPointsCompact(formData.bonusPoints)} bonus`}
                    </div>
                    <ul className="space-y-1 text-xs">
                      {previewBenefits.map((b, i) => (
                        <li key={i} className="text-neutral-700 dark:text-neutral-300">✓ {b}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 gradient-primary text-white py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-semibold"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 py-2 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-bold text-primary-700 dark:text-primary-400 mb-4">Tips</h2>
                  <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
                    <div>
                      <p className="font-medium mb-1">💡 Plan Code</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Unique identifier (e.g., PLAN_500K)</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">🎯 Bonus Points</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Optional extra points on subscription</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">📊 Total Points</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Monthly + Bonus combined</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
