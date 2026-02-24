'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store/authStore';
import { formatIdrCompactMillions, formatPointsCompact, getSubscriptionPlan, type SubscriptionPlan } from '@/lib/subscriptionPlan';
import { getDefaultAuthBanners } from '@/lib/authBanners';

export default function RegisterPage() {
  const defaultBanners = getDefaultAuthBanners();
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([getSubscriptionPlan()]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [mobileBannerSrc, setMobileBannerSrc] = useState(defaultBanners.registerMobile);
  const [desktopBannerSrc, setDesktopBannerSrc] = useState(defaultBanners.registerDesktop);
  const [fallbackBannerSrc, setFallbackBannerSrc] = useState(defaultBanners.registerFallback);
  const [showMobileBanner, setShowMobileBanner] = useState(true);
  const [showDesktopBanner, setShowDesktopBanner] = useState(true);
  const router = useRouter();
  const { setAuth, token } = useAuthStore();

  useEffect(() => {
    const fetchSubscriptionPlans = async () => {
      try {
        const response = await fetch('/api/subscription/plan');
        const data = await response.json();

        if (response.ok && data.plans && Array.isArray(data.plans)) {
          setSubscriptionPlans(data.plans);
          // Select first plan by default
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
    const fetchAuthBanners = async () => {
      try {
        const response = await fetch('/api/ui/auth-banners', { cache: 'no-store' });
        const data = await response.json();

        if (response.ok && data.banners) {
          setMobileBannerSrc(data.banners.registerMobile || defaultBanners.registerMobile);
          setDesktopBannerSrc(data.banners.registerDesktop || defaultBanners.registerDesktop);
          setFallbackBannerSrc(data.banners.registerFallback || defaultBanners.registerFallback);
        }
      } catch (error) {
        console.error('Auth banners fetch error:', error);
      }
    };

    fetchAuthBanners();
  }, [defaultBanners.registerDesktop, defaultBanners.registerFallback, defaultBanners.registerMobile]);

  const handleMobileBannerError = () => {
    if (mobileBannerSrc !== fallbackBannerSrc) {
      setMobileBannerSrc(fallbackBannerSrc);
      return;
    }
    setShowMobileBanner(false);
  };

  const handleDesktopBannerError = () => {
    if (desktopBannerSrc !== fallbackBannerSrc) {
      setDesktopBannerSrc(fallbackBannerSrc);
      return;
    }
    setShowDesktopBanner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all required fields');
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    // Password validation
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter');
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error('Password must contain at least one lowercase letter');
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number');
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        toast.error('Server error: ' + text.substring(0, 100));
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        // Show specific error messages
        if (response.status === 409) {
          toast.error('This email is already registered. Please use a different email or login.', {
            duration: 5000,
            icon: '📧',
          });
        } else if (response.status === 400) {
          toast.error(data.error || 'Please check your input', {
            duration: 4000,
          });
        } else {
          toast.error(data.error || 'Registration failed. Please try again.', {
            duration: 4000,
          });
        }
        setShakeForm(true);
        setTimeout(() => setShakeForm(false), 500);
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
    if (!selectedPlanCode) {
      toast.error('Please select a subscription plan');
      return;
    }

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
        },
        body: JSON.stringify({ plan_code: selectedPlanCode })
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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden grid lg:grid-cols-2">
        <div className="relative h-52 sm:h-64 md:h-72 lg:h-full lg:min-h-[720px] bg-gradient-to-br from-primary-700 to-accent-600">
          {showMobileBanner && (
            <Image
              src={mobileBannerSrc}
              alt="Wine Club register banner"
              fill
              priority
              unoptimized
              className="object-cover lg:hidden"
              sizes="(max-width: 1023px) 100vw"
              onError={handleMobileBannerError}
            />
          )}
          {showDesktopBanner && (
            <Image
              src={desktopBannerSrc}
              alt="Wine Club register banner"
              fill
              priority
              unoptimized
              className="hidden object-cover lg:block"
              sizes="50vw"
              onError={handleDesktopBannerError}
            />
          )}
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative z-10 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-end text-white">
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] opacity-90 mb-2">Wine Club</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">Banner Image Area</h2>
            <p className="mt-3 text-sm sm:text-base text-white/90 max-w-md">
              Add your visual here. This section is optimized for both mobile and desktop layouts.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2">
                Join Wine Club
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                Create your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className={`space-y-4 sm:space-y-5 ${shakeForm ? 'animate-shake' : ''}`} suppressHydrationWarning>
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
                  suppressHydrationWarning
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
                  suppressHydrationWarning
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
                  suppressHydrationWarning
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
                  suppressHydrationWarning
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                suppressHydrationWarning
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
      </div>

      {/* Subscription Plans Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">🍷</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Welcome to Wine Club!
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                Choose a subscription plan to get started
              </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sm:mb-8">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.code}
                  onClick={() => setSelectedPlanCode(plan.code)}
                  className={`relative p-4 sm:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedPlanCode === plan.code
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="text-center">
                    <h3 className="text-lg sm:text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                      {plan.shortName}
                    </h3>
                    <div className="mb-3 sm:mb-4">
                      <span className="text-2xl sm:text-xl font-bold text-primary-600 dark:text-primary-400">
                        {formatIdrCompactMillions(plan.amount)}
                      </span>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">per month</p>
                    </div>
                    <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex gap-2 flex-col text-xs">
                        <div className="font-semibold text-accent-600 dark:text-accent-400">
                          {formatPointsCompact(plan.pointsPerMonth)} points
                        </div>
                        {plan.bonusPoints > 0 && (
                          <div className="text-green-600 dark:text-green-400">
                            + {formatPointsCompact(plan.bonusPoints)} bonus
                          </div>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                      {plan.benefits.slice(0, 2).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-accent-600 dark:text-accent-400 flex-shrink-0">✓</span>
                          <span className="text-left line-clamp-1">{benefit}</span>
                        </li>
                      ))}
                      {plan.benefits.length > 2 && (
                        <li className="text-neutral-500 dark:text-neutral-400 italic text-xs">
                          +{plan.benefits.length - 2} more
                        </li>
                      )}
                    </ul>
                  </div>
                  {selectedPlanCode === plan.code && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Selected Plan Details */}
            {selectedPlanCode && (
              <div className="bg-accent-50 dark:bg-accent-900/20 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 border border-accent-200 dark:border-accent-800">
                <p className="text-xs font-medium text-accent-700 dark:text-accent-300 uppercase tracking-wide mb-3">
                  Plan Summary
                </p>
                {subscriptionPlans
                  .find((p) => p.code === selectedPlanCode)
                  ?.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                      <span className="text-accent-600 dark:text-accent-400">✓</span>
                      <span>{benefit}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSubscribeNow}
                disabled={isSubscribing || !selectedPlanCode}
                className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubscribing ? 'Processing...' : 'Continue to Payment'}
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
              You can change your subscription plan anytime from your profile page
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
