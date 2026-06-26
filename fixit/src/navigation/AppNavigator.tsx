import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { CategoryScreen } from '../screens/CategoryScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { AiRepairScreen } from '../screens/AiRepairScreen';
import { LoginModal } from '../components/LoginModal';
import { useAuthStore } from '../store/useAuthStore';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { showLoginModal, hasSeenInitialLogin, markHasSeenInitialLogin, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !hasSeenInitialLogin) {
      showLoginModal();
      markHasSeenInitialLogin();
    }
  }, [isAuthenticated, hasSeenInitialLogin]);

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="AiRepair" component={AiRepairScreen} />
      </Stack.Navigator>
      <LoginModal />
    </>
  );
};
