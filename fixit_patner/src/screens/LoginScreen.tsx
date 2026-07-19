import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Truck } from 'lucide-react-native';
import { colors } from '../theme/colors';

type AuthStackParamList = {
  Login: undefined;
  Otp: { phone: string };
  Aadhaar: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

import { API_URL } from '../context/AuthContext';
import axios from 'axios';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const handleLogin = async () => {
    if (phoneNumber.length >= 10) {
      try {
        setLoading(true);
        const formattedPhone = `+91${phoneNumber}`;
        // Hit our new Node.js backend
        await axios.post(`${API_URL}/auth/login`, { phone: formattedPhone });
        navigation.navigate('Otp', { phone: formattedPhone });
      } catch (e) {
        alert('Failed to send OTP');
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please enter a valid 10-digit phone number');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Truck size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Partner App</Text>
          <Text style={styles.subtitle}>Sign in to start accepting jobs</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your mobile number"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={10}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, (phoneNumber.length < 10 || loading) && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={phoneNumber.length < 10 || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending OTP...' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
