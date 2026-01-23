import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { PointsDB, AdminDB } from '@/lib/db/mongodb';

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

    const { user_id, amount, reason } = await request.json();

    if (!user_id || amount === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, amount, reason' },
        { status: 400 }
      );
    }

    const newBalance = await PointsDB.manualAdjustment(
      user_id,
      amount,
      reason,
      authResult.user.id
    );

    // Log admin action
    await AdminDB.logAction(
      authResult.user.id,
      'ADJUST_POINTS',
      'User',
      user_id,
      { amount, reason, new_balance: newBalance }
    );

    return NextResponse.json({
      message: 'Points adjusted successfully',
      new_balance: newBalance
    });
  } catch (error) {
    console.error('Admin points adjustment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
