import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Switch, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { loadPreferences, savePreferences, moodFromPreferences, DEFAULT_PREFERENCES } from '../services/PreferencesService';
import useStatusBarStyle from '../utils/useStatusBarStyle';

const LEVELS = [0, 25, 50, 75, 100];
const BUDGETS = ['Economy', 'Standard', 'Luxury'];
const MOBILITY = [
  { id: 'standard', label: 'mob_standard', icon: 'hiking' },
  { id: 'low', label: 'mob_low', icon: 'wheelchair-accessibility' },
  { id: 'walking', label: 'mob_walking', icon: 'walk' },
];

const ACCENT = '#00695C';
const MOOD_KEYS = { 'Culture Seeker': 'culture_seeker', 'Eco Explorer': 'eco_explorer', Family: 'family_trip' };

function Segment({ options, value, onChange, format = v => v, accessibilityHint }) {
  return (
    <View style={styles.segment}>
      {options.map(opt => {
        const selected = opt === value;
        return (
          <TouchableOpacity
            key={String(opt)}
            style={[styles.segItem, selected && styles.segItemOn]}
            onPress={() => onChange(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityHint={accessibilityHint}
          >
            <Text style={[styles.segText, selected && styles.segTextOn]}>{format(opt)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TravelPreferencesScreen({ navigation }) {
  useStatusBarStyle('dark-content');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Snap saved percentages to the nearest choice on screen
    const snap = v => LEVELS.reduce((best, l) => (Math.abs(l - v) < Math.abs(best - v) ? l : best), LEVELS[0]);
    loadPreferences().then(p => setPrefs({ ...p, ecoPct: snap(p.ecoPct), culturePct: snap(p.culturePct) }));
  }, []);

  const set = (patch) => setPrefs(p => ({ ...p, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await savePreferences(prefs);
      Alert.alert(t('prefs_saved'), t('prefs_saved_body'));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('could_not_save'), e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return <View style={styles.center}><ActivityIndicator color={ACCENT} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1B2B28" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('prefs_title')}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}>
        <Text style={styles.label}>{t('prefs_eco')}</Text>
        <Text style={styles.help}>{t('prefs_eco_help')}</Text>
        <Segment options={LEVELS} value={prefs.ecoPct} onChange={v => set({ ecoPct: v })} format={v => `${v}%`} />

        <Text style={styles.label}>{t('prefs_culture')}</Text>
        <Text style={styles.help}>{t('prefs_culture_help')}</Text>
        <Segment options={LEVELS} value={prefs.culturePct} onChange={v => set({ culturePct: v })} format={v => `${v}%`} />

        <View style={styles.moodRow}>
          <MaterialCommunityIcons name="compass-outline" size={18} color={ACCENT} />
          <Text style={styles.moodText}>{t('prefs_lean', { mood: t(MOOD_KEYS[moodFromPreferences(prefs)]) })}</Text>
        </View>

        <Text style={styles.label}>{t('budget')}</Text>
        <Segment options={BUDGETS} value={prefs.budget} onChange={v => set({ budget: v })} format={v => t(`budget_${v}`)} />

        <Text style={styles.label}>{t('trip_length')}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => set({ days: Math.max(1, prefs.days - 1) })} accessibilityLabel="Fewer days">
            <MaterialCommunityIcons name="minus" size={22} color={ACCENT} />
          </TouchableOpacity>
          <Text style={styles.stepValue}>{prefs.days === 1 ? t('one_day') : t('n_days', { n: prefs.days })}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => set({ days: Math.min(14, prefs.days + 1) })} accessibilityLabel="More days">
            <MaterialCommunityIcons name="plus" size={22} color={ACCENT} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('mobility')}</Text>
        <View style={styles.mobility}>
          {MOBILITY.map(m => {
            const selected = prefs.mobility === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.mobItem, selected && styles.mobItemOn]}
                onPress={() => set({ mobility: m.id })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <MaterialCommunityIcons name={m.icon} size={24} color={selected ? '#FFF' : ACCENT} />
                <Text style={[styles.mobText, selected && styles.segTextOn]}>{t(m.label)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('fewer_crowds')}</Text>
            <Text style={styles.help}>{t('fewer_crowds_help')}</Text>
          </View>
          <Switch value={prefs.avoidCrowds} onValueChange={v => set({ avoidCrowds: v })} color={ACCENT} />
        </View>

        <TouchableOpacity onPress={() => setPrefs({ ...DEFAULT_PREFERENCES })} style={styles.reset}>
          <Text style={styles.resetText}>{t('reset_defaults')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Button mode="contained" buttonColor={ACCENT} onPress={save} loading={saving} disabled={saving}
          contentStyle={{ height: 52 }} labelStyle={{ fontSize: 16 }} style={{ borderRadius: 14 }}>
          {t('save_prefs')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { padding: 8, marginRight: 4 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  body: { paddingHorizontal: 20 },
  label: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#1B2B28', marginTop: 22 },
  help: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#5F6F6B', marginTop: 2, marginBottom: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#E8EFED', borderRadius: 14, padding: 4, gap: 4, marginTop: 8 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segItemOn: { backgroundColor: ACCENT },
  segText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#33413E' },
  segTextOn: { color: '#FFF' },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: '#E0F2F1', borderRadius: 12, padding: 12 },
  moodText: { flex: 1, fontSize: 14, fontFamily: 'Outfit-Medium', color: '#004D40' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F2F1', alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#1B2B28', minWidth: 80, textAlign: 'center' },
  mobility: { flexDirection: 'row', gap: 10, marginTop: 10 },
  mobItem: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D6E2DF' },
  mobItemOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  mobText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#33413E', textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reset: { alignSelf: 'center', marginTop: 24, padding: 8 },
  resetText: { color: '#5F6F6B', textDecorationLine: 'underline', fontFamily: 'Outfit-Medium' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E6ECEA' },
});
