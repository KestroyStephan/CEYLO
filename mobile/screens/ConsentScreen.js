import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { setAnalyticsConsent } from '../services/Analytics';
import useStatusBarStyle from '../utils/useStatusBarStyle';

const ACCENT = '#00695C';
const SCALE = [1, 2, 3, 4, 5];

/**
 * First-launch consent (research ethics) and privacy summary. Also asks the "before"
 * eco-awareness question that the in-app survey repeats later (Objective 6).
 * Shown once per account; the choice can be changed in Profile.
 */
export default function ConsentScreen() {
  useStatusBarStyle('dark-content');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [awareness, setAwareness] = useState(null);
  const [saving, setSaving] = useState(null);

  const POINTS = [
    { icon: 'chart-timeline-variant', text: t('consent_point_events') },
    { icon: 'account-off-outline', text: t('consent_point_anonymous') },
    { icon: 'map-marker-off-outline', text: t('consent_point_location') },
    { icon: 'toggle-switch-off-outline', text: t('consent_point_optout') },
  ];

  const choose = async (agree) => {
    setSaving(agree ? 'yes' : 'no');
    try {
      await setAnalyticsConsent(agree, awareness ? { ecoAwarenessBefore: awareness } : {});
      // App.js listens to the user document and moves on once consent is stored
    } catch (e) {
      Alert.alert(t('could_not_save'), e.message);
      setSaving(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 170 }]}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="shield-check-outline" size={34} color={ACCENT} />
        </View>
        <Text style={styles.title}>{t('consent_title')}</Text>
        <Text style={styles.intro}>{t('consent_intro')}</Text>

        {POINTS.map(p => (
          <View key={p.icon} style={styles.point}>
            <MaterialCommunityIcons name={p.icon} size={22} color={ACCENT} />
            <Text style={styles.pointText}>{p.text}</Text>
          </View>
        ))}

        <Text style={styles.label}>{t('eco_awareness_q')}</Text>
        <View style={styles.scale}>
          {SCALE.map(v => {
            const selected = awareness === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.scaleItem, selected && styles.scaleItemOn]}
                onPress={() => setAwareness(v)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${v}`}
              >
                <Text style={[styles.scaleText, selected && styles.scaleTextOn]}>{v}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.scaleEnds}>
          <Text style={styles.scaleEnd}>{t('scale_never')}</Text>
          <Text style={styles.scaleEnd}>{t('scale_always')}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Button mode="contained" buttonColor={ACCENT} onPress={() => choose(true)}
          loading={saving === 'yes'} disabled={saving !== null}
          contentStyle={{ height: 52 }} labelStyle={{ fontSize: 16 }} style={{ borderRadius: 14 }}>
          {t('consent_agree')}
        </Button>
        <Button mode="text" textColor="#5F6F6B" onPress={() => choose(false)}
          loading={saving === 'no'} disabled={saving !== null} style={{ marginTop: 6 }}>
          {t('consent_decline')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  body: { paddingHorizontal: 24, paddingTop: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#E0F2F1', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#1B2B28', marginTop: 18 },
  intro: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#4A5A56', marginTop: 8, lineHeight: 22 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 18 },
  pointText: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#33413E', lineHeight: 20 },
  label: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#1B2B28', marginTop: 30, lineHeight: 22 },
  scale: { flexDirection: 'row', gap: 8, marginTop: 12 },
  scaleItem: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D6E2DF', alignItems: 'center', justifyContent: 'center' },
  scaleItemOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  scaleText: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#33413E' },
  scaleTextOn: { color: '#FFF' },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleEnd: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#5F6F6B' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E6ECEA' },
});
