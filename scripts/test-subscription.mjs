#!/usr/bin/env node

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const GUEST_EMAIL = 'guest@clubwine.com';
const GUEST_PASSWORD = 'Guest@2026';

console.log('🧪 Testing subscription flow...\n');

async function test() {
  try {
    // Step 1: Login
    console.log('Step 1: Login as guest...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: GUEST_EMAIL,
        password: GUEST_PASSWORD
      })
    });

    const loginData = await loginRes.json();
    console.log(`Response: ${loginRes.status}`, loginData);

    if (!loginData.token) {
      console.error('❌ Login failed - no token received');
      return;
    }

    const token = loginData.token;
    console.log(`✅ Login successful, token: ${token.substring(0, 20)}...`);

    // Step 2: Get subscription plans
    console.log('\nStep 2: Fetching subscription plans...');
    const plansRes = await fetch(`${BASE_URL}/api/subscription/plan`);
    const plansData = await plansRes.json();
    console.log(`Response: ${plansRes.status}`, plansData);

    if (!plansData.plans || plansData.plans.length === 0) {
      console.error('❌ No subscription plans found');
      return;
    }

    const firstPlan = plansData.plans[0];
    console.log(`✅ Found ${plansData.plans.length} plans, using: ${firstPlan.code}`);

    // Step 3: Create subscription
    console.log('\nStep 3: Creating subscription...');
    const subRes = await fetch(`${BASE_URL}/api/subscription/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ plan_code: firstPlan.code })
    });

    const subData = await subRes.json();
    console.log(`Response: ${subRes.status}`, JSON.stringify(subData, null, 2));

    if (!subRes.ok) {
      console.error('❌ Subscription creation failed');
      return;
    }

    console.log('\n✅ Subscription created successfully!');
    console.log(`Payment URL: ${subData.payment_url}`);
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

test();
