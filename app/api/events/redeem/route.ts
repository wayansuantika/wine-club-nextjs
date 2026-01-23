import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyActiveMember } from '@/lib/auth';
import { EventDB, PointsDB } from '@/lib/db/mongodb';

export async function POST(request: NextRequest) {
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

    const { event_id } = await request.json();

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Get event details
    const event = await EventDB.getById(event_id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if event is upcoming
    if (event.status !== 'UPCOMING') {
      return NextResponse.json(
        { error: 'Event is not available for registration' },
        { status: 400 }
      );
    }

    // Check user points balance
    const pointsBalance = await PointsDB.getBalance(authUser.id);
    if (pointsBalance < event.points_cost) {
      return NextResponse.json(
        { error: 'Insufficient points', balance: pointsBalance, required: event.points_cost },
        { status: 400 }
      );
    }

    // Deduct points and register for event
    try {
      const newBalance = await PointsDB.deductPoints(
        authUser.id,
        event.points_cost,
        `Event registration: ${event.title}`,
        event_id
      );

      const registration = await EventDB.register(authUser.id, event_id, event.points_cost);

      return NextResponse.json({
        message: 'Successfully registered for event',
        registration: {
          id: registration._id,
          event_id: registration.event_id,
          points_spent: registration.points_spent,
          registered_at: registration.registered_at
        },
        new_balance: newBalance
      });
    } catch (error: any) {
      // Handle specific errors
      if (error.message === 'Already registered for this event') {
        return NextResponse.json(
          { error: 'You are already registered for this event' },
          { status: 409 }
        );
      }
      if (error.message === 'Event is full') {
        return NextResponse.json(
          { error: 'Event is at full capacity' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Event redemption error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
