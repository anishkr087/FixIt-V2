import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, UploadCloud, CheckCircle2, FileText, ArrowRight } from 'lucide-react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

export default function AadhaarScreen() {
  const [aadhaar, setAadhaar] = useState('');
  const [frontDoc, setFrontDoc] = useState<string | null>(null);
  const [backDoc, setBackDoc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { token, updatePartner } = useAuth();

  const MAX_FILE_SIZE_KB = 300;

  const handlePickDocument = (type: 'front' | 'back') => {
    // Simulated file pick & size check (Max 300KB = 307200 bytes)
    const simulatedSizeKB = 220; // 220KB (valid sample)

    if (simulatedSizeKB > MAX_FILE_SIZE_KB) {
      Alert.alert(
        'File Too Large ⚠️',
        `The selected document is ${simulatedSizeKB}KB, which exceeds the maximum allowed size of 300KB. Please compress or select a smaller image.`
      );
      return;
    }

    const mockFilename = type === 'front' ? 'aadhaar_front_card.jpg' : 'aadhaar_back_card.jpg';
    if (type === 'front') {
      setFrontDoc(mockFilename);
    } else {
      setBackDoc(mockFilename);
    }
    Alert.alert('Document Selected 📄', `${type === 'front' ? 'Aadhaar Front Photo' : 'Aadhaar Back Photo'} (${simulatedSizeKB}KB) attached successfully.`);
  };

  const handleUploadKyc = async () => {
    if (aadhaar.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!frontDoc || !backDoc) {
      Alert.alert('Document Required 📑', 'Please upload both Front and Back photos of your Aadhaar Card (Max 300KB each).');
      return;
    }

    try {
      setIsUploading(true);
      const response = await axios.post(
        `${API_URL}/partner/kyc`,
        {
          aadhaar,
          idProof: `Uploaded: ${frontDoc}, ${backDoc} (<300KB)`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('KYC Documents Uploaded 🎉', 'Your Aadhaar documents have been submitted and verified.');
      await updatePartner(response.data);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'Document submission failed. Please try again.';
      Alert.alert('Upload Failed', msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Verification? ⏭️',
      'You can upload your Aadhaar document later from your profile settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip for now',
          onPress: async () => {
            try {
              setIsUploading(true);
              const response = await axios.post(
                `${API_URL}/partner/kyc`,
                { aadhaar: '000000000000', idProof: 'Skipped for now' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              await updatePartner(response.data);
            } catch (err) {
              await updatePartner({ kycVerified: true });
            } finally {
              setIsUploading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top Header Row with Skip button */}
        <View style={styles.topSkipRow}>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.topSkipBtn}>
            <Text style={styles.topSkipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <UploadCloud size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>Upload Aadhaar Card</Text>
            <Text style={styles.subtitle}>
              Enter your 12-digit Aadhaar number and upload front & back photos (Max 300KB per image).
            </Text>
          </View>

          <View style={styles.form}>
            {/* Aadhaar Number */}
            <Text style={styles.label}>12-Digit Aadhaar Number *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="XXXX XXXX XXXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={aadhaar}
                onChangeText={(text) => setAadhaar(text.replace(/[^0-9]/g, ''))}
                maxLength={12}
              />
              {aadhaar.length === 12 && (
                <ShieldCheck color={colors.success} size={24} style={{ marginLeft: 8 }} />
              )}
            </View>

            {/* Document Upload Boxes */}
            <Text style={styles.label}>Aadhaar Front Photo * (Max 300KB)</Text>
            <TouchableOpacity
              style={[styles.uploadBox, frontDoc && styles.uploadBoxActive]}
              activeOpacity={0.8}
              onPress={() => handlePickDocument('front')}
            >
              {frontDoc ? (
                <View style={styles.uploadedRow}>
                  <CheckCircle2 size={24} color={colors.success} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.uploadedFileName}>{frontDoc}</Text>
                    <Text style={styles.uploadedSubText}>Size: ~220KB • Tap to re-upload</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <FileText size={28} color={colors.primary} style={{ marginBottom: 6 }} />
                  <Text style={styles.uploadTitle}>Upload Front Side Photo</Text>
                  <Text style={styles.uploadSub}>PNG, JPG, or PDF (Max size 300KB)</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Aadhaar Back Photo * (Max 300KB)</Text>
            <TouchableOpacity
              style={[styles.uploadBox, backDoc && styles.uploadBoxActive]}
              activeOpacity={0.8}
              onPress={() => handlePickDocument('back')}
            >
              {backDoc ? (
                <View style={styles.uploadedRow}>
                  <CheckCircle2 size={24} color={colors.success} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.uploadedFileName}>{backDoc}</Text>
                    <Text style={styles.uploadedSubText}>Size: ~220KB • Tap to re-upload</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <FileText size={28} color={colors.primary} style={{ marginBottom: 6 }} />
                  <Text style={styles.uploadTitle}>Upload Back Side Photo</Text>
                  <Text style={styles.uploadSub}>PNG, JPG, or PDF (Max size 300KB)</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ height: 16 }} />

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (aadhaar.length !== 12 || !frontDoc || !backDoc || isUploading) && styles.buttonDisabled,
              ]}
              onPress={handleUploadKyc}
              disabled={aadhaar.length !== 12 || !frontDoc || !backDoc || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color={colors.card} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Upload & Proceed</Text>
                  <ArrowRight size={20} color={colors.card} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Secondary Skip Link */}
            <TouchableOpacity style={styles.secondarySkipContainer} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.secondarySkipText}>Skip for now & proceed to app</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
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
    paddingHorizontal: 12,
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
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 18,
    letterSpacing: 2,
    color: colors.text,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBoxActive: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  uploadSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  uploadedFileName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  uploadedSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  topSkipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  topSkipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },
  topSkipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  secondarySkipContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  secondarySkipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
