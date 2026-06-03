import { create } from 'zustand';
import { User, AuthTokens } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  isLoading: true,

  login: (user, tokens) => {
    localStorage.setItem('refreshToken', tokens.refreshToken);
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setTokens: (tokens) => {
    localStorage.setItem('refreshToken', tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },

  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ isLoading: loading }),

  initialize: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        localStorage.removeItem('refreshToken');
        set({ isLoading: false });
        return;
      }
      const data = await res.json();
      if (data.success) {
        const newTokens = data.data.tokens;
        localStorage.setItem('refreshToken', newTokens.refreshToken);

        const meRes = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${newTokens.accessToken}` },
        });
        const meData = await meRes.json();
        if (meData.success) {
          set({
            user: meData.data.user,
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
    } catch {
      // Ignore network errors
    }
    set({ isLoading: false });
  },
}));
