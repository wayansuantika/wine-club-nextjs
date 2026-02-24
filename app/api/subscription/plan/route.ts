import { NextResponse } from 'next/server';
import { getAllSubscriptionPlans } from '@/lib/server/subscriptionPlansStore';

export async function GET() {
  try {
    const plans = await getAllSubscriptionPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Subscription plans fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
