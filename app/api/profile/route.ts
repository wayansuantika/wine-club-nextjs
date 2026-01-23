import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { UserDB, PointsDB, SubscriptionDB } from '@/lib/db/mongodb';

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

    // Get user details
    const user = await UserDB.findById(authUser.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get points balance
    const points = await PointsDB.getByUserId(authUser.id);

    // Get subscription details
    const subscription = await SubscriptionDB.findByUserId(authUser.id);

    // Return combined profile data
    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        birth_date: user.birth_date,
        profile_photo: user.profile_photo,
        role: user.role,
        status: user.subscription_status,
        created_at: user.created_at
      },
      points: {
        balance: points.balance,
        total_earned: points.total_earned,
        total_spent: points.total_spent
      },
      subscription: subscription ? {
        id: subscription._id,
        status: subscription.status,
        amount: subscription.amount,
        interval: subscription.interval,
        start_date: subscription.start_date,
        next_payment_date: subscription.next_payment_date
      } : null
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const profileData = await request.json();

    // Remove fields that shouldn't be updated via this endpoint
    delete profileData.email;
    delete profileData.password;
    delete profileData.role;
    delete profileData.subscription_status;

    // Update user profile
    const updatedUser = await UserDB.updateProfile(authUser.id, profileData);

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        birth_date: updatedUser.birth_date,
        profile_photo: updatedUser.profile_photo
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
