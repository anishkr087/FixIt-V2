import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

type AuthStackParamList = {
  Otp: { phone: string };
  ProfileSetup: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Otp'>;

export default function OtpScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuth();

  const phone = route.params?.phone;

  const handleVerify = async () => {
    if (otp.length === 6) {
      try {
        setLoading(true);
        const response = await axios.post(`${API_URL}/auth/verify-otp`, { phone, otp });
        
        await login(response.data.token, response.data.partner);

        // If new user or profile incomplete, send to Profile Setup
        if (response.data.isNewUser || !response.data.partner.name) {
          navigation.navigate('ProfileSetup');
        } else {
          // If existing user with profile, AppNavigator will automatically 
          // switch to MainStack because AuthContext 'isAuthenticated' becomes true.
        }
      } catch (e: any) {
        if (e.response && e.response.status === 401) {
          alert('Invalid OTP. Please try again.');
        } else {
          const errMsg = e.response?.data?.error || 'Server connection error. Please try again later.';
          alert(errMsg);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <ShieldCheck size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify Phone</Text>
          <Text style={styles.subtitle}>Enter the 6-digit OTP sent to {phone}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="000 000"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity 
            style={[styles.button, (otp.length < 6 || loading) && styles.buttonDisabled]} 
            onPress={handleVerify}
            disabled={otp.length < 6 || loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  hint: { fontSize: 14, color: colors.primary, marginTop: 4 },
  form: { width: '100%' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card,
    height: 56, fontSize: 24, letterSpacing: 8, marginBottom: 24, color: colors.text,
  },
  button: {
    backgroundColor: colors.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.card, fontSize: 16, fontWeight: 'bold' }
});
