import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { ShieldCheck, ArrowRight } from 'lucide-react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

export default function AadhaarScreen() {
  const [aadhaar, setAadhaar] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { token, updatePartner } = useAuth();

  const handleVerify = async () => {
    if (aadhaar.length !== 12) {
      alert('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    
    try {
      setIsVerifying(true);
      const response = await axios.post(`${API_URL}/partner/kyc`, {
        aadhaar
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Mark Aadhaar as verified in our context to complete onboarding
      await updatePartner(response.data);
    } catch (err) {
      console.error(err);
      alert('KYC Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <ShieldCheck size={40} color={colors.success} />
          </View>
          <Text style={styles.title}>Identity Verification</Text>
          <Text style={styles.subtitle}>Enter your 12-digit Aadhaar number for KYC verification.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Aadhaar Number</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="XXXX XXXX XXXX"
              keyboardType="number-pad"
              value={aadhaar}
              onChangeText={(text) => {
                // Ensure only numbers
                const numericValue = text.replace(/[^0-9]/g, '');
                setAadhaar(numericValue);
              }}
              maxLength={12}
            />
            {aadhaar.length === 12 && (
              <ShieldCheck color={colors.success} size={24} style={{marginLeft: 10}}/>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.button, (aadhaar.length !== 12 || isVerifying) && styles.buttonDisabled]} 
            onPress={handleVerify}
            disabled={aadhaar.length !== 12 || isVerifying}
          >
            {isVerifying ? (
               <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text style={styles.buttonText}>Verify & Proceed</Text>
                <ArrowRight size={20} color={colors.card} style={{marginLeft: 8}} />
              </>
            )}
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
    backgroundColor: '#DCFCE7', // Light green
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
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
  input: {
    flex: 1,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.text,
  },
  button: {
    flexDirection: 'row',
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
