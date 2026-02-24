'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { formatIdrCompactMillions, formatPointsCompact } from '@/lib/subscriptionPlan';

interface SubscriptionPlan {
  code: string;
  name: string;
  shortName: string;
  currency: 'IDR';
  amount: number;
  interval: 'MONTH';
  intervalCount: number;
  pointsPerMonth: number;
  benefits: string[];
  description: string;
}

export default function AdminSubscriptionSettingsPage() {
  const router = useRouter();
  const { user, token, loadAuth, clearAuth } = useAuthStore();

  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: '',
    shortName: '',
    amount: 0,
    pointsPerMonth: 0,
    description: '',
    benefitsText: ''
  });

  const [previewBenefits, setPreviewBenefits] = useState<string[]>([]);

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

    fetchPlan();
  }, [authChecked, token, user, router]);

  const fetchPlan = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/api/admin/subscription/plan');
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to load subscription plan');
        return;
      }

      const plan = data.plan as SubscriptionPlan;
      setPlanForm({
        name: plan.name,
        shortName: plan.shortName,
        amount: plan.amount,
        pointsPerMonth: plan.pointsPerMonth,
        description: plan.description,
        benefitsText: plan.benefits.join('\n')
      });
      setPreviewBenefits(plan.benefits);
    } catch (error) {
      console.error('Subscription plan fetch error:', error);
      toast.error('Failed to load subscription plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const benefits = planForm.benefitsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!planForm.name.trim() || !planForm.shortName.trim() || !planForm.description.trim()) {
      toast.error('Name, short name, and description are required');
      return;
    }

    if (planForm.amount <= 0 || planForm.pointsPerMonth <= 0) {
      toast.error('Amount and points must be greater than 0');
      return;
    }

    if (benefits.length === 0) {
      toast.error('Please add at least one benefit');
      return;
    }

    setPreviewBenefits(benefits);

    setIsSaving(true);
    try {
      const response = await apiCall('/api/admin/subscription/plan', {
        method: 'PUT',
        body: JSON.stringify({
          name: planForm.name.trim(),
          shortName: planForm.shortName.trim(),
          amount: planForm.amount,
          pointsPerMonth: planForm.pointsPerMonth,
          description: planForm.description.trim(),
          benefits
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to update subscription plan');
        return;
      }

      toast.success('Subscription plan updated');
    } catch (error) {
      console.error('Subscription plan update error:', error);
      toast.error('Failed to update subscription plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const handleBenefitsChange = (text: string) => {
    setPlanForm({ ...planForm, benefitsText: text });
    const benefits = text
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    setPreviewBenefits(benefits);
  };

  const isFormValid = () => {
    return (
      planForm.name.trim() &&
      planForm.shortName.trim() &&
      planForm.description.trim() &&
      planForm.amount > 0 &&
      planForm.pointsPerMonth > 0 &&
      previewBenefits.length > 0
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription Settings</h1>
            <p className="text-white/70 text-sm">Manage subscription value and details</p>
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
          <div className="text-white text-center py-12">Loading...</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Form Column */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-primary-700 dark:text-primary-400 mb-4">Edit Plan Details</h2>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Plan Name</label>
                      <input
                        type="text"
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Short Name</label>
                      <input
                        type="text"
                        value={planForm.shortName}
                        onChange={(e) => setPlanForm({ ...planForm, shortName: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Amount (IDR)</label>
                      <input
                        type="number"
                        min={1}
                        value={planForm.amount}
                        onChange={(e) => setPlanForm({ ...planForm, amount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        required
                      />
                      {planForm.amount > 0 && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Displays as: <span className="font-semibold text-primary-600 dark:text-primary-400">{formatIdrCompactMillions(planForm.amount)}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Points / Month</label>
                      <input
                        type="number"
                        min={1}
                        value={planForm.pointsPerMonth}
                        onChange={(e) => setPlanForm({ ...planForm, pointsPerMonth: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                        required
                      />
                      {planForm.pointsPerMonth > 0 && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Displays as: <span className="font-semibold text-accent-600 dark:text-accent-400">{formatPointsCompact(planForm.pointsPerMonth)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Description</label>
                    <input
                      type="text"
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      placeholder="Short description of the plan"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Benefits (one per line)
                      {previewBenefits.length > 0 && (
                        <span className="text-xs text-accent-600 dark:text-accent-400 ml-2">({previewBenefits.length})</span>
                      )}
                    </label>
                    <textarea
                      value={planForm.benefitsText}
                      onChange={(e) => handleBenefitsChange(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-sm"
                      rows={6}
                      placeholder="Unlimited wine tastings&#10;Priority event access&#10;Members-only discounts"
                      required
                    />
                    {previewBenefits.length === 0 && planForm.benefitsText.trim() && (
                      <p className="text-xs text-error-600 dark:text-error-400 mt-1">ℹ Please add valid benefits (non-empty lines)</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving || !isFormValid()}
                      className="gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Subscription Plan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 rounded-xl shadow-lg p-6 sticky top-4">
                <h2 className="text-lg font-bold text-white mb-4">Live Preview</h2>

                {/* Price Box */}
                <div className="text-center py-8 mb-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="text-5xl font-bold text-white mb-2">
                    {planForm.amount > 0 ? formatIdrCompactMillions(planForm.amount) : '—'}
                  </div>
                  <p className="text-white/80 text-sm font-medium">per month (IDR)</p>
                </div>

                {/* Plan Info Grid */}
                <div className="space-y-4 mb-6 bg-white/5 rounded-xl p-4">
                  <div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Plan Name</p>
                    <p className="text-sm font-bold text-white">
                      {planForm.name || <span className="opacity-50 italic">(enter name)</span>}
                    </p>
                  </div>

                  <div className="h-px bg-white/10"></div>

                  <div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Short Name</p>
                    <p className="text-sm font-bold text-white">
                      {planForm.shortName || <span className="opacity-50 italic">(enter short name)</span>}
                    </p>
                  </div>

                  <div className="h-px bg-white/10"></div>

                  <div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Monthly Points</p>
                    <p className="text-sm font-bold text-accent-300">
                      {planForm.pointsPerMonth > 0 ? formatPointsCompact(planForm.pointsPerMonth) : '—'}
                    </p>
                  </div>
                </div>

                {/* Benefits Preview */}
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">Included Benefits</p>
                  {previewBenefits.length > 0 ? (
                    <ul className="space-y-2">
                      {previewBenefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-white/90">
                          <span className="text-accent-300 font-bold mt-0.5 flex-shrink-0">✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/50 italic">(benefits will appear here)</p>
                  )}
                </div>

                {/* Form Status */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  {isFormValid() ? (
                    <div className="flex items-center gap-2 text-xs text-accent-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Ready to save
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-white/70">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Complete all fields & add benefits</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
