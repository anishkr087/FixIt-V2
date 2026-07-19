import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fixit-v2.onrender.com/api';

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
  updateProfile: (name: string, location: string, email?: string) => Promise<void>;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  markHasSeenInitialLogin: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
            set({ token: data.token, user: data.user });
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
      updateProfile: async (name, location, email) => {
        const user = get().user;
        if (!user || !user.phone) return;

        try {
          console.log(`[Auth API] Saving profile in DB for phone: ${user.phone}`);
          const response = await fetch(`${API_URL}/customer/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: user.phone, name, location, email })
          });
          const data = await response.json();
          if (response.ok && data.success && data.user) {
            set({ user: data.user });
          } else {
            throw new Error(data.error || 'Failed to update profile on server');
          }
        } catch (err) {
          console.error('Error saving profile to database:', err);
          throw err;
        }
      },
      showLoginModal: () => set({ isLoginModalVisible: true }),
      hideLoginModal: () => set({ isLoginModalVisible: false }),
      markHasSeenInitialLogin: () => set({ hasSeenInitialLogin: true }),
    }),
    {
      name: 'fixit-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
