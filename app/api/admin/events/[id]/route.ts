import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { EventDB, AdminDB } from '@/lib/db/mongodb';

// PUT update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;
    const eventData = await request.json();

    // Remove fields that shouldn't be directly updated
    delete eventData._id;
    delete eventData.current_attendees; // This is managed through registrations

    // Convert date string to Date object if present
    if (eventData.event_date) {
      eventData.event_date = new Date(eventData.event_date);
    }

    const updatedEvent = await EventDB.update(id, eventData);

    if (!updatedEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Log admin action
    await AdminDB.logAction(
      authResult.user.id,
      'UPDATE_EVENT',
      'Event',
      id,
      { title: updatedEvent.title, changes: eventData }
    );

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Admin event update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;

    const deletedEvent = await EventDB.delete(id);

    if (!deletedEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Log admin action
    await AdminDB.logAction(
      authResult.user.id,
      'DELETE_EVENT',
      'Event',
      id,
      { title: deletedEvent.title }
    );

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Admin event deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
