import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { useCartStore } from '../store/useCartStore';

const CATEGORIES = [
  { id: '1', name: 'Cleaning', icon: 'sparkles-outline', color: '#FF9A9E' },
  { id: '2', name: 'Electrician', icon: 'flash-outline', color: '#FECFEF' },
  { id: '3', name: 'Plumber', icon: 'water-outline', color: '#A1C4FD' },
  { id: '4', name: 'Mechanic', icon: 'car-sport-outline', color: '#60A5FA' },
  { id: '5', name: 'Painting', icon: 'color-palette-outline', color: '#FBC2EB' },
  { id: '6', name: 'Carpenter', icon: 'hammer-outline', color: '#E0C3FC' },
  { id: '7', name: 'Pest Control', icon: 'bug-outline', color: '#FCD34D' },
  { id: '8', name: 'Appliance Repair', icon: 'tv-outline', color: '#A78BFA' },
  { id: '9', name: 'RO Repair', icon: 'filter-outline', color: '#38BDF8' },
  { id: '10', name: 'Salon', icon: 'cut-outline', color: '#F472B6' },
  { id: '11', name: 'Packers', icon: 'cube-outline', color: '#9CA3AF' },
];


export const HomeScreen = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [showAllServices, setShowAllServices] = useState(false);
  const { addItem, items, getTotal } = useCartStore();
  const cartTotal = getTotal();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: cartCount > 0 ? 100 : 40 }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location-sharp" size={16} color={colors.primary} />
              <Text style={styles.locationText}>{user?.location || 'Select Location'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.avatar}>
            <Ionicons name="person" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Offer Banner */}
        <LinearGradient
          colors={['#FF9A9E', '#FECFEF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>20% OFF</Text>
            <Text style={styles.bannerSub}>On your first home cleaning service!</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerBtnText}>Book Now</Text>
            </TouchableOpacity>
          </View>
          <Ionicons name="sparkles" size={80} color="rgba(255,255,255,0.3)" style={styles.bannerIcon} />
        </LinearGradient>

        {/* Categories Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Home Services</Text>
          {showAllServices && (
            <TouchableOpacity onPress={() => setShowAllServices(false)}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>See Less</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.grid}>
          {CATEGORIES.slice(0, showAllServices ? CATEGORIES.length : 5).map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Category', { categoryName: cat.name })}
            >
              <View style={[styles.iconContainer, { backgroundColor: cat.color }]}>
                <Ionicons name={cat.icon as any} size={32} color={colors.textPrimary} />
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}

          {!showAllServices && (
            <TouchableOpacity 
              style={styles.categoryCard}
              onPress={() => setShowAllServices(true)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E2E8F0' }]}>
                <Ionicons name="grid" size={32} color={colors.textPrimary} />
              </View>
              <Text style={styles.categoryName}>See More</Text>
            </TouchableOpacity>
          )}
        </View>


        {/* New AI / Quick Actions */}
        <Text style={styles.sectionTitle}>Smart Fixes</Text>
        
        <TouchableOpacity 
          style={styles.aiActionCard} 
          onPress={() => navigation.navigate('AiRepair')}
        >
          <LinearGradient 
            colors={['#1a1025', '#382250']} 
            style={styles.aiActionGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.aiContentInfo}>
              <Text style={styles.aiTitle}>Self Repair (AI Help)</Text>
              <Text style={styles.aiSubText}>Diagnose and fix issues instantly with Gemini AI.</Text>
            </View>
            <Ionicons name="hardware-chip" size={48} color="#E0C3FC" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionCard}>
            <LinearGradient colors={['#FFF59D', '#FDE047']} style={styles.quickActionGradient}>
              <Ionicons name="build" size={28} color={colors.textPrimary} />
              <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Drop & Repair</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <LinearGradient colors={['#FF9E9E', '#FF6B6B']} style={styles.quickActionGradient}>
              <Ionicons name="alert-circle" size={28} color="#FFF" />
              <Text style={styles.quickActionText}>Emergency</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {cartCount > 0 && (
        <View style={styles.checkoutBar}>
          <View>
            <Text style={styles.checkoutItems}>{cartCount} items | ₹{cartTotal}</Text>
            <Text style={styles.checkoutSub}>Extra charges may apply</Text>
          </View>
          <TouchableOpacity 
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={styles.checkoutBtnText}>View Cart</Text>
            <Ionicons name="cart" size={20} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  bannerContent: {
    flex: 1,
    zIndex: 1,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  bannerSub: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
    opacity: 0.8,
  },
  bannerButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  bannerIcon: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-15deg' }],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  categoryCard: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryName: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  aiActionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#382250',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  aiActionGradient: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiContentInfo: {
    flex: 1,
    paddingRight: 16,
  },
  aiTitle: {
    color: '#E0C3FC',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  aiSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 14,
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  checkoutItems: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkoutSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkoutBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
