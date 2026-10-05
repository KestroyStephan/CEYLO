import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList, Alert, Image, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAvoider from '../components/KeyboardAvoider';
import { Text, TextInput, Avatar, IconButton, Surface, Chip, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import i18next from '../i18n';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import * as Speech from 'expo-speech';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatTurn } from '../services/aiClient';
import { imgSource } from '../utils/images';
import { generateItinerary as buildItinerary, moodKey } from '../services/ItineraryService';
import { loadPreferences } from '../services/PreferencesService';
import destinationsData from '../assets/data/ai_destinations.json';

const MOOD_CATEGORIES = {
  eco: ['Nature & Viewpoint', 'Waterfall', 'Wildlife'],
  adventurer: ['Nature & Viewpoint', 'Waterfall', 'Wildlife'],
  culture: ['Heritage & Culture'],
  spiritual: ['Heritage & Culture'],
  family: ['Beach', 'Wildlife', 'Nature & Viewpoint'],
};

// Real destination cards from the bundled dataset, matched to what the traveler has told us so far
function findRecommendations(state) {
  const place = String(state.destination || '').toLowerCase();
  let matches = place
    ? destinationsData.filter(d => d.name.toLowerCase().includes(place) || d.province.toLowerCase().includes(place))
    : [];
  if (matches.length === 0 && state.mood) {
    const categories = MOOD_CATEGORIES[moodKey(state.mood)];
    matches = destinationsData.filter(d => categories.includes(d.category));
  }
  if (matches.length === 0) return null;
  return [...matches]
    .sort((a, b) => b.eco_score - a.eco_score)
    .slice(0, 3)
    .map(d => ({
      id: d.destination_id,
      name: d.name,
      category: d.category,
      province: d.province,
      ecoScore: Math.round(d.eco_score),
      rating: d.avg_rating,
      image: d.image,
    }));
}

const RenderMessage = memo(({ item, onSpeak, onSend, onSetDestination }) => (
  <View style={[styles.msgWrapper, item.sender === 'user' ? styles.userRow : styles.botRow]}>
    {item.sender === 'bot' && <Avatar.Icon size={32} icon="robot" style={{ backgroundColor: '#00695C' }} />}
    <View style={{ flex: 1, gap: 5, marginLeft: item.sender === 'bot' ? 10 : 0 }}>
      <Surface style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]} elevation={1}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.msgText, { color: item.sender === 'user' ? '#FFF' : '#333', flexShrink: 1 }]}>{item.text}</Text>
          {item.sender === 'bot' && (
            <IconButton
              icon="volume-high"
              iconColor="#00695C"
              size={18}
              style={{ margin: 0, marginLeft: 8 }}
              onPress={() => onSpeak(item.text)}
            />
          )}
        </View>
      </Surface>

      {/* Rich Media Horizontal Recommendations Carousel */}
      {item.sender === 'bot' && item.recommendations && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsContainer}>
          {item.recommendations.map((rec) => (
            <Surface key={rec.id} style={styles.recCard} elevation={2}>
              <Image source={imgSource(rec.image)} style={styles.recImage} />
              <View style={rec.ecoScore >= 95 ? styles.recBadge : [styles.recBadge, { backgroundColor: '#FFA726' }]}>
                <Text style={styles.recBadgeText}>{rec.ecoScore}% ECO</Text>
              </View>
              <View style={styles.recContent}>
                <Text style={styles.recTitle} numberOfLines={1}>{rec.name}</Text>
                <Text style={styles.recCategory}>{rec.category}</Text>
                <View style={styles.recRow}>
                  <Text style={styles.recPrice} numberOfLines={1}>{rec.province.replace(' Province', '')}</Text>
                  <View style={styles.recRatingRow}>
                    <MaterialCommunityIcons name="star" size={12} color="#FFB300" />
                    <Text style={styles.recRating}>{rec.rating}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.recBtn}
                  onPress={() => {
                    onSetDestination(rec.name);
                    Alert.alert("Destination Set", `${rec.name} added to your travel goals!`);
                  }}
                >
                  <Text style={styles.recBtnText}>{i18next.t('add_to_route')}</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          ))}
        </ScrollView>
      )}

      {item.options && (
        <View style={styles.optionRow}>
          {item.options.map((opt, i) => (
            <Chip key={i} style={styles.optionBtn} onPress={() => onSend(opt)}>{opt}</Chip>
          ))}
        </View>
      )}
    </View>
  </View>
));

