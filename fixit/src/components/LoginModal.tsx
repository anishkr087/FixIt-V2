import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { GlassCard } from './GlassCard';

export const LoginModal = () => {
  const { login, verifyOtp, updateProfile, isLoginModalVisible, hideLoginModal, completeLogin } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length === 10) {
      try {
        setLoading(true);
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

  const handleAutoLocate = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }
      setLocation('Locating...');
      let locationData = await Location.getCurrentPositionAsync({});
      let address = await Location.reverseGeocodeAsync(locationData.coords);
      if (address && address.length > 0) {
        const place = address[0].city || address[0].subregion || address[0].region || 'Unknown Location';
        setLocation(place);
      } else {
        setLocation('Location found');
      }
    } catch (e) {
      setLocation('');
      Alert.alert('Error', 'Failed to get location. Please enter manually.');
    }
  };

  const handleCompleteProfile = async () => {
    if (name.trim() && location.trim()) {
      try {
        setLoading(true);
        await updateProfile(name, location, email);
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

  const handleClose = () => {
    hideLoginModal();
    setTimeout(() => {
      setStep('phone');
      setPhone('');
      setOtp('');
      setEmail('');
    }, 500);
  };

  return (
    <Modal visible={isLoginModalVisible} transparent animationType="slide">
      <View style={[styles.modalOverlay, step === 'profile' && { justifyContent: 'flex-start' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.keyboardView, step === 'profile' && { flex: 1 }]}>
          <LinearGradient colors={[colors.primary, '#9B72CB']} style={[styles.modalContent, step === 'profile' && styles.modalContentFull]}>

            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Welcome to Fixit</Text>
              <Text style={styles.subtitle}>Login to book reliable services.</Text>
            </View>

            <GlassCard style={styles.card}>
              {(step === 'phone' || step === 'otp') && (
                <View>
                  <Text style={styles.label}>Enter Mobile Number</Text>
                  {step === 'phone' ? (
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
                  ) : (
                    <TextInput
                      style={styles.input}
                      value={`+91 ${phone}`}
                      editable={false}
                    />
                  )}

                  {step === 'otp' && (
                    <View>
                      <Text style={[styles.label, { marginTop: 4 }]}>Enter OTP sent to +91 {phone}</Text>
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
                    </View>
                  )}

                  {step === 'phone' ? (
                    <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
                      {loading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                      {loading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.buttonText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>
                  )}
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
                  <View style={styles.locationInputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="City / Location"
                      value={location}
                      onChangeText={setLocation}
                      placeholderTextColor={colors.textSecondary}
                    />
                    <TouchableOpacity style={styles.autoLocateBtn} onPress={handleAutoLocate}>
                      <Ionicons name="locate" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address (Optional)"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity style={styles.button} onPress={handleCompleteProfile}>
                    <Text style={styles.buttonText}>Get Started</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>

          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  modalContentFull: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 8,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  card: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: colors.textPrimary,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  autoLocateBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#1E1E24',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    height: 56,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginRight: 6,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    height: '100%',
    padding: 0,
  },
});
