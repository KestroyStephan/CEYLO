import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Avatar, ActivityIndicator, IconButton, Card } from 'react-native-paper';

// NOTE: If using a physical device, replace '192.168.x.x' with your PC's local IP address.
// For Android Emulator, '10.0.2.2' is correct.
// For iOS Simulator, 'localhost' is correct.
// Updated to your local IP: 10.164.88.3
const OLLAMA_URL = 'http://10.164.88.3:11434/api/generate';

export default function ChatbotScreen({ navigation }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Ayubowan! I'm Ceylo, your AI travel assistant. Helps you plan the perfect Sri Lankan trip. \n\nTell me: \n1. Where do you want to go? \n2. Budget? \n3. Mood (Relaxed/Adventure)?",
            sender: 'bot'
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef();

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage = { id: Date.now(), text: inputText, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setLoading(true);

        try {
            // Simplified prompt for faster/more direct responses
            const prompt = `You are Ceylo, a travel assistant for Sri Lanka.
            User: "${userMessage.text}"
            
            Provide a short, helpful response suggesting destinations, routes, or tips. 
            If specific details (budget/days) are missing, ask for them politely.
            Keep it under 100 words.`;

            const response = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "llama3.2", // Ensure this model is pulled in your local Ollama
                    prompt: prompt,
                    stream: false
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const botResponseText = data.response;

            const botMessage = {
                id: Date.now() + 1,
                text: botResponseText,
                sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Ollama connection error:", error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "I couldn't reach my brain (Ollama). \n\n1. Ensure Ollama is running (`ollama serve`).\n2. If on a physical phone, update OLLAMA_URL to your PC's IP.",
                sender: 'bot',
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Text variant="titleLarge" style={styles.headerTitle}>Plan with AI</Text>
                <Avatar.Icon size={40} icon="robot" style={{ backgroundColor: '#00695c' }} />
            </View>

            {/* Chat Area */}
            <ScrollView
                style={styles.chatContainer}
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.messageBubble,
                            msg.sender === 'user' ? styles.userBubble : styles.botBubble
                        ]}
                    >
                        <Text style={msg.sender === 'user' ? styles.userText : styles.botText}>
                            {msg.text}
                        </Text>
                    </View>
                ))}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator animating={true} color="#00695c" size="small" />
                        <Text style={{ marginLeft: 10, color: '#666' }}>Ceylo is thinking...</Text>
                    </View>
                )}
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        mode="outlined"
                        placeholder="Type a message..."
                        value={inputText}
                        onChangeText={setInputText}
                        style={styles.textInput}
                        outlineColor="transparent"
                        activeOutlineColor="transparent"
                        multiline
                    />
                    <IconButton
                        icon="send"
                        mode="contained"
                        containerColor="#00695c"
                        iconColor="#fff"
                        size={24}
                        onPress={sendMessage}
                        disabled={loading}
                    />
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        elevation: 2,
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? 40 : 50,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#00695c',
        flex: 1,
        textAlign: 'center',
    },
    chatContainer: {
        flex: 1,
        padding: 15,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
        elevation: 1,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#00695c',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderTopLeftRadius: 4,
    },
    userText: {
        color: '#fff',
    },
    botText: {
        color: '#333',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        marginLeft: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        marginRight: 10,
        borderRadius: 25,
        maxHeight: 100,
    },
});
