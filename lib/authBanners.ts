export interface AuthBannersConfig {
  loginMobile: string;
  loginDesktop: string;
  loginFallback: string;
  registerMobile: string;
  registerDesktop: string;
  registerFallback: string;
}

const DEFAULT_AUTH_BANNERS: AuthBannersConfig = {
  loginMobile: '/images/login-banner-mobile.jpg',
  loginDesktop: '/images/login-banner-desktop.jpg',
  loginFallback: '/images/login-banner.jpg',
  registerMobile: '/images/register-banner-mobile.jpg',
  registerDesktop: '/images/register-banner-desktop.jpg',
  registerFallback: '/images/register-banner.jpg'
};

export function getDefaultAuthBanners(): AuthBannersConfig {
  return DEFAULT_AUTH_BANNERS;
}
