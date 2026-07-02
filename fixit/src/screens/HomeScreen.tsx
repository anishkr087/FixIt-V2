import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { useCartStore } from '../store/useCartStore';
import { useBookingStore } from '../store/useBookingStore';

const { width } = Dimensions.get('window');

const FILTER_CATEGORIES = ['All', 'Electrical', 'Plumbing', 'Welding', 'Carpenter', 'Cleaning'];

const SERVICES_DATA = [
  {
    id: 's_electrical',
    categoryName: 'Electrical',
    dbCategory: 'Electrician',
    title: 'Electrical',
    desc: 'Wiring, repairs, switches & installations',
    price: 299,
    rating: 4.8,
    icon: 'flash',
    bgColor: '#FFF5F0',
    iconColor: '#FF5E14',
  },
  {
    id: 's_plumbing',
    categoryName: 'Plumbing',
    dbCategory: 'Plumber',
    title: 'Plumbing',
    desc: 'Leaks, pipes, fitting & drain cleaning',
    price: 249,
    rating: 4.7,
    icon: 'water',
    bgColor: '#E6FCFF',
    iconColor: '#06B6D4',
  },
  {
    id: 's_cleaning',
    categoryName: 'Cleaning',
    dbCategory: 'Cleaning',
    title: 'Cleaning',
    desc: 'Deep clean, sofa & bathroom sanitization',
    price: 179,
    rating: 4.7,
    icon: 'sparkles',
    bgColor: '#EBFDF5',
    iconColor: '#10B981',
  },
  {
    id: 's_pest',
    categoryName: 'Pest Control',
    dbCategory: 'Pest Control',
    title: 'Pest Control',
    desc: 'Termites, cockroaches & bed bugs',
    price: 599,
    rating: 4.4,
    icon: 'bug',
    bgColor: '#FFFBEB',
    iconColor: '#F59E0B',
  },
  {
    id: 's_carpenter',
    categoryName: 'Carpenter',
    dbCategory: 'Carpenter',
    title: 'Carpenter',
    desc: 'Furniture repair, assembly & woodwork',
    price: 199,
    rating: 4.8,
    icon: 'hammer',
    bgColor: '#F5F3FF',
    iconColor: '#8B5CF6',
  },
  {
    id: 's_mechanic',
    categoryName: 'Mechanic',
    dbCategory: 'Mechanic',
    title: 'Mechanic',
    desc: 'Car & bike repair, tuning & breakdown',
    price: 399,
    rating: 4.9,
    icon: 'car-sport',
    bgColor: '#EEF2F6',
    iconColor: '#475569',
  },
];

const TOP_PROS = [
  { id: 'p1', name: 'Rahul Sharma', role: 'Electrician', rating: 4.9, jobs: 312, initials: 'RS', color: '#FF5E14' },
  { id: 'p2', name: 'Vikram Singh', role: 'Carpenter', rating: 4.9, jobs: 198, initials: 'VS', color: '#8B5CF6' },
  { id: 'p3', name: 'Suresh Kumar', role: 'AC Tech', rating: 4.8, jobs: 245, initials: 'SK', color: '#06B6D4' },
  { id: 'p4', name: 'Amit Mishra', role: 'Plumber', rating: 4.7, jobs: 187, initials: 'AM', color: '#10B981' },
];

