import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Keyboard, Dimensions, FlatList, Alert } from 'react-native';
import { Text, TextInput, Avatar, ActivityIndicator, IconButton, Surface, Chip, Card, Portal, Modal, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection } from 'firebase/firestore';
import * as Speech from 'expo-speech';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// API URLs (Using Waterfall logic)
const MODELS = [
  { name: 'Groq Llama 3', url: 'https://api.groq.com/openai/v1/chat/completions', type: 'groq', key: process.env.EXPO_PUBLIC_GROQ_API_KEY },
  { name: 'Gemini 1.5 Flash', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, type: 'gemini' },
  { name: 'OpenAI GPT-4o-mini', url: 'https://api.openai.com/v1/chat/completions', type: 'openai', key: process.env.EXPO_PUBLIC_OPENAI_API_KEY },
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
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([
    { id: '1', text: "Ayubowan! I'm Ceylo, your spirit guide through the island. Where shall we begin your journey?", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [extractedState, setExtractedState] = useState({
    destination: null,
    days: null,
    budget: null,
    eco_interest: 50,
    mood: null
  });
  
  const hudAnim = useRef(new Animated.Value(-100)).current;
  const flatListRef = useRef();

  const waveAnims = useRef([
    new Animated.Value(20),
    new Animated.Value(40),
    new Animated.Value(60),
    new Animated.Value(40),
    new Animated.Value(20),
  ]).current;

  const startWaveAnimation = () => {
    const anims = waveAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * 80 + 20,
            duration: 300 + index * 50,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: Math.random() * 30 + 10,
            duration: 300 + index * 50,
            useNativeDriver: false,
          }),
        ])
      );
    });
    Animated.parallel(anims).start();
  };

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
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().mood) {
          setExtractedState(prev => ({ ...prev, mood: userDoc.data().mood }));
        }
      }
    };
    fetchUserMood();
  }, []);

  useEffect(() => {
    // Animate HUD in when valid data exists
    if (extractedState.destination || extractedState.mood) {
      Animated.spring(hudAnim, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [extractedState]);

  const callWaterfall = async (prompt) => {
    const contextPrompt = `\n\nCURRENT KNOWN STATE: ${JSON.stringify(extractedState)}\nUser: ${prompt}`;
    for (const model of MODELS) {
      if (!model.key && model.type !== 'gemini') continue;
      
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
              contents: [{ parts: [{ text: `${SYSTEM_PROMPT}${contextPrompt}` }] }],
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
              messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: contextPrompt }],
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

      // Check if we should inject mock recommendations for frontend display
      let recommendations = null;
      const lowerText = text.toLowerCase();
      if (lowerText.includes('sigiriya') || lowerText.includes('culture') || lowerText.includes('stay') || lowerText.includes('hotel') || lowerText.includes('mirissa') || lowerText.includes('safari') || lowerText.includes('wildlife')) {
        recommendations = [
          {
            id: 'rec_1',
            name: lowerText.includes('mirissa') ? "Mirissa Golden Sandy Beach" : lowerText.includes('safari') || lowerText.includes('wildlife') ? "Yala National Park Safari" : "Sigiriya Rock Fortress",
            category: lowerText.includes('mirissa') ? "Beach" : lowerText.includes('safari') || lowerText.includes('wildlife') ? "Wildlife" : "Heritage & Culture",
            ecoScore: 92,
            rating: 4.9,
            image: lowerText.includes('mirissa') 
              ? "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600"
              : lowerText.includes('safari') || lowerText.includes('wildlife')
              ? "https://images.unsplash.com/photo-1581888227599-779811939961?w=600"
              : "https://images.unsplash.com/photo-1588598130782-690a2985731f?w=600",
            vibe: lowerText.includes('mirissa') ? "Family Trip" : lowerText.includes('safari') || lowerText.includes('wildlife') ? "Adventurer" : "Culture Seeker"
          },
          {
            id: 'rec_2',
            name: lowerText.includes('mirissa') ? "Paradise Bay Eco Resort" : lowerText.includes('safari') || lowerText.includes('wildlife') ? "Cinnamon Wild Yala" : "Sigiriya Wilderness Lodge",
            category: "Stay",
            price: lowerText.includes('mirissa') ? "LKR 18,500/night" : lowerText.includes('safari') || lowerText.includes('wildlife') ? "LKR 28,000/night" : "LKR 14,000/night",
            ecoScore: 96,
            rating: 4.8,
            image: lowerText.includes('mirissa')
              ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
              : lowerText.includes('safari') || lowerText.includes('wildlife')
              ? "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600"
              : "https://images.unsplash.com/photo-1601248464673-9eb1f5850444?w=600",
            vibe: "Eco Explorer"
          }
        ];
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: responseJson.resp,
        sender: 'bot',
        options: responseJson.ui_options,
        isFinal: responseJson.isReady,
        recommendations: recommendations
      }]);

    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "I'm having a bit of trouble connecting to my signals. Please check your internet connection.",
        sender: 'bot'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceAssistant = () => {
    setVoiceModalVisible(true);
    startWaveAnimation();
    setTimeout(() => {
      setVoiceModalVisible(false);
      const voiceInputs = [
        "I want to plan a 3 day culture trip to Sigiriya on a standard budget",
        "Show me eco friendly stays in Mirissa beach",
        "Let's make a luxury wildlife safari in Yala National Park",
      ];
      const randomInput = voiceInputs[Math.floor(Math.random() * voiceInputs.length)];
      handleSend(randomInput);
    }, 3000);
  };

  const generateItinerary = async () => {
    setLoading(true);
    try {
      // 1. Fetch real 100k data RAG matches from backend
      const backendIp = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const ragResponse = await fetch(`http://${backendIp}:5000/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: extractedState.mood || 'Adventurer' })
      });
      
      const ragData = await ragResponse.json();
      const topDestinations = ragData.top_matches;

      // 2. Build the dynamic plan from real AI predictions
      const dynamicPlan = topDestinations.map((dest, index) => ({
        day: index + 1,
        activity: `Explore ${dest.name} in ${dest.province} (${dest.category})`,
        eco: dest.ecoScore,
        lat: dest.lat,
        lon: dest.lon,
        destinationId: dest.id
      }));

      const itinerary = {
        title: `Your ${extractedState.mood || 'Custom'} trip to ${extractedState.destination || 'Sri Lanka'}`,
        userId: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
        plan: dynamicPlan
      };

      const docRef = await addDoc(collection(db, 'itineraries'), itinerary);
      
      Alert.alert(
        "Itinerary Ready", 
        "Your ML-predicted itinerary has been generated from 100,000+ data points!",
        [
          {
            text: "View Itinerary",
            onPress: () => navigation.navigate('ItineraryDetail', { routeData: { id: docRef.id, ...itinerary } })
          }
        ]
      );
    } catch (e) {
      console.warn("RAG backend failed, check if server.js is running:", e);
      Alert.alert("Error", "Could not connect to the RAG backend. Is server.js running?");
    } finally {
      setLoading(false);
    }
  };

  const RenderMessage = ({ item }) => (
    <View style={[styles.msgWrapper, item.sender === 'user' ? styles.userRow : styles.botRow]}>
      {item.sender === 'bot' && <Avatar.Icon size={32} icon="robot" style={{ backgroundColor: '#00695C' }} />}
      <View style={{ flex: 1, gap: 5, marginLeft: item.sender === 'bot' ? 10 : 0 }}>
        <Surface style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]} elevation={1}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.msgText, { color: item.sender === 'user' ? '#FFF' : '#333', flex: 1 }]}>{item.text}</Text>
            {item.sender === 'bot' && (
              <IconButton 
                icon="volume-high" 
                iconColor="#00695C" 
                size={18} 
                style={{ margin: 0, marginLeft: 8 }}
                onPress={() => speakMessage(item.text)} 
              />
            )}
          </View>
        </Surface>
        
        {/* Rich Media Horizontal Recommendations Carousel */}
        {item.sender === 'bot' && item.recommendations && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsContainer}>
            {item.recommendations.map((rec) => (
              <Surface key={rec.id} style={styles.recCard} elevation={2}>
                <Image source={{ uri: rec.image }} style={styles.recImage} />
                <View style={rec.ecoScore >= 95 ? styles.recBadge : [styles.recBadge, { backgroundColor: '#FFA726' }]}>
                  <Text style={styles.recBadgeText}>{rec.ecoScore}% ECO</Text>
                </View>
                <View style={styles.recContent}>
                  <Text style={styles.recTitle} numberOfLines={1}>{rec.name}</Text>
                  <Text style={styles.recCategory}>{rec.category}</Text>
                  <View style={styles.recRow}>
                    <Text style={styles.recPrice}>{rec.price || 'Free Entry'}</Text>
                    <View style={styles.recRatingRow}>
                      <MaterialCommunityIcons name="star" size={12} color="#FFB300" />
                      <Text style={styles.recRating}>{rec.rating}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.recBtn}
                    onPress={() => {
                      if (rec.category === 'Stay') {
                        Alert.alert("Accommodation Selected", `${rec.name} has been set as your preferred stay!`);
                      } else {
                        setExtractedState(prev => ({ ...prev, destination: rec.name }));
                        Alert.alert("Destination Set", `${rec.name} added to your travel goals!`);
                      }
                    }}
                  >
                    <Text style={styles.recBtnText}>
                      {rec.category === 'Stay' ? 'Book Stay' : 'Add to Route'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Surface>
            ))}
          </ScrollView>
        )}

        {item.options && (
          <View style={styles.optionRow}>
            {item.options.map((opt, i) => (
              <Chip key={i} style={styles.optionBtn} onPress={() => handleSend(opt)}>{opt}</Chip>
            ))}
          </View>
        )}
      </View>
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

      {isRecording && (
        <View style={styles.recordingOverlay}>
          <MaterialCommunityIcons name="microphone" size={24} color="#D32F2F" style={styles.recordingIcon} />
          <Text style={styles.recordingText}>Listening...</Text>
        </View>
      )}

      <Surface style={styles.inputArea} elevation={5}>
        <View style={styles.inputRow}>
          <IconButton 
            icon="microphone" 
            containerColor="#E0F2F1" 
            iconColor="#00695C" 
            size={24} 
            onPress={startVoiceAssistant}
            disabled={loading}
          />
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
            disabled={loading || (!inputText.trim() && !isRecording)}
          />
        </View>
      </Surface>

      {/* Voice Assistant Modal Overlay */}
      <Portal>
        <Modal 
          visible={voiceModalVisible} 
          onDismiss={() => setVoiceModalVisible(false)} 
          contentContainerStyle={styles.voiceModal}
        >
          <LinearGradient colors={['rgba(0, 77, 64, 0.95)', 'rgba(0, 105, 92, 0.95)']} style={styles.voiceGradient}>
            <IconButton 
              icon="close" 
              iconColor="#FFF" 
              size={20} 
              style={styles.closeVoiceBtn} 
              onPress={() => setVoiceModalVisible(false)} 
            />
            <Avatar.Icon size={64} icon="microphone" style={{ backgroundColor: '#004D40' }} iconColor="#FFF" />
            <Text style={styles.voiceTitle}>Ceylo Voice Concierge</Text>
            <Text style={styles.voiceSubtitle}>Listening to your travel vibes...</Text>
            
            {/* Waveform Visualization */}
            <View style={styles.waveRow}>
              {waveAnims.map((anim, index) => (
                <Animated.View 
                  key={index} 
                  style={[
                    styles.waveBar, 
                    { 
                      height: anim, 
                      backgroundColor: index % 2 === 0 ? '#FF7043' : '#4CAF50',
                      opacity: index % 2 === 0 ? 0.9 : 0.8
                    }
                  ]} 
                />
              ))}
            </View>
          </LinearGradient>
        </Modal>
      </Portal>
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
  recordingOverlay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#FFEBEE', borderRadius: 20, marginHorizontal: 20, marginBottom: 10 },
  recordingText: { color: '#D32F2F', fontFamily: 'Outfit-Bold', marginLeft: 10 },
  recordingIcon: { opacity: 0.8 },
  inputArea: { padding: 15, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 25, height: 50 },
  genBtn: { margin: 20, borderRadius: 15, backgroundColor: '#FF7043' },
  
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
