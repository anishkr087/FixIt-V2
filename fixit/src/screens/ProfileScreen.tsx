import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';

export const ProfileScreen = () => {
  const { user, logout, isAuthenticated, showLoginModal, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Sync state if user loads later
  useEffect(() => {
    if (user && !isEditing) {
      setEditName(user.name || 'Priya Mehta');
      setEditEmail(user.email || 'priya.mehta@gmail.com');
      setEditPhone(user.phone || '+91 98765 43210');
    }
  }, [user, isEditing]);

  const handleSave = () => {
    updateProfile(editName, user?.location || '', editEmail);
    setIsEditing(false);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="person-circle-outline" size={90} color={colors.textSecondary} />
        <Text style={{ fontSize: 20, color: colors.textPrimary, marginVertical: 16, fontWeight: '700' }}>You are not logged in</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={showLoginModal} activeOpacity={0.8}>
          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>Login / Register</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'PM';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Gradient */}
        <LinearGradient
          colors={['#FF8A00', '#FF5E14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.profileHeaderRow}>
              {/* Initials Avatar Box */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{getInitials(user?.name || 'Priya Mehta')}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editAvatarBtn} 
                  activeOpacity={0.8}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="pencil" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* User Metadata */}
              <View style={styles.userMetaContainer}>
                <Text style={styles.userName}>{user?.name || 'Priya Mehta'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'priya.mehta@gmail.com'}</Text>
                <View style={styles.verifiedRow}>
                  <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                  <Text style={styles.verifiedText}>Verified Account</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.bodyContent}>
          {/* Stats Row Card */}
          <View style={styles.statsCardContainer}>
            <View style={styles.statsCard}>
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>14</Text>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>9</Text>
                <Text style={styles.statLabel}>Reviews Given</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>₹250</Text>
                <Text style={styles.statLabel}>Wallet</Text>
              </View>
            </View>
          </View>

          {/* Loyalty Status Card */}
          <View style={styles.loyaltyCard}>
            <View style={styles.loyaltyIconContainer}>
              <Ionicons name="star" size={22} color="#FFF" />
            </View>
            <View style={styles.loyaltyDetails}>
              <Text style={styles.loyaltyLabel}>LOYALTY STATUS</Text>
              <Text style={styles.loyaltyTitle}>Gold Member</Text>
              <Text style={styles.loyaltySub}>240 pts to Platinum · Book 2 more services</Text>
            </View>
          </View>

          {/* Personal Info Header */}
          <View style={styles.infoSectionHeader}>
            <Text style={styles.infoSectionTitle}>Personal Info</Text>
            {!isEditing ? (
              <TouchableOpacity 
                style={styles.editToggleBtn} 
                onPress={() => setIsEditing(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.editToggleText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Personal Info / Editing Form */}
          <View style={styles.infoCard}>
            {isEditing ? (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>FULL NAME</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter full name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Enter email address"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: colors.textSecondary }]} 
                    onPress={() => setIsEditing(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.infoRow}>
                  <Text style={styles.fieldLabel}>FULL NAME</Text>
                  <Text style={styles.fieldValue}>{user?.name || 'Priya Mehta'}</Text>
                </View>
                <View style={styles.infoRowDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                  <Text style={styles.fieldValue}>{user?.phone || '+91 98765 43210'}</Text>
                </View>
                <View style={styles.infoRowDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                  <Text style={styles.fieldValue}>{user?.email || 'priya.mehta@gmail.com'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Menu */}
          <View style={styles.secondaryMenu}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Ionicons name="location-outline" size={22} color={colors.textPrimary} style={{ width: 28 }} />
              <Text style={styles.menuText}>Manage Addresses</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Ionicons name="wallet-outline" size={22} color={colors.textPrimary} style={{ width: 28 }} />
              <Text style={styles.menuText}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} style={{ width: 28 }} />
              <Text style={[styles.menuText, { color: colors.danger, fontWeight: '700' }]}>Logout</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 110,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  headerSafeArea: {
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  userMetaContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginVertical: 4,
    fontWeight: '500',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 6,
  },
  bodyContent: {
    paddingHorizontal: 20,
  },
  statsCardContainer: {
    marginTop: -25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: '#E2E8F0',
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111625',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  loyaltyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 94, 20, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  loyaltyDetails: {
    flex: 1,
  },
  loyaltyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  loyaltyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  loyaltySub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
  infoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 1,
  },
  infoRow: {
    paddingVertical: 12,
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 4,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryMenu: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 16,
  },
});
