import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';

export const AiRepairScreen = ({ navigation }: any) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || ''; // Passed at build time

  const handleAskAI = async () => {
    if (!query.trim()) return;
    if (!apiKey) {
      setResponse("AI is currently unavailable. Developer: Please set the EXPO_PUBLIC_GEMINI_API_KEY in your environment.");
      return;
    }

    setLoading(true);
    setResponse('');
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `You are an expert home repair assistant named Fixit AI. A user is asking for help with a home repair issue. 
      Please provide a step-by-step, safe, and easy-to-understand guide to diagnosing and fixing the issue. If it sounds dangerous (like major electrical or plumbing), strongly advise them to book a professional through the app.
      
      User Issue: ${query}`;
      
      const result = await model.generateContent(prompt);
      setResponse(result.response.text());
    } catch (error: any) {
      setResponse("Sorry, I encountered an error. Please check your API key or try again.\n" + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1a1025', '#382250', '#1a1025']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>AI Repair Assistant</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content}>
            
            <View style={styles.heroSection}>
              <View style={styles.glowingOrb}>
                <Ionicons name="hardware-chip-outline" size={60} color="#E0C3FC" />
              </View>
              <Text style={styles.heroText}>Describe your problem</Text>
              <Text style={styles.heroSubText}>I will guide you step-by-step on how to fix it yourself.</Text>
            </View>

            {response ? (
              <View style={styles.responseContainer}>
                <Text style={styles.responseText}>{response}</Text>
              </View>
            ) : null}

          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. My AC is blowing warm air..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={query}
              onChangeText={setQuery}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !query.trim() && { opacity: 0.5 }]} 
              onPress={handleAskAI}
              disabled={loading || !query.trim()}
            >
              <LinearGradient colors={['#FF9A9E', '#FECFEF']} style={styles.sendBtnGradient}>
                {loading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Ionicons name="sparkles" size={24} color={colors.primary} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 40,
  },
  glowingOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(224, 195, 252, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(224, 195, 252, 0.4)',
    shadowColor: '#E0C3FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  heroText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  responseContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  responseText: {
    color: '#E0C3FC',
    fontSize: 16,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#FFF',
    padding: 16,
    paddingTop: 16,
    borderRadius: 24,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 56,
  },
  sendBtn: {
    marginLeft: 12,
    marginBottom: 4,
  },
  sendBtnGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
