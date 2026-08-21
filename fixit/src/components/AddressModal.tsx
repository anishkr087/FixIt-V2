import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';

const { width, height } = Dimensions.get('window');

export interface AddressData {
  houseNo: string;
  streetAddress: string;
  landmark: string;
  fullAddress: string;
  contactName: string;
  contactPhone: string;
  altPhone: string;
  addressType: 'Home' | 'Work';
  lat: number;
  lng: number;
}

interface AddressModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: (address: AddressData) => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  visible,
  onClose,
  onSaveSuccess,
}) => {
  const { user, updateProfile } = useAuthStore();
  const mapRef = useRef<MapView | null>(null);

  // Step state: 1 = Map Pin Location Selector, 2 = Address Form Sheet
  const [step, setStep] = useState<1 | 2>(1);

  // Map & Location State
  const [region, setRegion] = useState({
    latitude: user?.lat || 25.0113,
    longitude: user?.lng || 84.0200,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: user?.lat || 25.0113,
    lng: user?.lng || 84.0200,
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>('Selected Location');
  const [fullGeoAddress, setFullGeoAddress] = useState<string>(
    user?.streetAddress || user?.fullAddress || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State (Step 2)
  const [houseNo, setHouseNo] = useState<string>(user?.houseNo || '');
  const [areaVillage, setAreaVillage] = useState<string>(user?.streetAddress || '');
  const [city, setCity] = useState<string>(user?.location || '');
  const [localityNearby, setLocalityNearby] = useState<string>(user?.landmark || '');
  const [contactName, setContactName] = useState<string>(user?.name || '');
  const [contactPhone, setContactPhone] = useState<string>(
    user?.phone ? user.phone.replace('+91', '') : ''
  );
  const [altPhone, setAltPhone] = useState<string>(user?.altPhone || '');
  const [addressType, setAddressType] = useState<'Home' | 'Work'>(
    user?.addressType || 'Home'
  );
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setStep(1);
      if (user) {
        if (user.houseNo) setHouseNo(user.houseNo);
        if (user.landmark) setLocalityNearby(user.landmark);
        if (user.streetAddress) setAreaVillage(user.streetAddress);
        if (user.location) setCity(user.location);
        if (user.name) setContactName(user.name);
        if (user.phone) setContactPhone(user.phone.replace('+91', ''));
        if (user.altPhone) setAltPhone(user.altPhone);
        if (user.addressType) setAddressType(user.addressType);
        if (user.lat && user.lng) {
          const coords = { lat: user.lat, lng: user.lng };
          setSelectedCoords(coords);
          setRegion(prev => ({ ...prev, latitude: user.lat!, longitude: user.lng! }));
        }
      }
      detectCurrentLocation();
    }
  }, [visible, user]);

  const detectCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLocating(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLat = loc.coords.latitude;
      const newLng = loc.coords.longitude;
      const coords = { lat: newLat, lng: newLng };

      setSelectedCoords(coords);
      setRegion({
        latitude: newLat,
        longitude: newLng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: newLat,
            longitude: newLng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000
        );
      }

      await reverseGeocode(newLat, newLng);
    } catch (err) {
      console.log('Error detecting location:', err);
    } finally {
      setIsLocating(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      let addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const namePart = addr.name || addr.street || addr.subregion || 'Location';
        const formatted = [
          addr.name,
          addr.street,
          addr.subregion,
          addr.city,
          addr.region,
          addr.postalCode,
        ]
          .filter(Boolean)
          .join(', ');

        setLocationName(namePart);
        setFullGeoAddress(formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Auto-fill inputs from map coordinates
        if (addr.subregion || addr.district) {
          setAreaVillage(addr.subregion || addr.district || '');
        }
        if (addr.city || addr.subregion) {
          setCity(addr.city || addr.subregion || '');
        }
        if (addr.street || addr.name) {
          setLocalityNearby(addr.street || addr.name || '');
        }
      }
    } catch (err) {
      console.log('Reverse geocode error:', err);
      setFullGeoAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion);
    const coords = { lat: newRegion.latitude, lng: newRegion.longitude };
    setSelectedCoords(coords);
    reverseGeocode(newRegion.latitude, newRegion.longitude);
  };

  const handleSave = async () => {
    if (!houseNo.trim()) {
      Alert.alert('Required Field', 'Please enter your Flat / House / Building name.');
      return;
    }
    if (!areaVillage.trim()) {
      Alert.alert('Required Field', 'Please enter your Area / Village.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Required Field', 'Please enter your City.');
      return;
    }
    if (!contactName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const constructedFullAddress = `${houseNo.trim()}, ${localityNearby.trim()}, ${areaVillage.trim()}, ${city.trim()}`;

    try {
      setSaving(true);
      await updateProfile(contactName.trim(), city.trim(), user?.email, {
        houseNo: houseNo.trim(),
        streetAddress: areaVillage.trim(),
        landmark: localityNearby.trim(),
        fullAddress: constructedFullAddress,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        altPhone: altPhone.trim(),
        addressType: addressType,
      });

      const savedData: AddressData = {
        houseNo: houseNo.trim(),
        streetAddress: areaVillage.trim(),
        landmark: localityNearby.trim(),
        fullAddress: constructedFullAddress,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        altPhone: altPhone.trim(),
        addressType,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
      };

      if (onSaveSuccess) {
        onSaveSuccess(savedData);
      }
      onClose();
    } catch (err: any) {
      Alert.alert('Error Saving Address', err.message || 'Could not save address to server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {step === 1 ? (
          // ─── STEP 1: MAP LOCATION PINNER ("Add new address") ───
          <View style={styles.mapContainer}>
            {/* Header */}
            <View style={styles.mapHeader}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.mapHeaderTitle}>Add new address</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Search Input */}
            <View style={styles.searchBarWrap}>
              <Ionicons name="search" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by area, name, street."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Map View */}
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                mapType="none"
                initialRegion={region || { latitude: 25.0113, longitude: 84.0200, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                onRegionChangeComplete={handleRegionChangeComplete}
              >
                <UrlTile
                  urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                  maximumZ={19}
                  tileSize={256}
                  flipY={false}
                />
                <Marker coordinate={{ latitude: selectedCoords?.lat ?? 25.0113, longitude: selectedCoords?.lng ?? 84.0200 }} />
              </MapView>

              {/* Center Pin Indicator & Bubble */}
              <View style={styles.centerPinWrap} pointerEvents="none">
                <View style={styles.pinBubble}>
                  <Text style={styles.pinBubbleText}>Place pin on the exact location</Text>
                </View>
                <Ionicons name="location-sharp" size={40} color="#1E293B" />
              </View>

              {/* Floating "Use my current location" Button */}
              <TouchableOpacity
                style={styles.currentLocFloatingBtn}
                onPress={detectCurrentLocation}
                disabled={isLocating}
              >
                <Ionicons name="locate" size={18} color="#2563EB" style={{ marginRight: 6 }} />
                {isLocating ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text style={styles.currentLocFloatingText}>Use my current location</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Sheet Card */}
            <View style={styles.mapBottomSheet}>
              <Text style={styles.deliverToLabel}>Service At</Text>
              
              <View style={styles.locationCard}>
                <View style={styles.locationIconCircle}>
                  <Ionicons name="location" size={20} color="#2563EB" />
                </View>
                
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {locationName}
                  </Text>
                  <Text style={styles.locationSubText} numberOfLines={2}>
                    {fullGeoAddress || 'Detecting address location...'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.changeBtn} onPress={detectCurrentLocation}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setStep(2)}
              >
                <Text style={styles.primaryBtnText}>Add address Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ─── STEP 2: ADDRESS DETAILS FORM ("Service At") ───
          <View style={styles.formContainer}>
            {/* Header */}
            <View style={styles.formHeader}>
              <Text style={styles.formHeaderTitle}>Service At</Text>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
              {/* Info Alert Box */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={20} color="#9A3412" style={{ marginRight: 8 }} />
                <Text style={styles.infoBannerText}>
                  Ensure your address details are accurate for a smooth service experience
                </Text>
              </View>

              {/* Flat / House / Building name */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Flat/House/building name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter house, flat, building name"
                  placeholderTextColor="#94A3B8"
                  value={houseNo}
                  onChangeText={setHouseNo}
                  autoFocus
                />
              </View>

              {/* Locality (nearby) */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Locality (nearby) (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Near Main Temple, Landmark"
                  placeholderTextColor="#94A3B8"
                  value={localityNearby}
                  onChangeText={setLocalityNearby}
                />
              </View>

              {/* Area / Village */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Area / Village *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter area or village name"
                  placeholderTextColor="#94A3B8"
                  value={areaVillage}
                  onChangeText={setAreaVillage}
                />
              </View>

              {/* City */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter city"
                  placeholderTextColor="#94A3B8"
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              {/* Reference Geocoded Address */}
              <View style={styles.areaBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.areaBoxLabel}>Pinned Location Reference</Text>
                  <Text style={styles.areaBoxValue} numberOfLines={3}>
                    {fullGeoAddress || 'Location selected on map'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.changeBtn} onPress={() => setStep(1)}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Full Name */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Enter your full name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  value={contactName}
                  onChangeText={setContactName}
                />
              </View>

              {/* Mobile Number */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>10-digit mobile number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                />
              </View>

              {/* Alternate Phone Number */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Alternate phone number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Alternate phone number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={altPhone}
                  onChangeText={setAltPhone}
                />
              </View>

              {/* Type of Address */}
              <Text style={styles.typeTitle}>Type of address</Text>
              <View style={styles.typeRow}>
                {(['Home', 'Work'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, addressType === t && styles.typeChipActive]}
                    onPress={() => setAddressType(t)}
                  >
                    <Ionicons
                      name={t === 'Home' ? 'home-outline' : 'business-outline'}
                      size={18}
                      color={addressType === t ? colors.primary : '#475569'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.typeChipText, addressType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 20 }} />

              {/* Save Address Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save address</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Step 1 Map Styles
  mapContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPinWrap: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBubble: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  pinBubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  currentLocFloatingBtn: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  currentLocFloatingText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  mapBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  deliverToLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  locationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationSubText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  changeBtnText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Step 2 Form Styles
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  formContent: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 18,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  areaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  areaBoxLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',

  },
  areaBoxValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
    lineHeight: 18,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  typeChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  typeChipTextActive: {
    color: '#2563EB',
  },
});
