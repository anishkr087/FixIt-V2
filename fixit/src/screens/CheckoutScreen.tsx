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
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCartStore } from '../store/useCartStore';
import { colors } from '../theme/colors';
import { useSocketStore } from '../store/useSocketStore';
import { useBookingStore } from '../store/useBookingStore';
import { useAuthStore } from '../store/useAuthStore';

export const CheckoutScreen = ({ navigation }: any) => {
  const { items, getTotal, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('UPI');
  const [selectedTime, setSelectedTime] = useState('Tomorrow, 10:00 AM');
  
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const { user, updateProfile } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const { setBooking, setPartnerLocation } = useBookingStore();

  // Door Address state
  const [houseNo, setHouseNo] = useState<string>(user?.houseNo || '');
  const [streetAddress, setStreetAddress] = useState<string>(user?.streetAddress || '');
  const [landmark, setLandmark] = useState<string>(user?.landmark || '');
  const [isAddressModalVisible, setIsAddressModalVisible] = useState<boolean>(false);
  const [savingAddress, setSavingAddress] = useState<boolean>(false);

  const total = getTotal();
  const finalTotal = total;

  useEffect(() => {
    // Connect user socket to backend
    connect();

    // Acquire GPS location
    detectLocation();
  }, []);

  // Update local address state if user auth store updates
  useEffect(() => {
    if (user) {
      if (user.houseNo) setHouseNo(user.houseNo);
      if (user.streetAddress) setStreetAddress(user.streetAddress);
      if (user.landmark) setLandmark(user.landmark);
    }
  }, [user]);

  const detectLocation = async () => {
    setIsLocating(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setIsLocating(false);
      Alert.alert('Permission Required', 'Location permission is required to find nearby partners and deliver service at your door.');
      return;
    }
    try {
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(loc);

      // Perform reverse geocode if streetAddress is empty
      if (!streetAddress || !user?.streetAddress) {
        let addresses = await Location.reverseGeocodeAsync(loc.coords);
        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          const autoStreet = [addr.name, addr.street, addr.subregion, addr.city].filter(Boolean).join(', ');
          if (autoStreet && !streetAddress) {
            setStreetAddress(autoStreet);
          }
        }
      }
    } catch (err) {
      console.log('Failed to get current location at checkout:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Set up socket listeners for booking updates
  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdate = (data: any) => {
      console.log('booking_status_update received:', data);
      setBooking(data);
    };

    const handlePartnerLocation = (data: any) => {
      console.log('partner_location_update received:', data);
      setPartnerLocation({ lat: data.lat, lng: data.lng });
    };

    socket.on('booking_status_update', handleBookingUpdate);
    socket.on('partner_location_update', handlePartnerLocation);

    return () => {
      socket.off('booking_status_update', handleBookingUpdate);
      socket.off('partner_location_update', handlePartnerLocation);
    };
  }, [socket]);

  const handleSaveAddress = async () => {
    if (!houseNo.trim()) {
      Alert.alert('Address Missing', 'Please enter your Flat / House / Door number.');
      return;
    }
    if (!streetAddress.trim()) {
      Alert.alert('Address Missing', 'Please enter your Street / Area / Building name.');
      return;
    }

    const fullAddr = `${houseNo.trim()}, ${streetAddress.trim()}${landmark.trim() ? `, Landmark: ${landmark.trim()}` : ''}`;
    const lat = currentLocation?.coords.latitude || user?.lat || 28.6139;
    const lng = currentLocation?.coords.longitude || user?.lng || 77.2090;

    try {
      setSavingAddress(true);
      await updateProfile(user?.name, fullAddr, user?.email, {
        houseNo: houseNo.trim(),
        streetAddress: streetAddress.trim(),
        landmark: landmark.trim(),
        fullAddress: fullAddr,
        lat,
        lng
      });
      setIsAddressModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error Saving Address', err.message || 'Failed to save address to database.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleConfirm = async () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Please add some services before confirming.");
      return;
    }

    if (!user || !user.phone) {
      Alert.alert("Authentication Required", "Please log in to confirm booking.");
      return;
    }

    // Require Door Address
    if (!houseNo.trim() || !streetAddress.trim()) {
      Alert.alert(
        "Door Address Required 🏠",
        "Please provide your full door address (House/Flat No & Street) so our service partner can reach your house.",
        [{ text: "Enter Address", onPress: () => setIsAddressModalVisible(true) }]
      );
      return;
    }

    const category = items[0]?.category || 'Electrician';
    const problemDescription = items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
    const customerId = user.phone;
    const customerName = user.name || 'Valued Customer';

    const lat = currentLocation?.coords.latitude || user?.lat || 28.6139;
    const lng = currentLocation?.coords.longitude || user?.lng || 77.2090;
    const fullAddr = `${houseNo.trim()}, ${streetAddress.trim()}${landmark.trim() ? `, Landmark: ${landmark.trim()}` : ''}`;

    console.log(`Emitting request_job for category ${category} at lat:${lat}, lng:${lng}`);
    
    // Set searching status in local booking store
    setBooking({
      jobId: 'pending_' + Date.now(),
      status: 'requesting',
      message: 'Submitting your request...'
    });

    socket?.emit('request_job', {
      customerId,
      customerName,
      problemDescription,
      category,
      paymentMethod,
      estimatedPrice: finalTotal,
      lat,
      lng,
      fullAddress: fullAddr,
      houseNo: houseNo.trim(),
      streetAddress: streetAddress.trim(),
      landmark: landmark.trim()
    });

    Alert.alert(
      "Request Placed! 🛠️",
      "Finding the nearest service professional. Track updates in your Bookings tab.",
      [
        { 
          text: "Track Booking", 
          onPress: () => {
            clearCart();
            navigation.navigate('MainTabs', { screen: 'Bookings' });
          } 
        }
      ]
    );
  };

  const formattedAddressText = houseNo && streetAddress 
    ? `${houseNo}, ${streetAddress}${landmark ? ` (Landmark: ${landmark})` : ''}`
    : null;

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
        
        {/* Door Address & Geolocation Card */}
        <Text style={styles.sectionTitle}>Door Address & Location 📍</Text>
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <Ionicons name="home-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.addressCardTitle}>Service Delivery Address</Text>
              {formattedAddressText ? (
                <Text style={styles.addressCardText}>{formattedAddressText}</Text>
              ) : (
                <Text style={styles.addressCardMissingText}>No door address saved yet. Enter details so partner can reach your house.</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setIsAddressModalVisible(true)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>{formattedAddressText ? 'Edit' : 'Add'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gpsRow}>
            <Ionicons 
              name={currentLocation ? "location" : "location-outline"} 
              size={16} 
              color={currentLocation ? "#16A34A" : colors.textSecondary} 
            />
            <Text style={styles.gpsText}>
              {isLocating 
                ? 'Detecting precise GPS coordinates...' 
                : currentLocation 
                  ? `Precise GPS Active (${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)})` 
                  : 'GPS location pending (Tap Edit to detect)'}
            </Text>
          </View>
        </View>

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

        <Text style={styles.sectionTitle}>Date & Time</Text>
        <View style={styles.card}>
          <View style={styles.timeRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.timeText}>{selectedTime}</Text>
            <TouchableOpacity><Text style={styles.changeBtn}>Change</Text></TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.paymentRow}
            onPress={() => setPaymentMethod('UPI')}
          >
            <Ionicons 
              name={paymentMethod === 'UPI' ? 'radio-button-on' : 'radio-button-off'} 
              size={24} 
              color={paymentMethod === 'UPI' ? colors.primary : colors.textSecondary} 
            />
            <Text style={styles.paymentText}>Pay via UPI (GPay, PhonePe)</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.paymentRow}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons 
              name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'} 
              size={24} 
              color={paymentMethod === 'COD' ? colors.primary : colors.textSecondary} 
            />
            <Text style={styles.paymentText}>Pay after Service (Cash)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Bill Details</Text>
        <View style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{total}</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow, { borderTopWidth: 0, marginTop: 0, paddingTop: 0 }]}>
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

      {/* Door Address Entry Modal */}
      <Modal
        visible={isAddressModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Precise Door Address</Text>
              <TouchableOpacity onPress={() => setIsAddressModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.gpsDetectBtn} onPress={detectLocation} disabled={isLocating}>
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.gpsDetectBtnText}>Auto-Detect Current GPS Location</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>House / Flat / Floor / Door No. *</Text>
              <TextInput 
                style={styles.textInput}
                placeholder="e.g. Flat 402, 4th Floor, Block B"
                value={houseNo}
                onChangeText={setHouseNo}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street / Area / Building *</Text>
              <TextInput 
                style={styles.textInput}
                placeholder="e.g. Green Valley Apartments, MG Road"
                value={streetAddress}
                onChangeText={setStreetAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark (Optional)</Text>
              <TextInput 
                style={styles.textInput}
                placeholder="e.g. Near Central Park / Behind City Mall"
                value={landmark}
                onChangeText={setLandmark}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveAddressBtn, savingAddress && { opacity: 0.7 }]} 
              onPress={handleSaveAddress}
              disabled={savingAddress}
            >
              {savingAddress ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveAddressBtnText}>Save Address & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  spacer: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addressCardText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 4,
    lineHeight: 20,
  },
  addressCardMissingText: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gpsText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  itemQty: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  changeBtn: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentText: {
    fontSize: 16,
    marginLeft: 12,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  billValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  gpsDetectBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: '#F8FAFC',
  },
  saveAddressBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveAddressBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
