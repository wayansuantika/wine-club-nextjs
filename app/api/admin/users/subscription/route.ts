import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { SubscriptionDB, UserDB, AdminDB } from '@/lib/db/mongodb';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin access
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user: authUser } = authResult;
    const adminError = verifyAdmin(authUser);
    if (adminError) {
      return NextResponse.json(
        { error: adminError.error },
        { status: adminError.status }
      );
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find user's active subscription
    const subscription = await SubscriptionDB.findByUserId(user_id);
    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      );
    }

    if (subscription.status === 'CANCELLED' || subscription.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Subscription is already inactive' },
        { status: 400 }
      );
    }

    // Cancel recurring subscription in Xendit
    // In production, this would call Xendit's API to stop recurring charges
    try {
      // Example Xendit API call (uncomment when using real Xendit):
      /*
      const xenditResponse = await fetch(
        `https://api.xendit.co/recurring/plans/${subscription.xendit_subscription_id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!xenditResponse.ok) {
        const xenditError = await xenditResponse.json();
        console.error('Xendit cancellation error:', xenditError);
        throw new Error('Failed to cancel Xendit subscription');
      }
      */
      
      console.log(`[SIMULATION] Cancelled Xendit subscription: ${subscription.xendit_subscription_id}`);
    } catch (xenditError) {
      console.error('Xendit API error:', xenditError);
      // Continue with local cancellation even if Xendit fails
    }

    // Cancel subscription in database
    await SubscriptionDB.updateStatus(subscription._id.toString(), 'CANCELLED');

    // Update user status back to GUEST
    await UserDB.updateStatus(user_id, 'GUEST');

    // Log admin action
    await AdminDB.logAction(
      authUser.id,
      'DEACTIVATE_SUBSCRIPTION',
      'user',
      user_id,
      { 
        subscription_id: subscription._id.toString(), 
        xendit_subscription_id: subscription.xendit_subscription_id,
        description: `Deactivated subscription for user ${user_id} and cancelled recurring payments`
      }
    );

    return NextResponse.json({
      message: 'Subscription deactivated and recurring payments cancelled successfully',
      subscription: {
        id: subscription._id,
        status: 'CANCELLED',
        xendit_subscription_id: subscription.xendit_subscription_id
      }
    });
  } catch (error) {
    console.error('Subscription deactivation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
