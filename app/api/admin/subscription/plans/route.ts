import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { getAllSubscriptionPlans } from '@/lib/server/subscriptionPlansStore';

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

    const plans = await getAllSubscriptionPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Admin subscription plans fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
