import 'server-only';

import { AppConfigDB } from '@/lib/db/mongodb';
import { type SubscriptionPlan } from '@/lib/subscriptionPlan';

const SUBSCRIPTION_PLANS_CONFIG_KEY = 'subscription_plans';

// Default plans
export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    code: 'PLAN_500K',
    name: 'Starter Plan',
    shortName: 'Starter',
    currency: 'IDR',
    amount: 500000,
    interval: 'MONTH',
    intervalCount: 1,
    pointsPerMonth: 500000,
    bonusPoints: 0,
    benefits: [
      '500K points every month',
      'Access to wine events',
      'Member discounts up to 10%',
      'Monthly wine recommendations'
    ],
    description: 'Perfect for wine enthusiasts starting their journey'
  },
  {
    code: 'PLAN_1M',
    name: 'Premium Plan',
    shortName: 'Premium',
    currency: 'IDR',
    amount: 1000000,
    interval: 'MONTH',
    intervalCount: 1,
    pointsPerMonth: 1000000,
    bonusPoints: 250000,
    benefits: [
      '1M points + 250K bonus points every month',
      'Priority event access',
      'Member discounts up to 15%',
      'Exclusive wine selection',
      'Quarterly premium tastings'
    ],
    description: 'For serious wine collectors'
  },
  {
    code: 'PLAN_1_5M',
    name: 'Exclusive Plan',
    shortName: 'Exclusive',
    currency: 'IDR',
    amount: 1500000,
    interval: 'MONTH',
    intervalCount: 1,
    pointsPerMonth: 1500000,
    bonusPoints: 350000,
    benefits: [
      '1.5M points + 350K bonus points every month',
      'VIP event access & priority seating',
      'Member discounts up to 20%',
      'Premium wine allocation',
      'Personal wine consultant',
      'Exclusive member lounge access'
    ],
    description: 'Ultimate wine club experience'
  }
];

type EditableSubscriptionPlanFields = Pick<
  SubscriptionPlan,
  'name' | 'shortName' | 'amount' | 'pointsPerMonth' | 'bonusPoints' | 'benefits' | 'description'
>;

export type SubscriptionPlanCreateInput = EditableSubscriptionPlanFields & {
  code: string;
};

export type SubscriptionPlanUpdateInput = Partial<EditableSubscriptionPlanFields>;

function sanitizeCreateInput(input: SubscriptionPlanCreateInput): SubscriptionPlanCreateInput {
  if (!input.code?.trim()) {
    throw new Error('code must not be empty');
  }

  const update: SubscriptionPlanCreateInput = {
    code: input.code.trim().toUpperCase()
  } as SubscriptionPlanCreateInput;

  if (input.name !== undefined) {
    const value = input.name.trim();
    if (!value) throw new Error('name must not be empty');
    update.name = value;
  }

  if (input.shortName !== undefined) {
    const value = input.shortName.trim();
    if (!value) throw new Error('shortName must not be empty');
    update.shortName = value;
  }

  if (input.description !== undefined) {
    const value = input.description.trim();
    if (!value) throw new Error('description must not be empty');
    update.description = value;
  }

  if (input.amount !== undefined) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('amount must be a positive number');
    }
    update.amount = Math.round(input.amount);
  }

  if (input.pointsPerMonth !== undefined) {
    if (!Number.isFinite(input.pointsPerMonth) || input.pointsPerMonth <= 0) {
      throw new Error('pointsPerMonth must be a positive number');
    }
    update.pointsPerMonth = Math.round(input.pointsPerMonth);
  }

  if (input.bonusPoints !== undefined) {
    if (!Number.isFinite(input.bonusPoints) || input.bonusPoints < 0) {
      throw new Error('bonusPoints must be a non-negative number');
    }
    update.bonusPoints = Math.round(input.bonusPoints);
  }

  if (input.benefits !== undefined) {
    if (!Array.isArray(input.benefits) || input.benefits.length === 0) {
      throw new Error('benefits must be a non-empty array');
    }

    const benefits = input.benefits
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (benefits.length === 0) {
      throw new Error('benefits must include at least one non-empty item');
    }

    update.benefits = benefits;
  }

  return update;
}

