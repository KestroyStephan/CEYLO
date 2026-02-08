import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Text, TextInput, Avatar, ActivityIndicator, IconButton, Surface, Chip, Card, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

const OLLAMA_URL = 'http://10.164.88.3:11434/api/generate';

const SYSTEM_PROMPT = `You are CEYLO, the ultimate Sri Lankan Travel Concierge. 
Your goal is to build a "Trip Profile" for the user through natural conversation.

TRIP PROFILE DATA POINTS:
- source (Current location)
- destination (Primary city/region)
- group (Type: Solo/Couple/Family/Friends + Count)
- budget (Economy/Standard/Luxury)
- duration (Days)
- interests (List: Nature, Adventure, Culture, Beaches, Food, etc.)
- transport (Hire/Rent/Public)

STRICT RULES:
1. Don't be a robot. If the user provides multiple details (e.g., "5 days in Kandy"), extract ALL of them into extractedState.
2. Analyze the current Trip Profile. If a piece of data is missing, ask for it in a friendly, conversational way.
3. If they ask a general travel question, answer it briefly THEN pivot back to planning.
4. Always return JSON with two parts: 
   - "resp": Your conversational reply.
   - "extractedState": A JSON object containing NEW or UPDATED field values.
   - "ui": (Optional) The current category for UI logic ('budget', 'interests', 'groupType', 'transport', 'finalize').

JSON FORMAT:
{
  "resp": "That sounds lovely! Since you're traveling as a couple, would you prefer a Luxury stay in Kandy?",
  "extractedState": { "destination": "Kandy", "duration": "5", "groupType": "Couple" },
  "ui": "budget"
}`;

const FINAL_PLAN_PROMPT = `Generate a high-end, professionally detailed travel itinerary for Sri Lanka.
Include coordinates, hidden gems (💎), seasonal alerts, and specific transport provider contacts.

Return JSON: { "trip_plan": { ... } }`;

