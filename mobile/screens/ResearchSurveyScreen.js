import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { susScore } from '../utils/sus';

const ACCENT = '#00695C';
const SCALE = [1, 2, 3, 4, 5];

// The 10-item System Usability Scale (Brooke, 1996), kept in English so scores stay comparable
const SUS_ITEMS = [
  'I think that I would like to use this app frequently.',
  'I found the app unnecessarily complex.',
  'I thought the app was easy to use.',
  'I think that I would need the support of a technical person to be able to use this app.',
  'I found the various functions in this app were well integrated.',
  'I thought there was too much inconsistency in this app.',
  'I would imagine that most people would learn to use this app very quickly.',
  'I found the app very cumbersome to use.',
  'I felt very confident using the app.',
  'I needed to learn a lot of things before I could get going with this app.',
];

// Recommendation effectiveness (RQ1-RQ2, Objective 5) and eco / local impact (RQ5, Objective 6)
const STUDY_ITEMS = [
  { id: 'relevance', text: 'The recommended places matched my interests and mood.' },
  { id: 'discovery', text: 'The app helped me find places I would not have found on my own.' },
  { id: 'localSupport', text: 'The app made me more likely to use local guides, drivers and vendors.' },
  { id: 'ecoAwarenessAfter', text: 'When choosing places to visit, I think about their environmental impact.' },
];


function Scale({ value, onChange, label }) {
  return (
    <View style={styles.scale}>
      {SCALE.map(v => {
        const selected = value === v;
        return (
          <TouchableOpacity
            key={v}
            style={[styles.scaleItem, selected && styles.scaleItemOn]}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}: ${v}`}
          >
            <Text style={[styles.scaleText, selected && styles.scaleTextOn]}>{v}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ResearchSurveyScreen({ navigation }) {
  useStatusBarStyle('dark-content');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [sus, setSus] = useState(Array(SUS_ITEMS.length).fill(null));
  const [study, setStudy] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid))
      .then(s => s.exists() && setProfile(s.data()))
      .catch(() => {});
  }, []);

  const answered = sus.filter(a => a != null).length + Object.keys(study).length;
  const total = SUS_ITEMS.length + STUDY_ITEMS.length;
  const complete = answered === total;

  const submit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      const score = susScore(sus);
      await addDoc(collection(db, 'sus_responses'), {
        userId: uid,
        answers: sus,
        susScore: score,
        ...study,
        ecoAwarenessBefore: profile.ecoAwarenessBefore ?? null,
        strategy: profile.recStrategy || 'unassigned',
        createdAt: serverTimestamp(),
      });
      setResult(score);
    } catch (e) {
      Alert.alert(t('could_not_save'), e.message);
    } finally {
      setSaving(false);
    }
  };

  if (result != null) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <MaterialCommunityIcons name="check-decagram" size={64} color={ACCENT} />
        <Text style={styles.thanks}>{t('survey_thanks')}</Text>
        <Text style={styles.thanksSub}>{t('survey_score', { score: result.toFixed(1) })}</Text>
        <Button mode="contained" buttonColor={ACCENT} onPress={() => navigation.goBack()} style={{ marginTop: 24, borderRadius: 14 }}>
          {t('done')}
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel={t('go_back')} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B2B28" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('survey_title')}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}>
        <Text style={styles.intro}>{t('survey_intro')}</Text>
        <View style={styles.scaleEnds}>
          <Text style={styles.scaleEnd}>1 = {t('scale_disagree')}</Text>
          <Text style={styles.scaleEnd}>5 = {t('scale_agree')}</Text>
        </View>

        <Text style={styles.section}>{t('survey_part_usability')}</Text>
        {SUS_ITEMS.map((q, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.question}>{i + 1}. {q}</Text>
            <Scale label={`Q${i + 1}`} value={sus[i]} onChange={v => setSus(prev => prev.map((a, j) => (j === i ? v : a)))} />
          </View>
        ))}

        <Text style={styles.section}>{t('survey_part_trip')}</Text>
        {STUDY_ITEMS.map((q, i) => (
          <View key={q.id} style={styles.item}>
            <Text style={styles.question}>{SUS_ITEMS.length + i + 1}. {q.text}</Text>
            <Scale label={q.id} value={study[q.id]} onChange={v => setStudy(prev => ({ ...prev, [q.id]: v }))} />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Button mode="contained" buttonColor={ACCENT} onPress={submit} loading={saving} disabled={!complete || saving}
          contentStyle={{ height: 52 }} labelStyle={{ fontSize: 16, color: '#FFF' }} style={{ borderRadius: 14, backgroundColor: complete ? ACCENT : '#9DB8B3' }}>
          {complete ? t('survey_submit') : t('survey_progress', { done: answered, total })}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { padding: 8, marginRight: 4 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  body: { paddingHorizontal: 20 },
  intro: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#4A5A56', lineHeight: 20 },
  section: { fontSize: 13, fontFamily: 'Outfit-Bold', color: ACCENT, letterSpacing: 1, marginTop: 24, textTransform: 'uppercase' },
  item: { marginTop: 18 },
  question: { fontSize: 15, fontFamily: 'Outfit-Medium', color: '#1B2B28', lineHeight: 21 },
  scale: { flexDirection: 'row', gap: 8, marginTop: 10 },
  scaleItem: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D6E2DF', alignItems: 'center', justifyContent: 'center' },
  scaleItemOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  scaleText: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#33413E' },
  scaleTextOn: { color: '#FFF' },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  scaleEnd: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#5F6F6B' },
  thanks: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1B2B28', marginTop: 16, textAlign: 'center' },
  thanksSub: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#4A5A56', marginTop: 8, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E6ECEA' },
});
