import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { SubscriptionDB, UserDB } from '@/lib/db/mongodb';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY!;
const SUBSCRIPTION_AMOUNT = 1500000; // IDR 1.5M per month
const MONTHLY_POINTS = 6500000; // 6.5M points per month
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
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

    // Check if user already has active subscription
    const existingSubscription = await SubscriptionDB.findByUserId(authUser.id);
    if (existingSubscription && (existingSubscription.status === 'ACTIVE' || existingSubscription.status === 'PENDING')) {
      return NextResponse.json(
        { error: 'You already have an active or pending subscription' },
        { status: 409 }
      );
    }

    // Get user details
    const user = await UserDB.findById(authUser.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create Xendit customer (if not exists) and recurring plan
    try {
      const referenceId = `wineclub_${authUser.id}_${Date.now()}`;
      
      // Step 1: Create or get Xendit Customer
      let xenditCustomerId = user.xendit_customer_id;
      
      if (!xenditCustomerId) {
        // Create new Xendit customer
        // Parse name for Xendit requirements
        let givenNames = user.email.split('@')[0];
        let surname = 'User';
        
        if (user.full_name) {
          const nameParts = user.full_name.trim().split(' ');
          if (nameParts.length === 1) {
            givenNames = nameParts[0];
            surname = 'Member';
          } else {
            givenNames = nameParts.slice(0, -1).join(' ');
            surname = nameParts[nameParts.length - 1];
          }
        }
        
        const customerResponse = await fetch('https://api.xendit.co/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json',
            'accept': 'application/json'
          },
          body: JSON.stringify({
            reference_id: `customer_${authUser.id}`,
            type: 'INDIVIDUAL',
            individual_detail: {
              given_names: givenNames,
              surname: surname
            },
            email: user.email,
            mobile_number: user.phone || undefined,
            metadata: {
              user_id: authUser.id
            }
          })
        });

        if (!customerResponse.ok) {
          const customerError = await customerResponse.json();
          console.error('Xendit customer creation error:', customerError);
          throw new Error(customerError.message || 'Failed to create Xendit customer');
        }

        const customerData = await customerResponse.json();
        xenditCustomerId = customerData.id;
        
        // Save customer ID to user record
        await UserDB.updateProfile(authUser.id, { xendit_customer_id: xenditCustomerId });
      }
      
      // Step 2: Create Xendit Recurring Plan
      const xenditResponse = await fetch('https://api.xendit.co/recurring/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          reference_id: referenceId,
          customer_id: xenditCustomerId,
          recurring_action: 'PAYMENT',
          currency: 'IDR',
          amount: SUBSCRIPTION_AMOUNT,
          schedule: {
            reference_id: `schedule_${referenceId}`,
            interval: 'MONTH',
            interval_count: 1,
            anchor_date: new Date().toISOString(),
            retry_interval: 'DAY',
            retry_interval_count: 3,
            total_retry: 3
          },
          immediate_action_type: 'FULL_AMOUNT',
          notification_config: {
            recurring_created: ['EMAIL'],
            recurring_succeeded: ['EMAIL'],
            recurring_failed: ['EMAIL'],
            locale: 'en'
          },
          payment_link_for_failed_attempt: true,
          failed_cycle_action: 'RESUME',
          metadata: {
            user_id: authUser.id,
            user_email: user.email,
            points_per_month: MONTHLY_POINTS.toString()
          },
          description: 'Wine Club Monthly Subscription - IDR 1.5M/month (6.5M points)',
          items: [
            {
              type: 'DIGITAL_PRODUCT',
              name: 'Wine Club Premium Membership',
              net_unit_amount: SUBSCRIPTION_AMOUNT,
              quantity: 1,
              category: 'Subscription',
              description: 'Monthly wine club membership with 6.5M points'
            }
          ],
          success_return_url: `${APP_URL}/profile?payment=success`,
          failure_return_url: `${APP_URL}/profile?payment=failed`
        })
      });

      if (!xenditResponse.ok) {
        const xenditError = await xenditResponse.json();
        console.error('Xendit API error:', xenditError);
        throw new Error(xenditError.message || 'Failed to create Xendit subscription');
      }

      const xenditData = await xenditResponse.json();
      
      // Create subscription record with PENDING status
      const subscription = await SubscriptionDB.create({
        user_id: authUser.id,
        xendit_customer_id: xenditCustomerId,
        xendit_subscription_id: xenditData.id,
        status: 'PENDING',
        amount: SUBSCRIPTION_AMOUNT,
        interval: 'MONTH',
        interval_count: 1,
        start_date: new Date(),
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      // Get payment actions from Xendit response
      const paymentUrl = xenditData.actions?.find((action: any) => 
        action.action === 'AUTH' || action.action === 'TOKENIZE'
      )?.url || `${APP_URL}/profile`;

      return NextResponse.json({
        message: 'Subscription created successfully. Please complete payment.',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          amount: subscription.amount,
          xendit_plan_id: xenditData.id
        },
        payment_url: paymentUrl
      }, { status: 201 });

    } catch (xenditError: any) {
      console.error('Xendit integration error:', xenditError);
      
      // Fallback to simulation mode if Xendit fails (for development)
      const xenditCustomerId = `sim_cust_${Date.now()}_${authUser.id}`;
      const xenditSubscriptionId = `sim_sub_${Date.now()}_${authUser.id}`;

      const subscription = await SubscriptionDB.create({
        user_id: authUser.id,
        xendit_customer_id: xenditCustomerId,
        xendit_subscription_id: xenditSubscriptionId,
        status: 'PENDING',
        amount: SUBSCRIPTION_AMOUNT,
        interval: 'MONTH',
        interval_count: 1,
        start_date: new Date(),
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      return NextResponse.json({
        message: 'Subscription created (simulation mode). In production, you would be redirected to Xendit payment page.',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          amount: subscription.amount
        },
        payment_url: `${APP_URL}/profile?payment=demo`,
        simulation: true
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