export default function ChatbotScreen({ navigation, route }) {
  useStatusBarStyle('light-content');
  const { i18n, t } = useTranslation();
  const [messages, setMessages] = useState([
    { id: '1', text: t('chat_welcome'), sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedState, setExtractedState] = useState({
    destination: null,
    days: null,
    budget: null,
    eco_interest: 50,
    mood: null
  });

  const insets = useSafeAreaInsets();
  const flatListRef = useRef();
  const inputRef = useRef(null);

  const speakMessage = (text) => {
    Speech.stop();
    Speech.speak(text, {
      language: i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      Speech.stop();
    });
    return () => {
      Speech.stop();
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    // Fetch user mood from onboarding
    const fetchUserMood = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().mood) {
          setExtractedState(prev => ({ ...prev, mood: prev.mood || userDoc.data().mood }));
        }
      } catch (e) {
        console.log('Could not load mood:', e.message);
      }
    };
    fetchUserMood();
    // Saved preferences pre-fill the trip profile (budget and eco interest)
    loadPreferences().then(p => {
      setExtractedState(prev => ({ ...prev, budget: prev.budget || p.budget, eco_interest: p.ecoPct }));
    });
  }, []);

  // Keep the newest message visible when the keyboard opens
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => sub.remove();
  }, []);

  const handleSend = async (text = inputText) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now().toString(), text, sender: 'user' };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // The trained concierge model keeps the trip profile in extractedState between turns
      const responseJson = await chatTurn(text, extractedState);
      const nextState = { ...extractedState, ...(responseJson.extractedState || {}) };
      setExtractedState(nextState);

      const destinationChanged = nextState.destination && nextState.destination !== extractedState.destination;
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: responseJson.resp || t('chat_fallback'),
        sender: 'bot',
        options: responseJson.ui_options,
        isFinal: responseJson.isReady,
        recommendations: responseJson.recommendations?.length
          ? responseJson.recommendations
          : (destinationChanged ? findRecommendations(nextState) : null),
      }]);
    } catch (error) {
      console.warn('Concierge request failed:', error.message);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: t('chat_error'),
        sender: 'bot'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Speech-to-text needs a native module this app does not ship, so the mic hands
  // over to the keyboard's built-in dictation instead of faking a transcript.
  const startVoiceInput = () => {
    inputRef.current?.focus();
    Alert.alert(t('voice_title'), t('voice_body'));
  };

  const generateItinerary = async () => {
    setLoading(true);
    try {
      const itinerary = await buildItinerary({
        mood: extractedState.mood,
        days: extractedState.days,
        budget: extractedState.budget,
        destination: extractedState.destination,
      });
      Alert.alert(
        itinerary.offline ? t('itinerary_ready_offline') : t('itinerary_ready'),
        itinerary.offline
          ? t('itinerary_offline_body')
          : t('itinerary_body', { n: itinerary.plan.length }),
        [{ text: t('view_itinerary'), onPress: () => navigation.navigate('ItineraryDetail', { routeData: itinerary }) }]
      );
    } catch (e) {
      console.error("Itinerary generation failed:", e);
      Alert.alert(t('itinerary_failed'), t('try_again'));
    } finally {
      setLoading(false);
    }
  };

  // Stable callbacks passed to memoized RenderMessage
  const handleSpeak = useCallback((text) => speakMessage(text), []);
  const handleSendCallback = useCallback((text) => handleSend(text), [messages, extractedState, loading]);
  const handleSetDestination = useCallback((name) => {
    setExtractedState(prev => ({ ...prev, destination: name }));
  }, []);
  const renderItem = useCallback(({ item }) => (
    <RenderMessage
      item={item}
      onSpeak={handleSpeak}
      onSend={handleSendCallback}
      onSetDestination={handleSetDestination}
    />
  ), [handleSpeak, handleSendCallback, handleSetDestination]);

  const lastMessage = messages[messages.length - 1];
  const showHud = Boolean(extractedState.destination || extractedState.days || extractedState.mood);
  const canGenerate = lastMessage.isFinal || (extractedState.days && (extractedState.destination || extractedState.mood));

  return (
    <KeyboardAvoider behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <LinearGradient colors={['#004D40', '#00695C']} style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.barTitle}>{t('chat_title')}</Text>
      </LinearGradient>

      {showHud && (
      <View style={styles.hud}>
        <Surface style={styles.hudCard} elevation={2}>
          <View style={styles.hudRow}>
            <View style={styles.hudItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#00695C" />
              <Text style={styles.hudVal} numberOfLines={1}>{extractedState.destination || t('anywhere')}</Text>
            </View>
            <View style={styles.hudItem}>
              <MaterialCommunityIcons name="calendar" size={16} color="#00695C" />
              <Text style={styles.hudVal}>{extractedState.days ? (extractedState.days === 1 ? t('one_day') : t('n_days', { n: extractedState.days })) : t('days_q')}</Text>
            </View>
            <View style={styles.hudItem}>
              <MaterialCommunityIcons name="leaf" size={16} color="#4CAF50" />
              <Text style={styles.hudVal}>{extractedState.eco_interest}%</Text>
            </View>
          </View>
          {extractedState.mood && <Chip compact style={styles.moodBadge} textStyle={{ fontSize: 10 }}>{extractedState.mood}</Chip>}
        </Surface>
      </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.chatList}
        contentContainerStyle={styles.chatScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {canGenerate && (
        <Button
          mode="contained"
          icon="sparkles"
          onPress={generateItinerary}
          style={styles.genBtn}
          loading={loading}
          disabled={loading}
        >
          {t('generate_itinerary')}
        </Button>
      )}

      <Surface style={styles.inputArea} elevation={5}>
        <View style={styles.inputRow}>
          <IconButton
            icon="microphone"
            containerColor="#E0F2F1"
            iconColor="#00695C"
            size={24}
            onPress={startVoiceInput}
            disabled={loading}
          />
          <TextInput
            ref={inputRef}
            placeholder={t('chat_placeholder')}
            value={inputText}
            onChangeText={setInputText}
            mode="flat"
            style={styles.textInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
          <IconButton
            icon="send"
            containerColor="#00695C"
            iconColor="#FFF"
            size={24}
            onPress={() => handleSend()}
            disabled={loading || !inputText.trim()}
          />
        </View>
      </Surface>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  topBar: { paddingHorizontal: 20, paddingBottom: 16, alignItems: 'center' },
  barTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Outfit-Bold' },
  hud: { paddingHorizontal: 16, marginTop: 12 },
  hudCard: { backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hudRow: { flexDirection: 'row', gap: 14, flexShrink: 1 },
  hudItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  hudVal: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#333' },
  moodBadge: { backgroundColor: '#E1F5FE' },
  chatList: { flex: 1 },
  chatScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  msgWrapper: { marginBottom: 20, maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  botRow: { alignSelf: 'flex-start', flexDirection: 'row', gap: 10 },
  bubble: { padding: 15, borderRadius: 20 },
  userBubble: { backgroundColor: '#00695C', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 4 },
  msgText: { fontFamily: 'Outfit-Regular', fontSize: 15 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  optionBtn: { backgroundColor: '#B2DFDB' },
  recordingOverlay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#FFEBEE', borderRadius: 20, marginHorizontal: 20, marginBottom: 10 },
  recordingText: { color: '#D32F2F', fontFamily: 'Outfit-Bold', marginLeft: 10 },
  recordingIcon: { opacity: 0.8 },
  inputArea: { paddingHorizontal: 12, paddingVertical: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  textInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: 48, overflow: 'hidden' },
  genBtn: { marginHorizontal: 16, marginBottom: 10, borderRadius: 15, backgroundColor: '#FF7043' },

  // Voice Modal Styles
  voiceModal: { backgroundColor: 'transparent', margin: 20, justifyContent: 'center', alignItems: 'center' },
  voiceGradient: { width: '90%', borderRadius: 25, padding: 30, alignItems: 'center', position: 'relative' },
  closeVoiceBtn: { position: 'absolute', top: 10, right: 10 },
  voiceTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Outfit-Bold', marginTop: 15 },
  voiceSubtitle: { color: '#B2DFDB', fontSize: 13, fontFamily: 'Outfit-Regular', marginTop: 5, textAlign: 'center' },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, height: 100, marginTop: 25 },
  waveBar: { width: 8, borderRadius: 4 },

  // Recommendation Card Styles
  recommendationsContainer: { marginTop: 10, paddingVertical: 5 },
  recCard: { width: 200, backgroundColor: '#FFF', borderRadius: 15, marginRight: 15, overflow: 'hidden', borderBottomWidth: 3, borderBottomColor: '#00695C' },
  recImage: { width: '100%', height: 100 },
  recBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  recBadgeText: { color: '#FFF', fontSize: 9, fontFamily: 'Outfit-Bold' },
  recContent: { padding: 10 },
  recTitle: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#333' },
  recCategory: { fontSize: 10, color: '#666', marginTop: 2 },
  recRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  recPrice: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#00695C' },
  recRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  recRating: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#FFB300' },
  recBtn: { backgroundColor: '#E0F2F1', borderRadius: 10, paddingVertical: 6, alignItems: 'center', marginTop: 8 },
  recBtnText: { color: '#00695C', fontSize: 11, fontFamily: 'Outfit-Bold' },
});
