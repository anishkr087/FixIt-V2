import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CheckCircle, XCircle, Clock, MapPin, Calendar, IndianRupee, ShieldCheck } from 'lucide-react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

interface HistoryJob {
  id: string;
  customerName: string;
  problemDescription: string;
  amount: number;
  date: string;
  time: string;
  address: string;
  paymentMethod: string;
  status: 'completed' | 'cancelled';
}

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

export default function HistoryScreen() {
  const { token } = useAuth();
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/partner/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && res.data.history) {
        setHistory(res.data.history);
      }
    } catch (e) {
      console.log('History fetch error:', e);
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job History 📜</Text>
        <Text style={styles.headerSub}>Track all your past completed service requests</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          history.map((job) => {
            const parsedDesc = parseJobDescription(job.problemDescription);
            return (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    {job.status === 'completed' ? (
                      <View style={styles.statusBadge}>
                        <CheckCircle size={16} color={colors.success} />
                        <Text style={styles.statusText}>COMPLETED</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                        <XCircle size={16} color={colors.error} />
                        <Text style={[styles.statusText, { color: '#991B1B' }]}>CANCELLED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.earningText, job.status !== 'completed' && { color: colors.textSecondary }]}>
                    {job.status === 'completed' ? `+ ₹${job.amount}` : '₹0'}
                  </Text>
                </View>

                <Text style={styles.problemText}>{parsedDesc.items}</Text>
                {parsedDesc.details ? (
                  <Text style={[styles.customerText, { marginBottom: 6, fontStyle: 'italic', color: colors.text }]}>
                    Details: "{parsedDesc.details}"
                  </Text>
                ) : null}
                <Text style={styles.customerText}>Customer: {job.customerName}</Text>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <MapPin size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {job.address}
                  </Text>
                </View>

                <View style={styles.footerRow}>
                  <View style={styles.dateTimeContainer}>
                    <Calendar size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.dateTimeText}>
                      {job.date} • {job.time}
                    </Text>
                  </View>

                  <View style={styles.paymentBadge}>
                    <Text style={styles.paymentText}>{job.paymentMethod}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#166534',
    marginLeft: 4,
  },
  earningText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  problemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  customerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
