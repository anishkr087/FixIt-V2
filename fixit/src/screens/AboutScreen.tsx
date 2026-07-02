import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const AboutScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>About FixIt</Text>
          <Text style={styles.headerSubtitle}>Version 2.0.1</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Ionicons name="construct" size={48} color="#FFF" />
          <Text style={styles.heroTitle}>FixIt</Text>
          <Text style={styles.heroDescription}>
            Your all-in-one platform for reliable, on-demand home services. We connect you with certified local professionals for plumbing, electrical, cleaning, carpentry, and mechanics.
          </Text>
        </View>

        {/* Features */}
        <Text style={styles.sectionTitle}>Why Choose Us?</Text>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={[styles.iconBg, { backgroundColor: '#FFECE2' }]}>
              <Ionicons name="flash" size={24} color={colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>On-Demand Booking</Text>
              <Text style={styles.featureDesc}>Get instant bookings and track your service provider in real-time.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.iconBg, { backgroundColor: '#E2F7ED' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.success} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Verified Experts</Text>
              <Text style={styles.featureDesc}>Every service partner is strictly background-checked and certified.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.iconBg, { backgroundColor: '#E8F1FF' }]}>
              <Ionicons name="cash" size={24} color="#3B82F6" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Transparent Pricing</Text>
              <Text style={styles.featureDesc}>Upfront pricing with no hidden charges. Pay safely through digital methods.</Text>
            </View>
          </View>
        </View>

        {/* Contact/Support */}
        <Text style={styles.sectionTitle}>Get in Touch</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('mailto:support@fixit.com')}>
            <Ionicons name="mail" size={20} color={colors.textSecondary} style={{ width: 24 }} />
            <Text style={styles.contactText}>support@fixit.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('tel:+1800123456')}>
            <Ionicons name="call" size={20} color={colors.textSecondary} style={{ width: 24 }} />
            <Text style={styles.contactText}>1800-123-456 (Toll-Free)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>© 2026 FixIt Technologies Inc.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100, // Safe space for custom bottom tab bar
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  featuresList: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  footerText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
});
