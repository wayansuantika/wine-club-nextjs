'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

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
  isRegistered?: boolean;
}

type FilterStatus = 'AVAILABLE' | 'REGISTERED' | 'PAST';

export default function EventsPage() {
  const router = useRouter();
  const { user, token, loadAuth } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [balance, setBalance] = useState(0);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('AVAILABLE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<Event | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

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

    if (user?.status !== 'ACTIVE_MEMBER') {
      toast.error('Active membership required to view events');
      router.push('/profile');
      return;
    }

    fetchEvents();
    fetchProfile();
  }, [token, user, router, authChecked]);

  const filterEvents = useCallback(() => {
    let result = events;

    // Filter by status
    if (filterStatus === 'AVAILABLE') {
      result = result.filter(e => !isPastEvent(e) && !e.isRegistered && e.current_attendees < e.max_attendees);
    } else if (filterStatus === 'REGISTERED') {
      result = result
        .filter(e => e.isRegistered)
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    } else if (filterStatus === 'PAST') {
      result = result.filter(e => isPastEvent(e));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(query) || 
        e.location.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(result);
  }, [events, filterStatus, searchQuery]);

  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  const fetchEvents = async () => {
    try {
      const response = await apiCall('/api/events');
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to fetch events');
        return;
      }

      setEvents(data.events);
    } catch (error) {
      console.error('Events fetch error:', error);
      toast.error('An error occurred while fetching events');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiCall('/api/profile');
      const data = await response.json();
      if (response.ok) {
        setBalance(data.points.balance);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  };

  const isPastEvent = (event: Event) => {
    return new Date(event.event_date).getTime() < Date.now();
  };

  const handleRedeem = async (event: Event) => {
    if (event.isRegistered) {
      toast.error('You are already registered for this event');
      return;
    }

    if (balance < event.points_cost) {
      toast.error(`Insufficient points. You need ${event.points_cost.toLocaleString()} points`);
      return;
    }

    if (event.current_attendees >= event.max_attendees) {
      toast.error('Event is at full capacity');
      return;
    }

    try {
      const response = await apiCall('/api/events/redeem', {
        method: 'POST',
        body: JSON.stringify({ event_id: event._id })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to register for event');
        return;
      }

      toast.success('Successfully registered for event!');
      setBalance(data.new_balance);
      
      setEvents(prev => prev.map(e => 
        e._id === event._id ? { ...e, isRegistered: true, current_attendees: e.current_attendees + 1 } : e
      ));
    } catch (error) {
      console.error('Event redemption error:', error);
      toast.error('An error occurred during registration');
    }
  };

  const handleOpenJoinModal = (event: Event) => {
    setPendingEvent(event);
    setShowJoinModal(true);
  };

  const handleConfirmJoin = async () => {
    if (!pendingEvent) return;
    setIsJoining(true);
    await handleRedeem(pendingEvent);
    setIsJoining(false);
    setShowJoinModal(false);
    setPendingEvent(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading events...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center">
        <div className="text-white text-xl">No events available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Wine Club Events</h1>
          <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-white">
              <span className="text-xs sm:text-sm opacity-80 block sm:inline">Points:</span>
              <span className="ml-0 sm:ml-2 text-lg sm:text-xl font-bold block sm:inline">{balance.toLocaleString()}</span>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="bg-white/10 backdrop-blur-sm text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20 text-sm sm:text-base"
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      {/* Events Section */}
      <section className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Events</h2>
          
          {/* Filters */}
          <div className="space-y-4 sm:space-y-0 sm:flex sm:gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            <div className="flex gap-2 overflow-x-auto sm:overflow-x-visible">
              {(['AVAILABLE', 'REGISTERED', 'PAST'] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    filterStatus === status
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white text-lg">No events match your filters</p>
            <p className="text-white/60 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event._id}
                className={`rounded-xl overflow-hidden shadow-lg transition-shadow flex flex-col h-full ${
                  isPastEvent(event)
                    ? 'bg-neutral-100 dark:bg-neutral-900/70 opacity-80 grayscale'
                    : 'bg-white dark:bg-neutral-900 hover:shadow-xl'
                }`}
              >
                {/* Image */}
                <div className="relative w-full h-40 bg-gradient-to-br from-primary-700 to-accent-600">
                  {event.image_url && (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  {isPastEvent(event) && (
                    <div className="absolute left-3 top-3 rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-semibold text-white">
                      Past Event
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-neutral-900 dark:text-neutral-100 mb-1 line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-3 inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    <span>{event.location}</span>
                  </p>

                  <div className="mb-3 flex items-start justify-between gap-2">
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 flex-1 line-clamp-2">
                      {event.description}
                    </p>
                    {event.description && event.description.length > 120 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventModal(true);
                        }}
                        className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        aria-label="View event details"
                      >
                        <span className="material-symbols-outlined text-base">info</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Info */}
                  <div className="space-y-2 py-3 border-y border-neutral-200 dark:border-neutral-700 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">Date:</span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">Cost:</span>
                      <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {event.points_cost.toLocaleString()}pts
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">Spots:</span>
                      <span className={`font-semibold ${
                        event.current_attendees >= event.max_attendees 
                          ? 'text-error-600 dark:text-error-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {event.max_attendees - event.current_attendees}/{event.max_attendees}
                      </span>
                    </div>
                  </div>

                  {/* Register Button */}
                  <button
                    onClick={() => handleOpenJoinModal(event)}
                    disabled={
                      isPastEvent(event) ||
                      event.isRegistered ||
                      balance < event.points_cost ||
                      event.current_attendees >= event.max_attendees
                    }
                    className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-opacity ${
                      isPastEvent(event) ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed' :
                      event.isRegistered ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300' :
                      event.current_attendees >= event.max_attendees ? 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300' :
                      balance < event.points_cost ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-not-allowed' :
                      'gradient-primary text-white hover:opacity-90'
                    }`}
                  >
                    {isPastEvent(event)
                      ? 'Event Ended'
                      : event.isRegistered
                      ? '✓ Registered'
                      : 'Register'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedEvent.title}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>{selectedEvent.location}</span>
                </p>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="rounded-full border border-neutral-200 p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label="Close details"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Date</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Cost</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedEvent.points_cost.toLocaleString()} pts
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Spots</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedEvent.max_attendees - selectedEvent.current_attendees}/{selectedEvent.max_attendees}
                </span>
              </div>
              {selectedEvent.description && (
                <div className="pt-3">
                  <p className="text-neutral-500">Description</p>
                  <p className="mt-1 leading-relaxed text-neutral-800 dark:text-neutral-200">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showJoinModal && pendingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowJoinModal(false);
              setPendingEvent(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Confirm Registration
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Do you want to join this event?
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {pendingEvent.title}
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                <span>{pendingEvent.location}</span>
              </p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Cost: <span className="font-semibold">{pendingEvent.points_cost.toLocaleString()} pts</span>
              </p>
            </div>

            <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
              By confirming, the points used for this registration are non-refundable.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setPendingEvent(null);
                }}
                disabled={isJoining}
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Close
              </button>
              <button
                onClick={handleConfirmJoin}
                disabled={isJoining}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isJoining ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