function sanitizeUpdateInput(input: SubscriptionPlanUpdateInput): SubscriptionPlanUpdateInput {
  const update: SubscriptionPlanUpdateInput = {};

  if (input.name !== undefined) {
    const value = input.name.trim();
    if (!value) throw new Error('name must not be empty');
    update.name = value;
  }

  if (input.shortName !== undefined) {
    const value = input.shortName.trim();
    if (!value) throw new Error('shortName must not be empty');
    update.shortName = value;
  }

  if (input.description !== undefined) {
    const value = input.description.trim();
    if (!value) throw new Error('description must not be empty');
    update.description = value;
  }

  if (input.amount !== undefined) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('amount must be a positive number');
    }
    update.amount = Math.round(input.amount);
  }

  if (input.pointsPerMonth !== undefined) {
    if (!Number.isFinite(input.pointsPerMonth) || input.pointsPerMonth <= 0) {
      throw new Error('pointsPerMonth must be a positive number');
    }
    update.pointsPerMonth = Math.round(input.pointsPerMonth);
  }

  if (input.bonusPoints !== undefined) {
    if (!Number.isFinite(input.bonusPoints) || input.bonusPoints < 0) {
      throw new Error('bonusPoints must be a non-negative number');
    }
    update.bonusPoints = Math.round(input.bonusPoints);
  }

  if (input.benefits !== undefined) {
    if (!Array.isArray(input.benefits) || input.benefits.length === 0) {
      throw new Error('benefits must be a non-empty array');
    }

    const benefits = input.benefits
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (benefits.length === 0) {
      throw new Error('benefits must include at least one non-empty item');
    }

    update.benefits = benefits;
  }

  return update;
}

export async function getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const config = await AppConfigDB.getByKey(SUBSCRIPTION_PLANS_CONFIG_KEY);
    const plans = (config?.value || []) as SubscriptionPlan[];
    
    if (Array.isArray(plans) && plans.length > 0) {
      // Log first plan details for debugging
      console.log('📋 First loaded plan:', {
        code: plans[0].code,
        pointsPerMonth: plans[0].pointsPerMonth,
        amount: plans[0].amount,
        hasPointsPerMonth: 'pointsPerMonth' in plans[0]
      });
      return plans;
    }
    
    console.log('📋 No custom plans in DB, using defaults');
    return DEFAULT_SUBSCRIPTION_PLANS;
  } catch (error) {
    console.error('Failed to load subscription plans, using defaults:', error);
    return DEFAULT_SUBSCRIPTION_PLANS;
  }
}

export async function getSubscriptionPlanByCode(code: string): Promise<SubscriptionPlan | null> {
  const plans = await getAllSubscriptionPlans();
  return plans.find((p) => p.code === code) || null;
}

export async function createSubscriptionPlan(
  input: SubscriptionPlanCreateInput,
  createdBy: string
): Promise<SubscriptionPlan> {
  const sanitized = sanitizeCreateInput(input);

  const plans = await getAllSubscriptionPlans();

  // Check if code already exists
  if (plans.some((p) => p.code === sanitized.code)) {
    throw new Error(`Plan with code "${sanitized.code}" already exists`);
  }

  const newPlan: SubscriptionPlan = {
    code: sanitized.code,
    name: sanitized.name,
    shortName: sanitized.shortName,
    currency: 'IDR',
    amount: sanitized.amount,
    interval: 'MONTH',
    intervalCount: 1,
    pointsPerMonth: sanitized.pointsPerMonth,
    bonusPoints: sanitized.bonusPoints ?? 0,
    benefits: sanitized.benefits,
    description: sanitized.description
  };

  const updatedPlans = [...plans, newPlan];
  await AppConfigDB.upsert(SUBSCRIPTION_PLANS_CONFIG_KEY, updatedPlans, createdBy);

  return newPlan;
}

export async function updateSubscriptionPlan(
  code: string,
  input: SubscriptionPlanUpdateInput,
  updatedBy: string
): Promise<SubscriptionPlan> {
  const sanitized = sanitizeUpdateInput(input);

  if (Object.keys(sanitized).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  const plans = await getAllSubscriptionPlans();
  const planIndex = plans.findIndex((p) => p.code === code);

  if (planIndex === -1) {
    throw new Error(`Plan with code "${code}" not found`);
  }

  const currentPlan = plans[planIndex];
  const updatedPlan: SubscriptionPlan = {
    ...currentPlan,
    ...sanitized,
    code: currentPlan.code, // code is immutable
    currency: 'IDR',
    interval: 'MONTH',
    intervalCount: 1
  };

  plans[planIndex] = updatedPlan;
  await AppConfigDB.upsert(SUBSCRIPTION_PLANS_CONFIG_KEY, plans, updatedBy);

  return updatedPlan;
}

export async function deleteSubscriptionPlan(code: string, deletedBy: string): Promise<void> {
  const plans = await getAllSubscriptionPlans();

  if (plans.length <= 1) {
    throw new Error('Cannot delete the last subscription plan');
  }

  const filteredPlans = plans.filter((p) => p.code !== code);

  if (filteredPlans.length === plans.length) {
    throw new Error(`Plan with code "${code}" not found`);
  }

  await AppConfigDB.upsert(SUBSCRIPTION_PLANS_CONFIG_KEY, filteredPlans, deletedBy);
}
