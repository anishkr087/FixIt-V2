import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { useCartStore } from '../store/useCartStore';
import { useBookingStore } from '../store/useBookingStore';
import { useSocketStore } from '../store/useSocketStore';
import { useNotificationStore } from '../store/useNotificationStore';

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

  const { notifications, markAsRead, markAllAsRead, clearAll, addNotification, getUnreadCount } = useNotificationStore();
  const { socket, connect } = useSocketStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = getUnreadCount();

  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
  const tabBarHeight = 60 + bottomPadding;

  // Socket connect and listen
  useEffect(() => {
    if (user) {
      connect();
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: any) => {
      console.log('booking_status_update in HomeScreen:', data);
      addNotification({
        title: 'Booking Update 🛠️',
        body: `Your job request status has been updated to: ${data.status.replace('_', ' ').toUpperCase()}`,
        type: 'booking'
      });
    };

    socket.on('booking_status_update', handleUpdate);

    return () => {
      socket.off('booking_status_update', handleUpdate);
    };
  }, [socket]);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'GOOD MORNING 👋';
    if (hrs < 17) return 'GOOD AFTERNOON 👋';
    if (hrs < 22) return 'GOOD EVENING 👋';
    return 'GOOD NIGHT 👋';
  };

  const filteredServices = SERVICES_DATA.filter((service) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      service.categoryName.toLowerCase() === selectedCategory.toLowerCase();

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
          { paddingBottom: cartCount > 0 ? tabBarHeight + 90 : tabBarHeight + 30 }
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
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.headerTitleText}>Find Home Experts</Text>
                <TouchableOpacity 
                  style={styles.locationContainer}
                  activeOpacity={0.7}
                  onPress={() => Alert.alert("Location", `Current: ${user?.location || 'Bandra West, Mumbai'}\n\nAddress management is coming soon!`)}
                >
                  <Ionicons name="location-sharp" size={14} color="#FFF" />
                  <Text style={styles.locationText}>{user?.location || 'Bandra West, Mumbai'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.notificationBtn} 
                activeOpacity={0.8}
                onPress={() => setShowNotifications(true)}
              >
                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                  </View>
                )}
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
            <TouchableOpacity 
              style={styles.bannerBookBtn} 
              activeOpacity={0.8}
              onPress={() => Alert.alert("Special Offer", "Sparkle Sale booking is coming soon!")}
            >
              <Text style={styles.bannerBookText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {cartCount > 0 && (
        <View style={[styles.checkoutBar, { bottom: tabBarHeight + 10 }]}>
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

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={markAllAsRead} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Mark all as read</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearAll} style={styles.actionBtn}>
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Clear all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.notificationsList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <View key={notif.id} style={[styles.notificationItem, !notif.read && styles.unreadItem]}>
                    <View style={styles.notificationInfo}>
                      <Text style={styles.notificationTitle}>{notif.title}</Text>
                      <Text style={styles.notificationBody}>{notif.body}</Text>
                      <Text style={styles.notificationTime}>
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {!notif.read && (
                      <TouchableOpacity onPress={() => markAsRead(notif.id)} style={styles.markReadCircle}>
                        <View style={styles.unreadDot} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  actionBtn: {
    paddingVertical: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  notificationsList: {
    paddingVertical: 8,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  notificationItem: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  unreadItem: {
    backgroundColor: '#FFF8F5',
    borderColor: '#FFEBE0',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.4)',
    fontWeight: '600',
  },
  markReadCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