export default function ChatbotScreen({ navigation }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Ayubowan! I'm Ceylo, your personal Sri Lankan travel concierge. Where are we heading, or should I suggest some trending spots for this season?",
            sender: 'bot'
        }
    ]);
    const [tripState, setTripState] = useState({
        source: null,
        destination: null,
        groupType: null,
        groupCount: null,
        budget: null,
        duration: null,
        interests: [],
        transport: null
    });
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFinalized, setIsFinalized] = useState(false);
    const [tempCount, setTempCount] = useState(1);
    const scrollViewRef = useRef();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const sendMessage = async (text = inputText) => {
        const messageToSend = typeof text === 'string' ? text : inputText;
        if (!messageToSend.trim()) return;

        const userMsg = { id: Date.now(), text: messageToSend, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            const history = messages.slice(-5).map(m => `${m.sender}: ${m.text}`).join('\n');
            const currentProfile = JSON.stringify(tripState);

            const response = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama3.2",
                    prompt: `${SYSTEM_PROMPT}\n\nCURRENT TRIP PROFILE: ${currentProfile}\n\nCONVERSATION:\n${history}\nUser: ${messageToSend}\nResponse (JSON):`,
                    stream: false,
                    format: "json"
                }),
            });

            const data = await response.json();
            const botJson = JSON.parse(data.response);

            if (botJson.extractedState) {
                setTripState(prev => ({ ...prev, ...botJson.extractedState }));
            }

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: botJson.resp,
                sender: 'bot',
                ui: botJson.ui || (botJson.extractedState ? Object.keys(botJson.extractedState)[0] : null)
            }]);

            if (botJson.ui === 'finalize' || botJson.isReady) {
                await generateFinalPlan(history + `\nUser: ${messageToSend}`);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "I'm having a slight map-reading error. Let's try that again!",
                sender: 'bot'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const generateFinalPlan = async (fullHistory) => {
        setLoading(true);
        try {
            const response = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama3.2",
                    prompt: `${FINAL_PLAN_PROMPT}\n\nContext:\n${fullHistory}\nOutput (JSON):`,
                    stream: false,
                    format: "json"
                }),
            });

            const data = await response.json();
            const planData = JSON.parse(data.response);

            setMessages(prev => [...prev, {
                id: Date.now() + 2,
                text: "Your professional trip plan is ready! Have a safe journey.",
                sender: 'bot',
                plan: planData.trip_plan,
                ui: 'final'
            }]);
            setIsFinalized(true);
        } catch (error) {
            console.error("Plan Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderPlan = (plan) => (
        <Card style={styles.planCard}>
            <Card.Title
                title={`${plan.destination || 'Your Trip'}`}
                subtitle={`${plan.duration || ''} | ${plan.budget || ''}`}
                right={(props) => <Avatar.Icon {...props} icon="map-marker" style={{ backgroundColor: '#00695c' }} />}
            />
            <Card.Content>
                <TouchableOpacity
                    style={styles.mapBtn}
                    onPress={() => navigation.navigate('MapScreen', { route: plan.route })}
                >
                    <IconButton icon="map" iconColor="#fff" />
                    <Text style={styles.mapBtnText}>View Optimized Route</Text>
                </TouchableOpacity>

                {plan.route?.suggested_roads && (
                    <Text style={styles.roadInfo}>🛣️ {plan.route.suggested_roads.join(' → ')}</Text>
                )}

                <Text style={styles.sectionTitle}>🏨 Accommodations</Text>
                {plan.hotels?.map((h, i) => (
                    <View key={i} style={styles.hotelItem}>
                        <Text style={styles.hotelName}>{h.hotel_name}</Text>
                        <Text style={styles.hotelPrice}>{h.price_per_night}</Text>
                        <Text style={styles.hotelDesc}>{h.description}</Text>
                    </View>
                ))}

                <Divider style={{ marginVertical: 10 }} />

                <Text style={styles.sectionTitle}>🚗 Transport Details</Text>
                <View style={styles.transportBox}>
                    <Text style={[styles.hudText, { color: '#004d40' }]}>Mode: {plan.transport?.type}</Text>
                    {plan.transport?.providers?.map((p, i) => (
                        <View key={i} style={{ marginTop: 5 }}>
                            <Text style={styles.hotelName}>{p.name}</Text>
                            <Text style={styles.hudText}>📞 {p.contact}</Text>
                        </View>
                    ))}
                </View>

                <Divider style={{ marginVertical: 10 }} />

                <Text style={styles.sectionTitle}>📍 Itinerary & Hidden Gems</Text>
                {plan.itinerary?.map((day, i) => (
                    <View key={i} style={{ marginTop: 10 }}>
                        <Text style={{ fontWeight: 'bold' }}>Day {day.day}</Text>
                        {day.activities?.map((act, j) => (
                            <View key={j} style={{ marginLeft: 10, marginTop: 5 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600' }}>• {act.place_name} {act.is_hidden_gem ? '💎' : ''}</Text>
                                <Text style={{ fontSize: 11, color: '#666' }}>{act.place_details}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </Card.Content>
        </Card>
    );

    const lastBotMessage = [...messages].reverse().find(m => m.sender === 'bot');

    const TripProfileHeader = () => {
        const activeVals = Object.values(tripState).filter(v => v !== null && (Array.isArray(v) ? v.length > 0 : true));
        if (activeVals.length === 0 || isFinalized) return null;
        return (
            <Surface style={styles.profileHUD} elevation={4}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hudScroll}>
                    {tripState.destination && <View style={styles.hudBadge}><Text style={styles.hudText}>📍 {tripState.destination}</Text></View>}
                    {tripState.duration && <View style={styles.hudBadge}><Text style={styles.hudText}>📅 {tripState.duration} Days</Text></View>}
                    {tripState.groupType && <View style={styles.hudBadge}><Text style={styles.hudText}>👥 {tripState.groupType}</Text></View>}
                    {tripState.budget && <View style={styles.hudBadge}><Text style={styles.hudText}>💰 {tripState.budget}</Text></View>}
                </ScrollView>
            </Surface>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#004d40', '#00695c']} style={styles.headerGradient}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" iconColor="#fff" onPress={() => navigation.goBack()} />
                    <View style={styles.headerInfo}>
                        <Text variant="headlineSmall" style={styles.headerTitle}>Ceylo AI</Text>
                        <Text style={styles.headerSubtitle}>Personal Concierge</Text>
                    </View>
                    <Avatar.Icon size={45} icon="robot" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                </View>
            </LinearGradient>

            <TripProfileHeader />

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}>
                <Animated.View style={[styles.chatArea, { opacity: fadeAnim }]}>
                    <ScrollView style={styles.chatContainer} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
                        {messages.map((msg) => (
                            <View key={msg.id} style={[styles.messageWrapper, msg.sender === 'user' ? styles.userWrapper : styles.botWrapper]}>
                                {msg.sender === 'bot' && <Avatar.Icon size={30} icon="robot" style={styles.botAvatar} />}
                                <Surface style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble, msg.plan && { maxWidth: '95%' }]} elevation={1}>
                                    <Text style={msg.sender === 'user' ? styles.userText : styles.botText}>{msg.text}</Text>
                                    {msg.plan && renderPlan(msg.plan)}
                                </Surface>
                            </View>
                        ))}
                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator animating={true} color="#00695c" size="small" />
                                <Text style={styles.loadingText}>Thinking...</Text>
                            </View>
                        )}
                    </ScrollView>

                    {!isFinalized && (
                        <View style={{ paddingBottom: 10 }}>
                            {(['budget', 'interests', 'groupType', 'transport', 'finalize'].includes(lastBotMessage?.ui)) && !inputText && (
                                <View style={styles.actionSection}>
                                    <Surface style={styles.actionSurface} elevation={2}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniSelectRow}>
                                            {(
                                                lastBotMessage?.ui === 'budget' ? ['Economy', 'Standard', 'Luxury'] :
                                                    lastBotMessage?.ui === 'groupType' ? ['Solo', 'Couple', 'Family', 'Group'] :
                                                        lastBotMessage?.ui === 'transport' ? ['Private Car', 'Rentals', 'Public Trains'] :
                                                            lastBotMessage?.ui === 'interests' ? ['Wildlife', 'Culture', 'Hiking', 'Beaches'] :
                                                                ['Yes, Generate', 'Change Info']
                                            ).map((item, i) => (
                                                <TouchableOpacity key={i} style={styles.selectMiniBtn} onPress={() => sendMessage(item)}>
                                                    <Text style={styles.selectMiniBtnText}>{item}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </Surface>
                                </View>
                            )}
                            <Surface style={styles.inputSurface} elevation={4}>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        mode="flat"
                                        placeholder="Type naturally..."
                                        value={inputText}
                                        onChangeText={setInputText}
                                        style={styles.textInput}
                                        multiline
                                        underlineColor="transparent"
                                        activeUnderlineColor="transparent"
                                        placeholderTextColor="#999"
                                        selectionColor="#00695c"
                                        cursorColor="#00695c"
                                    />
                                    <TouchableOpacity style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]} onPress={() => sendMessage()}>
                                        <IconButton icon="send" iconColor="#fff" size={24} />
                                    </TouchableOpacity>
                                </View>
                            </Surface>
                        </View>
                    )}
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    profileHUD: { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    hudScroll: { paddingHorizontal: 15, gap: 10 },
    hudBadge: { backgroundColor: '#e0f2f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8 },
    hudText: { fontSize: 12, fontWeight: 'bold', color: '#00695c' },
    headerGradient: { paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
    headerInfo: { flex: 1, marginLeft: 10 },
    headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    chatArea: { flex: 1 },
    chatContainer: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
    messageWrapper: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    userWrapper: { justifyContent: 'flex-end' },
    botWrapper: { justifyContent: 'flex-start' },
    botAvatar: { backgroundColor: '#00695c', marginRight: 8 },
    messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 20 },
    userBubble: { backgroundColor: '#00695c', borderBottomRightRadius: 4 },
    botBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
    userText: { color: '#fff' },
    botText: { color: '#333' },
    loadingContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 40 },
    loadingText: { marginLeft: 10, color: '#666', fontStyle: 'italic' },
    actionSection: { paddingHorizontal: 15, marginBottom: 8 },
    actionSurface: { backgroundColor: '#fff', borderRadius: 20, padding: 8 },
    miniSelectRow: { gap: 8 },
    selectMiniBtn: { backgroundColor: '#f0f2f5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
    selectMiniBtnText: { fontSize: 12, fontWeight: 'bold', color: '#00695c' },
    inputSurface: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 10 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 25 },
    textInput: { flex: 1, backgroundColor: 'transparent' },
    sendButton: { backgroundColor: '#00695c', borderRadius: 20 },
    sendButtonDisabled: { backgroundColor: '#ccc' },
    planCard: { marginTop: 10, borderRadius: 15 },
    mapBtn: { flexDirection: 'row', backgroundColor: '#00695c', borderRadius: 10, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
    mapBtnText: { color: '#fff', fontWeight: 'bold' },
    sectionTitle: { color: '#00695c', fontWeight: 'bold', marginTop: 10, fontSize: 14 },
    hotelItem: { marginTop: 5, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 8 },
    hotelName: { fontWeight: 'bold' },
    hotelPrice: { color: '#00796b', fontSize: 12 },
    hotelDesc: { fontSize: 11, color: '#666' },
    transportBox: { backgroundColor: '#e0f2f1', padding: 8, borderRadius: 8 },
});
