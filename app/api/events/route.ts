import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyActiveMember } from '@/lib/auth';
import { EventDB } from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user: authUser } = authResult;

    // Check if user is active member
    const memberCheck = verifyActiveMember(authUser);
    if (memberCheck) {
      return NextResponse.json(
        { error: memberCheck.error },
        { status: memberCheck.status }
      );
    }

    // Get all events (excluding cancelled)
    const events = await EventDB.getAll(false);

    // Check which events the user is registered for
    const eventsWithRegistration = await Promise.all(
      events.map(async (event) => {
        const isRegistered = await EventDB.isUserRegistered(authUser.id, event._id.toString());
        return {
          _id: event._id,
          id: event._id.toString(),
          title: event.title,
          description: event.description,
          location: event.location,
          event_date: event.event_date,
          points_cost: event.points_cost,
          max_attendees: event.max_attendees,
          current_attendees: event.current_attendees,
          image_url: event.image_url,
          status: event.status,
          isRegistered
        };
      })
    );

    return NextResponse.json({ events: eventsWithRegistration });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
