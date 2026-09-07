import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { login, verifyOtp, user, updateProfile, completeLogin } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length === 10) {
      try {
        setLoading(true);
        // Prepend +91 here to match live API requirements
        await login(`+91${phone}`);
        setStep('otp');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length === 6) {
      try {
        setLoading(true);
        // Prepend +91 here too
        const success = await verifyOtp(`+91${phone}`, otp);
        if (success) {
          const currentUser = useAuthStore.getState().user;
          if (currentUser && currentUser.name && currentUser.location) {
            completeLogin();
          } else {
            setStep('profile');
          }
        } else {
          Alert.alert('Invalid OTP', 'Invalid or expired OTP code. Please try again.');
        }
      } catch (err) {
        Alert.alert('Error', 'OTP verification failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP code.');
    }
  };

  const handleCompleteProfile = async () => {
    if (name.trim() && location.trim()) {
      try {
        setLoading(true);
        await updateProfile(name, location);
        completeLogin();
      } catch (err) {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Profile Incomplete', 'Please fill in both your name and location.');
    }
  };

  return (
    <LinearGradient colors={[colors.primary, '#9B72CB', colors.background]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.inner, { paddingTop: Math.max(insets.top, 24) }]}>

        <View style={styles.header}>
          <Text style={styles.title}>Fixit</Text>
          <Text style={styles.subtitle}>Your Home Services, Sorted.</Text>
        </View>

        <GlassCard style={styles.card}>
          {step === 'phone' && (
            <View>
              <Text style={styles.label}>Enter Mobile Number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.phonePrefix}>+91</Text>
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="9999999999"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                  maxLength={10}
                />
              </View>
              <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'otp' && (
            <View>
              <Text style={styles.label}>Enter OTP sent to +91 {phone}</Text>
              <TextInput
                style={styles.input}
                placeholder="000 000"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                placeholderTextColor={colors.textSecondary}
                editable={!loading}
              />
              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'profile' && (
            <View>
              <Text style={styles.label}>Complete Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="City / Location"
                value={location}
                onChangeText={setLocation}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity style={styles.button} onPress={handleCompleteProfile}>
                <Text style={styles.buttonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
  },
  card: {
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: '#333',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
    padding: 0,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
