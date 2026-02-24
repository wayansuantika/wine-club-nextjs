import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { AppConfigDB, AdminDB } from '@/lib/db/mongodb';
import { getAllSubscriptionPlans } from '@/lib/server/subscriptionPlansStore';

const SUBSCRIPTION_PLANS_CONFIG_KEY = 'subscription_plans';

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

    console.log('🔄 Starting subscription plans migration...');

    const plans = await getAllSubscriptionPlans();
    let updated = false;
    const fixes: {code: string; oldPoints: number; newPoints: number}[] = [];

    // Fix plans that have incorrect points values
    // If pointsPerMonth is much smaller than the amount, it needs fixing
    const fixedPlans = plans.map((plan) => {
      let incorrectPoints = false;
      let correctedPoints = plan.pointsPerMonth;

      // Case 1: Points explicitly very small (< 1000)
      if (plan.pointsPerMonth < 1000) {
        incorrectPoints = true;
        correctedPoints = plan.pointsPerMonth * 1000;
        console.warn(`⚠️ Plan ${plan.code}: points < 1000 (${plan.pointsPerMonth}), multiplying by 1000`);
      }
      // Case 2: Amount is in millions but points are in thousands
      // E.g., amount 1500000 but points 1500 -> should be 1500000
      else if (plan.amount >= 100000 && plan.pointsPerMonth < 100000) {
        // Check if points look like they were meant to match the amount
        const pointsAsPercentOfAmount = plan.pointsPerMonth / plan.amount;
        if (pointsAsPercentOfAmount < 0.01) {
          // Points are less than 1% of amount, they're definitely wrong
          incorrectPoints = true;
          correctedPoints = plan.amount;
          console.warn(`⚠️ Plan ${plan.code}: amount=${plan.amount} but points=${plan.pointsPerMonth}, correcting to ${correctedPoints}`);
        }
      }

      if (incorrectPoints) {
        fixes.push({
          code: plan.code,
          oldPoints: plan.pointsPerMonth,
          newPoints: correctedPoints
        });
        updated = true;
        return { ...plan, pointsPerMonth: correctedPoints };
      }
      return plan;
    });

    if (!updated) {
      console.log('✅ All subscription plans have correct values');
      return NextResponse.json({
        message: 'No fixes needed',
        plansCount: plans.length,
        fixes: []
      });
    }

    // Save fixed plans
    await AppConfigDB.upsert(SUBSCRIPTION_PLANS_CONFIG_KEY, fixedPlans, authResult.user.id);

    // Log the migration
    await AdminDB.logAction(
      authResult.user.id,
      'MIGRATE_SUBSCRIPTION_PLANS',
      'AppConfig',
      SUBSCRIPTION_PLANS_CONFIG_KEY,
      { fixes }
    );

    console.log('✅ Subscription plans migration completed');
    console.log(`📊 Fixed ${fixes.length} plans:`, fixes);

    return NextResponse.json({
      message: 'Subscription plans fixed successfully',
      plansCount: fixedPlans.length,
      fixes,
      plans: fixedPlans
    });
  } catch (error: unknown) {
    console.error('❌ Migration error:', error);
    const message = error instanceof Error ? error.message : 'Migration failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
