'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store/authStore';
import { getDefaultAuthBanners } from '@/lib/authBanners';

export default function LoginPage() {
  const defaultBanners = getDefaultAuthBanners();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileBannerSrc, setMobileBannerSrc] = useState(defaultBanners.loginMobile);
  const [desktopBannerSrc, setDesktopBannerSrc] = useState(defaultBanners.loginDesktop);
  const [fallbackBannerSrc, setFallbackBannerSrc] = useState(defaultBanners.loginFallback);
  const [showMobileBanner, setShowMobileBanner] = useState(true);
  const [showDesktopBanner, setShowDesktopBanner] = useState(true);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const fetchAuthBanners = async () => {
      try {
        const response = await fetch('/api/ui/auth-banners', { cache: 'no-store' });
        const data = await response.json();

        if (response.ok && data.banners) {
          setMobileBannerSrc(data.banners.loginMobile || defaultBanners.loginMobile);
          setDesktopBannerSrc(data.banners.loginDesktop || defaultBanners.loginDesktop);
          setFallbackBannerSrc(data.banners.loginFallback || defaultBanners.loginFallback);
        }
      } catch (error) {
        console.error('Auth banners fetch error:', error);
      }
    };

    fetchAuthBanners();
  }, [defaultBanners.loginDesktop, defaultBanners.loginFallback, defaultBanners.loginMobile]);

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
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
        toast.error(data.error || 'Login failed');
        return;
      }

      // Store auth in Zustand store (which also stores in localStorage)
      setAuth(data.user, data.token);

      toast.success('Login successful!');

      // Redirect based on role
      if (data.user.role === 'admin' || data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else if (data.user.status === 'ACTIVE_MEMBER') {
        router.push('/events');
      } else {
        router.push('/profile');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden grid lg:grid-cols-2">
        <div className="relative h-52 sm:h-64 md:h-72 lg:h-full lg:min-h-[720px] bg-gradient-to-br from-primary-700 to-accent-600">
          {showMobileBanner && (
            <Image
              src={mobileBannerSrc}
              alt="Wine Club login banner"
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
              alt="Wine Club login banner"
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">Welcome Back</h2>
            <p className="mt-3 text-sm sm:text-base text-white/90 max-w-md">
              Sign in to continue your wine journey and unlock exclusive member experiences.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2">
                Wine Club
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                Sign in to your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" suppressHydrationWarning>
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
                  suppressHydrationWarning
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                suppressHydrationWarning
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>

            <div className="mt-8 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Test Accounts:
              </p>
              <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>Admin: admin@clubwine.com / Admin@2026</li>
                <li>Member: member@clubwine.com / Member@2026</li>
                <li>Guest: guest@clubwine.com / Guest@2026</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
