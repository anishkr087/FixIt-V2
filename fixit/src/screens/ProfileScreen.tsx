import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';

export const ProfileScreen = () => {
  const { user, logout, isAuthenticated, showLoginModal, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Sync state if user loads later
  useEffect(() => {
    if (user && !isEditing) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditLocation(user.location || '');
    }
  }, [user, isEditing]);

  const handleSave = () => {
    updateProfile(editName, editLocation, editEmail);
    setIsEditing(false);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="person-circle-outline" size={80} color={colors.textSecondary} />
        <Text style={{ fontSize: 20, color: colors.textPrimary, marginVertical: 16 }}>You are not logged in</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={showLoginModal}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Login / Register</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Profile</Text>

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          {isEditing ? (
             <View>
              <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder="Full Name" />
              <TextInput style={styles.editInput} value={editEmail} onChangeText={setEditEmail} placeholder="Email Address" autoCapitalize="none" />
              <TextInput style={styles.editInput} value={editLocation} onChangeText={setEditLocation} placeholder="Location" />
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.textSecondary, marginLeft: 8 }]} onPress={() => setIsEditing(false)}>
                  <Text style={styles.saveBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
             </View>
          ) : (
            <View>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.phone}>{user?.phone}</Text>
              {user?.email ? <Text style={styles.detailText}>{user.email}</Text> : null}
              {user?.location ? <Text style={styles.detailText}>{user.location}</Text> : null}
            </View>
          )}
        </View>
        {!isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
            <Ionicons name="pencil" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="location-outline" size={24} color={colors.textPrimary} />
          <Text style={styles.menuText}>Manage Addresses</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="wallet-outline" size={24} color={colors.textPrimary} />
          <Text style={styles.menuText}>Payment Methods</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          <Text style={[styles.menuText, { color: colors.danger, fontWeight: 'bold' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 16, color: colors.textPrimary },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  name: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  phone: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  detailText: { fontSize: 12, color: colors.textSecondary },
  menu: { backgroundColor: '#FFF', paddingHorizontal: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { flex: 1, marginLeft: 16, fontSize: 16, color: colors.textPrimary },
  loginBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, marginTop: 16 },
  editInput: { backgroundColor: colors.background, padding: 8, borderRadius: 8, marginBottom: 8, fontSize: 14 },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  editBtn: { alignSelf: 'flex-start', padding: 8, backgroundColor: colors.primary, borderRadius: 20 }
});
