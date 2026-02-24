import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { AdminDB } from '@/lib/db/mongodb';
import {
  getSubscriptionPlanByCode,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  type SubscriptionPlanCreateInput,
  type SubscriptionPlanUpdateInput
} from '@/lib/server/subscriptionPlansStore';

interface RouteParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(request: NextRequest, route: RouteParams) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { code } = await route.params;
    const plan = await getSubscriptionPlanByCode(code);

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Admin subscription plan fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, route: RouteParams) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { code } = await route.params;
    const body = (await request.json()) as SubscriptionPlanUpdateInput;

    const plan = await updateSubscriptionPlan(code, body, authResult.user.id);

    await AdminDB.logAction(authResult.user.id, 'UPDATE_SUBSCRIPTION_PLAN', 'AppConfig', code, body);

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

export async function DELETE(request: NextRequest, route: RouteParams) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { code } = await route.params;
    await deleteSubscriptionPlan(code, authResult.user.id);

    await AdminDB.logAction(authResult.user.id, 'DELETE_SUBSCRIPTION_PLAN', 'AppConfig', code, {});

    return NextResponse.json({ message: 'Subscription plan deleted successfully' });
  } catch (error: any) {
    console.error('Admin subscription plan delete error:', error);

    if (error?.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, route: RouteParams) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = (await request.json()) as SubscriptionPlanCreateInput;
    const plan = await createSubscriptionPlan(body, authResult.user.id);

    await AdminDB.logAction(authResult.user.id, 'CREATE_SUBSCRIPTION_PLAN', 'AppConfig', plan.code, body);

    return NextResponse.json(
      {
        message: 'Subscription plan created successfully',
        plan
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Admin subscription plan create error:', error);

    if (error?.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
