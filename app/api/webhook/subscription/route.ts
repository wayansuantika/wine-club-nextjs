import { NextRequest, NextResponse } from 'next/server';
import { WebhookDB, SubscriptionDB, PaymentDB, PointsDB, UserDB } from '@/lib/db/mongodb';
import { getSubscriptionPlanByCode, getAllSubscriptionPlans } from '@/lib/server/subscriptionPlansStore';

const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Verify webhook token
    const webhookToken = request.headers.get('x-callback-token');
    if (webhookToken !== XENDIT_WEBHOOK_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid webhook token' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const eventType = payload.event || payload.status;

    // Log webhook
    const webhookLog = await WebhookDB.log(
      eventType,
      payload.id || payload.subscription_id,
      payload.status,
      payload
    );

    try {
      // Handle different webhook events
      switch (eventType) {
        case 'subscription.activated':
        case 'subscription.payment_succeeded': {
          const xenditSubscriptionId = payload.subscription_id;
          const subscription = await SubscriptionDB.findByXenditId(xenditSubscriptionId);

          if (subscription) {
            // Find matching plan by amount (or use first available)
            let subscriptionPlan = null;
            const planCode = payload.metadata?.subscription_plan_code;
            
            if (planCode) {
              subscriptionPlan = await getSubscriptionPlanByCode(planCode);
            }
            
            if (!subscriptionPlan) {
              // Try to match by amount
              const allPlans = await getAllSubscriptionPlans();
              subscriptionPlan = allPlans.find(p => p.amount === subscription.amount);
            }
            
            if (!subscriptionPlan) {
              // Use first plan as fallback
              const allPlans = await getAllSubscriptionPlans();
              subscriptionPlan = allPlans[0];
            }

            // Update subscription status
            await SubscriptionDB.updateStatus(
              subscription._id.toString(),
              'ACTIVE',
              payload.next_payment_date ? new Date(payload.next_payment_date) : null
            );

            // Update user status to ACTIVE_MEMBER
            await UserDB.updateStatus(subscription.user_id.toString(), 'ACTIVE_MEMBER');

            // Record payment
            await PaymentDB.create({
              user_id: subscription.user_id,
              subscription_id: subscription._id,
              xendit_payment_id: payload.payment_id || payload.id,
              amount: payload.amount || subscription.amount,
              status: 'SUCCEEDED',
              payment_method: payload.payment_method || 'xendit',
              paid_at: new Date()
            });

            // Add monthly points + bonus points
            const totalPoints = subscriptionPlan.pointsPerMonth + subscriptionPlan.bonusPoints;
            await PointsDB.addPoints(
              subscription.user_id.toString(),
              totalPoints,
              subscriptionPlan.bonusPoints > 0 
                ? `Monthly subscription: ${subscriptionPlan.pointsPerMonth.toLocaleString()} points + ${subscriptionPlan.bonusPoints.toLocaleString()} bonus`
                : `Monthly subscription: ${subscriptionPlan.pointsPerMonth.toLocaleString()} points`,
              subscription._id.toString()
            );
          }
          break;
        }

        case 'subscription.cancelled':
        case 'subscription.expired': {
          const xenditSubscriptionId = payload.subscription_id;
          const subscription = await SubscriptionDB.findByXenditId(xenditSubscriptionId);

          if (subscription) {
            await SubscriptionDB.updateStatus(subscription._id.toString(), 'CANCELLED');
            // Update user status back to GUEST
            await UserDB.updateStatus(subscription.user_id.toString(), 'GUEST');
          }
          break;
        }

        case 'subscription.payment_failed': {
          const xenditSubscriptionId = payload.subscription_id;
          const subscription = await SubscriptionDB.findByXenditId(xenditSubscriptionId);

          if (subscription) {
            // Record failed payment
            await PaymentDB.create({
              user_id: subscription.user_id,
              subscription_id: subscription._id,
              xendit_payment_id: payload.payment_id || payload.id,
              amount: payload.amount || subscription.amount,
              status: 'FAILED',
              payment_method: payload.payment_method || 'xendit'
            });
          }
          break;
        }
      }

      // Mark webhook as processed
      await WebhookDB.markProcessed(webhookLog._id.toString());

      return NextResponse.json({ success: true });
    } catch (processingError: unknown) {
      const message = processingError instanceof Error ? processingError.message : 'Unknown processing error';
      console.error('Webhook processing error:', processingError);
      await WebhookDB.markProcessed(webhookLog._id.toString(), message);
      throw processingError;
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
