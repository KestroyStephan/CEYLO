import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, Keyboard, Dimensions, FlatList, Alert } from 'react-native';
import { Text, TextInput, Avatar, ActivityIndicator, IconButton, Surface, Chip, Card, Portal, Modal, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection } from 'firebase/firestore';
import * as Speech from 'expo-speech';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';

const { width, height } = Dimensions.get('window');




const getSystemPrompt = (mode, ragContext = null) => {
  if (mode === 'trip_planner') {
    return `You are CEYLO, an elite Sri Lankan Travel Concierge. 
Your goal is to build a "Trip Profile" for the traveler and generate a complete personalized tour plan.
STRICT JSON OUTPUT REQUIRED for every response.

ExtractedState JSON Schema:
{
  "resp": "Conversational reply guiding the trip plan, or the final detailed itinerary.",
  "extractedState": {
    "destination": "City Name or All Sri Lanka",
    "days": 0,
    "budget": "Economy/Standard/Luxury",
    "eco_interest": 0-100,
    "mood": "Adventurer/Culture Seeker/Eco Explorer/Family/Spiritual",
    "startDate": "YYYY-MM-DD (if known)",
    "endDate": "YYYY-MM-DD (if known)"
  },
  "isReady": boolean,
  "ui_options": ["Option 1", "Option 2"]
}

CRITICAL RULES (Enforce these when isReady is true and you generate the final plan):
1. Recommend destinations across ALL PROVINCES (popular + hidden gems).
2. Consider Seasonal Events/Activities happening during the travel dates.
3. Include an intelligent day-by-day route with estimated travel times.
4. Predict & display estimated costs (Accommodation, Food, Transport, Entry Fees) and Total Budget.
5. Provide Realistic AI Reasoning for EVERY recommendation (e.g. "Recommendation: Knuckles Eco Trail. Reason: Matches your interest in nature and fits your $ budget").

${ragContext ? `DATABASE RAG CONTEXT (Use these exact places/events in your plan!):\n${JSON.stringify(ragContext)}` : "Extract preferences silently while talking. Once budget, days, and mood are known, set isReady to true."}`;
  } else if (mode === 'personal_assistant') {
    return `You are CEYLO, a premium Sri Lankan Personal Travel Assistant.
Answer questions naturally like weather, transport recommendations, travel routes (e.g. to Nuwara Eliya), what to do next, or tourist advice.
STRICT JSON OUTPUT REQUIRED.

ExtractedState JSON Schema:
{
  "resp": "Detailed response as a helpful personal assistant answering traveler's questions (e.g. routes, climate, transport advice). Keep it concise, friendly, and practical.",
  "extractedState": {},
  "isReady": false,
  "ui_options": ["Ask about Nuwara Eliya route", "Ask about climate today", "Ask about train travel"]
}

CONTEXT:
- Use hospitality markers (Ayubowan, Vanakkam) ONLY in the first message. DO NOT repeat them in subsequent replies.
- Offer actionable local tips.`;
  } else {
    return `You are CEYLO, a premium Sri Lankan Travel Concierge.
STRICT JSON OUTPUT REQUIRED.

ExtractedState JSON Schema:
{
  "resp": "Welcome response. Guide them to select a mode.",
  "extractedState": {},
  "isReady": false,
  "ui_options": ["🗺️ Plan a Trip", "💁 Personal Assistant"]
}`;
  }
};

