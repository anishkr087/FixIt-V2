import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Star, CheckCircle, XCircle, Clock, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { partnerInfo } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{partnerInfo?.name?.charAt(0) || 'P'}</Text>
            {partnerInfo?.kycVerified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={16} color={colors.card} />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{partnerInfo?.name || 'Partner Name'}</Text>
            <Text style={styles.category}>{partnerInfo?.serviceCategory || 'Service Pro'} • {partnerInfo?.experience || 0} Yrs Exp</Text>
            <View style={styles.ratingBadge}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>{partnerInfo?.rating || '4.9'}</Text>
            </View>
          </View>
        </View>

        {/* Performance Analytics */}
        <Text style={styles.sectionTitle}>Performance Analytics</Text>
        <View style={styles.analyticsGrid}>
          
          <View style={styles.analyticBox}>
            <CheckCircle size={24} color={colors.success} style={{marginBottom: 8}} />
            <Text style={styles.analyticValue}>{partnerInfo?.jobsCompleted || 42}</Text>
            <Text style={styles.analyticLabel}>Jobs Done</Text>
          </View>

          <View style={styles.analyticBox}>
            <Clock size={24} color={colors.primary} style={{marginBottom: 8}} />
            <Text style={styles.analyticValue}>95%</Text>
            <Text style={styles.analyticLabel}>Acceptance</Text>
          </View>

          <View style={styles.analyticBox}>
            <XCircle size={24} color={colors.error} style={{marginBottom: 8}} />
            <Text style={styles.analyticValue}>2%</Text>
            <Text style={styles.analyticLabel}>Cancellations</Text>
          </View>

        </View>

        {/* Options */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Personal Details</Text>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Bank & Payouts</Text>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Help & Support</Text>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 20, borderRadius: 20, elevation: 4, marginBottom: 30, marginTop: 10 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.card },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.success, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  profileInfo: { marginLeft: 20, flex: 1 },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  category: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  ratingText: { fontSize: 14, fontWeight: 'bold', color: '#D97706', marginLeft: 6 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  analyticsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  analyticBox: { flex: 1, backgroundColor: colors.card, padding: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
  analyticValue: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  analyticLabel: { fontSize: 12, color: colors.textSecondary },
  settingsCard: { backgroundColor: colors.card, borderRadius: 20, padding: 8, elevation: 2 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingText: { fontSize: 16, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 }
});
