import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { AdminDB } from '@/lib/db/mongodb';
import { getRuntimeSubscriptionPlan, updateRuntimeSubscriptionPlan } from '@/lib/server/subscriptionPlanStore';

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

    const plan = await getRuntimeSubscriptionPlan();
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Admin subscription plan fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const plan = await updateRuntimeSubscriptionPlan(body, authResult.user.id);

    await AdminDB.logAction(
      authResult.user.id,
      'UPDATE_SUBSCRIPTION_PLAN',
      'AppConfig',
      'subscription_plan',
      body
    );

    return NextResponse.json({
      message: 'Subscription plan updated successfully',
      plan
    });
  } catch (error: any) {
    console.error('Admin subscription plan update error:', error);

    if (error?.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
