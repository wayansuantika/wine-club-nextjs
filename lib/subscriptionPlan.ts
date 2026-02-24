export interface SubscriptionPlan {
  code: string;
  name: string;
  shortName: string;
  currency: 'IDR';
  amount: number;
  interval: 'MONTH';
  intervalCount: number;
  pointsPerMonth: number;
  bonusPoints: number; // Additional points on top of pointsPerMonth
  benefits: string[];
  description: string;
}

const SUBSCRIPTION_PLAN: SubscriptionPlan = {
  code: 'WINE_CLUB_MONTHLY',
  name: 'Wine Club Premium Membership',
  shortName: 'Monthly Membership',
  currency: 'IDR',
  amount: 1500000,
  interval: 'MONTH',
  intervalCount: 1,
  pointsPerMonth: 6500000,
  bonusPoints: 0,
  benefits: [
    '6.5M points every month',
    'Access to exclusive wine events',
    'Priority event registration',
    'Member-only wine tastings'
  ],
  description: 'Wine Club monthly subscription'
};

export function getSubscriptionPlan(): SubscriptionPlan {
  return SUBSCRIPTION_PLAN;
}

export function formatIdr(amount: number): string {
  return `IDR ${amount.toLocaleString('en-US')}`;
}

export function formatIdrCompactMillions(amount: number): string {
  if (amount >= 1000000) {
    return `IDR ${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (amount >= 1000) {
    return `IDR ${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return `IDR ${amount}`;
}

export function formatPointsMillions(points: number): string {
  return `${(points / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function formatPointsCompact(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (points >= 1000) {
    return `${(points / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return `${points}`;
}

export function formatPointsForDescription(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1).replace(/\.0$/, '')}M points`;
  }

  if (points >= 1000) {
    return `${(points / 1000).toFixed(1).replace(/\.0$/, '')}K points`;
  }

  return `${points} points`;
}
