import 'server-only';

import { AppConfigDB } from '@/lib/db/mongodb';
import { getDefaultAuthBanners, type AuthBannersConfig } from '@/lib/authBanners';

const AUTH_BANNERS_CONFIG_KEY = 'auth_banners';

export type AuthBannersUpdateInput = Partial<AuthBannersConfig>;

function isValidBannerUrl(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('/')) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeUpdate(input: AuthBannersUpdateInput): AuthBannersUpdateInput {
  const update: AuthBannersUpdateInput = {};

  const keys: (keyof AuthBannersConfig)[] = [
    'loginMobile',
    'loginDesktop',
    'loginFallback',
    'registerMobile',
    'registerDesktop',
    'registerFallback'
  ];

  for (const key of keys) {
    if (input[key] === undefined) continue;

    const value = String(input[key]).trim();
    if (!isValidBannerUrl(value)) {
      throw new Error(`${key} must be a valid absolute URL (http/https) or local path (/...)`);
    }

    update[key] = value;
  }

  return update;
}

export async function getRuntimeAuthBanners(): Promise<AuthBannersConfig> {
  const defaults = getDefaultAuthBanners();

  try {
    const config = await AppConfigDB.getByKey(AUTH_BANNERS_CONFIG_KEY);
    const override = (config?.value || {}) as AuthBannersUpdateInput;

    return {
      ...defaults,
      ...override
    };
  } catch (error) {
    console.error('Failed to load auth banners config, using defaults:', error);
    return defaults;
  }
}

export async function updateRuntimeAuthBanners(
  input: AuthBannersUpdateInput,
  updatedBy: string
): Promise<AuthBannersConfig> {
  const sanitizedUpdate = sanitizeUpdate(input);

  if (Object.keys(sanitizedUpdate).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  const current = await getRuntimeAuthBanners();
  const merged = {
    ...current,
    ...sanitizedUpdate
  };

  await AppConfigDB.upsert(AUTH_BANNERS_CONFIG_KEY, merged, updatedBy);

  return merged;
}
