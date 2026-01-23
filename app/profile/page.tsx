'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

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

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loadAuth, clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('An error occurred while fetching profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const response = await apiCall('/api/subscription/create', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create subscription');
        return;
      }

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
      console.error('Subscription creation error:', error);
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
                <p className={`text-lg font-semibold ${
                  isActiveMember ? 'text-accent-500' : 'text-neutral-600 dark:text-neutral-400'
                }`}>
                  {profile.user.status === 'ACTIVE_MEMBER' ? '🎉 Active Member' : '👋 Guest'}
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
                  {isGuest ? "You don't have an active subscription" : "Your subscription is not active"}
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
                  <li>• Monthly 6.5M points</li>
                  <li>• Event registration access</li>
                  <li>• Member-only benefits</li>
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
                  Subscribe to Wine Club
                </h3>
                <div className="text-center py-6 mb-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                  <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                    IDR 1.5M
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400">per month</p>
                </div>
                <ul className="space-y-3 text-neutral-700 dark:text-neutral-300 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-500 mt-1">✓</span>
                    <span>6.5 million points monthly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-500 mt-1">✓</span>
                    <span>Access to all exclusive events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-500 mt-1">✓</span>
                    <span>Priority event registration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-500 mt-1">✓</span>
                    <span>Member-only wine tastings</span>
                  </li>
                </ul>
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
                    disabled={isProcessing}
                    className="flex-1 gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm'}
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