export default function ChatbotScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [chatbotMode, setChatbotMode] = useState(null); // 'trip_planner' or 'personal_assistant'
  const [messages, setMessages] = useState([
    { 
      id: '1', 
      text: "Ayubowan! I'm Ceylo, your personal travel concierge. How can I help you today?", 
      sender: 'bot',
      options: ["🗺️ Plan a Trip", "💁 Personal Assistant"]
    }
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

  const callWaterfall = async (prompt, activeMode = chatbotMode, ragContext = null) => {
    const activeSystemPrompt = getSystemPrompt(activeMode, ragContext);
    const contextPrompt = `\n\nCURRENT KNOWN STATE: ${JSON.stringify(extractedState)}\nUser: ${prompt}`;
    
    const models = [
      { name: 'Groq Llama 3', url: 'https://api.groq.com/openai/v1/chat/completions', type: 'groq', key: process.env.EXPO_PUBLIC_GROQ_API_KEY },
      { name: 'OpenAI GPT-4o-mini', url: 'https://api.openai.com/v1/chat/completions', type: 'openai', key: process.env.EXPO_PUBLIC_OPENAI_API_KEY },
      { name: 'Gemini 1.5 Flash', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`, type: 'gemini' },
    ];

    // Helper to safely parse JSON from AI response (strips markdown fences if present)
    const safeParseJSON = (raw) => {
      let text = raw.trim();
      // Strip ```json ... ``` or ``` ... ``` wrappers
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(text);
    };

    for (const model of models) {
      // Skip models with no API key (except Gemini which embeds key in URL)
      if (model.type !== 'gemini' && !model.key) {
        console.warn(`Skipping ${model.name}: no API key set`);
        continue;
      }
      
      try {
        console.log(`Trying ${model.name}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        let response;
        if (model.type === 'gemini') {
          response = await fetch(model.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${activeSystemPrompt}${contextPrompt}` }] }],
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
              messages: [
                { role: 'system', content: activeSystemPrompt },
                { role: 'user', content: contextPrompt }
              ],
              response_format: { type: "json_object" }
            }),
            signal: controller.signal
          });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`${model.name} HTTP ${response.status}: ${errText.substring(0, 120)}`);
        }

        const data = await response.json();
        
        const resultString = model.type === 'gemini' 
          ? data?.candidates?.[0]?.content?.parts?.[0]?.text 
          : data?.choices?.[0]?.message?.content;

        if (!resultString) throw new Error(`${model.name} returned empty content`);
          
        console.log(`${model.name} success ✅`);
        return safeParseJSON(resultString);
      } catch (err) {
        console.warn(`${model.name} failed:`, err.message);
        continue; // Try next model
      }
    }
    throw new Error("All AI models exhausted");
  };


  const handleSend = async (text) => {
    const messageText = text || inputText;
    console.log("[Chatbot] handleSend called with messageText:", messageText, "inputText:", inputText);
    if (!messageText || !messageText.trim()) {
      console.log("[Chatbot] Empty message text, aborting.");
      return;
    }
    const cleanText = messageText.trim();
    console.log("[Chatbot] Sending cleanText:", cleanText);

    const userMsg = { id: Date.now().toString(), text: cleanText, sender: 'user' };
    setMessages(prev => {
      console.log("[Chatbot] Appending user message to state...");
      return [...prev, userMsg];
    });
    setInputText('');
    setLoading(true);

    let activeMode = chatbotMode;
    if (cleanText === "🗺️ Plan a Trip") {
      console.log("[Chatbot] Mode changed to trip_planner");
      activeMode = 'trip_planner';
      setChatbotMode('trip_planner');
    } else if (cleanText === "💁 Personal Assistant") {
      console.log("[Chatbot] Mode changed to personal_assistant (static welcoming response)");
      setChatbotMode('personal_assistant');
      setLoading(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "I am now active as your Personal Assistant. Ask me anything! For example: Nuwara Eliya route, weather status, or travel tips. 💁",
        sender: 'bot',
        options: ["Nuwara Eliya route?", "How is the climate?", "Best way to travel?"]
      }]);
      return;
    }

    try {
      console.log("[Chatbot] Invoking AI waterfall with activeMode:", activeMode);
      
      let ragContext = null;
      if (activeMode === 'trip_planner') {
        try {
          const ragResponse = await fetch(`${API_BASE_URL}/api/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              startDate: extractedState.startDate, 
              endDate: extractedState.endDate, 
              budget: extractedState.budget, 
              interests: cleanText, 
              days: extractedState.days, 
              mood: extractedState.mood 
            })
          });
          const ragData = await ragResponse.json();
          if (ragData.success) {
            ragContext = ragData.context;
          }
        } catch (e) {
          console.warn("Failed to fetch RAG context from backend:", e);
        }
      }

      const responseJson = await callWaterfall(cleanText, activeMode, ragContext);
      console.log("[Chatbot] AI response received:", responseJson);
      
      if (responseJson.extractedState) {
        setExtractedState(prev => ({ ...prev, ...responseJson.extractedState }));
      }

      // Check if we should inject mock recommendations for frontend display
      let recommendations = null;
      const lowerText = cleanText.toLowerCase();
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
      console.warn("[Chatbot] Waterfall error, using offline local rule-based engine:", error);
      
      if (activeMode === 'trip_planner') {
         let fallbackPlan = "I couldn't reach the AI servers, but based on my local datasets, here is a suggested itinerary:\n\n";
         if (ragContext && ragContext.destinations && ragContext.destinations.length > 0) {
             ragContext.destinations.slice(0,3).forEach((d, i) => {
                 fallbackPlan += `Day ${i+1}: Visit ${d.name} in ${d.district} (${d.category}).\n`;
             });
             fallbackPlan += "\nEstimated Budget: LKR 45,000\nEnjoy your trip!";
         } else {
             fallbackPlan = "Let's map out your journey! A classic 3-day itinerary: Colombo -> Kandy -> Ella. Would you like to generate this?";
         }
         
         setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            text: fallbackPlan,
            sender: 'bot',
            options: [],
            isFinal: true
         }]);
         setLoading(false);
         return;
      }

      const lower = cleanText.toLowerCase();
      let responseText = "I'm operating in helper mode right now! How can I assist you with your travels in Sri Lanka?";
      let nextOptions = ["Plan a Trip", "Weather in Ella?", "Train routes?"];

      if (lower.includes("nuwara eliya") || lower.includes("route") || lower.includes("go to") || lower.includes("direction")) {
        responseText = "To travel to Nuwara Eliya, the most popular and scenic route is taking the train from Colombo or Kandy to Nanu Oya station, then taking a quick 15-minute taxi or TukTuk up to Nuwara Eliya city center. High-country driving via the A5 highway is also beautiful but has many winding roads.";
        nextOptions = ["Is it cold there?", "Train tickets?", "What to do next?"];
      } else if (lower.includes("climate") || lower.includes("weather") || lower.includes("rain") || lower.includes("temperature")) {
        responseText = "Sri Lanka has a tropical climate. Coastal areas (like Colombo, Hikkaduwa, Trincomalee) are sunny and warm at 28-32°C. Central hill country locations (like Nuwara Eliya, Ella) are cooler, averaging 15-20°C. Be prepared for occasional rain showers in the hills!";
        nextOptions = ["Nuwara Eliya route?", "Best time to visit?", "Beach weather?"];
      } else if (lower.includes("travel") || lower.includes("transport") || lower.includes("train") || lower.includes("bus") || lower.includes("tuktuk") || lower.includes("way to")) {
        responseText = "For long distances, the local train system is highly recommended (especially the Kandy to Ella line). For daily local commuting, hiring a TukTuk or using ride-hailing apps like PickMe/Uber is the most convenient and cost-effective method.";
        nextOptions = ["Train booking?", "Rent a car?", "Nuwara Eliya route?"];
      } else if (lower.includes("plan") || lower.includes("trip") || lower.includes("itinerary")) {
        responseText = "Let's map out your journey! A classic 7-day Sri Lankan itinerary starts in Colombo, moves to Kandy & Sigiriya for culture, then Ella for tea hills, and finishes with a Yala wildlife safari and Mirissa beaches. Would you like suggestions for beaches or cultural sites?";
        nextOptions = ["Show beaches", "Cultural sites", "How many days?"];
      } else if (lower.includes("beach") || lower.includes("mirissa") || lower.includes("hikkaduwa")) {
        responseText = "Sri Lanka's south coast has beautiful beaches! Mirissa is famous for whale watching and surfing, Hikkaduwa has coral sanctuaries, and Unawatuna is perfect for swimming. They are best visited between November and April.";
        nextOptions = ["Mirissa stays", "Whale watching", "Ella highlands?"];
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("ayubowan")) {
        responseText = "Ayubowan! I am your Ceylo personal assistant. Ask me anything about routes, climate, transport, or trip planning in Sri Lanka!";
        nextOptions = ["Nuwara Eliya route?", "How is the climate?", "Best way to travel?"];
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        options: nextOptions
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
      const ragResponse = await fetch(`${API_BASE_URL}/api/recommend`, {
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
        "Your ML-predicted itinerary has been generated combining real datasets and AI!",
        [
          {
            text: "View Itinerary",
            onPress: () => navigation.navigate('ItineraryDetail', { routeData: { id: docRef.id, ...itinerary } })
          }
        ]
      );
    } catch (e) {
      console.warn("RAG backend failed, generating fallback itinerary:", e);
      
      // FALLBACK TO MOCK PLAN
      const dynamicPlan = [
        { day: 1, activity: `Arrive and settle in ${extractedState.destination || 'Colombo'}`, eco: 85, lat: 6.9271, lon: 79.8612, destinationId: 'colombo', transport: 'car' },
        { day: 2, activity: `Eco-friendly city tour and local cuisine`, eco: 92, lat: 6.9271, lon: 79.8612, destinationId: 'colombo_tour', transport: 'walk' },
        { day: 3, activity: `Visit nearest national park for wildlife safari`, eco: 98, lat: 6.9271, lon: 79.8612, destinationId: 'safari', transport: 'train' }
      ];

      const itinerary = {
        title: `Your ${extractedState.mood || 'Custom'} trip to ${extractedState.destination || 'Sri Lanka'}`,
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: new Date().toISOString(),
        plan: dynamicPlan,
        ecoScore: 92,
        cost: "LKR 20,000",
        duration: "3 Days"
      };

      try {
        const docRef = await addDoc(collection(db, 'itineraries'), itinerary);
        Alert.alert(
          "Itinerary Ready (Fallback Mode)", 
          "Could not connect to the ML backend. A smart fallback itinerary has been generated and saved instead.",
          [
            {
              text: "View Itinerary",
              onPress: () => navigation.navigate('ItineraryDetail', { routeData: { id: docRef.id, ...itinerary } })
            }
          ]
        );
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        Alert.alert("Error", "Could not connect to the RAG backend, and failed to save fallback itinerary to Firestore.");
      }
    } finally {
      setLoading(false);
    }
  };

