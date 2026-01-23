import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyActiveMember } from '@/lib/auth';
import { SubscriptionDB, UserDB } from '@/lib/db/mongodb';

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
        { error: 'No active subscription to cancel' },
        { status: 400 }
      );
    }

    // Get user's subscription
    const subscription = await SubscriptionDB.findByUserId(authUser.id);
    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      );
    }

    // In production, you would cancel the Xendit subscription here
    // For now, we'll just update the database

    // Update subscription status to CANCELLED
    await SubscriptionDB.updateStatus(subscription._id.toString(), 'CANCELLED');

    // Update user status to GUEST
    await UserDB.updateStatus(authUser.id, 'GUEST');

    return NextResponse.json({
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription._id,
        status: 'CANCELLED'
      }
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
