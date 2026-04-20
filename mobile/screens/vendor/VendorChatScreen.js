import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../firebaseConfig';
import {
  collection, onSnapshot, addDoc, query, orderBy,
  serverTimestamp, doc, getDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const QUICK_REPLIES = [
  "I'll be there shortly! ≡ƒÖî",
  "Your booking is confirmed Γ£à",
  "Please share your location ≡ƒôì",
];

export default function VendorChatScreen({ route }) {
  const { bookingId, order } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [headerInfo, setHeaderInfo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);   // tourist typing indicator
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const uid = auth.currentUser?.uid;

  // Fetch booking header
  useEffect(() => {
    if (!bookingId) return;
    getDoc(doc(db, 'bookings', bookingId)).then((snap) => {
      if (snap.exists()) setHeaderInfo(snap.data());
    });
  }, [bookingId]);

  // Real-time messages
  useEffect(() => {
    const q = query(
      collection(db, 'chats', bookingId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);

      // Batch-mark unread
      const batch = writeBatch(db);
      let hasUnread = false;
      snap.docs.forEach((d) => {
        if (!d.data().read_by?.includes(uid)) {
          batch.update(d.ref, { read_by: [...(d.data().read_by || []), uid] });
          hasUnread = true;
        }
      });
      if (hasUnread) await batch.commit().catch(() => {});

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [bookingId, uid]);

  // Tourist typing indicator listener
  useEffect(() => {
    const chatRef = doc(db, 'chats', bookingId);
    const unsub = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        setIsTyping(snap.data().isTyping_tourist || false);
      }
    });
    return () => unsub();
  }, [bookingId]);

  // Update vendor typing status
  const handleTyping = (val) => {
    setText(val);
    updateDoc(doc(db, 'chats', bookingId), { isTyping_vendor: true }).catch(() => {});
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'chats', bookingId), { isTyping_vendor: false }).catch(() => {});
    }, 1500);
  };

  const sendMessage = async (msgText) => {
    const trimmed = (msgText || text).trim();
    if (!trimmed) return;
    setText('');
    updateDoc(doc(db, 'chats', bookingId), { isTyping_vendor: false }).catch(() => {});
    try {
      await addDoc(collection(db, 'chats', bookingId, 'messages'), {
        senderId: uid,
        text: trimmed,
        imageUrl: null,
        timestamp: serverTimestamp(),
        read_by: [uid],
      });
    } catch (e) {
      console.log('Send error:', e.message);
    }
  };

  const sendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const storageRef = ref(storage, `chats/${bookingId}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'chats', bookingId, 'messages'), {
        senderId: uid,
        text: '',
        imageUrl: url,
        timestamp: serverTimestamp(),
        read_by: [uid],
      });
    } catch (e) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const info = headerInfo || order;

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === uid;
    const timeStr = item.timestamp?.toDate?.()?.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    }) || '';
    const isRead = item.read_by?.length > 1;

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.msgImage} />
          ) : (
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
              {item.text}
            </Text>
          )}
          <View style={styles.msgMeta}>
            <Text style={[styles.time, isMe ? styles.timeMe : styles.timeThem]}>{timeStr}</Text>
            {isMe && (
              <Text style={styles.readReceipt}>{isRead ? 'Γ£ôΓ£ô' : 'Γ£ô'}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(info?.customerName || 'C')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{info?.customerName || 'Customer'}</Text>
          {isTyping ? (
            <Text style={styles.typingIndicator}>typing...</Text>
          ) : (
            <Text style={styles.headerSub} numberOfLines={1}>
              {info?.items?.map((i) => i.name).join(', ') || `Order #${bookingId?.slice(-6)}`}
            </Text>
          )}
        </View>
      </View>

      {/* Quick reply templates */}
      <View style={styles.quickRepliesBar}>
        {QUICK_REPLIES.map((qr) => (
          <TouchableOpacity
            key={qr}
            style={styles.quickReplyBtn}
            onPress={() => sendMessage(qr)}
          >
            <Text style={styles.quickReplyText} numberOfLines={1}>{qr}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#059669" /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>≡ƒÆ¼</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={sendImage}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#059669" />
              : <MaterialCommunityIcons name="image-outline" size={22} color="#059669" />}
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a messageΓÇª"
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={handleTyping}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnOff]}
            onPress={() => sendMessage()}
            disabled={!text.trim()}
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, paddingTop: 50, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280' },
  typingIndicator: { fontSize: 12, color: '#059669', fontStyle: 'italic' },
  quickRepliesBar: {
    flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8,
    gap: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  quickReplyBtn: {
    borderWidth: 1, borderColor: '#d1fae5', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f0fdf4', maxWidth: 160,
  },
  quickReplyText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  msgList: { padding: 16, paddingBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  msgRow: { marginBottom: 8 },
  msgRowMe: { alignItems: 'flex-end' },
  msgRowThem: { alignItems: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#059669', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#1f2937' },
  msgImage: { width: 200, height: 150, borderRadius: 12, resizeMode: 'cover' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  time: { fontSize: 10 },
  timeMe: { color: '#a7f3d0' },
  timeThem: { color: '#9ca3af' },
  readReceipt: { fontSize: 10, color: '#a7f3d0' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8,
  },
  attachBtn: { padding: 8, justifyContent: 'flex-end' },
  textInput: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: '#d1fae5' },
});
