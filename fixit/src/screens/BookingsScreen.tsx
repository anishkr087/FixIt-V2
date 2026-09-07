import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { useBookingStore } from '../store/useBookingStore';
import { useSocketStore } from '../store/useSocketStore';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/apiClient';

// Lazy-load MapView — prevents crash at app startup if native module not ready
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let UrlTile: any = null;
let PROVIDER_GOOGLE: any = null;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  UrlTile = Maps.UrlTile;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (e) {
  console.warn('react-native-maps not available:', e);
}


const parseJobDescription = (desc: string) => {
  if (!desc) return { items: 'Home Service', details: '', photos: [] };
  try {
    const parsed = JSON.parse(desc);
    if (parsed && (parsed.items || parsed.details || parsed.photos)) {
      return {
        items: parsed.items || 'Home Service',
        details: parsed.details || '',
        photos: parsed.photos || []
      };
    }
  } catch (e) {
    // Plain text format
  }
  return { items: desc, details: '', photos: [] };
};

export const BookingsScreen = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
  const tabBarHeight = 60 + bottomPadding;

  const { activeBooking, partnerLocation, setBooking, setPartnerLocation, clearBooking } = useBookingStore();
  const { socket, connect } = useSocketStore();
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

  const { user } = useAuthStore();
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookingHistory();
  };

  const fetchBookingHistory = async () => {
    if (!user || !user.phone) return;
    try {
      setLoadingHistory(true);
      const encodedPhone = encodeURIComponent(user.phone.trim());
      const response = await apiClient.get(`/customer/bookings/${encodedPhone}`);
      if (response.data && response.data.success && response.data.bookings) {
        const bookings = response.data.bookings;
        setPastBookings(bookings);

        // Scan past bookings to restore active booking if one is still in progress
        const active = bookings.find((b: any) => b.status !== 'completed' && b.status !== 'cancelled');
        if (active) {
          setBooking({
            jobId: active.id || active._id,
            status: active.status,
            message: `Professional status: ${active.status.toUpperCase().replace('_', ' ')}`,
            lat: active.customer_location_lat,
            lng: active.customer_location_lng,
            partner: active.partner || null
          });
        }
      }
    } catch (err) {
      console.error('Error fetching bookings inside BookingsScreen:', err);
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    connect();

    // Acquire GPS location
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        let loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc);
      } catch (err) {
        console.log('Failed to get location inside BookingsScreen:', err);
      }
    })();
  }, []);

  useEffect(() => {
    fetchBookingHistory();
  }, [user]);

  // Store activeBooking in ref to prevent stale closures inside socket listeners
  const activeBookingRef = useRef(activeBooking);
  useEffect(() => {
    activeBookingRef.current = activeBooking;
  }, [activeBooking]);

  // Connect socket and register listeners for status updates
  useEffect(() => {
    if (!socket) return;

    const handleBookingStatusUpdate = (data: any) => {
      console.log('booking_status_update in BookingsScreen:', data);
      if (data) {
        const currentBooking = activeBookingRef.current;
        if (currentBooking && (currentBooking.jobId.startsWith('pending_') || currentBooking.jobId === data.jobId)) {
          setBooking({
            ...currentBooking,
            ...data,
            partner: data.partner !== undefined ? data.partner : currentBooking.partner,
            lat: data.lat !== undefined ? data.lat : currentBooking.lat,
            lng: data.lng !== undefined ? data.lng : currentBooking.lng,
          });
        } else if (!currentBooking) {
          setBooking(data);
        }
      }
    };

    const handlePartnerLocationUpdate = (data: any) => {
      console.log('partner_location_update in BookingsScreen:', data);
      if (data && data.lat && data.lng) {
        setPartnerLocation({ lat: data.lat, lng: data.lng });
      }
    };

    socket.on('booking_status_update', handleBookingStatusUpdate);
    socket.on('partner_location_update', handlePartnerLocationUpdate);

    return () => {
      socket.off('booking_status_update', handleBookingStatusUpdate);
      socket.off('partner_location_update', handlePartnerLocationUpdate);
    };
  }, [socket]);

  // Refresh past bookings when a job is completed
  useEffect(() => {
    if (activeBooking?.status === 'completed') {
      fetchBookingHistory();
    }
  }, [activeBooking?.status]);

  const getStatusStep = () => {
    if (!activeBooking) return 0;
    const status = activeBooking.status;
    if (status === 'requesting' || status === 'broadcasted') return 1;
    if (status === 'accepted') return 2;
    if (status === 'on_the_way' || status === 'reached') return 3;
    if (status === 'work_started') return 4;
    if (status === 'completed') return 5;
    return 0;
  };

  const handleCancelBooking = () => {
    Alert.alert(
      "Cancel Booking?",
      "Are you sure you want to cancel this request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            // Emit update_job_status with partnerId if available; server validates authorization
            // For pending/broadcasted jobs (no partner yet), server should allow customer-initiated cancel
            if (activeBooking?.jobId) {
              socket?.emit('update_job_status', {
                jobId: activeBooking.jobId,
                status: 'cancelled',
                partnerId: activeBooking.partner ? undefined : null // will fail auth if partner already assigned
              });
            }
            clearBooking();
          }
        }
      ]
    );
  };

  const renderLiveStatus = () => {
    const step = getStatusStep();
    const status = activeBooking?.status;
    const partner = activeBooking?.partner;

    // Simulated/Real partner coordinates for map rendering
    const pLocation = partnerLocation || (currentLocation && activeBooking?.status !== 'completed' ? {
      lat: currentLocation.coords.latitude + 0.007,
      lng: currentLocation.coords.longitude + 0.007
    } : null);

    return (
      <View style={styles.liveCard}>
        <View style={styles.liveHeader}>
          <Text style={styles.liveTitle}>Live Booking Status</Text>
          <Ionicons name="pulse" size={20} color={colors.primary} />
        </View>

        <Text style={styles.liveMessage}>{activeBooking?.message || 'Processing Request...'}</Text>

        {/* Live Tracking Map */}
        {partner && (currentLocation || pLocation) && MapView && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.liveMap}
              provider={PROVIDER_GOOGLE}
              mapType="standard"
              region={{
                latitude: activeBooking?.lat || user?.lat || currentLocation?.coords.latitude || pLocation?.lat || 28.6139,
                longitude: activeBooking?.lng || user?.lng || currentLocation?.coords.longitude || pLocation?.lng || 77.2090,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              {/* Customer Marker */}
              {(activeBooking?.lat || user?.lat || currentLocation) && (
                <Marker
                  coordinate={{
                    latitude: activeBooking?.lat || user?.lat || (currentLocation ? currentLocation.coords.latitude : 25.0113),
                    longitude: activeBooking?.lng || user?.lng || (currentLocation ? currentLocation.coords.longitude : 84.0200)
                  }}
                  title="Doorstep / Home"
                >
                  <View style={styles.customerMarker}>
                    <View style={styles.customerMarkerInner} />
                  </View>
                </Marker>
              )}

              {/* Partner Marker */}
              {pLocation && (
                <Marker
                  coordinate={{
                    latitude: pLocation.lat,
                    longitude: pLocation.lng
                  }}
                  title={partner.name}
                >
                  <View style={styles.partnerMarker}>
                    <Ionicons name="car-sport" size={14} color="#FFF" />
                  </View>
                </Marker>
              )}

              {/* Route Polyline connecting Customer and Partner */}
              {(activeBooking?.lat || user?.lat || currentLocation) && pLocation && (
                <Polyline
                  coordinates={[
                    { 
                      latitude: activeBooking?.lat || user?.lat || (currentLocation ? currentLocation.coords.latitude : 25.0113), 
                      longitude: activeBooking?.lng || user?.lng || (currentLocation ? currentLocation.coords.longitude : 84.0200)
                    },
                    { latitude: pLocation.lat, longitude: pLocation.lng }
                  ]}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                  lineDashPattern={[6, 3]}
                />
              )}
            </MapView>
          </View>
        )}

        {/* Stepper Progress */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
              {step > 1 ? (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              ) : (
                <View style={styles.stepDotInner} />
              )}
            </View>
            <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>Request Received</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
              {step > 2 ? (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              ) : (
                <View style={styles.stepDotInner} />
              )}
            </View>
            <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>Professional Assigned</Text>
          </View>
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
              {step > 3 ? (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              ) : (
                <View style={styles.stepDotInner} />
              )}
            </View>
            <Text style={[styles.stepText, step >= 3 && styles.stepTextActive]}>Heading to your location</Text>
          </View>
          <View style={[styles.stepLine, step >= 4 && styles.stepLineActive]} />

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 4 && styles.stepDotActive]}>
              {step > 4 ? (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              ) : (
                <View style={styles.stepDotInner} />
              )}
            </View>
            <Text style={[styles.stepText, step >= 4 && styles.stepTextActive]}>Work in Progress</Text>
          </View>
        </View>

        {/* Assigned Partner Card Details */}
        {partner && (
          <View style={styles.partnerProfileCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={20} color="#FFF" />
            </View>
            <View style={styles.partnerInfoDetails}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.partnerSub}>{partner.experience} yrs exp • ★ {partner.rating}</Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Alert.alert('Calling Partner', `Connecting call to: +91 ${partner.phone}`)}
            >
              <Ionicons name="call" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Action Button Panel */}
        {status !== 'completed' && status !== 'no_partners' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelBooking}
          >
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        {status === 'completed' && (
          <View style={styles.completedSuccessCard}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} style={{ marginBottom: 6 }} />
            <Text style={styles.completedSuccessTitle}>Service Completed! ✅</Text>
            <Text style={styles.completedSuccessSub}>Your service request has been successfully fulfilled.</Text>
            <TouchableOpacity
              style={[styles.completeBtn, { marginTop: 12 }]}
              onPress={clearBooking}
            >
              <Text style={styles.completeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'no_partners' && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={clearBooking}
          >
            <Text style={styles.completeBtnText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <Text style={styles.headerTitle}>My Bookings</Text>

        {activeBooking && renderLiveStatus()}

        <Text style={[styles.sectionTitle, activeBooking && { marginTop: 12 }]}>Past Bookings</Text>

        <View style={styles.pastBookingsList}>
          {loadingHistory && pastBookings.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : pastBookings.length === 0 ? (
            <View style={styles.emptyBookingsCard}>
              <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyBookingsText}>No bookings placed yet.</Text>
            </View>
          ) : (
            pastBookings.map((item) => {
              const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
              
              const isCompleted = item.status === 'completed';
              const isCancelled = item.status === 'cancelled';
              
              const statusIcon = isCompleted 
                ? 'checkmark-circle' 
                : isCancelled 
                  ? 'close-circle' 
                  : 'time';
              
              const statusColor = isCompleted 
                ? colors.success 
                : isCancelled 
                  ? colors.danger 
                  : colors.warning;

              const parsedDesc = parseJobDescription(item.problemDescription);

              return (
                <View key={item._id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.serviceTitle} numberOfLines={1}>
                        {parsedDesc.items}
                      </Text>
                      {parsedDesc.details ? (
                        <Text style={[styles.date, { fontStyle: 'italic', marginTop: 2 }]} numberOfLines={1}>
                          "{parsedDesc.details}"
                        </Text>
                      ) : null}
                      <Text style={styles.date}>{formattedDate}</Text>
                    </View>
                    <Text style={styles.price}>₹{item.estimatedPrice}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statusRow}>
                    <Ionicons 
                      name={statusIcon as any} 
                      size={20} 
                      color={statusColor} 
                    />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { },
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 16, color: colors.textPrimary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 12, color: colors.textPrimary },
  pastBookingsList: { paddingHorizontal: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  date: { fontSize: 13, color: colors.textSecondary },
  price: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { marginLeft: 8, fontWeight: 'bold' },

  liveCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: colors.primary + '25',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  liveMessage: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: colors.primary + '10',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  stepperContainer: {
    paddingLeft: 8,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepTextActive: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 11,
    marginVertical: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  partnerProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerInfoDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  partnerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.danger,
    fontWeight: 'bold',
    fontSize: 14,
  },
  completeBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveMap: {
    flex: 1,
  },
  customerMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  partnerMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  emptyBookingsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    gap: 8,
  },
  emptyBookingsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  completedSuccessCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginTop: 8,
  },
  completedSuccessTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  completedSuccessSub: {
    fontSize: 13,
    color: '#15803D',
    textAlign: 'center',
  },
});
