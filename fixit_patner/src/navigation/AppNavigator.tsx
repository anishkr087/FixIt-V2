import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import AadhaarScreen from '../screens/AadhaarScreen';
import PartnerHomeScreen from '../screens/PartnerHomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Home, Briefcase, Wallet, User } from 'lucide-react-native';
import { colors } from '../theme/colors';

const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { isAuthenticated, partnerInfo, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Otp" component={OtpScreen} />
        </AuthStack.Navigator>
      ) : (!partnerInfo?.name || !partnerInfo?.serviceCategory || !partnerInfo?.kycVerified) ? (
        <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
          <OnboardingStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <OnboardingStack.Screen name="DocumentUpload" component={AadhaarScreen} />
        </OnboardingStack.Navigator>
      ) : (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: {
              backgroundColor: colors.card,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Home') return <Home size={size} color={color} />;
              if (route.name === 'History') return <Briefcase size={size} color={color} />;
              if (route.name === 'Earnings') return <Wallet size={size} color={color} />;
              if (route.name === 'Profile') return <User size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home" component={PartnerHomeScreen} initialParams={{ onLogout: logout }} />
          <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'Jobs' }} />
          <Tab.Screen name="Earnings" component={EarningsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}
