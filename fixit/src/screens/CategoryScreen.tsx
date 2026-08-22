import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/useCartStore';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';

const MOCK_SERVICES: Record<string, any[]> = {
  Welder: [
    { id: 'w1', name: 'Gate / Grill Repair & Welding', price: 999 },
    { id: 'w2', name: 'Door Latch / Hinge Repair', price: 349 },
    { id: 'w3', name: 'New Iron Railing Fabrication', price: 4999 },
  ],
  Electrician: [
    { id: 'e1', name: 'Full Home Wiring & Safety Audit', price: 4999 },
    { id: 'e2', name: 'AC Power Point Installation & Wiring', price: 499 },
    { id: 'e3', name: 'Distribution Board (DB) & MCB Box Upgrade', price: 1299 },
    { id: 'e4', name: 'Inverter & Battery Complete Setup', price: 899 },
  ],
  Plumber: [
    { id: 'p1', name: 'Water Pipe Leakage Repair & Fixing', price: 399 },
    { id: 'p2', name: 'Washbasin Blockage Clearing', price: 209 },
    { id: 'p3', name: 'Water Tank Installation & Setup', price: 899 },
    { id: 'p4', name: 'Complete Bathroom Fittings Installation', price: 1499 },
  ],
  Mechanic_Car: [
    { id: 'm_c1', name: 'Car Engine Tune-Up & General Service', price: 1899 },
    { id: 'm_c2', name: 'Complete Car Wash & Detailing', price: 999 },
    { id: 'm_c3', name: 'Brake System Inspection & Overhaul', price: 799 },
  ],
  Mechanic_Bike: [
    { id: 'm_b1', name: 'Two-Wheeler Full Servicing', price: 799 },
    { id: 'm_b2', name: 'Bike Engine Oil Change & Tuning', price: 499 },
  ],
  Mechanic_Auto: [
    { id: 'm_a1', name: 'Auto Full General Servicing', price: 999 },
    { id: 'm_a2', name: 'Auto Carburetor Tuning & Cleaning', price: 399 },
  ]
};

