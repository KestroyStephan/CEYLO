// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../firebaseConfig';
import {
  collection, onSnapshot, addDoc, query, orderBy,
  serverTimestamp, doc, getDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const PRIMARY   = '#006A3B';
const SECONDARY = '#006A6A';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';

const QUICK_REPLIES = [
  "I'll be there shortly! 🙌",
  "Your booking is confirmed ✅",
  "Please share your location 📍",
];

export default function VendorChatScreen({ route }) {
  const { bookingId, order } = route.params;
  const [messages,    setMessages]    = useState([]);
  const [text,        setText]        = useState('');
  const [loading,     setLoading]     = useState(true);
  const [headerInfo,  setHeaderInfo]  = useState(order || null);
  const [touristTyping,setTouristTyping]= useState(false);
  const [uploading,   setUploading]   = useState(false);
  const flatRef      = useRef(null);
  const typingTimeout= useRef(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (bookingId && !headerInfo) {
      getDoc(doc(db,'orders',bookingId)).then(s => { if(s.exists()) setHeaderInfo(s.data()); });
    }
  }, [bookingId]);

  useEffect(() => {
    const q = query(collection(db,'chats',bookingId,'messages'), orderBy('timestamp','asc'));
    const unsub = onSnapshot(q, async snap => {
      const msgs = snap.docs.map(d=>({ id:d.id,...d.data() }));
      setMessages(msgs);
      setLoading(false);
      // Mark as read
      const batch = writeBatch(db);
      let hasUnread = false;
      snap.docs.forEach(d=>{
        if (!d.data().read_by?.includes(uid)){
          batch.update(d.ref,{read_by:[...(d.data().read_by||[]),uid]});hasUnread=true;
        }
      });
      if(hasUnread) await batch.commit().catch(()=>{});
      setTimeout(()=>flatRef.current?.scrollToEnd({animated:true}),100);
    });
    return ()=>unsub();
  },[bookingId,uid]);

  useEffect(()=>{
    const unsub = onSnapshot(doc(db,'chats',bookingId), snap=>{
      if(snap.exists()) setTouristTyping(!!snap.data().touristTyping);
    });
    return ()=>unsub();
  },[bookingId]);

  const handleTyping = (t) => {
    setText(t);
    updateDoc(doc(db,'chats',bookingId),{vendorTyping:true}).catch(()=>{});
    clearTimeout(typingTimeout.current);
    typingTimeout.current=setTimeout(()=>{
      updateDoc(doc(db,'chats',bookingId),{vendorTyping:false}).catch(()=>{});
    },2000);
  };

  const sendText = async (msg=text) => {
    if (!msg.trim()) return;
    setText('');
    updateDoc(doc(db,'chats',bookingId),{vendorTyping:false}).catch(()=>{});
    try {
      await addDoc(collection(db,'chats',bookingId,'messages'),{
        senderId:uid, text:msg.trim(), imageUrl:null,
        timestamp:serverTimestamp(), read_by:[uid],
      });
    } catch(e) {}
  };

  const sendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status!=='granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.8});
    if (r.canceled||!r.assets?.length) return;
    setUploading(true);
    try {
      const res=await fetch(r.assets[0].uri);const blob=await res.blob();
      const ref2=ref(storage,`chats/${bookingId}/${Date.now()}.jpg`);
      const url = await new Promise((resolve,reject)=>{
        uploadBytesResumable(ref2,blob).on('state_changed',null,reject,async()=>resolve(await getDownloadURL(ref2)));
      });
      await addDoc(collection(db,'chats',bookingId,'messages'),{
        senderId:uid, text:'', imageUrl:url,
        timestamp:serverTimestamp(), read_by:[uid],
      });
    } catch(e){}
    finally{setUploading(false);}
  };

  const renderBubble = ({ item }) => {
    const isMe = item.senderId === uid;
    return (
      <View style={[styles.bubbleWrap,isMe&&styles.bubbleWrapMe]}>
        {!isMe&&<View style={styles.bubbleAvatar}><Text style={styles.bubbleAvatarText}>T</Text></View>}
        <View style={[styles.bubble,isMe?styles.bubbleMe:styles.bubbleThem]}>
          {item.imageUrl
            ? <Image source={{uri:item.imageUrl}} style={styles.chatImage}/>
            : <Text style={[styles.bubbleText,isMe&&{color:'#FFF'}]}>{item.text}</Text>}
          <Text style={[styles.bubbleTime,isMe&&{color:'rgba(255,255,255,0.65)'}]}>
            {item.timestamp?.toDate?.()?.toLocaleTimeString?.([],{hour:'2-digit',minute:'2-digit'})||''}
            {isMe&&<Text style={styles.readTick}> ✓✓</Text>}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{flex:1,backgroundColor:BG}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={0}>
      <StatusBar barStyle="dark-content"/>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>{(headerInfo?.customerName||'T')[0].toUpperCase()}</Text>
        </View>
        <View style={{flex:1,marginLeft:12}}>
          <Text style={styles.customerName}>{headerInfo?.customerName||'Tourist'}</Text>
          <Text style={styles.bookingId}>#{bookingId?.slice(-8)}</Text>
        </View>
        {touristTyping&&<Text style={styles.typingIndicator}>typing...</Text>}
      </View>

      {/* Quick Replies */}
      <View style={styles.quickBar}>
        {QUICK_REPLIES.map(q=>(
          <TouchableOpacity key={q} style={styles.quickChip} onPress={()=>sendText(q)}>
            <Text style={styles.quickChipText} numberOfLines={1}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY}/></View>
        : <FlatList
            ref={flatRef} data={messages} keyExtractor={i=>i.id}
            renderItem={renderBubble} contentContainerStyle={{padding:16,paddingBottom:20}}
            onContentSizeChange={()=>flatRef.current?.scrollToEnd({animated:false})}/>}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.imageBtn} onPress={sendImage} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color={PRIMARY}/>
            : <Ionicons name="image-outline" size={22} color={ON_SURF_V}/>}
        </TouchableOpacity>
        <TextInput
          style={styles.input} value={text} onChangeText={handleTyping}
          placeholder="Type a message..." placeholderTextColor="#AAB8AA"
          multiline returnKeyType="send" onSubmitEditing={()=>sendText()}/>
        <TouchableOpacity style={[styles.sendBtn,!text.trim()&&{opacity:0.4}]} onPress={()=>sendText()} disabled={!text.trim()}>
          <Ionicons name="send" size={18} color="#FFF"/>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center:       {flex:1,justifyContent:'center',alignItems:'center'},
  header:       {flexDirection:'row',alignItems:'center',paddingTop:52,paddingHorizontal:16,paddingBottom:12,backgroundColor:SURFACE,borderBottomWidth:1,borderBottomColor:SURFACE_C},
  customerAvatar:{width:42,height:42,borderRadius:21,backgroundColor:SURFACE_C,alignItems:'center',justifyContent:'center'},
  customerAvatarText:{fontSize:18,fontWeight:'800',color:PRIMARY},
  customerName: {fontSize:16,fontWeight:'700',color:ON_SURF},
  bookingId:    {fontSize:12,color:ON_SURF_V},
  typingIndicator:{fontSize:12,color:PRIMARY,fontStyle:'italic',fontWeight:'600'},
  quickBar:     {flexDirection:'row',gap:8,paddingHorizontal:12,paddingVertical:8,backgroundColor:SURFACE,borderBottomWidth:1,borderBottomColor:SURFACE_C},
  quickChip:    {paddingHorizontal:12,paddingVertical:7,borderRadius:9999,backgroundColor:SURFACE_C,maxWidth:180},
  quickChipText:{fontSize:12,color:ON_SURF_V,fontWeight:'600'},
  bubbleWrap:   {flexDirection:'row',alignItems:'flex-end',marginBottom:12,gap:8},
  bubbleWrapMe: {flexDirection:'row-reverse'},
  bubbleAvatar: {width:30,height:30,borderRadius:15,backgroundColor:SURFACE_C,alignItems:'center',justifyContent:'center'},
  bubbleAvatarText:{fontSize:12,fontWeight:'800',color:PRIMARY},
  bubble:       {maxWidth:'75%',borderRadius:18,padding:12},
  bubbleMe:     {backgroundColor:PRIMARY,borderTopRightRadius:4},
  bubbleThem:   {backgroundColor:SURFACE,borderTopLeftRadius:4,shadowColor:'#181D19',shadowOpacity:0.06,shadowRadius:6,elevation:2},
  bubbleText:   {fontSize:15,color:ON_SURF,lineHeight:22},
  chatImage:    {width:200,height:160,borderRadius:10},
  bubbleTime:   {fontSize:10,color:ON_SURF_V,marginTop:4,textAlign:'right'},
  readTick:     {fontSize:10,color:'rgba(255,255,255,0.7)'},
  inputBar:     {flexDirection:'row',alignItems:'flex-end',gap:8,padding:12,backgroundColor:'rgba(246,251,243,0.97)',borderTopWidth:0.5,borderTopColor:OUTLINE_V},
  imageBtn:     {width:40,height:40,borderRadius:12,backgroundColor:SURFACE_C,alignItems:'center',justifyContent:'center'},
  input:        {flex:1,backgroundColor:SURFACE_C,borderRadius:20,paddingHorizontal:16,paddingVertical:10,fontSize:15,color:ON_SURF,maxHeight:100},
  sendBtn:      {width:42,height:42,borderRadius:21,backgroundColor:PRIMARY,alignItems:'center',justifyContent:'center'},
});
