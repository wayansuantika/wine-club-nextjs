import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { SubscriptionDB, UserDB } from '@/lib/db/mongodb';
import { formatIdrCompactMillions, formatPointsForDescription } from '@/lib/subscriptionPlan';
import { getSubscriptionPlanByCode, getAllSubscriptionPlans } from '@/lib/server/subscriptionPlansStore';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    // Check if Xendit key is configured
    if (!XENDIT_SECRET_KEY || XENDIT_SECRET_KEY === '') {
      console.error('❌ XENDIT_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Payment gateway not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Verify authentication
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      console.error('🔴 Auth failed:', authResult.error);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user: authUser } = authResult;
    console.log('✅ User authenticated:', authUser.email);

    // Get request body to get the plan code
    const body = await request.json();
    const planCode = body.plan_code;
    console.log('📋 Subscription request - Plan code:', planCode);

    // Get subscription plan
    let subscriptionPlan = null;
    if (planCode) {
      subscriptionPlan = await getSubscriptionPlanByCode(planCode);
      if (!subscriptionPlan) {
        console.error('❌ Plan not found:', planCode);
        return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
      }
    } else {
      // Use first available plan as default
      const plans = await getAllSubscriptionPlans();
      if (plans.length === 0) {
        console.error('❌ No subscription plans available');
        return NextResponse.json({ error: 'No subscription plans available' }, { status: 404 });
      }
      subscriptionPlan = plans[0];
    }

    // Validate plan has required fields
    if (!subscriptionPlan.pointsPerMonth || subscriptionPlan.pointsPerMonth === 0) {
      console.error('❌ Invalid subscription plan - missing pointsPerMonth:', subscriptionPlan);
      return NextResponse.json({ error: 'Invalid subscription plan configuration' }, { status: 500 });
    }

    console.log('✅ Subscription plan selected:', subscriptionPlan.code, subscriptionPlan.name);
    console.log('📊 Plan details:', {
      pointsPerMonth: subscriptionPlan.pointsPerMonth,
      amount: subscriptionPlan.amount,
      interval: subscriptionPlan.interval,
      intervalCount: subscriptionPlan.intervalCount
    });

    // Check if user already has active subscription
    const existingSubscription = await SubscriptionDB.findByUserId(authUser.id);
    
    // Only block if they have an ACTIVE subscription
    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      console.error('❌ User already has active subscription');
      return NextResponse.json(
        { error: 'You already have an active subscription. Cancel it first to subscribe to a different plan.' },
        { status: 409 }
      );
    }

    // If they have a PENDING subscription
    if (existingSubscription && existingSubscription.status === 'PENDING') {
      // Check if it's for the same plan
      if (existingSubscription.plan_code === subscriptionPlan.code && existingSubscription.payment_url) {
        console.log('♻️ User has pending subscription for same plan, reusing payment URL...');
        return NextResponse.json({
          message: 'Reusing existing payment link for same plan.',
          subscription: {
            id: existingSubscription._id,
            status: existingSubscription.status,
            amount: existingSubscription.amount,
            xendit_plan_id: existingSubscription.xendit_subscription_id
          },
          payment_url: existingSubscription.payment_url
        }, { status: 200 });
      } else {
        // Different plan, delete old subscription to retry
        console.log('🔄 User has pending subscription for different plan, deleting to allow new subscription...');
        try {
          await SubscriptionDB.deleteById(existingSubscription._id.toString());
          console.log('✅ Old pending subscription deleted');
        } catch (deleteError) {
          console.error('⚠️ Could not delete old pending subscription, but continuing:', deleteError);
        }
      }
    }
    
    console.log('✅ Ready to create new subscription');

    // Get user details
    const user = await UserDB.findById(authUser.id);
    if (!user) {
      console.error('❌ User not found in database:', authUser.id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    console.log('✅ User found:', user.email, 'Status:', user.status);

    // Create Xendit customer (if not exists) and recurring plan
    try {
      const referenceId = `wineclub_${authUser.id}_${Date.now()}`;
      
      // Verify API key before proceeding
      if (!XENDIT_SECRET_KEY) {
        console.error('❌ XENDIT_SECRET_KEY not configured');
        throw new Error('Xendit API key not configured');
      }
      console.log('✅ Xendit API key is configured');
      
      // Step 1: Create or get Xendit Customer
      let xenditCustomerId = user.xendit_customer_id;
      
      if (!xenditCustomerId) {
        console.log('🔄 Creating new Xendit customer for:', user.email);
        
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
            reference_id: `customer_${authUser.id}_${Date.now()}`,
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

        console.log(`📡 Customer creation response: ${customerResponse.status} ${customerResponse.statusText}`);

        if (!customerResponse.ok) {
          const customerError = await customerResponse.json();
          console.error('❌ Xendit customer creation error:', customerResponse.status, customerError);
          throw new Error(customerError.message || 'Failed to create Xendit customer');
        }

        const customerData = await customerResponse.json();
        xenditCustomerId = customerData.id;
        console.log('✅ Xendit customer created:', xenditCustomerId);
        
        // Save customer ID to user record
        await UserDB.updateProfile(authUser.id, { xendit_customer_id: xenditCustomerId });
      } else {
        console.log('✅ Reusing existing Xendit customer:', xenditCustomerId);
      }
      
      // Step 2: Create Xendit Recurring Plan
      console.log('🔄 Creating Xendit recurring plan...', {
        planCode: subscriptionPlan.code,
        amount: subscriptionPlan.amount,
        customerId: xenditCustomerId,
        isNewCustomer: !user.xendit_customer_id
      });

      // Build description with explicit format checking
      const formattedPoints = subscriptionPlan.pointsPerMonth ? formatPointsForDescription(subscriptionPlan.pointsPerMonth) : '0 points';
      const planDescription = `${subscriptionPlan.intervalCount} ${subscriptionPlan.interval.toLowerCase()} membership with ${formattedPoints}`;
      const mainDescription = `${subscriptionPlan.description} - ${formatIdrCompactMillions(subscriptionPlan.amount)}/month (${formattedPoints})`;
      
      console.log('📝 Xendit descriptions:', {
        planDescription,
        mainDescription,
        pointsPerMonth: subscriptionPlan.pointsPerMonth,
        formattedPoints
      });

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
          currency: subscriptionPlan.currency,
          amount: subscriptionPlan.amount,
          schedule: {
            reference_id: `schedule_${referenceId}`,
            interval: subscriptionPlan.interval,
            interval_count: subscriptionPlan.intervalCount,
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
            points_per_month: subscriptionPlan.pointsPerMonth.toString(),
            subscription_plan_code: subscriptionPlan.code
          },
          description: mainDescription,
          items: [
            {
              type: 'DIGITAL_PRODUCT',
              name: subscriptionPlan.name,
              net_unit_amount: subscriptionPlan.amount,
              quantity: 1,
              category: 'Subscription',
              description: planDescription
            }
          ],
          success_return_url: `${APP_URL}/profile?payment=success`,
          failure_return_url: `${APP_URL}/profile?payment=failed`
        })
      });

      console.log(`📡 Recurring plan creation response: ${xenditResponse.status} ${xenditResponse.statusText}`);

      if (!xenditResponse.ok) {
        const xenditError = await xenditResponse.json();
        console.error('❌ Xendit API error:', xenditResponse.status, xenditError);
        
        // Log specific error details
        console.error('📋 Xendit error code:', xenditError.error_code);
        console.error('📋 Xendit error message:', xenditError.message);
        console.error('📋 Full error response:', JSON.stringify(xenditError, null, 2));
        
        throw new Error(xenditError.message || 'Failed to create Xendit subscription');
      }

      const xenditData = await xenditResponse.json();
      console.log('✅ Xendit recurring plan created:', xenditData.id);
      console.log('📊 FULL XENDIT RESPONSE:', JSON.stringify(xenditData, null, 2));
      console.log('📋 Xendit actions array:', xenditData.actions);
      console.log('📋 Xendit status:', xenditData.status);
      
      // Extract payment URL from Xendit response before creating subscription
      let paymentUrl = `${APP_URL}/profile`;
      
      if (xenditData.actions && Array.isArray(xenditData.actions)) {
        console.log('🔍 Looking for payment action in actions array...');
        for (const action of xenditData.actions) {
          console.log(`  - Action: ${action.action}, URL: ${action.url}`);
        }
        
        const authAction = xenditData.actions.find((action: { action?: string; url?: string }) => 
          action.action === 'AUTH' || action.action === 'TOKENIZE' || action.action === 'VERIFY'
        );
        
        if (authAction) {
          paymentUrl = authAction.url;
          console.log('✅ Found payment action URL:', paymentUrl);
        } else {
          console.warn('⚠️ No AUTH/TOKENIZE/VERIFY action found');
        }
      } else {
        console.warn('⚠️ No actions array in Xendit response');
      }
      
      // Create subscription record with PENDING status
      const subscription = await SubscriptionDB.create({
        user_id: authUser.id,
        xendit_customer_id: xenditCustomerId,
        xendit_subscription_id: xenditData.id,
        plan_code: subscriptionPlan.code,
        payment_url: paymentUrl,
        status: 'PENDING',
        amount: subscriptionPlan.amount,
        interval: subscriptionPlan.interval,
        interval_count: subscriptionPlan.intervalCount,
        start_date: new Date(),
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      console.log('✅ Subscription created with payment URL, status: PENDING');

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

    } catch (xenditError: unknown) {
      const xenditMessage = xenditError instanceof Error ? xenditError.message : 'Unknown error';
      const xenditName = xenditError instanceof Error ? xenditError.name : 'UnknownError';
      const xenditStack = xenditError instanceof Error ? xenditError.stack : undefined;
      console.error('❌ XENDIT INTEGRATION ERROR');
      console.error('Error message:', xenditMessage);
      console.error('Error type:', xenditName);
      console.error('Stack trace:', xenditStack);
      
      // Log the auth header format (without actual key)
      if (XENDIT_SECRET_KEY) {
        const keyStart = XENDIT_SECRET_KEY.substring(0, 20);
        const keyEnd = XENDIT_SECRET_KEY.substring(XENDIT_SECRET_KEY.length - 10);
        console.error(`📌 API Key found (starts: ${keyStart}..., ends: ...${keyEnd})`);
        console.error(`📌 API Key length: ${XENDIT_SECRET_KEY.length}`);
      } else {
        console.error('❌ NO API KEY CONFIGURED');
      }
      
      // Provide either a real error or fallback
      console.warn('⚠️ Xendit request failed, falling back to simulation mode');
      console.warn(`⚠️ This happens when: Customer reuse fails, network issues, or Xendit rejects duplicate plans`);
      
      const xenditCustomerId = `sim_cust_${Date.now()}_${authUser.id}`;
      const xenditSubscriptionId = `sim_sub_${Date.now()}_${authUser.id}`;

      const subscription = await SubscriptionDB.create({
        user_id: authUser.id,
        xendit_customer_id: xenditCustomerId,
        xendit_subscription_id: xenditSubscriptionId,
        plan_code: subscriptionPlan.code,
        status: 'PENDING',
        amount: subscriptionPlan.amount,
        interval: subscriptionPlan.interval,
        interval_count: subscriptionPlan.intervalCount,
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
    console.error('❌ Subscription creation error:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
