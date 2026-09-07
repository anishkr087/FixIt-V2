import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, IndianRupee, ArrowDownToLine, TrendingUp, CalendarDays } from 'lucide-react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { useAuth, API_URL } from '../context/AuthContext';

export default function EarningsScreen() {
  const { token } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [jobsCompletedCount, setJobsCompletedCount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/partner/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(response.data.walletBalance);
      setTodayEarnings(response.data.todayEarnings);
      setJobsCompletedCount(response.data.jobsCompleted);
      setTransactions(response.data.transactions);
    } catch (err) {
      console.error('Error fetching earnings:', err);
      Alert.alert('Error', 'Failed to fetch earnings history');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = () => {
    if (walletBalance <= 0) {
      Alert.alert('Insufficient Balance', 'You do not have any funds to withdraw.');
      return;
    }

    Alert.alert(
      'Withdraw to Bank',
      'Select withdrawal amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(walletBalance >= 100 ? [{ text: '₹100', onPress: () => performWithdrawal(100) }] : []),
        ...(walletBalance >= 500 ? [{ text: '₹500', onPress: () => performWithdrawal(500) }] : []),
        { text: `All (₹${walletBalance})`, onPress: () => performWithdrawal(walletBalance) }
      ]
    );
  };

  const performWithdrawal = async (amount: number) => {
    try {
      setWithdrawing(true);
      const response = await axios.post(`${API_URL}/partner/withdraw`, {
        amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', `Successfully withdrew ₹${amount} to your bank account!`);
      setWalletBalance(response.data.walletBalance);
      setTransactions(response.data.transactions);
    } catch (err: any) {
      console.error('Withdrawal failed:', err);
      const errMsg = err.response?.data?.error || 'Failed to request withdrawal. Please try again.';
      Alert.alert('Withdrawal Failed', errMsg);
    } finally {
      setWithdrawing(false);
    }
  };

  const formatTxDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday = date.toDateString() === now.toDateString();
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
      const timeStr = date.toLocaleTimeString('en-IN', timeOptions);

      if (isToday) {
        return `Today, ${timeStr}`;
      } else if (isYesterday) {
        return `Yesterday, ${timeStr}`;
      } else {
        const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-IN', dateOptions);
      }
    } catch (e) {
      return dateStr;
    }
  };

  const getTxColor = (type: string) => {
    switch (type) {
      case 'earning':
        return colors.success;
      case 'withdrawal':
        return colors.textSecondary;
      case 'commission_deduction':
      default:
        return colors.error;
    }
  };

  const getTxSign = (type: string, amount: number) => {
    const val = Math.abs(amount);
    if (type === 'earning') {
      return `+ ₹${val}`;
    } else {
      return `- ₹${val}`;
    }
  };

  const renderTransaction = ({ item }: any) => {
    const color = getTxColor(item.type);
    const amountStr = getTxSign(item.type, item.amount);
    const dateStr = formatTxDate(item.createdAt);

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionIcon}>
          <IndianRupee size={20} color={color} />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>{item.description}</Text>
          <Text style={styles.transactionDate}>{dateStr}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color }]}>{amountStr}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading earnings history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Earnings</Text>

        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Wallet color={colors.card} size={28} />
            <Text style={styles.walletTitle}>Available Balance</Text>
          </View>
          <Text style={styles.balanceText}>₹{walletBalance}</Text>
          
          <TouchableOpacity 
            style={[styles.withdrawBtn, (walletBalance <= 0 || withdrawing) && { opacity: 0.6 }]} 
            onPress={handleWithdraw}
            disabled={walletBalance <= 0 || withdrawing}
          >
            {withdrawing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <ArrowDownToLine size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.withdrawText}>Withdraw to Bank</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <TrendingUp size={24} color={colors.success} />
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>₹{todayEarnings}</Text>
          </View>
          <View style={styles.statBox}>
            <CalendarDays size={24} color={colors.primary} />
            <Text style={styles.statLabel}>Jobs Done</Text>
            <Text style={styles.statValue}>{jobsCompletedCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 32, backgroundColor: colors.card, borderRadius: 16 }}>
            <Text style={{ color: colors.textSecondary }}>No transactions recorded yet.</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={item => item._id}
            renderItem={renderTransaction}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 24, marginTop: 10 },
  walletCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 24, elevation: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, marginBottom: 24 },
  walletHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  walletTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginLeft: 12 },
  balanceText: { color: colors.card, fontSize: 40, fontWeight: 'bold', marginBottom: 24, letterSpacing: 1 },
  withdrawBtn: { backgroundColor: colors.card, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  withdrawText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, elevation: 2, marginHorizontal: 4, alignItems: 'center' },
  statLabel: { color: colors.textSecondary, fontSize: 14, marginTop: 12, marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  transactionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  transactionDetails: { flex: 1, marginLeft: 16 },
  transactionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  transactionDate: { fontSize: 12, color: colors.textSecondary },
  transactionAmount: { fontSize: 16, fontWeight: 'bold' }
});