export const HomeScreen = () => {
  const { user } = useAuthStore();
  const { activeBooking } = useBookingStore();
  const navigation = useNavigation<any>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { items, getTotal } = useCartStore();
  
  const cartTotal = getTotal();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const filteredServices = SERVICES_DATA.filter((service) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      service.categoryName.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Electrical' && service.categoryName === 'Electrical') ||
      (selectedCategory === 'Carpenter' && service.categoryName === 'Carpenter');
      
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.desc.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesCategory && matchesSearch;
  });

  const handleServicePress = (service: typeof SERVICES_DATA[0]) => {
    navigation.navigate('Category', { categoryName: service.dbCategory });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: cartCount > 0 ? 160 : 100 }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FF8A00', '#FF5E14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>GOOD MORNING 👋</Text>
                <Text style={styles.headerTitleText}>Find Home Experts</Text>
                <View style={styles.locationContainer}>
                  <Ionicons name="location-sharp" size={14} color="#FFF" />
                  <Text style={styles.locationText}>{user?.location || 'Bandra West, Mumbai'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search electricians, plumbers..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.bodyContent}>
          <View style={styles.activeBookingContainer}>
            <View style={styles.activeBookingCard}>
              <View style={styles.activeBookingIconContainer}>
                <Ionicons name="flash" size={24} color={colors.primary} />
              </View>
              <View style={styles.activeBookingDetails}>
                <Text style={styles.activeBookingLabel}>ACTIVE BOOKING</Text>
                <Text style={styles.activeBookingTitle}>
                  {activeBooking ? activeBooking.message : 'Electrician · Today 4:00 PM'}
                </Text>
                <View style={styles.activeBookingStatusRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.activeBookingStatusText}>
                    {activeBooking ? `Status: ${activeBooking.status.replace('_', ' ')}` : 'Rahul is on the way'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.trackBtn} 
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Bookings')}
              >
                <Text style={styles.trackBtnText}>Track</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {FILTER_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.activeCategoryPill]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryPillText, isSelected && styles.activeCategoryPillText]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What do you need?</Text>
            <Text style={styles.sectionSubtitle}>{filteredServices.length} available</Text>
          </View>

          <View style={styles.servicesGrid}>
            {filteredServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.9}
              >
                <View style={[styles.serviceIconContainer, { backgroundColor: service.bgColor }]}>
                  <Ionicons name={service.icon as any} size={28} color={service.iconColor} />
                </View>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceDesc} numberOfLines={2}>{service.desc}</Text>
                
                <View style={styles.serviceFooter}>
                  <Text style={styles.servicePrice}>₹{service.price}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{service.rating}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Professionals</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See all &gt;</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.prosScroll}
            contentContainerStyle={styles.prosScrollContent}
          >
            {TOP_PROS.map((pro) => (
              <View key={pro.id} style={styles.proCard}>
                <View style={[styles.proAvatar, { backgroundColor: pro.color }]}>
                  <Text style={styles.proAvatarText}>{pro.initials}</Text>
                </View>
                <Text style={styles.proName}>{pro.name}</Text>
                <Text style={styles.proRole}>{pro.role}</Text>
                
                <View style={styles.proRatingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.proRatingText}>{pro.rating} · {pro.jobs} jobs</Text>
                </View>
                
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified Pro</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.statsCard}>
            <Text style={styles.statsHeader}>SERVEASE IN NUMBERS</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>50k+</Text>
                <Text style={styles.statLbl}>Customers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>3.5k+</Text>
                <Text style={styles.statLbl}>Experts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>1.2L+</Text>
                <Text style={styles.statLbl}>Jobs Done</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>4.8★</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
            </View>
          </View>

          <View style={styles.limitedOfferBanner}>
            <View style={styles.bannerLeft}>
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>LIMITED OFFER</Text>
              </View>
              <Text style={styles.bannerTitleText}>Home Sparkle Sale</Text>
              <Text style={styles.bannerDescText}>Get deep cleaning starting at just ₹179!</Text>
            </View>
            <TouchableOpacity style={styles.bannerBookBtn} activeOpacity={0.8}>
              <Text style={styles.bannerBookText}>Book Now</Text>
            </TouchableOpacity>
          </View>
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
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutBtnText}>View Cart</Text>
            <Ionicons name="cart" size={20} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      )}
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
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 35,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerSafeArea: {
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  headerTitleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginVertical: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5E14',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  bodyContent: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  activeBookingContainer: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  activeBookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activeBookingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBookingDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  activeBookingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activeBookingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  activeBookingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeBookingStatusText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  trackBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  trackBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryScroll: {
    marginHorizontal: -20,
    marginBottom: 24,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeCategoryPill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeCategoryPillText: {
    color: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    width: (width - 52) / 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    height: 30,
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  prosScroll: {
    marginHorizontal: -20,
    marginBottom: 28,
  },
  prosScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  proCard: {
    width: 170,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  proAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  proAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  proName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  proRole: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  proRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  proRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 4,
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 28,
  },
  statsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  limitedOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111625',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  bannerLeft: {
    flex: 1,
  },
  offerBadge: {
    backgroundColor: 'rgba(255, 94, 20, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  offerBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bannerDescText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  bannerBookBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bannerBookText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  checkoutBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 105 : 95,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  checkoutItems: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  checkoutSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
