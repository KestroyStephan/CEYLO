import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Dimensions, TouchableOpacity, FlatList,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const RANGE_TABS = ['Week', 'Month'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLast7Days() {
  const days = [], labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(new Date(d));
    labels.push(DAY_NAMES[d.getDay()]);
  }
  return { days, labels };
}

function getLast30Days() {
  const days = [], labels = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(new Date(d));
    labels.push(i % 5 === 0 ? d.getDate().toString() : '');
  }
  return { days, labels };
}

// Trust Score = (completionRate ├ù 0.4) + (responseScore ├ù 0.3) + (ratingScore ├ù 0.2) + (tenureScore ├ù 0.1)
function calcTrustScore(completionRate, avgRating, totalOrders) {
  const ratingScore = (avgRating || 0) / 5;
  const tenureScore = Math.min(totalOrders / 100, 1);
  const responseScore = 0.8; // placeholder until response time data is tracked
  const raw = (completionRate * 0.4) + (responseScore * 0.3) + (ratingScore * 0.2) + (tenureScore * 0.1);
  return Math.round(raw * 100);
}

export default function VendorRevenueScreen() {
  const [range, setRange] = useState('Week');
  const [chartData, setChartData] = useState(Array(7).fill(0.01));
  const [ratingData, setRatingData] = useState(Array(7).fill(0));
  const [labels, setLabels] = useState(['', '', '', '', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [weekTotal, setWeekTotal] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [avgRating, setAvgRating] = useState(null);
  const [topServices, setTopServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trustScore, setTrustScore] = useState(0);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    fetchData();
  }, [uid, range]);

  const fetchData = async () => {
    try {
      const { days, labels: lbs } =
        range === 'Week' ? getLast7Days() : getLast30Days();
      setLabels(lbs);
      const startDate = days[0];
      const endDate = new Date();

      const q = query(
        collection(db, 'bookings'),
        where('vendorId', '==', uid),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );
      const snap = await getDocs(q);
      const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const revenueByDay = Array(days.length).fill(0);
      const ratingByDay = Array(days.length).fill(0);
      const ratingCountByDay = Array(days.length).fill(0);
      let totalRev = 0, ratingSum = 0, ratingCount = 0;
      let total = bookings.length, completed = 0;
      const serviceMap = {};
      const reviewList = [];

      bookings.forEach((b) => {
        const bDate = b.createdAt?.toDate?.() ? new Date(b.createdAt.toDate()) : new Date();
        bDate.setHours(0, 0, 0, 0);
        const dayIdx = days.findIndex((d) => d.getTime() === bDate.getTime());

        if (b.status === 'completed') {
          completed++;
          if (dayIdx >= 0) revenueByDay[dayIdx] += b.totalPrice || 0;
          totalRev += b.totalPrice || 0;
        }
        if (b.rating) {
          ratingSum += b.rating;
          ratingCount++;
          if (dayIdx >= 0) {
            ratingByDay[dayIdx] += b.rating;
            ratingCountByDay[dayIdx]++;
          }
        }
        // Reviews
        if (b.review) {
          reviewList.push({ id: b.id, name: b.customerName, rating: b.rating, review: b.review });
        }
        // Service ranking
        (b.items || []).forEach((item) => {
          const key = item.name || 'Unknown';
          if (!serviceMap[key]) serviceMap[key] = { count: 0, revenue: 0 };
          serviceMap[key].count += item.qty || 1;
          serviceMap[key].revenue += (item.price || 0) * (item.qty || 1);
        });
      });

      const avgRatingByDay = ratingByDay.map((sum, i) =>
        ratingCountByDay[i] > 0 ? parseFloat((sum / ratingCountByDay[i]).toFixed(1)) : 0
      );

      setChartData(revenueByDay.map((v) => v || 0.01));
      setRatingData(avgRatingByDay);
      setWeekTotal(totalRev);
      setTotalOrders(total);
      setCompletedOrders(completed);
      setAvgRating(ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null);
      setTopServices(
        Object.entries(serviceMap)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 3)
          .map(([name, data]) => ({ name, ...data }))
      );
      setReviews(reviewList.slice(0, 5));
      const completionRate = total > 0 ? completed / total : 0;
      setTrustScore(calcTrustScore(completionRate, avgRating, total));
    } catch (e) {
      console.log('Revenue fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#059669" /></View>;
  }

  const chartConfig = {
    backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
    labelColor: () => '#9ca3af', barPercentage: 0.55,
    decimalPlaces: 0, propsForBackgroundLines: { stroke: '#f3f4f6' },
  };
  const lineChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
  };

  const medals = ['≡ƒÑç', '≡ƒÑê', '≡ƒÑë'];
  const trustColor = trustScore >= 80 ? '#059669' : trustScore >= 60 ? '#d97706' : '#dc2626';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header + range toggle */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Revenue Analytics</Text>
          <Text style={styles.headerSub}>Performance overview</Text>
        </View>
        <View style={styles.rangeToggle}>
          {RANGE_TABS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Trust Score */}
      <View style={styles.trustCard}>
        <View>
          <Text style={styles.trustLabel}>Trust Score</Text>
          <Text style={[styles.trustScore, { color: trustColor }]}>{trustScore}/100</Text>
          <Text style={styles.trustSub}>Based on completion, ratings & tenure</Text>
        </View>
        <View style={styles.trustCircle}>
          <Text style={[styles.trustCircleText, { color: trustColor }]}>{trustScore}%</Text>
        </View>
      </View>

      {/* Revenue Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Revenue (LKR) ΓÇö {range}</Text>
        <BarChart
          data={{ labels, datasets: [{ data: chartData }] }}
          width={screenWidth - 64} height={180}
          chartConfig={chartConfig}
          style={{ borderRadius: 10 }}
          yAxisLabel="LKR "
          fromZero
        />
      </View>

      {/* Rating Trend Line Chart */}
      {ratingData.some((v) => v > 0) && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Rating Trend Γ¡É ΓÇö {range}</Text>
          <LineChart
            data={{ labels, datasets: [{ data: ratingData.map((v) => v || 0.01) }] }}
            width={screenWidth - 64} height={160}
            chartConfig={lineChartConfig}
            style={{ borderRadius: 10 }}
            bezier
            fromZero
          />
        </View>
      )}

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>LKR {weekTotal.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{completedOrders}/{totalOrders}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{avgRating ? `Γ¡É ${avgRating}` : 'ΓÇö'}</Text>
          <Text style={styles.summaryLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Top Services */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>≡ƒÅå Top Services</Text>
        {topServices.length === 0 ? (
          <Text style={styles.noDataText}>No completed orders yet</Text>
        ) : (
          topServices.map((s, idx) => (
            <View key={s.name} style={styles.topRow}>
              <Text style={styles.medal}>{medals[idx]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.svcName}>{s.name}</Text>
                <Text style={styles.svcOrders}>{s.count} bookings</Text>
              </View>
              <Text style={styles.svcRevenue}>LKR {s.revenue.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>

      {/* Reviews */}
      {reviews.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Γ¡É Recent Reviews</Text>
          {reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{r.name || 'Customer'}</Text>
                <Text style={styles.reviewRating}>{'Γ¡É'.repeat(Math.round(r.rating || 0))}</Text>
              </View>
              <Text style={styles.reviewText}>{r.review}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 20, paddingTop: 50, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#064e3b' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  rangeToggle: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 10, padding: 3 },
  rangeBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 },
  rangeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, elevation: 2 },
  rangeBtnText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  rangeBtnTextActive: { color: '#059669' },
  trustCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  trustLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  trustScore: { fontSize: 32, fontWeight: '900' },
  trustSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  trustCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: '#d1fae5',
    alignItems: 'center', justifyContent: 'center',
  },
  trustCircleText: { fontSize: 16, fontWeight: '800' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, alignItems: 'center',
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, alignSelf: 'flex-start' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#059669', marginBottom: 3 },
  summaryLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textAlign: 'center' },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#064e3b', marginBottom: 14 },
  noDataText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  medal: { fontSize: 22, marginRight: 12 },
  svcName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  svcOrders: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  svcRevenue: { fontSize: 14, fontWeight: '800', color: '#059669' },
  reviewCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#374151' },
  reviewRating: { fontSize: 12 },
  reviewText: { fontSize: 13, color: '#6b7280', lineHeight: 20, fontStyle: 'italic' },
});
