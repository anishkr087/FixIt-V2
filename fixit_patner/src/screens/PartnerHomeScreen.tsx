import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Vibration,
  Linking,
  Modal,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  User,
  Power,
  IndianRupee,
  Briefcase,
  Zap,
  MapPin,
  Clock,
  Navigation,
  CheckCircle,
  Truck,
  PlayCircle,
  Shield,
  X,
  Eye,
  Radio,
  FileText,
  ExternalLink,
} from 'lucide-react-native';
import { io, Socket } from 'socket.io-client';
import * as Location from 'expo-location';
import axios from 'axios';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

let TaskManager: any = null;
try {
  TaskManager = require('expo-task-manager');
} catch (e) {
  console.warn('expo-task-manager unavailable:', e);
}

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://fixit-v2.onrender.com';
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_PARTNER_LOCATION_TASK';

if (TaskManager && TaskManager.defineTask) {
  try {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }: any) => {
      if (error) {
        console.error('[Background Location] Task error:', error);
        return;
      }
      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
          console.log('[Background Location] Active partner position:', locations[0].coords.latitude, locations[0].coords.longitude);
        }
      }
    });
  } catch (e) {
    console.log('[Background Location] Task definition check note:', e);
  }
}

const playAlarmSound = () => {
  try {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }
    if (typeof window !== 'undefined' && ((window as any).AudioContext || (window as any).webkitAudioContext)) {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      [0, 0.22, 0.44, 0.66].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + delay + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    }
  } catch (e) {
    console.log('Alarm sound notification note:', e);
  }
};

const parseJobDescription = (desc: string) => {
  if (!desc) return { items: 'Job Request', details: '', photos: [] };
  try {
    const parsed = JSON.parse(desc);
    if (parsed && (parsed.items || parsed.details || parsed.photos)) {
      return {
        items: parsed.items || 'Job Request',
        details: parsed.details || '',
        photos: parsed.photos || []
      };
    }
  } catch (e) {
    // Plain text format
  }
  return { items: desc, details: '', photos: [] };
};

