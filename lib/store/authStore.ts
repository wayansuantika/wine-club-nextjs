import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  full_name?: string;
  profile_photo?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  loadAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  loadAuth: () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (userStr && token) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token });
        } catch (error) {
          console.error('Failed to parse user from localStorage:', error);
        }
      }
    }
  },
}));
