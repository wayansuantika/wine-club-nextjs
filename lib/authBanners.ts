export interface AuthBannersConfig {
  loginMobile: string;
  loginDesktop: string;
  loginFallback: string;
  registerMobile: string;
  registerDesktop: string;
  registerFallback: string;
}

const DEFAULT_AUTH_BANNERS: AuthBannersConfig = {
  loginMobile: '/images/auth-banners/loginMobile-1771574449506.jpeg',
  loginDesktop: '/images/auth-banners/loginDesktop-1771574458958.jpeg',
  loginFallback: '/images/auth-banners/loginDesktop-1771574458958.jpeg', // Use desktop as fallback
  registerMobile: '/images/auth-banners/registerMobile-1771574468483.jpeg',
  registerDesktop: '/images/auth-banners/registerDesktop-1771574478983.jpeg',
  registerFallback: '/images/auth-banners/registerDesktop-1771574478983.jpeg' // Use desktop as fallback
};

export function getDefaultAuthBanners(): AuthBannersConfig {
  return DEFAULT_AUTH_BANNERS;
}
