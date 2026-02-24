import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
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

    // Get user registrations with event details
    const registrations = await EventDB.getUserRegistrations(authUser.id);

    // Format response
    const formattedRegistrations = registrations.map((reg: any) => ({
      registration_id: reg._id,
      reservation_code: reg.reservation_code,
      points_spent: reg.points_spent,
      status: reg.status,
      registered_at: reg.registered_at,
      event: {
        id: reg.event_id._id,
        title: reg.event_id.title,
        description: reg.event_id.description,
        location: reg.event_id.location,
        event_date: reg.event_id.event_date,
        points_cost: reg.event_id.points_cost,
        image_url: reg.event_id.image_url,
        status: reg.event_id.status
      }
    }));

    return NextResponse.json({ registrations: formattedRegistrations });
  } catch (error) {
    console.error('User registrations fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
