'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store/authStore';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const router = useRouter();
  const { setAuth, token } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password validation
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }

      // Store auth in Zustand store
      setAuth(data.user, data.token);

      toast.success('Account created successfully! Welcome to Wine Club 🍷');
      
      // Show subscription confirmation modal
      setShowSubscriptionModal(true);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribeNow = async () => {
    setIsSubscribing(true);
    
    try {
      // Get token from store (already set by setAuth after registration)
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        toast.error('Authentication required. Please login again.');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create subscription');
        return;
      }

      // Redirect to Xendit payment page
      if (data.payment_url) {
        toast.success('Redirecting to payment...');
        setTimeout(() => {
          window.location.href = data.payment_url;
        }, 500);
      } else {
        toast.error('Payment URL not available');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSubscribeLater = () => {
    setShowSubscriptionModal(false);
    toast.success('You can subscribe anytime from your profile');
    setTimeout(() => {
      router.push('/profile');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2">
              Join Wine Club
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
              Create your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Full Name (Optional)
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading}
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Confirmation Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">🍷</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Welcome to Wine Club!
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                Would you like to subscribe now and start enjoying exclusive benefits?
              </p>
            </div>

            <div className="bg-accent-50 dark:bg-accent-900/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Monthly Membership
                </span>
                <span className="text-lg sm:text-xl font-bold text-accent-700 dark:text-accent-400">
                  IDR 1,500,000
                </span>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="text-accent-600 dark:text-accent-400">✓</span>
                  <span>6.5M points every month</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent-600 dark:text-accent-400">✓</span>
                  <span>Access to exclusive wine events</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent-600 dark:text-accent-400">✓</span>
                  <span>Premium member benefits</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSubscribeNow}
                disabled={isSubscribing}
                className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubscribing ? 'Processing...' : 'Subscribe Now'}
              </button>
              <button
                onClick={handleSubscribeLater}
                disabled={isSubscribing}
                className="w-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold py-3 px-6 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Maybe Later
              </button>
            </div>

            <p className="text-xs text-center text-neutral-500 dark:text-neutral-500 mt-4">
              You can subscribe anytime from your profile page
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
