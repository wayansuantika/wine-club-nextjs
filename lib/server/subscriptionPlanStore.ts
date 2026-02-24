import 'server-only';

import { AppConfigDB } from '@/lib/db/mongodb';
import { getSubscriptionPlan, type SubscriptionPlan } from '@/lib/subscriptionPlan';

const SUBSCRIPTION_PLAN_CONFIG_KEY = 'subscription_plan';

type EditableSubscriptionPlanFields = Pick<
  SubscriptionPlan,
  'name' | 'shortName' | 'amount' | 'pointsPerMonth' | 'benefits' | 'description'
>;

export type SubscriptionPlanUpdateInput = Partial<EditableSubscriptionPlanFields>;

function sanitizeUpdate(input: SubscriptionPlanUpdateInput): SubscriptionPlanUpdateInput {
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

export async function getRuntimeSubscriptionPlan(): Promise<SubscriptionPlan> {
  const basePlan = getSubscriptionPlan();

  try {
    const config = await AppConfigDB.getByKey(SUBSCRIPTION_PLAN_CONFIG_KEY);
    const override = (config?.value || {}) as SubscriptionPlanUpdateInput;

    return {
      ...basePlan,
      ...override,
      benefits: Array.isArray(override.benefits) && override.benefits.length > 0 ? override.benefits : basePlan.benefits
    };
  } catch (error) {
    console.error('Failed to load runtime subscription plan, using defaults:', error);
    return basePlan;
  }
}

export async function updateRuntimeSubscriptionPlan(
  input: SubscriptionPlanUpdateInput,
  updatedBy: string
): Promise<SubscriptionPlan> {
  const sanitizedUpdate = sanitizeUpdate(input);

  if (Object.keys(sanitizedUpdate).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  const currentPlan = await getRuntimeSubscriptionPlan();
  const mergedPlan = {
    ...currentPlan,
    ...sanitizedUpdate,
    benefits: sanitizedUpdate.benefits ?? currentPlan.benefits
  };

  const overrideToStore: EditableSubscriptionPlanFields = {
    name: mergedPlan.name,
    shortName: mergedPlan.shortName,
    amount: mergedPlan.amount,
    pointsPerMonth: mergedPlan.pointsPerMonth,
    benefits: mergedPlan.benefits,
    description: mergedPlan.description
  };

  await AppConfigDB.upsert(SUBSCRIPTION_PLAN_CONFIG_KEY, overrideToStore, updatedBy);

  return mergedPlan;
}
