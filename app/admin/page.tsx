'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

type Tab = 'events' | 'users' | 'payments' | 'webhooks';

interface Event {
  _id: string;
  title: string;
  description?: string;
  location: string;
  event_date: string;
  points_cost: number;
  max_attendees: number;
  current_attendees: number;
  image_url?: string;
  status: string;
}

interface Registration {
  _id: string;
  user_id: {
    _id: string;
    email: string;
    full_name?: string;
  };
  points_spent: number;
  reservation_code: string;
  status: string;
  registered_at: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  status: string;
  points_balance: number;
  created_at: string;
}

interface Payment {
  _id: string;
  user_id?: {
    email?: string;
  } | null;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  paid_at?: string;
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  event_date: string;
  points_cost: number;
  max_attendees: number;
  image_url: string;
  status: string;
}

interface Webhook {
  _id: string;
  event_type: string;
  status: string;
  processed: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, token, loadAuth, clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsEvent, setRegistrationsEvent] = useState<Event | null>(null);

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

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, activeTab, router, authChecked]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'events':
          await fetchEvents();
          break;
        case 'users':
          await fetchUsers();
          break;
        case 'payments':
          await fetchPayments();
          break;
        case 'webhooks':
          await fetchWebhooks();
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await apiCall('/api/admin/events');
      const data = await response.json();
      if (response.ok) setEvents(data.events);
    } catch (error) {
      console.error('Events fetch error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiCall('/api/admin/users');
      const data = await response.json();
      if (response.ok) setUsers(data.users);
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await apiCall('/api/admin/payments');
      const data = await response.json();
      if (response.ok) setPayments(data.payments);
    } catch (error) {
      console.error('Payments fetch error:', error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const response = await apiCall('/api/admin/webhooks');
      const data = await response.json();
      if (response.ok) setWebhooks(data.webhooks);
    } catch (error) {
      console.error('Webhooks fetch error:', error);
    }
  };

  const handleCreateEvent = async (eventData: EventFormData) => {
    try {
      const response = await apiCall('/api/admin/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to create event');
        return;
      }

      toast.success('Event created successfully');
      setShowEventModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Event creation error:', error);
      toast.error('An error occurred');
    }
  };

  const handleUpdateEvent = async (eventId: string, eventData: EventFormData) => {
    try {
      const response = await apiCall(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(eventData)
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to update event');
        return;
      }

      toast.success('Event updated successfully');
      setShowEventModal(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Event update error:', error);
      toast.error('An error occurred');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await apiCall(`/api/admin/events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete event');
        return;
      }

      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Event deletion error:', error);
      toast.error('An error occurred');
    }
  };

  const handleViewRegistrations = async (eventItem: Event) => {
    setRegistrationsEvent(eventItem);
    setShowRegistrationsModal(true);
    setRegistrationsLoading(true);
    try {
      const response = await apiCall(`/api/admin/events/${eventItem._id}/registrations`);
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to load registrations');
        setRegistrations([]);
        return;
      }
      setRegistrations(data.registrations || []);
    } catch (error) {
      console.error('Registrations fetch error:', error);
      toast.error('An error occurred while loading registrations');
      setRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handleAdjustPoints = async (userId: string, amount: number, reason: string) => {
    try {
      const response = await apiCall('/api/admin/users/points', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, amount, reason })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to adjust points');
        return;
      }

      toast.success('Points adjusted successfully');
      setShowPointsModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Points adjustment error:', error);
      toast.error('An error occurred');
    }
  };

  const handleMigrateReservationCodes = async () => {
    if (!confirm('This will generate reservation codes for all existing registrations. Continue?')) {
      return;
    }

    const loadingToast = toast.loading('Migrating reservation codes...');
    try {
      const response = await apiCall('/api/admin/migrate-reservation-codes', {
        method: 'POST'
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to migrate codes', { id: loadingToast });
        return;
      }

      toast.success(`Successfully updated ${data.updated} registrations`, { id: loadingToast });
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('An error occurred during migration', { id: loadingToast });
    }
  };

  const handleDeactivateSubscription = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to deactivate the subscription for ${userEmail}? This will downgrade them to GUEST status.`)) {
      return;
    }

    try {
      const response = await apiCall('/api/admin/users/subscription', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to deactivate subscription');
        return;
      }

      toast.success('Subscription deactivated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Subscription deactivation error:', error);
      toast.error('An error occurred');
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/settings/subscription-plans"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <div className="text-base font-semibold text-white">Subscription Plans</div>
            <div className="text-sm text-white/70">Manage all subscription plans</div>
          </Link>
          <Link
            href="/admin/settings/auth-banners"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <div className="text-base font-semibold text-white">Auth Banner Settings</div>
            <div className="text-sm text-white/70">Manage login and register banner image URLs</div>
          </Link>
        </div>
      </section>

      {/* Tabs */}
      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            {(['events', 'users', 'payments', 'webhooks'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-accent-400'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-white text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Events Tab */}
            {activeTab === 'events' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Events Management</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleMigrateReservationCodes}
                      className="bg-white/10 backdrop-blur-sm text-white px-4 py-3 rounded-lg hover:bg-white/20 transition-colors border border-white/20 text-sm font-medium"
                      title="Generate reservation codes for existing registrations"
                    >
                      Migrate Codes
                    </button>
                    <button
                      onClick={() => setShowEventModal(true)}
                      className="gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                      + Create Event
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...events]
                    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                    .map((event) => (
                    <div key={event._id} className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold text-primary-700 dark:text-primary-400 mb-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        {new Date(event.event_date).toLocaleDateString()}
                      </p>
                      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-sm leading-none">location_on</span>
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-sm leading-none">payments</span>
                          <span>{event.points_cost.toLocaleString()} points</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-sm leading-none">groups</span>
                          <span>{event.current_attendees} / {event.max_attendees}</span>
                        </div>
                        <p>
                          Status: <span className={`font-semibold ${
                            event.status === 'UPCOMING' ? 'text-accent-500' :
                            event.status === 'COMPLETED' ? 'text-neutral-500' :
                            'text-error-500'
                          }`}>{event.status}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setEditingEvent(event);
                            setShowEventModal(true);
                          }}
                          className="flex-1 bg-primary-100 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-200 transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleViewRegistrations(event)}
                          className="flex-1 bg-accent-100 text-accent-700 px-4 py-2 rounded-lg hover:bg-accent-200 transition-colors text-sm font-medium"
                        >
                          Members
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event._id)}
                          className="flex-1 bg-error-100 text-error-700 px-4 py-2 rounded-lg hover:bg-error-200 transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Users Management</h2>

                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-primary-100 dark:bg-primary-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Points</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Actions</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100">
                            {user.email}
                            {user.full_name && <span className="block text-xs text-neutral-600 dark:text-neutral-400">{user.full_name}</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              user.status === 'ACTIVE_MEMBER' ? 'bg-accent-100 text-accent-700' : 'bg-neutral-200 text-neutral-700'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {user.points_balance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowPointsModal(true);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600"
                                aria-label="Adjust points"
                                title="Adjust points"
                              >
                                <span className="material-symbols-outlined">tune</span>
                              </button>
                              {user.status === 'ACTIVE_MEMBER' && (
                                <button
                                  onClick={() => handleDeactivateSubscription(user.id, user.email)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-error-500 text-white transition-colors hover:bg-error-600"
                                  aria-label="Deactivate member"
                                  title="Deactivate member"
                                >
                                  <span className="material-symbols-outlined">person_off</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Payment History</h2>
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-primary-100 dark:bg-primary-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">User</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {payments.map((payment) => (
                        <tr key={payment._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100">
                            {payment.user_id?.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            IDR {payment.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'SUCCEEDED' ? 'bg-accent-100 text-accent-700' :
                              payment.status === 'FAILED' ? 'bg-error-100 text-error-700' :
                              'bg-neutral-200 text-neutral-700'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                            {new Date(payment.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Webhooks Tab */}
            {activeTab === 'webhooks' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Webhook Logs</h2>
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-primary-100 dark:bg-primary-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Event Type</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Processed</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-primary-900 dark:text-primary-100">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {webhooks.map((webhook) => (
                        <tr key={webhook._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {webhook.event_type}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                            {webhook.status}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              webhook.processed ? 'bg-accent-100 text-accent-700' : 'bg-neutral-200 text-neutral-700'
                            }`}>
                              {webhook.processed ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                            {new Date(webhook.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Event Modal */}
      {showEventModal && <EventModal event={editingEvent} onClose={() => { setShowEventModal(false); setEditingEvent(null); }} onCreate={handleCreateEvent} onUpdate={handleUpdateEvent} />}

      {showRegistrationsModal && registrationsEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-primary-700 dark:text-primary-400">
                  Event Members
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {registrationsEvent.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRegistrationsModal(false);
                  setRegistrationsEvent(null);
                  setRegistrations([]);
                }}
                className="rounded-full border border-neutral-200 p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label="Close members"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {registrationsLoading ? (
              <div className="text-neutral-600 dark:text-neutral-400">Loading members...</div>
            ) : registrations.length === 0 ? (
              <div className="text-neutral-600 dark:text-neutral-400">No members registered yet.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Registered Date</th>
                      <th className="px-4 py-3 font-semibold">Reservation ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {registrations.map((registration) => (
                      <tr key={registration._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                        <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                          {registration.user_id?.full_name || registration.user_id?.email || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                          {registration.user_id?.email || 'No email'}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                          {new Date(registration.registered_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-primary-600 dark:text-primary-400 font-semibold">
                          {registration.reservation_code || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Points Modal */}
      {showPointsModal && selectedUser && <PointsModal user={selectedUser} onClose={() => { setShowPointsModal(false); setSelectedUser(null); }} onSave={handleAdjustPoints} />}
    </div>
  );
}

// Event Modal Component
function EventModal({ event, onClose, onCreate, onUpdate }: {
  event: Event | null;
  onClose: () => void;
  onCreate?: (data: EventFormData) => void;
  onUpdate?: (eventId: string, data: EventFormData) => void;
}) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    event_date: event ? new Date(event.event_date).toISOString().slice(0, 16) : '',
    points_cost: event?.points_cost || 0,
    max_attendees: event?.max_attendees || 0,
    image_url: event?.image_url || '',
    status: event?.status || 'UPCOMING'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (event && onUpdate) {
      onUpdate(event._id, formData);
    } else if (onCreate) {
      onCreate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-primary-700 dark:text-primary-400 mb-6">
          {event ? 'Edit Event' : 'Create Event'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Title</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" rows={3} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Location</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Event Date</label>
              <input type="datetime-local" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" required />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Points Cost</label>
              <input type="number" value={formData.points_cost} onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Max Attendees</label>
              <input type="number" value={formData.max_attendees} onChange={(e) => setFormData({ ...formData, max_attendees: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Image URL <span className="text-xs text-neutral-500">(optional)</span></label>
            <input type="text" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" placeholder="https://example.com/image.jpg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-6 py-3 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors font-medium">Cancel</button>
            <button type="submit" className="flex-1 gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Points Modal Component
function PointsModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (userId: string, amount: number, reason: string) => void }) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, amount, reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h3 className="text-2xl font-bold text-primary-700 dark:text-primary-400 mb-4">Adjust Points</h3>
        <p className="text-neutral-700 dark:text-neutral-300 mb-6">
          User: <strong>{user.email}</strong><br />
          Current Balance: <strong>{user.points_balance.toLocaleString()}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Amount (positive to add, negative to deduct)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" rows={3} required />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-6 py-3 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors font-medium">Cancel</button>
            <button type="submit" className="flex-1 gradient-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
