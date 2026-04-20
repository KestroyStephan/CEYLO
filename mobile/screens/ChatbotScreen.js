import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Keyboard, Dimensions, FlatList } from 'react-native';
import { Text, TextInput, Avatar, ActivityIndicator, IconButton, Surface, Chip, Card, Portal, Modal, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebaseConfig';
import { doc, updateDoc, arrayUnion, addDoc, collection } from 'firebase/firestore';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// API URLs (Using Waterfall logic)
const MODELS = [
  { name: 'Gemini 1.5 Flash', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, type: 'gemini' },
  { name: 'OpenAI GPT-4o-mini', url: 'https://api.openai.com/v1/chat/completions', type: 'openai', key: process.env.EXPO_PUBLIC_OPENAI_API_KEY },
  { name: 'Groq Llama 3', url: 'https://api.groq.com/openai/v1/chat/completions', type: 'groq', key: process.env.EXPO_PUBLIC_GROQ_API_KEY },
  { name: 'GitHub Models', url: 'https://models.inference.ai.azure.com/chat/completions', type: 'github', key: process.env.EXPO_PUBLIC_GITHUB_TOKEN },
];

const SYSTEM_PROMPT = `You are CEYLO, a premium Sri Lankan Travel Concierge. 
Your goal is to build a "Trip Profile" for the traveler through natural conversation.
STRICT JSON OUTPUT REQUIRED for every response.

ExtractedState JSON Schema:
{
  "resp": "Conversational reply in traveler's language",
  "extractedState": {
    "destination": "City Name",
    "days": 0,
    "budget": "Economy/Standard/Luxury",
    "eco_interest": 0-100,
    "mood": "Adventurer/Culture Seeker/Eco Explorer/Family/Spiritual",
    "mobility": "Standard/Accessible"
  },
  "isReady": boolean,
  "ui_options": ["Option 1", "Option 2"]
}

CONTEXT:
- Use Sri Lankan hospitality markers (Ayubowan, Vanakkam).
- Prioritize eco-friendly destinations.
- Extract preferences silently while talking.`;

export default function ChatbotScreen({ navigation }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    { id: '1', text: "Ayubowan! I'm Ceylo, your spirit guide through the island. Where shall we begin your journey?", sender: 'bot' }
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
  
  const hudAnim = useRef(new Animated.Value(-100)).current;
  const flatListRef = useRef();

  useEffect(() => {
    // Animate HUD in when valid data exists
    if (extractedState.destination || extractedState.mood) {
      Animated.spring(hudAnim, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [extractedState]);

  const callWaterfall = async (prompt) => {
    for (const model of MODELS) {
      try {
        console.log(`Trying ${model.name}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        let response;
        if (model.type === 'gemini') {
          response = await fetch(model.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${prompt}` }] }],
              generationConfig: { responseMimeType: "application/json" }
            }),
            signal: controller.signal
          });
        } else {
          response = await fetch(model.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${model.key}`
            },
            body: JSON.stringify({
              model: model.type === 'groq' ? "llama-3.3-70b-versatile" : "gpt-4o-mini",
              messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
              response_format: { type: "json_object" }
            }),
            signal: controller.signal
          });
        }

        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`${model.name} failed`);
        const data = await response.json();
        
        const resultString = model.type === 'gemini' 
          ? data.candidates[0].content.parts[0].text 
          : data.choices[0].message.content;
          
        return JSON.parse(resultString);
      } catch (err) {
        console.warn(`${model.name} error:`, err.message);
        continue; // Try next model
      }
    }
    throw new Error("All AI models exhausted");
  };

  const handleSend = async (text = inputText) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const responseJson = await callWaterfall(text);
      if (responseJson.extractedState) {
        setExtractedState(prev => ({ ...prev, ...responseJson.extractedState }));
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: responseJson.resp,
        sender: 'bot',
        options: responseJson.ui_options,
        isFinal: responseJson.isReady
      }]);

      // TTS implementation
      Speech.speak(responseJson.resp, {
        language: i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });

      if (responseJson.extractedState?.destination) {
        // Mock weather context injection
        console.log("Injecting weather info for", responseJson.extractedState.destination);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "I'm having a bit of trouble connecting to my signals. Could you repeat that?",
        sender: 'bot'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const generateItinerary = async () => {
    setLoading(true);
    // Phase 4 specific: Structured plan generation
    setTimeout(async () => {
      const itinerary = {
        title: `Your ${extractedState.mood} trip to ${extractedState.destination}`,
        userId: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
        plan: [
          { day: 1, activity: "Arrival and local eco-walk", eco: 95 },
          { day: 2, activity: "Temple visit and cultural tour", eco: 80 }
        ]
      };
      await addDoc(collection(db, 'itineraries'), itinerary);
      setLoading(false);
      Alert.alert("Success", "Your premium itinerary has been generated and saved!");
    }, 2000);
  };

  const RenderMessage = ({ item }) => (
    <View style={[styles.msgWrapper, item.sender === 'user' ? styles.userRow : styles.botRow]}>
      {item.sender === 'bot' && <Avatar.Icon size={32} icon="robot" style={{ backgroundColor: '#00695C' }} />}
      <Surface style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]} elevation={1}>
        <Text style={[styles.msgText, { color: item.sender === 'user' ? '#FFF' : '#333' }]}>{item.text}</Text>
      </Surface>
      {item.options && (
        <View style={styles.optionRow}>
          {item.options.map((opt, i) => (
            <Chip key={i} style={styles.optionBtn} onPress={() => handleSend(opt)}>{opt}</Chip>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={['#004D40', '#00695C']} style={styles.topBar}>
        <Text style={styles.barTitle}>Ceylo AI Concierge</Text>
      </LinearGradient>

      <Animated.View style={[styles.hud, { transform: [{ translateY: hudAnim }] }]}>
        <Surface style={styles.hudCard} elevation={3}>
          <View style={styles.hudRow}>
            <View style={styles.hudItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#00695C" />
              <Text style={styles.hudVal}>{extractedState.destination || '???'}</Text>
            </View>
            <View style={styles.hudItem}>
              <MaterialCommunityIcons name="calendar" size={16} color="#00695C" />
              <Text style={styles.hudVal}>{extractedState.days || '??'}</Text>
            </View>
            <View style={styles.hudItem}>
              <MaterialCommunityIcons name="leaf" size={16} color="#4CAF50" />
              <Text style={styles.hudVal}>{extractedState.eco_interest}%</Text>
            </View>
          </View>
          {extractedState.mood && <Chip style={styles.moodBadge} textStyle={{ fontSize: 10 }}>{extractedState.mood}</Chip>}
        </Surface>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={RenderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatScroll}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {messages[messages.length - 1].isFinal && (
        <Button 
          mode="contained" 
          icon="sparkles" 
          onPress={generateItinerary} 
          style={styles.genBtn}
          loading={loading}
        >
          Generate Premium Itinerary
        </Button>
      )}

      <Surface style={styles.inputArea} elevation={5}>
        <View style={styles.inputRow}>
          <IconButton icon="microphone" containerColor="#E0F2F1" iconColor="#00695C" size={24} />
          <TextInput
            placeholder="Type your preferences..."
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  topBar: { padding: 50, paddingTop: 60, paddingBottom: 20, alignItems: 'center' },
  barTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Outfit-Bold' },
  hud: { position: 'absolute', top: 110, width: '100%', zIndex: 10, paddingHorizontal: 20 },
  hudCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudRow: { flexDirection: 'row', gap: 20 },
  hudItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hudVal: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#333' },
  moodBadge: { backgroundColor: '#E1F5FE' },
  chatScroll: { padding: 20, paddingTop: 80, paddingBottom: 100 },
  msgWrapper: { marginBottom: 20, maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  botRow: { alignSelf: 'flex-start', flexDirection: 'row', gap: 10 },
  bubble: { padding: 15, borderRadius: 20 },
  userBubble: { backgroundColor: '#00695C', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 4 },
  msgText: { fontFamily: 'Outfit-Regular', fontSize: 15 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  optionBtn: { backgroundColor: '#B2DFDB' },
  inputArea: { padding: 15, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 25, height: 50 },
  genBtn: { margin: 20, borderRadius: 15, backgroundColor: '#FF7043' },
});
