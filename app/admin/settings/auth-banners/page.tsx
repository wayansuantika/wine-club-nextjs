'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface AuthBannersConfig {
  loginMobile: string;
  loginDesktop: string;
  loginFallback: string;
  registerMobile: string;
  registerDesktop: string;
  registerFallback: string;
}

type BannerField = keyof AuthBannersConfig;

export default function AdminAuthBannersSettingsPage() {
  const router = useRouter();
  const { user, token, loadAuth, clearAuth } = useAuthStore();

  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadField, setUploadField] = useState<BannerField>('loginMobile');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [bannersForm, setBannersForm] = useState<AuthBannersConfig>({
    loginMobile: '',
    loginDesktop: '',
    loginFallback: '',
    registerMobile: '',
    registerDesktop: '',
    registerFallback: ''
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

    fetchBanners();
  }, [authChecked, token, user, router]);

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/api/admin/ui/auth-banners');
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to load auth banners');
        return;
      }

      setBannersForm(data.banners);
    } catch (error) {
      console.error('Auth banners fetch error:', error);
      toast.error('Failed to load auth banners');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const response = await apiCall('/api/admin/ui/auth-banners', {
        method: 'PUT',
        body: JSON.stringify(bannersForm)
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to update auth banners');
        return;
      }

      toast.success('Auth banners updated');
    } catch (error) {
      console.error('Auth banners update error:', error);
      toast.error('Failed to update auth banners');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!token) {
      toast.error('Authentication required');
      router.push('/login');
      return;
    }

    if (!uploadFile) {
      toast.error('Please choose an image file first');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('field', uploadField);
      formData.append('file', uploadFile);

      const response = await fetch('/api/admin/ui/auth-banners/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to upload image');
        return;
      }

      setBannersForm((prev) => ({
        ...prev,
        [uploadField]: data.url
      }));

      setUploadFile(null);
      toast.success('Image uploaded. Save Banner URLs to persist changes.');
    } catch (error) {
      console.error('Banner upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Auth Banner Settings</h1>
            <p className="text-white/70 text-sm">Manage login and register banner image URLs</p>
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
            <form onSubmit={handleSave} className="space-y-5">
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/50">
                <h2 className="text-lg font-bold text-primary-700 dark:text-primary-400 mb-3">Upload Banner Image</h2>
                <div className="grid md:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Target Field</label>
                    <select
                      value={uploadField}
                      onChange={(e) => setUploadField(e.target.value as BannerField)}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    >
                      <option value="loginMobile">Login Mobile</option>
                      <option value="loginDesktop">Login Desktop</option>
                      <option value="loginFallback">Login Fallback</option>
                      <option value="registerMobile">Register Mobile</option>
                      <option value="registerDesktop">Register Desktop</option>
                      <option value="registerFallback">Register Fallback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Image File</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="gradient-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 bg-neutral-100 dark:bg-neutral-900 rounded p-2 space-y-1">
                  <p className="font-medium">📐 Recommended Dimensions:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><strong>Mobile (Login/Register):</strong> 1080×1920px (9:16 aspect)</li>
                    <li><strong>Desktop (Login/Register):</strong> 1200×800px (3:2 aspect)</li>
                  </ul>
                  <p className="mt-1">💾 Max: 5MB • Formats: JPG, PNG, WEBP, GIF</p>
                  <p>💡 Optimize with tools like TinyPNG or ImageOptim to reduce file size</p>
                </div>
              </div>

              <h2 className="text-lg font-bold text-primary-700 dark:text-primary-400">Login Page</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Login Mobile URL</label>
                  <input
                    type="text"
                    value={bannersForm.loginMobile}
                    onChange={(e) => setBannersForm({ ...bannersForm, loginMobile: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Login Desktop URL</label>
                  <input
                    type="text"
                    value={bannersForm.loginDesktop}
                    onChange={(e) => setBannersForm({ ...bannersForm, loginDesktop: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Login Fallback URL</label>
                <input
                  type="text"
                  value={bannersForm.loginFallback}
                  onChange={(e) => setBannersForm({ ...bannersForm, loginFallback: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  required
                />
              </div>

              <h2 className="text-lg font-bold text-primary-700 dark:text-primary-400 pt-2">Register Page</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Register Mobile URL</label>
                  <input
                    type="text"
                    value={bannersForm.registerMobile}
                    onChange={(e) => setBannersForm({ ...bannersForm, registerMobile: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Register Desktop URL</label>
                  <input
                    type="text"
                    value={bannersForm.registerDesktop}
                    onChange={(e) => setBannersForm({ ...bannersForm, registerDesktop: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Register Fallback URL</label>
                <input
                  type="text"
                  value={bannersForm.registerFallback}
                  onChange={(e) => setBannersForm({ ...bannersForm, registerFallback: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Banner URLs'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
