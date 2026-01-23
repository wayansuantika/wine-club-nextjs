'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiCall } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface Event {
  _id: string;
  id: string;
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

export default function EventsPage() {
  const router = useRouter();
  const { user, token, loadAuth } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [balance, setBalance] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

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
      
      // Mark event as registered
      setEvents(prev => prev.map(e => 
        e._id === event._id ? { ...e, isRegistered: true, current_attendees: e.current_attendees + 1 } : e
      ));
    } catch (error) {
      console.error('Event redemption error:', error);
      toast.error('An error occurred during registration');
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : events.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < events.length - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [events.length]);

  // Touch event handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart - touchEnd;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  };

  const getCardStyle = (index: number) => {
    const diff = index - currentIndex;
    if (diff === 0) {
      return 'scale-100 opacity-100 z-20';
    } else if (diff === -1 || (currentIndex === 0 && index === events.length - 1)) {
      return 'scale-85 opacity-50 blur-sm z-10 -translate-x-4';
    } else if (diff === 1 || (currentIndex === events.length - 1 && index === 0)) {
      return 'scale-85 opacity-50 blur-sm z-10 translate-x-4';
    }
    return 'scale-75 opacity-0 pointer-events-none';
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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 overflow-x-hidden">
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

      {/* Carousel */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div 
          className="relative flex items-center justify-center min-h-[500px] sm:min-h-[700px] touch-pan-y overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Cards */}
          <div className="relative w-full max-w-4xl h-[500px] sm:h-[640px]">
            {events.map((event, index) => {
              const isActive = index === currentIndex;
              return (
                <div
                  key={event._id}
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${getCardStyle(index)}`}
                >
                  <div className={`bg-white dark:bg-neutral-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden ${isActive ? 'h-[500px] sm:h-[640px]' : 'h-[420px] sm:h-[520px]'}`}>

                    <div className={`relative w-full ${isActive ? 'h-48 sm:h-64' : 'h-40 sm:h-48'}`}>
                      {event.image_url ? (
                        <div className="w-full h-full">
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="block sm:hidden w-full h-full object-cover"
                            loading="lazy"
                          />
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="hidden sm:block w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center p-4 sm:p-8">
                          <h2 className="text-white text-xl sm:text-3xl font-bold text-center leading-tight">
                            {event.title}
                          </h2>
                        </div>
                      )}
                    
                    {/* Overlay with Cost and Button */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs text-white/80 block">Cost:</span>
                          <span className="text-lg sm:text-2xl font-bold text-white">
                            {event.points_cost.toLocaleString()} pts
                          </span>
                        </div>

                        {isActive && (
                          <button
                            onClick={() => handleRedeem(event)}
                            disabled={event.isRegistered || event.current_attendees >= event.max_attendees}
                            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                              event.isRegistered
                                ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-not-allowed'
                                : event.current_attendees >= event.max_attendees
                                ? 'bg-error-200 text-error-700 cursor-not-allowed'
                                : 'gradient-primary text-white hover:opacity-90'
                            }`}
                          >
                            {event.isRegistered ? 'Registered' : event.current_attendees >= event.max_attendees ? 'Full' : 'Redeem'}
                          </button>
                        )}
                      </div>
                    </div>
                    </div>

                    <div className={`p-4 sm:p-6 overflow-y-auto ${isActive ? 'max-h-[252px] sm:max-h-[376px]' : 'max-h-[220px] sm:max-h-[272px]'}`}>
                    {event.image_url && (
                      <h2 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-400 mb-3">
                        {event.title}
                      </h2>
                    )}
                    
                    <div className="space-y-2 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-4">
                      <p className="flex items-center gap-2">
                        <span className="font-semibold">📍</span>
                        <span className="truncate">{event.location}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-semibold">📅</span>
                        <span className="text-xs sm:text-sm">
                          {new Date(event.event_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-semibold">👥</span>
                        {event.current_attendees} / {event.max_attendees} attendees
                      </p>
                    </div>

                    {event.description && (
                      <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 line-clamp-3 sm:line-clamp-none">
                        {event.description}
                      </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrevious}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 sm:bg-white/10 sm:backdrop-blur-sm text-primary-900 sm:text-white p-3 sm:p-4 rounded-full hover:bg-white sm:hover:bg-white/20 transition-colors border-2 border-white shadow-lg sm:shadow-none z-30"
            aria-label="Previous event"
          >
            <svg className="w-6 h-6 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 sm:bg-white/10 sm:backdrop-blur-sm text-primary-900 sm:text-white p-3 sm:p-4 rounded-full hover:bg-white sm:hover:bg-white/20 transition-colors border-2 border-white shadow-lg sm:shadow-none z-30"
            aria-label="Next event"
          >
            <svg className="w-6 h-6 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Indicators */}
        <div className="flex justify-center gap-2 mt-6 sm:mt-8">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 sm:h-2 rounded-full transition-all ${
                index === currentIndex ? 'w-6 sm:w-8 bg-white' : 'w-1.5 sm:w-2 bg-white/30'
              }`}
              aria-label={`Go to event ${index + 1}`}
            />
          ))}
        </div>

        <p className="text-center text-white/60 mt-3 sm:mt-4 text-xs sm:text-sm">
          <span className="block sm:inline">Swipe or use arrow keys to navigate</span>
          <span className="hidden sm:inline"> • </span>
          <span className="block sm:inline mt-1 sm:mt-0">Click buttons to browse events</span>
        </p>
      </div>
    </div>
  );
}