export default function PartnerHomeScreen({ navigation }: any) {
  const { partnerInfo, logout, token } = useAuth();

  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState<any>(null);
  const [acceptedJob, setAcceptedJob] = useState<any>(null);
  const [jobStatus, setJobStatus] = useState<string>(''); // '' -> 'accepted' -> 'on_the_way' -> 'reached' -> 'work_started' -> 'completed'
  const [timeLeft, setTimeLeft] = useState(30);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [todayJobsCount, setTodayJobsCount] = useState<number>(0);
  const [upcomingJobs, setUpcomingJobs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentSelectionModal, setShowPaymentSelectionModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Earnings & Wallet Balance
      const earningsRes = await axios.get(`${API_URL}/partner/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (earningsRes.data) {
        setWalletBalance(earningsRes.data.walletBalance ?? 0);
        setTodayEarnings(earningsRes.data.todayEarnings ?? 0);
        setTodayJobsCount(earningsRes.data.jobsCompleted ?? 0);

        // Force offline if suspended
        if (earningsRes.data.walletBalance <= -500 && isOnlineRef.current) {
          setIsOnline(false);
          socketRef.current?.emit('go_offline', { partnerId: partnerInfo?._id });
        }
      }

      // 2. Fetch Jobs history & active job
      const jobsRes = await axios.get(`${API_URL}/partner/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (jobsRes.data?.success && jobsRes.data.history) {
        const active = jobsRes.data.history.find(
          (j: any) => j.status !== 'completed' && j.status !== 'cancelled'
        );
        if (active) {
          setAcceptedJob({
            jobId: active.id,
            customerName: active.customerName,
            problemDescription: active.problemDescription,
            estimatedPrice: active.amount,
            fullAddress: active.address,
            lat: active.lat,
            lng: active.lng,
          });
          setJobStatus(active.status);
        }

        // Upcoming / recent scheduled jobs
        const upcoming = jobsRes.data.history.filter(
          (j: any) => j.status === 'scheduled' || j.status === 'accepted'
        );
        setUpcomingJobs(upcoming.length > 0 ? upcoming : jobsRes.data.history.slice(0, 3));
      }
    } catch (e) {
      console.log('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setupLocationAndSockets();
    fetchDashboardData();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData();
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
      socketRef.current?.disconnect();
    };
  }, [navigation]);

  const setupLocationAndSockets = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc);
      }
    } catch (e) {
      console.log('Location permission / position note:', e);
    }

    socketRef.current = io(SOCKET_URL, {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('[Socket] Connected with auth token:', socketRef.current?.id);
    });

    socketRef.current.on('new_job_broadcast', (jobData: any) => {
      if (!acceptedJobRef.current && !jobStatusRef.current) {
        setIncomingJob(jobData);
        playAlarmSound();
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

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    if (newStatus) {
      let loc = currentLocation;
      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCurrentLocation(loc);
      } catch (err) {
        console.log('Error getting position for go_online:', err);
      }

      socketRef.current?.emit('go_online', {
        partnerId: partnerInfo?._id,
        lat: loc?.coords.latitude || 25.0113,
        lng: loc?.coords.longitude || 84.0200,
        serviceCategory: partnerInfo?.serviceCategory
      });
    } else {
      socketRef.current?.emit('go_offline', { partnerId: partnerInfo?._id });
    }
  };

  const startTimer = () => {
    setTimeLeft(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
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
    if (newStatus === 'completed') {
      setShowPaymentSelectionModal(true);
    } else {
      setJobStatus(newStatus);
      socketRef.current?.emit('update_job_status', {
        jobId: acceptedJob.jobId,
        partnerId: partnerInfo?._id,
        status: newStatus
      });
    }
  };

  const submitJobCompletion = (method: 'UPI' | 'COD') => {
    if (!acceptedJob) return;
    setShowPaymentSelectionModal(false);
    socketRef.current?.emit('complete_job', {
      jobId: acceptedJob.jobId,
      partnerId: partnerInfo?._id,
      paymentMethod: method
    });
    Alert.alert('Job Completed! 🎉', `Job marked as completed. Payment recorded via ${method === 'UPI' ? 'UPI' : 'Cash'}.`);
    setAcceptedJob(null);
    setJobStatus('');
    fetchDashboardData();
  };

  // Redirect to Google Maps for turn-by-turn directions using coordinates
  const handleOpenDirections = (lat?: number, lng?: number) => {
    const targetLat = lat || incomingJob?.lat || acceptedJob?.lat;
    const targetLng = lng || incomingJob?.lng || acceptedJob?.lng;

    if (!targetLat || !targetLng) {
      Alert.alert('Location Coordinates', 'Coordinates are not available for this job.');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://maps.google.com/?q=${targetLat},${targetLng}`);
        }
      })
      .catch((err) => {
        console.error('Error opening Google Maps:', err);
        Alert.alert('Error', 'Failed to open navigation directions.');
      });
  };

  const handlePayDues = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/partner/clear-dues`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Payment Successful ✅', 'Outstanding dues cleared successfully. Your account is now active.');
      setWalletBalance(response.data.walletBalance);
      fetchDashboardData();
    } catch (e: any) {
      console.log('Failed to pay dues:', e);
      Alert.alert('Payment Failed', e.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Suspension check
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

  const incomingParsedDesc = incomingJob ? parseJobDescription(incomingJob.problemDescription) : null;
  const acceptedParsedDesc = acceptedJob ? parseJobDescription(acceptedJob.problemDescription) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>
            Fixit <Text style={styles.brandSubtitle}>Partner</Text>
          </Text>
          <Text style={styles.welcomeText}>
            {partnerInfo?.serviceCategory ? `${partnerInfo.serviceCategory} Expert` : 'Service Dashboard'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowNotificationsModal(true)}
            activeOpacity={0.7}
          >
            <Bell size={22} color={colors.text} />
            {incomingJob && <View style={styles.headerNotifDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <User size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} colors={[colors.primary]} />}
      >
        {/* ── ONLINE / OFFLINE HERO CARD ── */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View style={styles.statusIndicatorRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : '#94A3B8' }]} />
            <Text style={[styles.statusStateText, { color: isOnline ? colors.success : colors.textSecondary }]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>

          <Text style={styles.statusDescription}>
            {isOnline
              ? "You're available for jobs"
              : "You're currently offline. Turn on to start receiving jobs"}
          </Text>

          <TouchableOpacity
            style={[styles.toggleStatusBtn, isOnline ? styles.goOfflineBtn : styles.goOnlineBtn]}
            onPress={handleToggleOnline}
            activeOpacity={0.85}
            disabled={!!acceptedJob}
          >
            <Power size={18} color={isOnline ? colors.error : '#FFFFFF'} style={{ marginRight: 8 }} />
            <Text style={isOnline ? styles.goOfflineBtnText : styles.goOnlineBtnText}>
              {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TODAY METRICS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TODAY</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
            <Text style={styles.viewMoreLink}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.todayRow}>
          {/* Earnings Card */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Earnings')}
          >
            <View style={styles.metricIconWrap}>
              <IndianRupee size={20} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>₹{todayEarnings.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricLabel}>Earnings</Text>
          </TouchableOpacity>

          {/* Jobs Card */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('History')}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Briefcase size={20} color={colors.success} />
            </View>
            <Text style={styles.metricValue}>{todayJobsCount}</Text>
            <Text style={styles.metricLabel}>Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* ── ACTIVE JOB (When job is in progress) ── */}
        {acceptedJob && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>ACTIVE JOB</Text>
              <View style={styles.activeStatusPill}>
                <Text style={styles.activeStatusPillText}>
                  {jobStatus === 'accepted' && 'Accepted'}
                  {jobStatus === 'on_the_way' && 'Heading to Customer'}
                  {jobStatus === 'reached' && 'Reached Location'}
                  {jobStatus === 'work_started' && 'Work In Progress'}
                </Text>
              </View>
            </View>

            <View style={styles.activeJobCard}>
              <View style={styles.activeJobHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeJobTitle}>
                    {acceptedParsedDesc?.items || 'Current Job'}
                  </Text>
                  <Text style={styles.activeCustomerName}>
                    Customer: {acceptedJob.customerName || 'Customer'}
                  </Text>
                </View>
                <Text style={styles.activeJobPrice}>₹{acceptedJob.estimatedPrice}</Text>
              </View>

              {acceptedParsedDesc?.details ? (
                <Text style={styles.activeJobNotes} numberOfLines={2}>
                  "{acceptedParsedDesc.details}"
                </Text>
              ) : null}

              {/* Clickable address with coordinates */}
              <TouchableOpacity
                style={styles.activeAddressCard}
                onPress={() => handleOpenDirections(acceptedJob.lat, acceptedJob.lng)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <MapPin size={16} color={colors.primary} style={{ marginRight: 6, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeAddressText}>
                      {acceptedJob.fullAddress || acceptedJob.doorAddress || 'Door address specified on booking'}
                    </Text>
                    <Text style={styles.tapToNavigateHint}>
                      📍 Tap to open turn-by-turn directions in Google Maps ↗
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Workflow advancement button */}
              {jobStatus === 'accepted' && (
                <TouchableOpacity
                  style={styles.workflowActionBtn}
                  onPress={() => advanceJobStatus('on_the_way')}
                  activeOpacity={0.85}
                >
                  <Truck size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.workflowActionBtnText}>Start Journey</Text>
                </TouchableOpacity>
              )}

              {jobStatus === 'on_the_way' && (
                <TouchableOpacity
                  style={styles.workflowActionBtn}
                  onPress={() => advanceJobStatus('reached')}
                  activeOpacity={0.85}
                >
                  <MapPin size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.workflowActionBtnText}>Reached Customer Location</Text>
                </TouchableOpacity>
              )}

              {jobStatus === 'reached' && (
                <TouchableOpacity
                  style={[styles.workflowActionBtn, { backgroundColor: colors.warning }]}
                  onPress={() => advanceJobStatus('work_started')}
                  activeOpacity={0.85}
                >
                  <PlayCircle size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.workflowActionBtnText}>Start Work</Text>
                </TouchableOpacity>
              )}

              {jobStatus === 'work_started' && (
                <TouchableOpacity
                  style={[styles.workflowActionBtn, { backgroundColor: colors.success }]}
                  onPress={() => setShowPaymentSelectionModal(true)}
                  activeOpacity={0.85}
                >
                  <CheckCircle size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.workflowActionBtnText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── UPCOMING BOOKINGS ── */}
        {!acceptedJob && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>UPCOMING</Text>
            </View>

            {upcomingJobs.length > 0 ? (
              upcomingJobs.map((job: any, index: number) => {
                const desc = parseJobDescription(job.problemDescription);
                return (
                  <View key={job.id || index} style={styles.upcomingCard}>
                    <View style={styles.upcomingMain}>
                      <View style={styles.upcomingTimeRow}>
                        <Clock size={14} color={colors.primary} style={{ marginRight: 5 }} />
                        <Text style={styles.upcomingTimeText}>
                          {job.time || 'Scheduled for today'}
                        </Text>
                      </View>
                      <Text style={styles.upcomingServiceTitle} numberOfLines={1}>
                        {desc.items}
                      </Text>
                      <View style={styles.upcomingLocationRow}>
                        <MapPin size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.upcomingLocationText} numberOfLines={1}>
                          {job.address || 'Nearby service location'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.upcomingPriceCol}>
                      <Text style={styles.upcomingPrice}>₹{job.amount}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyUpcomingBox}>
                <Clock size={28} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyUpcomingTitle}>No upcoming bookings</Text>
                <Text style={styles.emptyUpcomingSubtitle}>
                  {isOnline ? 'Stay online to receive instant booking alerts.' : 'Turn your status online to receive requests.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── HIGH PRIORITY MODAL: JOB ALERT POPUP (No Map, Clickable Coordinates) ── */}
      <Modal
        visible={!!incomingJob && !acceptedJob}
        animationType="slide"
        transparent={true}
        onRequestClose={handleDeclineJob}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            {/* Header: 🔔 NEW JOB */}
            <View style={styles.alertHeaderRow}>
              <View style={styles.alertBellBadge}>
                <Bell size={22} color="#D97706" />
              </View>
              <Text style={styles.alertHeading}>NEW JOB</Text>
            </View>

            {/* Service Name: e.g. AC Service */}
            <Text style={styles.alertServiceTitle}>
              {incomingParsedDesc?.items || partnerInfo?.serviceCategory || 'Service Request'}
            </Text>

            {/* Location & Coordinates (Clickable -> Redirects to Google Maps Directions) */}
            <TouchableOpacity
              style={styles.alertLocationPill}
              onPress={() => handleOpenDirections(incomingJob?.lat, incomingJob?.lng)}
              activeOpacity={0.8}
            >
              <View style={styles.alertLocRow}>
                <MapPin size={20} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.alertDistanceText}>
                  {incomingJob?.distance ? `${incomingJob.distance} km` : '2.4 km'}
                </Text>
                <Navigation size={14} color={colors.primary} style={{ marginLeft: 6 }} />
              </View>
              <Text style={styles.alertCoordsText}>
                {incomingJob?.lat && incomingJob?.lng
                  ? `(${incomingJob.lat.toFixed(4)}, ${incomingJob.lng.toFixed(4)}) • Tap for directions`
                  : 'Tap to view directions on Google Maps'}
              </Text>
            </TouchableOpacity>

            {/* Price: ₹499 */}
            <Text style={styles.alertPriceText}>₹{incomingJob?.estimatedPrice}</Text>

            {/* Customer Requested: "AC not cooling" */}
            <View style={styles.alertCustomerBox}>
              <Text style={styles.alertCustomerLabel}>Customer requested:</Text>
              <Text style={styles.alertCustomerQuote}>
                "{incomingParsedDesc?.details || incomingParsedDesc?.items || 'AC not cooling'}"
              </Text>
            </View>

            {/* Customer Photos Preview if any */}
            {incomingParsedDesc?.photos && incomingParsedDesc.photos.length > 0 ? (
              <View style={styles.alertPhotosRow}>
                {incomingParsedDesc.photos.map((base64: string, idx: number) => (
                  <Image key={idx} source={{ uri: base64 }} style={styles.alertPhotoPreview} />
                ))}
              </View>
            ) : null}

            {/* Action Buttons: [ REJECT ]  [ ACCEPT ] */}
            <View style={styles.alertButtonsRow}>
              <TouchableOpacity
                style={styles.alertRejectBtn}
                onPress={handleDeclineJob}
                activeOpacity={0.8}
              >
                <Text style={styles.alertRejectBtnText}>REJECT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.alertAcceptBtn}
                onPress={handleAcceptJob}
                activeOpacity={0.8}
              >
                <Text style={styles.alertAcceptBtnText}>ACCEPT</Text>
              </TouchableOpacity>
            </View>

            {/* Timer: 00:18 */}
            <View style={styles.alertTimerWrap}>
              <Clock size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.alertTimerText}>
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: PAYMENT COMPLETION ── */}
      <Modal
        visible={showPaymentSelectionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentSelectionModal(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.paymentModalSheet}>
            <Text style={styles.paymentModalTitle}>Select Payment Method 💳</Text>
            <Text style={styles.paymentModalSubtitle}>
              Confirm how you collected payment from the customer:
            </Text>

            <TouchableOpacity
              style={[styles.paymentMethodOption, { borderColor: colors.primary }]}
              onPress={() => submitJobCompletion('UPI')}
              activeOpacity={0.8}
            >
              <Navigation size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paymentMethodTitle}>UPI / Online Transfer</Text>
                <Text style={styles.paymentMethodDesc}>GPay, PhonePe, Paytm, or QR code</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentMethodOption, { borderColor: '#16A34A', marginTop: 12 }]}
              onPress={() => submitJobCompletion('COD')}
              activeOpacity={0.8}
            >
              <CheckCircle size={24} color="#16A34A" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.paymentMethodTitle}>Cash Payment</Text>
                <Text style={styles.paymentMethodDesc}>Cash handed directly to you</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPaymentSelectionModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: NOTIFICATIONS ── */}
      <Modal
        visible={showNotificationsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.paymentModalSheet}>
            <View style={styles.notifHeaderRow}>
              <Text style={styles.paymentModalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)} style={styles.notifCloseBtn}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 16 }}>
              <View style={styles.notifItem}>
                <View style={[styles.notifIcon, { backgroundColor: isOnline ? '#ECFDF5' : '#F1F5F9' }]}>
                  <Radio size={20} color={isOnline ? colors.success : colors.textSecondary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.notifTitle}>
                    {isOnline ? 'Active on Partner Network' : 'Currently Offline'}
                  </Text>
                  <Text style={styles.notifSubtitle}>
                    {isOnline ? 'You are receiving real-time job broadcasts within 7.5 km.' : 'Turn your status online to start receiving jobs.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: colors.text,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  headerNotifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* ── STATUS CARD ── */
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  statusCardOnline: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FAFCFF',
  },
  statusCardOffline: {
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusStateText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  toggleStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
  },
  goOnlineBtn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  goOnlineBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  goOfflineBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  goOfflineBtnText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* ── TODAY METRICS ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  viewMoreLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  todayRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  /* ── SECTION BLOCK ── */
  sectionBlock: {
    marginBottom: 24,
  },

  /* ── ACTIVE JOB CARD ── */
  activeStatusPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activeStatusPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  activeJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeJobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activeJobTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  activeCustomerName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  activeJobPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  activeJobNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.text,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  activeAddressCard: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeAddressText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  tapToNavigateHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  workflowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  workflowActionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── UPCOMING ── */
  upcomingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  upcomingMain: {
    flex: 1,
    marginRight: 12,
  },
  upcomingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  upcomingTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  upcomingServiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  upcomingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upcomingLocationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  upcomingPriceCol: {
    alignItems: 'flex-end',
  },
  upcomingPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  emptyUpcomingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyUpcomingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptyUpcomingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  /* ── JOB ALERT POPUP (EXACT WIREFRAME MATCH) ── */
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertBellBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  alertHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 1,
  },
  alertServiceTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  alertLocationPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  alertLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertDistanceText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  alertCoordsText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  alertPriceText: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 14,
  },
  alertCustomerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  alertCustomerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertCustomerQuote: {
    fontSize: 15,
    color: colors.text,
    fontStyle: 'italic',
    fontWeight: '500',
    lineHeight: 20,
  },
  alertPhotosRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  alertPhotoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  alertButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 14,
  },
  alertRejectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 14,
  },
  alertRejectBtnText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertAcceptBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  alertAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertTimerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTimerText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  /* ── PAYMENT & NOTIF MODALS ── */
  paymentModalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  paymentModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  paymentMethodDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 14,
  },
  modalCancelBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notifCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  notifSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  /* ── SUSPENDED SCREEN ── */
  suspendedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  suspendedContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  suspendedIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  suspendedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.error,
    marginBottom: 8,
  },
  suspendedSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  dueCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  dueLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  dueValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.error,
  },
  payDuesButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  payDuesButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  suspendedLogoutBtn: {
    paddingVertical: 10,
  },
  suspendedLogoutBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