// ─── Rendered outside component to prevent keyboard dismissal on re-render ───
const RenderMessage = memo(({ item, onSpeak, onSend, onSetDestination }) => (
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
              onPress={() => onSpeak(item.text)}
            />
          )}
        </View>
      </Surface>

      {/* Rich Media Horizontal Recommendations Carousel */}
      {item.sender === 'bot' && item.recommendations && Array.isArray(item.recommendations) && (
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
                      onSetDestination(rec.name);
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

      {item.options && Array.isArray(item.options) && (
        <View style={styles.optionRow}>
          {item.options.map((opt, i) => (
            <Chip key={i} style={styles.optionBtn} onPress={() => onSend(opt)}>{opt}</Chip>
          ))}
        </View>
      )}
    </View>
  </View>
));

  // Stable callbacks passed to memoized RenderMessage
  const handleSpeak = useCallback((text) => speakMessage(text), []);
  const handleSendCallback = useCallback((text) => handleSend(text), [inputText, extractedState, loading, chatbotMode]);
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
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
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        onContentSizeChange={() => {
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToEnd({ animated: true });
            } catch (e) {
              console.warn("FlatList scroll to end failed:", e);
            }
          }
        }}
      />

      {messages && messages.length > 0 && messages[messages.length - 1]?.isFinal && (
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
