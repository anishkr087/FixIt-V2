import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
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

  const { user } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const { setBooking, setPartnerLocation } = useBookingStore();

  const total = getTotal();
  const taxes = Math.round(total * 0.18);
  const finalTotal = total + taxes + 49; // 49 is platform fee

  useEffect(() => {
    // Connect user socket to backend
    connect();

    // Acquire GPS location
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied for checkout');
        return;
      }
      try {
        let loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc);
      } catch (err) {
        console.log('Failed to get current location at checkout:', err);
      }
    })();
  }, []);

  // Set up socket listeners for booking updates
  useEffect(() => {
    if (!socket) return;

    socket.on('booking_status_update', (data: any) => {
      console.log('booking_status_update received:', data);
      setBooking(data);
    });

    socket.on('partner_location_update', (data: any) => {
      console.log('partner_location_update received:', data);
      setPartnerLocation({ lat: data.lat, lng: data.lng });
    });

    return () => {
      socket.off('booking_status_update');
      socket.off('partner_location_update');
    };
  }, [socket]);

  const handleConfirm = () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Please add some services before confirming.");
      return;
    }

    const category = items[0]?.category || 'Electrician';
    const problemDescription = items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
    const customerId = user?.phone || 'cust_' + Math.random().toString(36).substr(2, 9);
    const customerName = user?.name || 'Aisha Y.';

    const lat = currentLocation?.coords.latitude || 28.6139;
    const lng = currentLocation?.coords.longitude || 77.2090;

    console.log(`Emitting request_job for category ${category}`);
    
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
      estimatedPrice: finalTotal,
      lat,
      lng
    });

    Alert.alert(
      "Request Placed! 🛠️",
      "Finding the nearest service professional. Track updates in your Bookings tab.",
      [
        { 
          text: "Track Booking", 
          onPress: () => {
            clearCart();
            // Navigate to Bookings screen in MainTabs
            navigation.navigate('MainTabs', { screen: 'Bookings' });
          } 
        }
      ]
    );
  };

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
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Fee (18%)</Text>
            <Text style={styles.billValue}>₹{taxes}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Fee</Text>
            <Text style={styles.billValue}>₹49</Text>
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
  }
});
