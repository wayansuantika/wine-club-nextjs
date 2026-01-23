import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { UserDB, PointsDB } from '@/lib/db/mongodb';

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

    const users = await UserDB.getAll();

    // Get points for each user
    const usersWithPoints = await Promise.all(
      users.map(async (user) => {
        const points = await PointsDB.getByUserId(user._id.toString());
        return {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          status: user.subscription_status,
          points_balance: points.balance,
          created_at: user.created_at
        };
      })
    );

    return NextResponse.json({ users: usersWithPoints });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