const ONE_TAP_SERVICES: Record<string, any[]> = {
  Plumber: [
    { id: 'ot_p1', name: 'Replace Small Plumbing Item (Tap Spindle / Washer / Teflon)', price: 99, icon: 'water-outline', color: '#FECFEF' },
    { id: 'ot_p2', name: 'Install or Replace Tap (Washbasin / Kitchen / Bathroom)', price: 149, icon: 'water-outline', color: '#FFF59D' },
    { id: 'ot_p3', name: 'Flush Tank Repair (Minor Issue / Ball Valve Replacement)', price: 149, icon: 'sync-outline', color: '#E0C3FC' },
    { id: 'ot_p4', name: 'Install or Replace Toilet Jet Spray', price: 299, icon: 'water-outline', color: '#E0C3FC' },
    { id: 'ot_p5', name: 'Install or Replace Shower Head', price: 249, icon: 'water-outline', color: '#A1C4FD' },
    { id: 'ot_p6', name: 'Sink / Waste Pipe Replacement', price: 199, icon: 'build-outline', color: '#FECFEF' },
    { id: 'ot_p7', name: 'New Bathroom Fitting Installation (Towel Ring / Holder)', price: 299, icon: 'construct-outline', color: '#FECFEF' },
    { id: 'ot_p8', name: 'Plumbing Inspection & Fault Diagnosis', price: 199, icon: 'search-outline', color: '#A78BFA' },
  ],
  Electrician: [
    { id: 'ot_e1', name: 'Replace Small Electrical Item (Switch / Socket / Holder / Plug Top / Regulator)', price: 99, icon: 'flash-outline', color: '#FECFEF' },
    { id: 'ot_e2', name: 'Install or Replace Light (Bulb / Tube / LED Batten)', price: 149, icon: 'bulb-outline', color: '#FFF59D' },
    { id: 'ot_e3', name: 'Fan Repair (Capacitor / Regulator / Minor Issue)', price: 149, icon: 'sync-outline', color: '#E0C3FC' },
    { id: 'ot_e4', name: 'Install or Replace Fan', price: 299, icon: 'sync-outline', color: '#E0C3FC' },
    { id: 'ot_e5', name: 'Install or Replace Exhaust Fan', price: 249, icon: 'sync-outline', color: '#A1C4FD' },
    { id: 'ot_e6', name: 'MCB / Fuse Replacement', price: 199, icon: 'flash-outline', color: '#FECFEF' },
    { id: 'ot_e7', name: 'New Electrical Point (Light / Fan / Socket)', price: 299, icon: 'construct-outline', color: '#FECFEF' },
    { id: 'ot_e8', name: 'Electrical Inspection & Fault Diagnosis', price: 199, icon: 'search-outline', color: '#A78BFA' },
  ],
  Mechanic_Car: [
    { id: 'ot_mc1', name: 'Battery & Starting Issue', price: 299, icon: 'flash-outline', color: '#FECFEF' },
    { id: 'ot_mc2', name: 'Engine Diagnosis & Minor Repair', price: 399, icon: 'search-outline', color: '#A78BFA' },
    { id: 'ot_mc3', name: 'Brake / Clutch Repair', price: 349, icon: 'construct-outline', color: '#FFF59D' },
    { id: 'ot_mc4', name: 'Tyre / Puncture Repair', price: 199, icon: 'construct-outline', color: '#60A5FA' },
    { id: 'ot_mc5', name: 'Oil & Filter Change', price: 399, icon: 'water-outline', color: '#A1C4FD' },
    { id: 'ot_mc6', name: 'Lights & Electrical Repair', price: 299, icon: 'bulb-outline', color: '#E0C3FC' },
    { id: 'ot_mc7', name: 'General Car Service', price: 599, icon: 'car-outline', color: '#FFF59D' },
    { id: 'ot_mc8', name: 'Breakdown Assistance', price: 499, icon: 'alert-circle-outline', color: '#FECFEF' },
  ],
  Mechanic_Bike: [
    { id: 'ot_mb1', name: 'Tyre / Puncture Service', price: 149, icon: 'construct-outline', color: '#60A5FA' },
    { id: 'ot_mb2', name: 'Battery Jump Start / Replacement', price: 199, icon: 'flash-outline', color: '#FECFEF' },
    { id: 'ot_mb3', name: 'Bike Not Starting Diagnosis', price: 249, icon: 'search-outline', color: '#A78BFA' },
    { id: 'ot_mb4', name: 'Engine Oil Change', price: 249, icon: 'water-outline', color: '#FFF59D' },
    { id: 'ot_mb5', name: 'Chain Cleaning & Lubrication', price: 199, icon: 'settings-outline', color: '#E0C3FC' },
    { id: 'ot_mb6', name: 'Lights & Electrical Repair', price: 199, icon: 'bulb-outline', color: '#FFF59D' },
    { id: 'ot_mb7', name: 'Clutch / Brake Adjustment', price: 249, icon: 'construct-outline', color: '#A1C4FD' },
  ],
  Mechanic_Auto: [
    { id: 'ot_ma1', name: 'Tyre / Puncture Repair', price: 149, icon: 'construct-outline', color: '#60A5FA' },
    { id: 'ot_ma2', name: 'Battery & Starting Issue', price: 249, icon: 'flash-outline', color: '#FECFEF' },
    { id: 'ot_ma3', name: 'Engine Diagnosis & Minor Repair', price: 349, icon: 'search-outline', color: '#A78BFA' },
    { id: 'ot_ma4', name: 'Brake / Clutch Repair', price: 299, icon: 'construct-outline', color: '#FFF59D' },
    { id: 'ot_ma5', name: 'Oil & Filter Change', price: 299, icon: 'water-outline', color: '#A1C4FD' },
    { id: 'ot_ma6', name: 'Lights & Electrical Repair', price: 249, icon: 'bulb-outline', color: '#E0C3FC' },
    { id: 'ot_ma7', name: 'General Auto Service', price: 499, icon: 'car-outline', color: '#FFF59D' },
    { id: 'ot_ma8', name: 'Breakdown Assistance', price: 449, icon: 'alert-circle-outline', color: '#FECFEF' },
  ],
  Carpenter: [
    { id: 'ot5', name: 'Door Lock Repair', price: 199, icon: 'key-outline', color: '#FBC2EB' },
  ],
  Welder: [
    { id: 'ot_w1', name: 'Minor Welding / Spot Welding', price: 199, icon: 'construct-outline', color: '#FECFEF' },
    { id: 'ot_w2', name: 'Hinge / Latch Welding Repair', price: 249, icon: 'build-outline', color: '#FFF59D' },
    { id: 'ot_w3', name: 'Metal Chair / Table Repair', price: 299, icon: 'hammer-outline', color: '#E0C3FC' },
    { id: 'ot_w4', name: 'Iron Gate / Lock Weld Fixing', price: 499, icon: 'key-outline', color: '#A1C4FD' },
  ],
};

