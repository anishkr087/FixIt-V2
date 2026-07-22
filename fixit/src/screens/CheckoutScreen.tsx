import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  Vibration,
  Platform 
} from 'react-native';

const playSuccessChimeSound = () => {
  try {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 300, 100, 300]);
    }
    if (typeof window !== 'undefined' && ((window as any).AudioContext || (window as any).webkitAudioContext)) {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
      });
    }
  } catch (e) {
    console.log('Success chime notification note:', e);
  }
};

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCartStore } from '../store/useCartStore';
import { colors } from '../theme/colors';
import { useSocketStore } from '../store/useSocketStore';
import { useBookingStore } from '../store/useBookingStore';
import { useAuthStore } from '../store/useAuthStore';
import { AddressModal, AddressData } from '../components/AddressModal';

export const CheckoutScreen = ({ navigation }: any) => {
  const { items, getTotal, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<string>('Pending');
  
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [autoArea, setAutoArea] = useState<string>('');

  const { user, updateProfile } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const { setBooking, setPartnerLocation } = useBookingStore();

  // Address form state
  const [houseNo, setHouseNo] = useState<string>(user?.houseNo || '');
  const [streetAddress, setStreetAddress] = useState<string>(user?.streetAddress || '');
  const [landmark, setLandmark] = useState<string>(user?.landmark || '');
  const [contactName, setContactName] = useState<string>(user?.name || '');
  const [contactPhone, setContactPhone] = useState<string>(
    user?.phone ? user.phone.replace('+91', '') : ''
  );
  const [altPhone, setAltPhone] = useState<string>('');
  const [addressType, setAddressType] = useState<'Home' | 'Work'>('Home');
  const [lat, setLat] = useState<number | null>(user?.lat || null);
  const [lng, setLng] = useState<number | null>(user?.lng || null);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState<boolean>(false);
  const [savingAddress, setSavingAddress] = useState<boolean>(false);

  const total = getTotal();
  const finalTotal = total;

  useEffect(() => {
    connect();
    detectLocation();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.houseNo) setHouseNo(user.houseNo);
      if (user.streetAddress) setStreetAddress(user.streetAddress);
      if (user.landmark) setLandmark(user.landmark);
      if (user.name) setContactName(user.name);
      if (user.lat) setLat(user.lat);
      if (user.lng) setLng(user.lng);
    }
  }, [user]);

  const detectLocation = async () => {
    setIsLocating(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setIsLocating(false);
      Alert.alert('Permission Required', 'Location permission is required to find nearby partners.');
      return;
    }
    try {
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(loc);

      // Reverse geocode to fill area
      let addresses = await Location.reverseGeocodeAsync(loc.coords);
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const area = [addr.name, addr.street, addr.subregion, addr.city, addr.region, addr.postalCode]
          .filter(Boolean)
          .join(', ');
        setAutoArea(area);
        if (!streetAddress && !user?.streetAddress) {
          setStreetAddress(area);
        }
      }
    } catch (err) {
      console.log('Failed to get location:', err);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleBookingUpdate = (data: any) => {
      setBooking(data);
      if (data && (data.status === 'accepted' || data.assignedPartner || data.status === 'on_the_way')) {
        playSuccessChimeSound(); // Trigger audio chime & haptic vibration when partner assigned!
      }
    };
    const handlePartnerLocation = (data: any) => setPartnerLocation({ lat: data.lat, lng: data.lng });
    socket.on('booking_status_update', handleBookingUpdate);
    socket.on('partner_location_update', handlePartnerLocation);
    return () => {
      socket.off('booking_status_update', handleBookingUpdate);
      socket.off('partner_location_update', handlePartnerLocation);
    };
  }, [socket]);

  const handleSaveAddress = async () => {
    if (!houseNo.trim()) {
      Alert.alert('Required', 'Please enter your Flat / House / Building name.');
      return;
    }
    if (!contactName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const area = streetAddress.trim() || autoArea;
    const fullAddr = `${houseNo.trim()}, ${area}${landmark.trim() ? `, ${landmark.trim()}` : ''}`;
    const lat = currentLocation?.coords.latitude ?? user?.lat ?? 28.6139;
    const lng = currentLocation?.coords.longitude ?? user?.lng ?? 77.2090;

    try {
      setSavingAddress(true);
      await updateProfile(contactName.trim(), fullAddr, user?.email);
      setIsAddressModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error Saving Address', err.message || 'Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleAddressSaved = (data: AddressData) => {
    setHouseNo(data.houseNo);
    setStreetAddress(data.streetAddress);
    setLandmark(data.landmark);
    setAddressType(data.addressType);
    setLat(data.lat);
    setLng(data.lng);
  };

  const handleConfirm = async () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Please add some services before confirming.');
      return;
    }
    if (!user || !user.phone) {
      Alert.alert('Authentication Required', 'Please log in to confirm booking.');
      return;
    }

    const currentHouseNo = user.houseNo || houseNo;
    const currentStreetAddress = user.streetAddress || streetAddress;
    const currentLandmark = user.landmark || landmark;
    const currentLat = lat ?? user.lat ?? currentLocation?.coords.latitude ?? 25.0113;
    const currentLng = lng ?? user.lng ?? currentLocation?.coords.longitude ?? 84.0200;

    if (!currentHouseNo.trim() || !currentStreetAddress.trim()) {
      Alert.alert(
        'Door Address Required 🏠',
        'Please select map location & provide your full door address so our partner can reach you.',
        [{ text: 'Add Address', onPress: () => setIsAddressModalVisible(true) }]
      );
      return;
    }

    const category = items[0]?.category || 'Electrician';
    const problemDescription = items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
    const fullAddr = user.fullAddress || `${currentHouseNo.trim()}, ${currentStreetAddress.trim()}${currentLandmark.trim() ? `, ${currentLandmark.trim()}` : ''}`;

    setBooking({ 
      jobId: 'pending_' + Date.now(), 
      status: 'requesting', 
      message: 'Submitting your request...',
      lat: currentLat,
      lng: currentLng
    });

    socket?.emit('request_job', {
      customerId: user.phone,
      customerName: user.name || 'Valued Customer',
      problemDescription,
      category,
      paymentMethod,
      estimatedPrice: finalTotal,
      lat: currentLat,
      lng: currentLng,
      fullAddress: fullAddr,
      houseNo: currentHouseNo.trim(),
      streetAddress: currentStreetAddress.trim(),
      landmark: currentLandmark.trim(),
      altPhone: user.altPhone || '',
      addressType: user.addressType || 'Home'
    });

    Alert.alert(
      'Request Placed! 🛠️',
      'Finding the nearest service professional. Track updates in your Bookings tab.',
      [{ text: 'Track Booking', onPress: () => { clearCart(); navigation.navigate('MainTabs', { screen: 'Bookings' }); } }]
    );
  };

  const formattedAddressText = (user?.houseNo || houseNo) && (user?.streetAddress || streetAddress)
    ? `${user?.houseNo || houseNo}, ${user?.streetAddress || streetAddress}${(user?.landmark || landmark) ? ` (${user?.landmark || landmark})` : ''}`
    : user?.fullAddress || null;

  const currentAddressType = user?.addressType || addressType;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Summary & Payment</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Door Address Card */}
        <Text style={styles.sectionTitle}>Service At 📍</Text>
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <View style={styles.addressIconWrap}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              {formattedAddressText ? (
                <>
                  <Text style={styles.addressCardTitle}>{currentAddressType}</Text>
                  <Text style={styles.addressCardText}>{formattedAddressText}</Text>
                </>
              ) : (
                <Text style={styles.addressCardMissingText}>
                  No address saved yet. Add your door address so our partner can find you.
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setIsAddressModalVisible(true)} style={styles.changeChip}>
              <Text style={styles.changeChipText}>{formattedAddressText ? 'Change' : 'Add'}</Text>
            </TouchableOpacity>
          </View>

          {/* GPS status strip */}
          <View style={styles.gpsStrip}>
            <Ionicons
              name={(user?.lat || currentLocation) ? 'radio-button-on' : 'radio-button-off'}
              size={14}
              color={(user?.lat || currentLocation) ? '#16A34A' : colors.textSecondary}
            />
            <Text style={styles.gpsText}>
              {user?.lat && user?.lng
                ? `Saved Pin: ${user.lat.toFixed(4)}, ${user.lng.toFixed(4)}`
                : currentLocation
                  ? `GPS: ${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`
                  : 'GPS location not selected yet'}
            </Text>
          </View>
        </View>

        {/* Services */}
        <Text style={styles.sectionTitle}>Selected Services</Text>
        <View style={styles.card}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Bill */}
        <Text style={styles.sectionTitle}>Bill Details</Text>
        <View style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{total}</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total to Pay</Text>
            <Text style={styles.totalValue}>₹{finalTotal}</Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
      </View>

      {/* 2-Step Address Modal */}
      <AddressModal
        visible={isAddressModalVisible}
        onClose={() => setIsAddressModalVisible(false)}
        onSaveSuccess={handleAddressSaved}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  spacer: { width: 40 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },

  // Address card
  addressHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  addressCardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  addressCardText: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  addressCardMissingText: { fontSize: 13, color: '#DC2626' },
  changeChip: {
    borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 6,
  },
  changeChipText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  gpsStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 },
  gpsText: { fontSize: 11, color: colors.textSecondary },

  // Items / Time / Payment / Bill
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemName: { fontSize: 16, color: colors.textPrimary },
  itemQty: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { flex: 1, fontSize: 15, color: colors.textPrimary, marginLeft: 12 },
  changeBtn: { color: colors.primary, fontWeight: 'bold' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  paymentText: { fontSize: 15, marginLeft: 12, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 14, color: colors.textSecondary },
  billValue: { fontSize: 14, color: colors.textPrimary },
  totalRow: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary },

  footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.border },
  confirmBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  closeBtn: { padding: 4 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB',
    borderRadius: 8, padding: 10, marginBottom: 16, gap: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: 4 },

  // Flat/House — highlighted blue border
  flatInput: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: colors.textPrimary, backgroundColor: '#FFF',
  },

  // Area card (auto-filled)
  areaCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 8, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  areaCardLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  areaCardValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },
  changeAreaBtn: {
    borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 6, marginLeft: 8,
  },
  changeAreaBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  // GPS button
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, marginBottom: 12,
  },
  gpsBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  // Generic text input
  textInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: colors.textPrimary, backgroundColor: '#FFF',
  },

  // Address type chips
  typeLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#F8FAFC',
  },
  typeChipActive: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  typeChipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  typeChipTextActive: { color: colors.primary, fontWeight: '700' },

  saveAddressBtn: {
    backgroundColor: colors.primary, padding: 16, borderRadius: 12,
    alignItems: 'center', marginBottom: 8,
  },
  saveAddressBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
