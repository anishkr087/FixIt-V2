import { create } from 'zustand';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.31.254:5000/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoginModalVisible: boolean;
  hasSeenInitialLogin: boolean;
  user: { name?: string; location?: string; phone: string; email?: string } | null;
  token: string | null;
  login: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<boolean>;
  completeLogin: () => void;
  logout: () => void;
  updateProfile: (name: string, location: string, email?: string) => void;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  markHasSeenInitialLogin: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoginModalVisible: false,
  hasSeenInitialLogin: false,
  user: null,
  token: null,
  login: async (phone) => {
    try {
      console.log(`[Auth API] Sending OTP request for phone: ${phone}`);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      set({ user: { phone } });
    } catch (err) {
      console.error('API Login Error:', err);
      throw err;
    }
  },
  verifyOtp: async (phone, code) => {
    try {
      console.log(`[Auth API] Verifying OTP for phone: ${phone}, OTP: ${code}`);
      const response = await fetch(`${API_URL}/auth/verify-otp-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code })
      });
      const data = await response.json();
      if (response.ok && data.success && data.token) {
        set({ token: data.token });
        return true;
      }
      return false;
    } catch (err) {
      console.error('API Verify Error:', err);
      return false;
    }
  },
  completeLogin: () => {
    set({ isAuthenticated: true, isLoginModalVisible: false });
  },
  logout: () => set({ isAuthenticated: false, user: null, token: null }),
  updateProfile: (name, location, email) => set((state) => ({
    user: state.user ? { ...state.user, name, location, email } : null
  })),
  showLoginModal: () => set({ isLoginModalVisible: true }),
  hideLoginModal: () => set({ isLoginModalVisible: false }),
  markHasSeenInitialLogin: () => set({ hasSeenInitialLogin: true }),
}));
