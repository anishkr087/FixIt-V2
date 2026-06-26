import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Change to your actual local IP (e.g. 192.168.1.5) or 10.0.2.2 for Android Emulator
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.31.254:5000/api';

interface AuthContextType {
  token: string | null;
  partnerInfo: any;
  isAuthenticated: boolean;
  login: (token: string, partner: any) => Promise<void>;
  logout: () => Promise<void>;
  updatePartner: (partner: any) => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@partner_token');
      const storedPartner = await AsyncStorage.getItem('@partner_info');
      
      if (storedToken && storedPartner) {
        setToken(storedToken);
        setPartnerInfo(JSON.parse(storedPartner));
      }
    } catch (e) {
      console.log('Failed to load token:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newPartner: any) => {
    setToken(newToken);
    setPartnerInfo(newPartner);
    await AsyncStorage.setItem('@partner_token', newToken);
    await AsyncStorage.setItem('@partner_info', JSON.stringify(newPartner));
  };

  const logout = async () => {
    setToken(null);
    setPartnerInfo(null);
    await AsyncStorage.removeItem('@partner_token');
    await AsyncStorage.removeItem('@partner_info');
  };

  const updatePartner = async (partner: any) => {
    setPartnerInfo(partner);
    await AsyncStorage.setItem('@partner_info', JSON.stringify(partner));
  };

  return (
    <AuthContext.Provider value={{
      token,
      partnerInfo,
      isAuthenticated: !!token,
      login,
      logout,
      updatePartner,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
