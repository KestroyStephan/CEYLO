import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  TextInput, TouchableOpacity, FlatList, ActivityIndicator,
  Text, SafeAreaView
} from 'react-native';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessageScreen({ route, navigation }) {
  const { chatId, recipientName } = route.params;
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef();

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsub();
  }, [chatId]);

  const handleSend = async () => {
    if (inputText.trim().length === 0) return;
    
    const textToSend = inputText.trim();
    setInputText(''); // Optimistic clear

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        text: textToSend,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message: ', error);
      setInputText(textToSend); // Restore if failed
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    return (
      <View style={[styles.msgContainer, isMe ? styles.msgMe : styles.msgThem]}>
        <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>
          {item.text}
        </Text>
        <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeThem]}>
          {item.createdAt ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top || 15 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{recipientName || 'Chat'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#006A3B" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={[styles.inputRow, { paddingBottom: insets.bottom || 15 }]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#8A9E8A"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <MaterialCommunityIcons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F4' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE'
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#1A2E1A' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15, paddingBottom: 20 },
  
  msgContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  msgMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#006A3B',
    borderBottomRightRadius: 4,
  },
  msgThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EEF2EE'
  },
  msgText: { fontSize: 15, fontFamily: 'Outfit-Regular', lineHeight: 20 },
  msgTextMe: { color: '#FFF' },
  msgTextThem: { color: '#1A2E1A' },
  
  msgTime: { fontSize: 10, fontFamily: 'Outfit-Regular', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
  msgTimeThem: { color: '#8A9E8A' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2EE'
  },
  input: {
    flex: 1,
    backgroundColor: '#F4F7F4',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: '#1A2E1A',
    marginRight: 10
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#006A3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  }
});