export const CategoryScreen = ({ route, navigation }: any) => {
  const { categoryName } = route.params || { categoryName: 'Electrician' };
  const [mechanicSubTab, setMechanicSubTab] = useState<'Car' | 'Bike' | 'Auto'>('Car');
  
  const lookupCategory = categoryName === 'Mechanic' ? `Mechanic_${mechanicSubTab}` : categoryName;
  const mainServices = MOCK_SERVICES[lookupCategory] || [];
  const categoryOneTapServices = ONE_TAP_SERVICES[lookupCategory] || [];
  
  const { items, addItem, getTotal } = useCartStore();
  const cartTotal = getTotal();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{categoryName}</Text>
        <View style={styles.spacer} />
      </View>

      {categoryName === 'Mechanic' && (
        <View style={styles.subTabContainer}>
          {(['Car', 'Bike', 'Auto'] as const).map((tab) => {
            const isActive = mechanicSubTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.subTab, isActive && styles.activeSubTab]}
                onPress={() => setMechanicSubTab(tab)}
              >
                <Ionicons 
                  name={tab === 'Car' ? 'car-outline' : tab === 'Bike' ? 'bicycle-outline' : 'bus-outline'} 
                  size={18} 
                  color={isActive ? '#FFF' : colors.textSecondary} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.subTabText, isActive && styles.activeSubTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {categoryOneTapServices.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderTitleRow}>
                <Ionicons name="flash" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitleText}>One Tap Services</Text>
              </View>
              <Text style={styles.sectionSubtitleText}>Quick issues solved instantly</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.oneTapScroll}
              contentContainerStyle={styles.oneTapContainer}
            >
              {categoryOneTapServices.map((service) => (
                <GlassCard key={service.id} style={styles.oneTapCard}>
                  <View style={[styles.oneTapIconBg, { backgroundColor: service.color }]}>
                    <Ionicons name={service.icon as any} size={24} color={colors.textPrimary} />
                  </View>
                  <Text style={styles.oneTapName} numberOfLines={2}>{service.name}</Text>
                  <View style={styles.oneTapFooter}>
                    <Text style={styles.oneTapPrice}>₹{service.price}</Text>
                    <TouchableOpacity 
                      style={styles.oneTapAddBtn}
                      onPress={() => addItem({ id: service.id, name: service.name, price: service.price, category: categoryName })}
                    >
                      <Text style={styles.oneTapAddBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Book Professional Directly Section (Replacing old Regular Services) */}
        <View style={[styles.sectionContainer, { marginTop: categoryOneTapServices.length > 0 ? 10 : 0 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleRow}>
              <Ionicons name="people-outline" size={20} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitleText}>Book Professional Directly</Text>
            </View>
            <Text style={styles.sectionSubtitleText}>Get a certified expert at your doorstep</Text>
          </View>
          <GlassCard style={styles.serviceCard}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>Book {lookupCategory.replace('_', ' ')} Partner</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, paddingRight: 12 }}>
                Certified expert visits your home to inspect, diagnose, and fix the issue. Visiting charge is ₹199 (adjustable in the final bill).
              </Text>
              <Text style={[styles.price, { marginTop: 8 }]}>₹ 199</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => addItem({ 
                id: `bp_${lookupCategory}`, 
                name: `Book ${lookupCategory.replace('_', ' ')} Partner`, 
                price: 199, 
                category: categoryName 
              })}
            >
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </GlassCard>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFF',
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
  list: {
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sectionSubtitleText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  oneTapScroll: {
    marginHorizontal: -16,
    paddingLeft: 16,
  },
  oneTapContainer: {
    paddingRight: 32,
    gap: 16,
    flexDirection: 'row',
  },
  oneTapCard: {
    width: 220,
    height: 190,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 0,
    justifyContent: 'space-between',
  },
  oneTapIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  oneTapName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 18,
    height: 36,
  },
  oneTapFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  oneTapPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  oneTapAddBtn: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  oneTapAddBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFF',
    borderWidth: 0,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  addButton: {
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addText: {
    color: colors.primary,
    fontWeight: 'bold',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '600',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-between',
    gap: 12,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  activeSubTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeSubTabText: {
    color: '#FFF',
  },
});
