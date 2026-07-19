import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Alert } from 'react-native';
// Lazy-load react-native-maps to prevent crash if native module not ready
let MapView: any = null, Marker: any = null, Polyline: any = null, Circle: any = null;
try { const M = require('react-native-maps'); MapView = M.default; Marker = M.Marker; Polyline = M.Polyline; Circle = M.Circle; } catch(e) { console.warn('Maps unavailable', e); }
import { MapPin, Navigation, CheckCircle, Clock, Truck, PlayCircle, PowerOff, Shield } from 'lucide-react-native';
import { io, Socket } from 'socket.io-client';
import * as Location from 'expo-location';
import axios from 'axios';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://fixit-v2.onrender.com';

export default function PartnerHomeScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState<any>(null);
  const [acceptedJob, setAcceptedJob] = useState<any>(null);
  
  // Job Workflow States: '' -> 'accepted' -> 'on_the_way' -> 'reached' -> 'work_started' -> 'completed'
  const [jobStatus, setJobStatus] = useState<string>(''); 
  
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fetchingWallet, setFetchingWallet] = useState<boolean>(true);

  const { partnerInfo, logout, token } = useAuth();

  const fetchWalletBalance = async () => {
    try {
      const response = await axios.get(`${API_URL}/partner/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(response.data.walletBalance);
      
      // Force offline if suspended
      if (response.data.walletBalance <= -500 && isOnlineRef.current) {
        setIsOnline(false);
        socketRef.current?.emit('go_offline', { partnerId: partnerInfo?._id });
      }
    } catch (e) {
      console.log('Failed to fetch wallet balance on home screen:', e);
    } finally {
      setFetchingWallet(false);
    }
  };

  const handlePayDues = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/partner/clear-dues`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Payment Successful ✅', 'Outstanding dues cleared successfully. Your account is now active.');
      setWalletBalance(response.data.walletBalance);
    } catch (e: any) {
      console.log('Failed to pay dues:', e);
      Alert.alert('Payment Failed', e.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletBalance();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchWalletBalance();
    });
    return unsubscribe;
  }, [navigation]);
  
  // Membership settings (Commented out for future update)
  // const [selectedTier, setSelectedTier] = useState<'basic' | 'silver' | 'gold'>(partnerInfo?.membershipTier || 'basic');
  const selectedTier = 'basic';

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  
  // Ref tracking to bypass React hook closure caching inside setupLocationAndSockets watchPosition callback
  const isOnlineRef = useRef(isOnline);
  const acceptedJobRef = useRef(acceptedJob);
  const jobStatusRef = useRef(jobStatus);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    acceptedJobRef.current = acceptedJob;
  }, [acceptedJob]);

  useEffect(() => {
    jobStatusRef.current = jobStatus;
  }, [jobStatus]);

  const getTierConfig = () => {
    /* FUTURE UPDATE:
    switch (selectedTier) {
      case 'silver':
        return {
          radius: 5000,
          strokeColor: 'rgba(245, 158, 11, 0.5)',
          fillColor: 'rgba(245, 158, 11, 0.12)',
        };
      case 'gold':
        return {
          radius: 7500,
          strokeColor: 'rgba(245, 158, 11, 0.5)',
          fillColor: 'rgba(245, 158, 11, 0.12)',
        };
      case 'basic':
      default:
        return {
          radius: 3000,
          strokeColor: 'rgba(16, 185, 129, 0.5)',
          fillColor: 'rgba(16, 185, 129, 0.12)',
        };
    }
    */
    return {
      radius: 3000,
      strokeColor: 'rgba(16, 185, 129, 0.5)',
      fillColor: 'rgba(16, 185, 129, 0.12)',
    };
  };

  const getMapDeltas = () => {
    if (!isOnline) return { latitudeDelta: 0.02, longitudeDelta: 0.02 };
    /* FUTURE UPDATE:
    switch (selectedTier) {
      case 'gold': return { latitudeDelta: 0.16, longitudeDelta: 0.16 };
      case 'silver': return { latitudeDelta: 0.11, longitudeDelta: 0.11 };
      case 'basic':
      default: return { latitudeDelta: 0.07, longitudeDelta: 0.07 };
    }
    */
    return { latitudeDelta: 0.07, longitudeDelta: 0.07 };
  };

  useEffect(() => {
    setupLocationAndSockets();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (locationSubRef.current) locationSubRef.current.remove();
      socketRef.current?.disconnect();
    };
  }, []);

  const setupLocationAndSockets = async () => {
    // 1. Get GPS Permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow location tracking to use the partner app.');
      setLoading(false);
      return;
    }

    // Get initial location
    const location = await Location.getCurrentPositionAsync({});
    setCurrentLocation(location);
    setLoading(false);

    // 2. Start Live Tracking Broadcast
    locationSubRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      (loc) => {
        setCurrentLocation(loc);
        if (isOnlineRef.current && socketRef.current) {
          socketRef.current.emit('update_location', { 
            partnerId: partnerInfo?._id, 
            lat: loc.coords.latitude, 
            lng: loc.coords.longitude 
          });
        }
      }
    );

    // 3. Setup Socket
    socketRef.current = io(SOCKET_URL, {
      auth: { token }
    });
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server with auth token:', socketRef.current?.id);
    });

    socketRef.current.on('new_job_broadcast', (jobData: any) => {
      // Use refs to read current state values — avoids stale closure
      if (!acceptedJobRef.current && !jobStatusRef.current) { 
        setIncomingJob(jobData);
        startTimer();
      }
    });

    socketRef.current.on('job_assigned_to_other', () => {
      handleDeclineJob(); 
    });

    socketRef.current.on('error_notification', (msg: string) => {
      Alert.alert('Account Status', msg);
    });
  };

  const handleToggleOnline = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    if (newStatus) {
      socketRef.current?.emit('go_online', { 
        partnerId: partnerInfo?._id,
        lat: currentLocation?.coords.latitude,
        lng: currentLocation?.coords.longitude,
        membershipTier: selectedTier,
        serviceCategory: partnerInfo?.serviceCategory
      });
    } else {
      socketRef.current?.emit('go_offline', { partnerId: partnerInfo?._id });
    }
  };

  /* FUTURE UPDATE:
  const handleTierChange = (tier: 'basic' | 'silver' | 'gold') => {
    setSelectedTier(tier);
    if (isOnline) {
      socketRef.current?.emit('go_online', {
        partnerId: partnerInfo?._id,
        lat: currentLocation?.coords.latitude,
        lng: currentLocation?.coords.longitude,
        membershipTier: tier,
        serviceCategory: partnerInfo?.serviceCategory
      });
      Alert.alert(
        'Range Extended', 
        `Switched to ${tier.toUpperCase()}. Service range is now ${tier === 'basic' ? '3km' : tier === 'silver' ? '5km' : '7.5km'}.`
      );
    }
  };
  */

  const startTimer = () => {
    setTimeLeft(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIncomingJob(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAcceptJob = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    socketRef.current?.emit('accept_job', { jobId: incomingJob.jobId, partnerId: partnerInfo?._id });
    setAcceptedJob(incomingJob);
    setJobStatus('accepted');
    setIncomingJob(null);
  };

  const handleDeclineJob = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIncomingJob(null);
  };

  const advanceJobStatus = (newStatus: string) => {
    setJobStatus(newStatus);
    socketRef.current?.emit('update_job_status', { 
      jobId: acceptedJob.jobId, 
      partnerId: partnerInfo?._id,
      status: newStatus 
    });

    if (newStatus === 'completed') {
      Alert.alert('Job Completed!', 'Payment has been processed cleanly.');
      setAcceptedJob(null);
      setJobStatus('');
      // Trigger earnings refresh if needed
    }
  };

  if (loading || !currentLocation) {
    return (
      <View style={[styles.container, styles.centerElements]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Acquiring high-accuracy GPS...</Text>
      </View>
    );
  }

  // Draw simulated route line between partner and customer if job accepted
  const routeCoordinates = acceptedJob ? [
    { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude },
    { latitude: acceptedJob.lat, longitude: acceptedJob.lng }
  ] : [];

  if (walletBalance <= -500) {
    return (
      <SafeAreaView style={[styles.container, styles.suspendedContainer]}>
        <View style={styles.suspendedContent}>
          <View style={styles.suspendedIconContainer}>
            <Shield size={48} color={colors.error} />
          </View>
          <Text style={styles.suspendedTitle}>Account Suspended</Text>
          <Text style={styles.suspendedSubtitle}>
            Your partner profile is suspended because your wallet balance has reached the maximum overdraft limit of -₹500.
          </Text>
          
          <View style={styles.dueCard}>
            <Text style={styles.dueLabel}>Outstanding Balance</Text>
            <Text style={styles.dueValue}>₹{walletBalance}</Text>
          </View>

          <TouchableOpacity style={styles.payDuesButton} onPress={handlePayDues} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.payDuesButtonText}>Pay Outstanding Balance (₹{Math.abs(walletBalance)})</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.suspendedLogoutBtn} onPress={logout}>
            <Text style={styles.suspendedLogoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={false} 
        region={{
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          ...getMapDeltas()
        }}
      >
        {/* Dynamic Range Circle */}
        {isOnline && (
          <Circle
            center={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude
            }}
            radius={getTierConfig().radius}
            strokeColor={getTierConfig().strokeColor}
            fillColor={getTierConfig().fillColor}
            strokeWidth={2}
          />
        )}

        {/* Partner GPS Marker */}
        <Marker coordinate={{ latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude }} title="You">
          <View style={styles.partnerMarker}>
            <View style={styles.partnerMarkerInner} />
          </View>
        </Marker>

        {/* Customer Marker */}
        {(incomingJob || acceptedJob) && (
          <Marker
            coordinate={{ 
              latitude: incomingJob?.lat || acceptedJob?.lat, 
              longitude: incomingJob?.lng || acceptedJob?.lng 
            }}
          >
            <View style={styles.requestMarker}>
              <MapPin size={28} color={colors.card} fill={acceptedJob ? colors.success : colors.warning} />
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {acceptedJob && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      <SafeAreaView style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleToggleOnline} style={styles.statusBadge} disabled={!!acceptedJob || walletBalance <= -500}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.textSecondary }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Warning Banner for Low Balance (wallet <= -300 and > -500) */}
        {walletBalance <= -300 && walletBalance > -500 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              ⚠️ Warning: Low wallet balance (₹{walletBalance}). Clear outstanding dues soon to avoid account suspension (threshold: -₹500).
            </Text>
          </View>
        )}

        {/* FUTURE UPDATE: Membership Tier selector overlay
        <View style={styles.membershipSelectorBar}>
          {(['basic', 'silver', 'gold'] as const).map((tier) => {
            const active = selectedTier === tier;
            let activeColor = colors.success; // Basic is green
            if (tier === 'silver' || tier === 'gold') activeColor = colors.warning; // Silver/Gold are yellow/amber
            return (
              <TouchableOpacity
                key={tier}
                style={[
                  styles.tierTab,
                  active && { backgroundColor: activeColor, borderColor: activeColor }
                ]}
                onPress={() => handleTierChange(tier)}
                disabled={!!acceptedJob}
              >
                <Shield size={12} color={active ? '#FFF' : colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.tierTabText, active && styles.tierTabTextActive]}>
                  {tier.toUpperCase()} ({tier === 'basic' ? '3km' : tier === 'silver' ? '5km' : '7.5km'})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        */}
      </SafeAreaView>

      {/* Incoming Job Popup (30-sec limit) */}
      {incomingJob && !acceptedJob && (
        <View style={styles.bottomSheet}>
          <View style={styles.timerRow}>
            <Clock size={20} color={colors.error} />
            <Text style={styles.timerText}>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</Text>
          </View>
          <Text style={styles.jobTitle}>{incomingJob.problemDescription}</Text>
          <Text style={styles.jobUser}>Customer: {incomingJob.customerName}</Text>
          
          <View style={styles.jobDetailsRow}>
            <View style={styles.jobDetailBox}>
              <Text style={styles.jobDetailLabel}>Distance</Text>
              <Text style={styles.jobDetailValue}>{incomingJob.distance} km</Text>
            </View>
            <View style={styles.jobDetailBox}>
              <Text style={styles.jobDetailLabel}>Earnings</Text>
              <Text style={styles.jobDetailValue}>₹{(incomingJob.estimatedPrice * 0.8).toFixed(0)}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={handleDeclineJob}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAcceptJob}>
              <Text style={styles.buttonText}>Accept Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Offline Bottom Sheet */}
      {!isOnline && !acceptedJob && !incomingJob && (
        <View style={styles.bottomSheet}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <PowerOff size={32} color={colors.textSecondary} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>You're Offline</Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 }}>
              Turn your status online to start receiving job requests and earning money.
            </Text>
          </View>
          <TouchableOpacity style={[styles.button, styles.acceptButton, { height: 56 }]} onPress={handleToggleOnline}>
            <Text style={[styles.buttonText, { fontSize: 18 }]}>Go Online Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Accepted Job UI Workflow */}
      {acceptedJob && (
         <View style={styles.bottomSheet}>
          <View style={styles.workflowHeader}>
            {jobStatus === 'accepted' && <Navigation size={24} color={colors.primary} />}
            {jobStatus === 'on_the_way' && <Truck size={24} color={colors.primary} />}
            {jobStatus === 'reached' && <MapPin size={24} color={colors.warning} />}
            {jobStatus === 'work_started' && <PlayCircle size={24} color={colors.success} />}
            
            <Text style={styles.workflowTitle}>
              {jobStatus === 'accepted' && 'Job Accepted'}
              {jobStatus === 'on_the_way' && 'Heading to Customer'}
              {jobStatus === 'reached' && 'Arrived at Location'}
              {jobStatus === 'work_started' && 'Work in Progress'}
            </Text>
          </View>
          
          <Text style={styles.jobUser}>Task: {acceptedJob.problemDescription}</Text>
          <View style={styles.divider} />
          <Text style={styles.addressText}>Address: Sector 14, Main Road, Block A</Text>
          
          {/* Workflow Action Button */}
          {jobStatus === 'accepted' && (
            <TouchableOpacity style={[styles.button, styles.workflowBtnBase]} onPress={() => advanceJobStatus('on_the_way')}>
              <Text style={styles.buttonText}>Start Journey</Text>
            </TouchableOpacity>
          )}

          {jobStatus === 'on_the_way' && (
            <TouchableOpacity style={[styles.button, styles.workflowBtnBase]} onPress={() => advanceJobStatus('reached')}>
              <Text style={styles.buttonText}>Reached Customer Location</Text>
            </TouchableOpacity>
          )}

          {jobStatus === 'reached' && (
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.warning }]} onPress={() => advanceJobStatus('work_started')}>
              <Text style={styles.buttonText}>Start Work</Text>
            </TouchableOpacity>
          )}

          {jobStatus === 'work_started' && (
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.success }]} onPress={() => advanceJobStatus('completed')}>
              <CheckCircle size={20} color={colors.card} style={{marginRight: 8}} />
              <Text style={styles.buttonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
       </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerElements: { justifyContent: 'center', alignItems: 'center' },
  map: { width: width, height: height },
  topBarContainer: { position: 'absolute', top: 0, width: '100%' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 24 : 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, elevation: 3 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontWeight: 'bold', color: colors.text },
  logoutButton: { backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, elevation: 3, justifyContent: 'center' },
  logoutText: { fontWeight: 'bold', color: colors.error },
  offlineBanner: { backgroundColor: colors.card, margin: 20, padding: 16, borderRadius: 16, elevation: 5, alignItems: 'center' },
  offlineText: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  offlineSubText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  bottomSheet: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: colors.card, borderRadius: 24, padding: 24, elevation: 10 },
  timerRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  timerText: { color: colors.error, fontWeight: 'bold', marginLeft: 6 },
  jobTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  jobUser: { fontSize: 16, color: colors.textSecondary, marginBottom: 16 },
  jobDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  jobDetailBox: { flex: 1, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12, marginHorizontal: 4 },
  jobDetailLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  jobDetailValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, flexDirection: 'row' },
  declineButton: { backgroundColor: '#F1F5F9' },
  acceptButton: { backgroundColor: colors.primary },
  buttonText: { color: colors.card, fontSize: 16, fontWeight: 'bold' },
  partnerMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(37, 99, 235, 0.3)', alignItems: 'center', justifyContent: 'center' },
  partnerMarkerInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 3 },
  requestMarker: { alignItems: 'center', justifyContent: 'center' },
  workflowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  workflowTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginLeft: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  addressText: { fontSize: 14, color: colors.text, marginBottom: 20, fontStyle: 'italic' },
  workflowBtnBase: { backgroundColor: colors.primary, marginTop: 4 },
  
  membershipSelectorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tierTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tierTabText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  tierTabTextActive: {
    color: '#FFFFFF',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  warningBannerText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 18,
  },
  suspendedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  suspendedContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  suspendedIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  suspendedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  suspendedSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dueCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dueValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.error,
  },
  payDuesButton: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  payDuesButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  suspendedLogoutBtn: {
    paddingVertical: 12,
  },
  suspendedLogoutBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
