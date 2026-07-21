import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { UserCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

type AuthStackParamList = {
  DocumentUpload: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'DocumentUpload'>;

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };
  
  const navigation = useNavigation<NavigationProp>();
  const { token, updatePartner } = useAuth();

  const handleContinue = async () => {
    if (name && selectedCategories.length > 0 && experience && serviceArea) {
      try {
        setLoading(true);
        const response = await axios.post(`${API_URL}/partner/onboard`, {
          name, 
          serviceCategory: selectedCategories.join(','), 
          experience: Number(experience), 
          serviceArea
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Update local context
        await updatePartner(response.data);
        
        // Move to document upload
        navigation.navigate('DocumentUpload');
      } catch (err: any) {
        console.error('Profile setup error:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to save profile';
        alert(`Failed to save profile: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please fill out all fields');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <UserCheck size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>Basic Details</Text>
            <Text style={styles.subtitle}>Let customers know who you are</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Ramesh Kumar" value={name} onChangeText={setName} />

            <Text style={styles.label}>Service Category (Select one or more)</Text>
            <View style={styles.chipContainer}>
              {['Electrician', 'Plumber', 'Cleaning', 'Pest Control', 'Carpenter', 'Mechanic'].map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Experience (Years)</Text>
            <TextInput style={styles.input} placeholder="e.g. 5" keyboardType="number-pad" value={experience} onChangeText={setExperience} />

            <Text style={styles.label}>Service Area (City)</Text>
            <TextInput style={styles.input} placeholder="e.g. Bangalore" value={serviceArea} onChangeText={setServiceArea} />

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 24 },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card,
    height: 56, fontSize: 16, paddingHorizontal: 16, marginBottom: 20, color: colors.text,
  },
  button: {
    backgroundColor: colors.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.card, fontSize: 16, fontWeight: 'bold' },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.card,
    fontWeight: 'bold',
  },
});
