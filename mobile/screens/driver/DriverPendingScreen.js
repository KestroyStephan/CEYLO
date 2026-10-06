import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Image
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '../../components/Toast';
import { checkDocument, extOf, isPdf, fmtSize, uploadFile } from '../../utils/documents';

// What CEYLO checks before a driver can take rides. Keys are shared with the admin portal.
export const DRIVER_DOCS = [
  { key: 'nic_front', label: 'NIC – front', required: true },
  { key: 'nic_back', label: 'NIC – back', required: true },
  { key: 'licence_front', label: 'Driving licence – front', required: true, expiry: true },
  { key: 'licence_back', label: 'Driving licence – back', required: true },
  { key: 'vehicle_cr', label: 'Vehicle registration (CR)', required: true },
  { key: 'insurance', label: 'Vehicle insurance certificate', required: true, expiry: true },
  { key: 'revenue_licence', label: 'Revenue licence', required: false, expiry: true },
  { key: 'vehicle_photo', label: 'Vehicle photo showing the plate', required: false },
];

const toMs = (t) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : t ? Date.parse(t) || 0 : 0);

// A review only counts for the file it was made on; a newer upload goes back to "waiting"
export const docState = (file, review) => {
  if (!file) return 'missing';
  if (!review || toMs(review.at) < toMs(file.uploadedAt)) return 'pending';
  return review.status === 'approved' ? 'approved' : review.status === 'rejected' ? 'rejected' : 'pending';
};

const STATE_UI = {
  missing: { icon: 'cloud-upload-outline', color: '#6B7A6B', bg: '#F2F5F2', text: 'Not uploaded' },
  pending: { icon: 'time-outline', color: '#B26A00', bg: '#FFF4E0', text: 'Waiting for review' },
  approved: { icon: 'checkmark-circle', color: '#006A3B', bg: '#E8F5E9', text: 'Approved' },
  rejected: { icon: 'close-circle', color: '#BA1A1A', bg: '#FDECEC', text: 'Rejected' },
};

