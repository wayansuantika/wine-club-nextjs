import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { EventDB, AdminDB } from '@/lib/db/mongodb';

// GET all events (admin view - includes all statuses)
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const events = await EventDB.getAll(true); // Include all events including cancelled
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Admin events fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new event
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const eventData = await request.json();

    // Validate required fields
    if (!eventData.title || !eventData.event_date || !eventData.points_cost || !eventData.max_attendees) {
      return NextResponse.json(
        { error: 'Missing required fields: title, event_date, points_cost, max_attendees' },
        { status: 400 }
      );
    }

    const event = await EventDB.create({
      title: eventData.title,
      description: eventData.description,
      event_date: new Date(eventData.event_date),
      location: eventData.location,
      points_cost: eventData.points_cost,
      max_attendees: eventData.max_attendees,
      image_url: eventData.image_url,
      status: eventData.status || 'UPCOMING'
    });

    // Log admin action
    await AdminDB.logAction(
      authResult.user.id,
      'CREATE_EVENT',
      'Event',
      event._id.toString(),
      { title: event.title }
    );

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Admin event creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
