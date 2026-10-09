import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import PersonAvatar from '../components/PersonAvatar';

/**
 * Guide's business view, as a working guide needs it: what they earned from completed tours
 * (paid online vs. to collect on the day), this month vs. all time, and what tourists say.
 */
const toDate = (t) => (t?.toDate ? t.toDate() : t ? new Date(t) : null);
const money = (n) => `US$ ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function GuideEarningsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setBookings([]); return undefined; }
    const unsubB = onSnapshot(query(collection(db, 'bookings'), where('guideId', '==', uid)),
      (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setBookings([]));
    const unsubR = onSnapshot(query(collection(db, 'reviews'), where('guideId', '==', uid)),
      (snap) => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))), () => setReviews([]));
    return () => { unsubB(); unsubR(); };
  }, []);

  const stats = useMemo(() => {
    const list = bookings || [];
    const done = list.filter(b => b.status === 'completed');
    const now = new Date();
    const thisMonth = done.filter(b => {
      const d = toDate(b.completedAt) || toDate(b.createdAt);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sum = (arr) => arr.reduce((n, b) => n + (Number(b.totalAmount) || 0), 0);
    const paid = done.filter(b => b.paymentStatus === 'paid');
    const avg = reviews.length ? reviews.reduce((n, r) => n + (Number(r.rating) || 0), 0) / reviews.length : null;
    return {
      total: sum(done), month: sum(thisMonth), tours: done.length, monthTours: thisMonth.length,
      paidOnline: sum(paid), toCollect: sum(done) - sum(paid),
      upcoming: list.filter(b => ['accepted', 'confirmed'].includes(b.status)).length,
      guests: done.reduce((n, b) => n + (Number(b.explorers || b.groupSize) || 1), 0),
      avg, recent: done.sort((a, b) => (toDate(b.completedAt)?.getTime() || 0) - (toDate(a.completedAt)?.getTime() || 0)).slice(0, 5),
    };
  }, [bookings, reviews]);

  if (bookings === null) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#006A3B" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings & reviews</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Earned this month</Text>
          <Text style={styles.heroValue}>{money(stats.month)}</Text>
          <Text style={styles.heroSub}>{stats.monthTours} tour{stats.monthTours === 1 ? '' : 's'} completed · {money(stats.total)} all time</Text>
        </View>

        <View style={styles.grid}>
          <Stat icon="credit-card-check-outline" label="Paid online" value={money(stats.paidOnline)} />
          <Stat icon="cash" label="Collect on the day" value={money(stats.toCollect)} />
          <Stat icon="flag-checkered" label="Tours completed" value={String(stats.tours)} />
          <Stat icon="account-group-outline" label="Guests guided" value={String(stats.guests)} />
          <Stat icon="calendar-clock" label="Upcoming tours" value={String(stats.upcoming)} />
          <Stat icon="star" label="Rating" value={stats.avg ? `${stats.avg.toFixed(1)} ★ (${reviews.length})` : 'No reviews yet'} />
        </View>

        <Text style={styles.section}>Recent tours</Text>
        {stats.recent.length === 0 ? (
          <Text style={styles.empty}>Completed tours appear here. Start and complete a tour from Bookings.</Text>
        ) : stats.recent.map(b => (
          <View key={b.id} style={styles.row}>
            <PersonAvatar uri={b.touristPhoto} name={b.touristName} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{b.touristName || 'Tourist'} · {b.explorers || b.groupSize || 1} guest{(b.explorers || b.groupSize || 1) > 1 ? 's' : ''}</Text>
              <Text style={styles.rowSub}>{b.selectedDate || toDate(b.completedAt)?.toLocaleDateString('en-GB') || ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.rowAmount}>{b.totalAmount ? money(b.totalAmount) : '—'}</Text>
              <Text style={[styles.rowPaid, b.paymentStatus === 'paid' ? { color: '#1B8A4B' } : { color: '#B26A00' }]}>{b.paymentStatus === 'paid' ? 'Paid' : 'Cash'}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.section}>What tourists say</Text>
        {reviews.length === 0 ? (
          <Text style={styles.empty}>Reviews appear here after tourists rate a completed tour.</Text>
        ) : reviews.slice(0, 10).map(r => (
          <View key={r.id} style={styles.review}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PersonAvatar uri={r.avatar} name={r.name} size={34} />
              <Text style={styles.rowTitle}>{r.name || 'Guest'}</Text>
              <Text style={styles.stars}>{'★'.repeat(Math.round(Number(r.rating) || 0))}</Text>
            </View>
            {r.text ? <Text style={styles.reviewText}>{r.text}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label, value }) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon} size={20} color="#00695C" />
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  back: { padding: 6 },
  headerTitle: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  body: { padding: 16, paddingBottom: 60, gap: 12 },
  hero: { backgroundColor: '#004D40', borderRadius: 20, padding: 20 },
  heroLabel: { color: '#CFE8DD', fontSize: 13, fontFamily: 'Outfit-Medium' },
  heroValue: { color: '#FFFFFF', fontSize: 34, fontFamily: 'Outfit-Bold', marginTop: 4 },
  heroSub: { color: '#CFE8DD', fontSize: 13, fontFamily: 'Outfit-Regular', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 4, borderWidth: 1, borderColor: '#EEF2EE' },
  statValue: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  statLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#5B6B66' },
  section: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#1A2E1A', marginTop: 10 },
  empty: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7A75' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12 },
  rowTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1A2E1A' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7A75', marginTop: 2 },
  rowAmount: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  rowPaid: { fontSize: 11, fontFamily: 'Outfit-SemiBold', marginTop: 2 },
  review: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, gap: 8 },
  stars: { marginLeft: 'auto', color: '#D9891F', fontSize: 14 },
  reviewText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#33463F', lineHeight: 19 },
});