export default function DriverPendingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const uid = auth.currentUser?.uid;
  const [driver, setDriver] = useState(null);
  const [docs, setDocs] = useState({ files: {}, review: {} });
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [pct, setPct] = useState(0);
  const [expiry, setExpiry] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid) return undefined;
    const unsubDriver = onSnapshot(doc(db, 'drivers', uid),
      (snap) => { setDriver(snap.exists() ? snap.data() : null); setLoaded(true); },
      () => setLoaded(true));
    const unsubDocs = onSnapshot(doc(db, 'driver_documents', uid), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setDocs({ files: data.files || {}, review: data.review || {} });
      setExpiry(prev => {
        const next = { ...prev };
        Object.entries(data.files || {}).forEach(([k, f]) => { if (f.expiry && next[k] === undefined) next[k] = f.expiry; });
        return next;
      });
    }, () => {});
    return () => { unsubDriver(); unsubDocs(); };
  }, [uid]);

  const status = driver?.status || 'pending_verification';
  const states = Object.fromEntries(DRIVER_DOCS.map(d => [d.key, docState(docs.files[d.key], docs.review[d.key])]));
  const requiredDone = DRIVER_DOCS.filter(d => d.required).every(d => states[d.key] !== 'missing' && states[d.key] !== 'rejected');
  const uploadedCount = DRIVER_DOCS.filter(d => states[d.key] !== 'missing').length;
  const submitted = Boolean(driver?.documentsSubmittedAt) && toMs(driver.documentsSubmittedAt) >= Math.max(0, ...Object.values(docs.files).map(f => toMs(f.uploadedAt)));

  const validExpiry = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v));

  const pick = async (item) => {
    if (busyKey) return;
    if (item.expiry && expiry[item.key] && !validExpiry(expiry[item.key])) {
      toast.warning('Expiry date', 'Use the format YYYY-MM-DD, for example 2027-03-31.');
      return;
    }
    let asset;
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.length) return;
      asset = r.assets[0];
    } catch (e) {
      toast.error('Could not open files', e.message);
      return;
    }
    const problem = checkDocument(asset);
    if (problem) { toast.warning(problem[0], problem[1]); return; }

    setBusyKey(item.key);
    setPct(0);
    try {
      const path = `driver_documents/${uid}/${item.key}.${extOf(asset)}`;
      const url = await uploadFile(asset, path, f => setPct(Math.round(Math.min(1, Math.max(0, f)) * 100)));
      await setDoc(doc(db, 'driver_documents', uid), {
        uid,
        files: {
          [item.key]: {
            url, path,
            name: asset.name || `${item.key}.${extOf(asset)}`,
            contentType: asset.mimeType || (isPdf(asset) ? 'application/pdf' : 'image/jpeg'),
            size: asset.size ?? null,
            expiry: item.expiry && validExpiry(expiry[item.key]) ? expiry[item.key] : null,
            uploadedAt: Date.now(),
          },
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success('Uploaded', `${item.label} saved.`);
    } catch (e) {
      toast.error('Upload failed', e.code === 'storage/unauthorized' ? 'You are not allowed to upload here. Please sign in again.' : 'Check your connection and try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const submitForReview = async () => {
    if (!requiredDone) {
      toast.warning('Documents missing', 'Upload every required document before sending it for review.');
      return;
    }
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'drivers', uid), {
        documentsSubmittedAt: Date.now(),
        ...(status === 'rejected' ? { status: 'pending_verification' } : {}),
      });
      if (status === 'rejected') await updateDoc(doc(db, 'users', uid), { role: 'driver_pending', status: 'pending_verification' });
      toast.success('Sent for review', 'The CEYLO team checks documents within 1-2 business days. You will get a notification.');
    } catch (e) {
      toast.error('Could not submit', 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error('Logout error:', error); }
  };

  if (!loaded) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color="#006A3B" /></View>;
  }

  if (status === 'suspended') {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: 24 }]}>
        <View style={styles.headerRow}>
          <Ionicons name="ban-outline" size={30} color="#BA1A1A" />
          <Text style={styles.title}>Account suspended</Text>
        </View>
        <Text style={styles.subtitle}>Reason: {driver?.rejectionReason || 'Not specified'}</Text>
        <Text style={styles.subtitle}>Contact CEYLO support to have your account reviewed. You cannot receive rides while suspended.</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('sign_out')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const header = status === 'approved'
    ? { icon: 'checkmark-circle', color: '#006A3B', title: t('welcome_ceylo'), body: 'Your account is approved. Opening the driver dashboard…' }
    : status === 'rejected'
      ? { icon: 'close-circle', color: '#BA1A1A', title: t('app_rejected'), body: `Reason: ${driver?.rejectionReason || 'Not specified'}. Replace the rejected documents and send them again.` }
      : Object.values(states).includes('rejected')
        ? { icon: 'alert-circle-outline', color: '#BA1A1A', title: 'Action needed', body: 'Some documents were rejected. Replace them and send them for review again.' }
      : submitted
        ? { icon: 'hourglass-outline', color: '#B26A00', title: t('app_under_review'), body: 'Our team is checking your documents. This usually takes 1-2 business days.' }
        : { icon: 'document-text-outline', color: '#006A3B', title: 'Verify your account', body: 'Upload clear photos or PDF scans (JPG, PNG or PDF, up to 5 MB each).' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }}>
      <View style={styles.headerRow}>
        <Ionicons name={header.icon} size={30} color={header.color} />
        <Text style={styles.title}>{header.title}</Text>
      </View>
      <Text style={styles.subtitle}>{header.body}</Text>
      {status === 'approved' && <ActivityIndicator size="small" color="#006A3B" style={{ marginTop: 12 }} />}

      {driver && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{driver.vehicleType} · {driver.licensePlate} · Licence {driver.licenseNumber}</Text>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Documents</Text>
        <Text style={styles.count}>{uploadedCount}/{DRIVER_DOCS.length} uploaded</Text>
      </View>

      {DRIVER_DOCS.map(item => {
        const file = docs.files[item.key];
        const st = states[item.key];
        const ui = STATE_UI[st];
        const busy = busyKey === item.key;
        const locked = st === 'approved' || status === 'approved';
        return (
          <View key={item.key} style={styles.docCard}>
            <TouchableOpacity style={styles.docRow} onPress={() => !locked && pick(item)} activeOpacity={locked ? 1 : 0.7}
              accessibilityLabel={`${item.label}: ${ui.text}`}>
              {file && !isPdf({ mimeType: file.contentType, name: file.name }) ? (
                <Image source={{ uri: file.url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name={file ? 'document-text' : ui.icon} size={22} color={file ? '#C62828' : ui.color} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.docLabel}>{item.label}{item.required ? '' : ' (optional)'}</Text>
                <Text style={styles.docSub} numberOfLines={1}>
                  {busy ? `Uploading ${pct}%` : file ? `${file.name}${file.size ? ` · ${fmtSize(file.size)}` : ''}` : 'JPG, PNG or PDF · max 5 MB'}
                </Text>
                <View style={[styles.badge, { backgroundColor: ui.bg }]}>
                  <Text style={[styles.badgeText, { color: ui.color }]}>{ui.text}</Text>
                </View>
              </View>
              {busy ? <ActivityIndicator color="#006A3B" /> : !locked && (
                <Text style={styles.action}>{file ? 'Replace' : 'Upload'}</Text>
              )}
            </TouchableOpacity>
            {busy && <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>}
            {st === 'rejected' && docs.review[item.key]?.reason ? (
              <Text style={styles.reason}>Reason: {docs.review[item.key].reason}</Text>
            ) : null}
            {item.expiry && !locked && (
              <TextInput
                style={styles.expiry}
                placeholder="Expiry date (YYYY-MM-DD)"
                placeholderTextColor="#9AA79A"
                value={expiry[item.key] || ''}
                onChangeText={v => setExpiry(prev => ({ ...prev, [item.key]: v.replace(/[^\d-]/g, '').slice(0, 10) }))}
                onEndEditing={() => {
                  const v = expiry[item.key];
                  if (!v) return;
                  if (!validExpiry(v)) { toast.warning('Expiry date', 'Use the format YYYY-MM-DD, for example 2027-03-31.'); return; }
                  if (Date.parse(v) < Date.now()) toast.warning('Document expired', `${item.label} expired on ${v}. Upload a valid one.`);
                  if (file && file.expiry !== v) {
                    setDoc(doc(db, 'driver_documents', uid), { files: { [item.key]: { expiry: v } } }, { merge: true }).catch(() => {});
                  }
                }}
                keyboardType="numbers-and-punctuation"
              />
            )}
          </View>
        );
      })}

      {status !== 'approved' && (!submitted || status === 'rejected') && (
        <TouchableOpacity style={[styles.submit, (!requiredDone || submitting) && { opacity: 0.5 }]} onPress={submitForReview} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Send for review</Text>}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('sign_out')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBF3' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#181D19', flex: 1 },
  subtitle: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#3F4941', marginTop: 8, lineHeight: 20 },
  summary: { marginTop: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E3E8E1' },
  summaryText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#2E4832' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#181D19' },
  count: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6B7A6B' },
  docCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E3E8E1' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#F2F5F2' },
  docLabel: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#181D19' },
  docSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7A6B', marginTop: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-Bold' },
  action: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#006A3B' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#E3E8E1', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#006A3B' },
  reason: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#BA1A1A', marginTop: 8 },
  expiry: { marginTop: 10, height: 40, borderRadius: 10, backgroundColor: '#F2F5F2', paddingHorizontal: 12, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#181D19' },
  submit: { backgroundColor: '#006A3B', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  submitText: { color: '#FFF', fontSize: 16, fontFamily: 'Outfit-Bold' },
  logoutButton: { borderWidth: 1.5, borderColor: '#C9D2C9', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  logoutText: { color: '#3F4941', fontFamily: 'Outfit-Medium' },
});
