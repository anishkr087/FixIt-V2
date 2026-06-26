import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { useBookingStore } from '../store/useBookingStore';
import { useSocketStore } from '../store/useSocketStore';

const MOCK_BOOKINGS = [
  { id: '1', service: 'Deep Home Cleaning', date: 'Oct 24, 2026', status: 'Completed', price: 2999 },
  { id: '2', service: 'Fan Repair', date: 'Oct 10, 2026', status: 'Completed', price: 149 },
];

export const BookingsScreen = () => {
  const { activeBooking, partnerLocation, clearBooking } = useBookingStore();
  const { socket, connect } = useSocketStore();
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

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
            socket?.emit('update_job_status', { 
              jobId: activeBooking?.jobId, 
              status: 'cancelled' 
            });
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
        {partner && (currentLocation || pLocation) && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.liveMap}
              region={{
                latitude: currentLocation?.coords.latitude || pLocation?.lat || 28.6139,
                longitude: currentLocation?.coords.longitude || pLocation?.lng || 77.2090,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              {/* Customer Marker */}
              {currentLocation && (
                <Marker
                  coordinate={{
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude
                  }}
                  title="Your Location"
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
              {currentLocation && pLocation && (
                <Polyline
                  coordinates={[
                    { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude },
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
          <TouchableOpacity 
            style={styles.completeBtn}
            onPress={clearBooking}
          >
            <Text style={styles.completeBtnText}>Dismiss & Clear</Text>
          </TouchableOpacity>
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        
        {activeBooking && renderLiveStatus()}

        <Text style={[styles.sectionTitle, activeBooking && { marginTop: 12 }]}>Past Bookings</Text>
        
        <View style={styles.pastBookingsList}>
          {MOCK_BOOKINGS.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.serviceTitle}>{item.service}</Text>
                  <Text style={styles.date}>{item.date}</Text>
                </View>
                <Text style={styles.price}>₹ {item.price}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statusRow}>
                <Ionicons 
                  name={item.status === 'Completed' ? 'checkmark-circle' : 'time'} 
                  size={20} 
                  color={item.status === 'Completed' ? colors.success : colors.warning} 
                />
                <Text style={[styles.statusText, { color: item.status === 'Completed' ? colors.success : colors.warning }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 16, color: colors.textPrimary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 12, color: colors.textPrimary },
  pastBookingsList: { paddingHorizontal: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.1, shadowRadius: 4 },
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
});
