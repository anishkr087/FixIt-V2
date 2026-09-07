import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Star,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  User,
  CreditCard,
  HelpCircle,
  LogOut,
  X,
  PhoneCall,
  MessageCircle,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { partnerInfo, logout } = useAuth();

  const [activeModal, setActiveModal] = useState<'personal' | 'bank' | 'help' | null>(null);

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of your Partner account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const handleAnalyticsPress = (title: string, desc: string) => {
    Alert.alert(title, desc);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.category}>
              {partnerInfo?.serviceCategory || 'Service Pro'} • {partnerInfo?.experience || 0} Yrs Exp
            </Text>
            <View style={styles.ratingBadge}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>{partnerInfo?.rating || '5.0'}</Text>
            </View>
          </View>
        </View>

        {/* Performance Analytics */}
        <Text style={styles.sectionTitle}>Performance Analytics</Text>
        <View style={styles.analyticsGrid}>
          <TouchableOpacity
            style={styles.analyticBox}
            activeOpacity={0.7}
            onPress={() =>
              handleAnalyticsPress(
                'Jobs Done 🛠️',
                `You have successfully completed ${partnerInfo?.jobsCompleted || 0} service jobs with FixIt.`
              )
            }
          >
            <CheckCircle size={24} color={colors.success} style={{ marginBottom: 8 }} />
            <Text style={styles.analyticValue}>{partnerInfo?.jobsCompleted || 0}</Text>
            <Text style={styles.analyticLabel}>Jobs Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.analyticBox}
            activeOpacity={0.7}
            onPress={() =>
              handleAnalyticsPress(
                'Average Rating ⭐',
                `Your average customer rating is ${partnerInfo?.rating || 5.0} stars.`
              )
            }
          >
            <Star size={24} color="#F59E0B" fill="#F59E0B" style={{ marginBottom: 8 }} />
            <Text style={styles.analyticValue}>{partnerInfo?.rating || 5.0}</Text>
            <Text style={styles.analyticLabel}>Average Rating</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.analyticBox}
            activeOpacity={0.7}
            onPress={() =>
              handleAnalyticsPress(
                'Wallet Balance 💳',
                `Your current wallet balance is ₹${partnerInfo?.walletBalance || 0}.`
              )
            }
          >
            <CreditCard size={24} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.analyticValue}>₹{partnerInfo?.walletBalance || 0}</Text>
            <Text style={styles.analyticLabel}>Wallet Balance</Text>
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal('personal')}
          >
            <View style={styles.settingRowLeft}>
              <User size={20} color={colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingText}>Personal Details</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal('bank')}
          >
            <View style={styles.settingRowLeft}>
              <CreditCard size={20} color={colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingText}>Bank & Payouts</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal('help')}
          >
            <View style={styles.settingRowLeft}>
              <HelpCircle size={20} color={colors.primary} style={{ marginRight: 12 }} />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={handleLogoutPress}
          >
            <View style={styles.settingRowLeft}>
              <LogOut size={20} color={colors.error} style={{ marginRight: 12 }} />
              <Text style={[styles.settingText, { color: colors.error }]}>Logout</Text>
            </View>
            <ChevronRight size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Modals */}

        {/* 1. Personal Details Modal */}
        <Modal
          visible={activeModal === 'personal'}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Personal Details 👤</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={{ padding: 4 }}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <DetailRow label="FULL NAME" value={partnerInfo?.name || 'Partner Name'} />
                <DetailRow label="PHONE NUMBER" value={partnerInfo?.phone || 'Not available'} />
                <DetailRow label="SERVICE CATEGORY" value={partnerInfo?.serviceCategory || 'Electrician'} />
                <DetailRow label="EXPERIENCE" value={`${partnerInfo?.experience || 0} Years`} />
                <DetailRow label="SERVICE AREA" value={partnerInfo?.serviceArea || 'Sasaram & Nearby (7 km)'} />
                <DetailRow label="KYC STATUS" value={partnerInfo?.kycVerified ? 'VERIFIED ✅' : 'PENDING ⏳'} />
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 2. Bank & Payouts Modal */}
        <Modal
          visible={activeModal === 'bank'}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bank & Payouts 🏦</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={{ padding: 4 }}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <DetailRow
                  label="BANK ACCOUNT NUMBER"
                  value={partnerInfo?.bankAccountNumber ? `•••• •••• ${partnerInfo.bankAccountNumber.slice(-4)}` : '•••• 6612'}
                />
                <DetailRow label="IFSC CODE" value={partnerInfo?.bankIfsc || 'SBIN0001234'} />
                <DetailRow label="PAYOUT CYCLE" value="Instant / Daily Payout" />
                <DetailRow label="WALLET BALANCE" value={`₹${partnerInfo?.walletBalance ?? 0}`} />
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 3. Help & Support Modal */}
        <Modal
          visible={activeModal === 'help'}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Help & Support 🎧</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={{ padding: 4 }}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12, marginVertical: 16 }}>
                <TouchableOpacity
                  style={styles.supportActionCard}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL('tel:+916206483661')}
                >
                  <PhoneCall size={22} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.supportActionTitle}>Call Partner Helpline</Text>
                    <Text style={styles.supportActionSub}>Toll-free 24/7 support line</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.supportActionCard}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL('https://wa.me/916206483661')}
                >
                  <MessageCircle size={22} color={colors.success} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.supportActionTitle}>WhatsApp Support</Text>
                    <Text style={styles.supportActionSub}>Quick resolution via chat</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRowContainer}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    marginBottom: 30,
    marginTop: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.card },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.success,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  profileInfo: { marginLeft: 20, flex: 1 },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  category: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ratingText: { fontSize: 14, fontWeight: 'bold', color: '#D97706', marginLeft: 6 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  analyticsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  analyticBox: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 1,
  },
  analyticValue: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  analyticLabel: { fontSize: 12, color: colors.textSecondary },
  settingsCard: { backgroundColor: colors.card, borderRadius: 20, padding: 8, elevation: 2 },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: { fontSize: 16, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    marginVertical: 16,
    gap: 12,
  },
  detailRowContainer: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  supportActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supportActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  supportActionSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: {
    color: colors.card,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
