'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { formatIdrCompactMillions, formatPointsCompact, getSubscriptionPlan, type SubscriptionPlan } from '@/lib/subscriptionPlan';

interface ProfileData {
  user: {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    address?: string;
    role: string;
    status: string;
    created_at: string;
  };
  points: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
  subscription: {
    id: string;
    status: string;
    amount: number;
    start_date: string;
    next_payment_date: string;
  } | null;
}

interface EventRegistration {
  registration_id: string;
  reservation_code: string;
  points_spent: number;
  status: string;
  registered_at: string;
  event: {
    id: string;
    title: string;
    location: string;
    event_date: string;
    points_cost: number;
    status: string;
  };
}

export default function ProfilePage() {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([getSubscriptionPlan()]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const router = useRouter();
  const { user, token, loadAuth, clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadAuth();
    setAuthChecked(true);
  }, [loadAuth]);

  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        const response = await fetch('/api/subscription/plan');
        const data = await response.json();

        if (response.ok && data.plans && Array.isArray(data.plans)) {
          setSubscriptionPlans(data.plans);
          if (data.plans.length > 0) {
            setSelectedPlanCode(data.plans[0].code);
          }
        }
      } catch (error) {
        console.error('Subscription plans fetch error:', error);
      }
    };

    fetchSubscriptionPlans();
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (!token) {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [token, router, authChecked]);

  const fetchProfile = async () => {
    try {
      const response = await apiCall('/api/profile');
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to fetch profile');
        if (response.status === 401) {
          clearAuth();
          router.push('/login');
        }
        return;
      }

      setProfile(data);

      // Fetch registrations if user is active member
      if (data.user.status === 'ACTIVE_MEMBER') {
        fetchRegistrations();
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('An error occurred while fetching profile');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await apiCall('/api/profile/registrations');
      const data = await response.json();

      if (response.ok) {
        setRegistrations(data.registrations);
      }
    } catch (error) {
      console.error('Registrations fetch error:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlanCode) {
      toast.error('Please select a subscription plan');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('📤 Sending subscription request with plan:', selectedPlanCode);
      
      const response = await apiCall('/api/subscription/create', {
        method: 'POST',
        body: JSON.stringify({ plan_code: selectedPlanCode })
      });

      const data = await response.json();
      console.log('📥 Subscription response:', { status: response.status, data });

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to create subscription';
        console.error('❌ Subscription error:', errorMsg);
        toast.error(errorMsg);
        return;
      }

      console.log('✅ Subscription created successfully');

      // Redirect to Xendit payment page
      if (data.payment_url) {
        toast.success('Redirecting to payment page...');
        setShowModal(false);
        
        // Redirect to Xendit payment URL
        window.location.href = data.payment_url;
      } else {
        toast.success('Subscription created successfully!');
        setShowModal(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Subscription creation error:', error);
      toast.error('An error occurred while creating subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to events.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiCall('/api/subscription/cancel', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel subscription');
        return;
      }

      toast.success('Subscription cancelled successfully');
      setShowModal(false);
      
      // Reload page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      toast.error('An error occurred while cancelling subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center">
        <div className="text-white text-xl">Profile not found</div>
      </div>
    );
  }

  const isGuest = profile.user.status === 'GUEST';
  const isActiveMember = profile.user.status === 'ACTIVE_MEMBER';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">My Profile</h1>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            {isActiveMember && (
              <button
                onClick={() => router.push('/events')}
                className="flex-1 sm:flex-none bg-accent-500 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-accent-600 transition-colors font-medium text-sm sm:text-base"
              >
                Browse Events
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none bg-white/10 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20 text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* User Info Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-400 mb-6">
              Account Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Email</label>
                <p className="text-lg text-neutral-900 dark:text-neutral-100">{profile.user.email}</p>
              </div>

              {profile.user.full_name && (
                <div>
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Full Name</label>
                  <p className="text-lg text-neutral-900 dark:text-neutral-100">{profile.user.full_name}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Status</label>
                <p className={`text-lg font-semibold inline-flex items-center gap-2 ${
                  isActiveMember ? 'text-accent-500' : 'text-neutral-600 dark:text-neutral-400'
                }`}>
                  <span className="material-symbols-outlined text-base">
                    {profile.user.status === 'ACTIVE_MEMBER' ? 'celebration' : 'person'}
                  </span>
                  <span>{profile.user.status === 'ACTIVE_MEMBER' ? 'Active Member' : 'Guest'}</span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Member Since</label>
                <p className="text-lg text-neutral-900 dark:text-neutral-100">
                  {new Date(profile.user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Points Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-400 mb-4 sm:mb-6">
              Points Balance
            </h2>
            
            <div className="text-center py-6 sm:py-8">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-accent-500 mb-2">
                {profile.points.balance.toLocaleString()}
              </div>
              <p className="text-neutral-600 dark:text-neutral-400">points available</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Earned</p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {profile.points.total_earned.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Spent</p>
                <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {profile.points.total_spent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="md:col-span-2 bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-400 mb-4 sm:mb-6">
              Subscription
            </h2>

            {profile.subscription && profile.subscription.status === 'ACTIVE' ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Status</p>
                    <p className="text-lg font-semibold text-accent-500">Active</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Amount</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      IDR {profile.subscription.amount.toLocaleString()} / month
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Next Payment</p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {new Date(profile.subscription.next_payment_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="w-full bg-error-100 text-error-700 px-6 py-3 rounded-lg hover:bg-error-200 transition-colors font-medium mt-4"
                >
                  Cancel Subscription
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  {isGuest
                    ? "You are currently a guest. To view and register for events, please start a subscription."
                    : "Your subscription is not active"}
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="gradient-primary text-white px-8 py-3 rounded-lg hover:opacity-90 transition-opacity font-semibold"
                >
                  Subscribe Now
                </button>
              </div>
            )}
          </div>

          {/* Registered Events Card - Only for Active Members */}
          {isActiveMember && registrations.length > 0 && (
            <div className="md:col-span-2 bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-400 mb-4 sm:mb-6">
                My Registered Events
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        Event Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        Point Cost
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        Reservation ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {registrations.map((reg) => (
                      <tr key={reg.registration_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                          {reg.event.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                          {reg.event.location}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                          {new Date(reg.event.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                          {reg.points_spent.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-primary-600 dark:text-primary-400 font-semibold">
                          {reg.reservation_code}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {registrations.length === 0 && (
                <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
                  No registered events yet. Browse events to start!
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Subscription Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-8">
            {isActiveMember ? (
              <>
                <h3 className="text-2xl font-bold text-error-600 mb-4">Cancel Subscription</h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                  Are you sure you want to cancel your subscription? You will lose access to:
                </p>
                <ul className="space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                  <li>• Monthly subscription benefits</li>
                  <li>• Event registration access</li>
                  <li>• Member-only discounts</li>
                </ul>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={isProcessing}
                    className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-6 py-3 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors font-medium"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isProcessing}
                    className="flex-1 bg-error-500 text-white px-6 py-3 rounded-lg hover:bg-error-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {isProcessing ? 'Cancelling...' : 'Cancel Subscription'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-primary-700 dark:text-primary-400 mb-4">
                  Choose Plan
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-center mb-6 text-sm">
                  Select which subscription plan you'd like to subscribe to
                </p>

                {/* Plans Grid */}
                <div className="grid gap-3 mb-6">
                  {subscriptionPlans.map((plan) => (
                    <div
                      key={plan.code}
                      onClick={() => setSelectedPlanCode(plan.code)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedPlanCode === plan.code
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:border-primary-300 dark:hover:border-primary-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{plan.shortName}</h4>
                        <span className="text-primary-600 dark:text-primary-400 font-bold">
                          {formatIdrCompactMillions(plan.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm mb-2">
                        <span className="text-accent-600 dark:text-accent-400 font-semibold">
                          {formatPointsCompact(plan.pointsPerMonth)} pts
                        </span>
                        {plan.bonusPoints > 0 && (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            + {formatPointsCompact(plan.bonusPoints)} bonus
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{plan.description}</p>
                    </div>
                  ))}
                </div>

                {/* Selected Plan Details */}
                {selectedPlanCode &&
                  (() => {
                    const selectedPlan = subscriptionPlans.find((p) => p.code === selectedPlanCode);
                    return selectedPlan ? (
                      <div className="bg-accent-50 dark:bg-accent-900/20 rounded-lg p-4 mb-6 border border-accent-200 dark:border-accent-800">
                        <p className="text-xs font-semibold text-accent-700 dark:text-accent-300 uppercase tracking-wide mb-2">
                          Benefits
                        </p>
                        <ul className="space-y-1.5">
                          {selectedPlan.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                              <span className="text-accent-600 dark:text-accent-400 flex-shrink-0">✓</span>
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()}

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={isProcessing}
                    className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-6 py-3 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubscribe}
                    disabled={isProcessing || !selectedPlanCode}
                    className="flex-1 gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Continue to Payment'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
