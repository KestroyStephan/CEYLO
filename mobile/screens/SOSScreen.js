import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Linking, ScrollView, Dimensions, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import { Text, Surface, Button, IconButton, List, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { db, auth, storage } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as SMS from 'expo-sms';
import NetInfo from '@react-native-community/netinfo';
import { Audio } from 'expo-av';
import { onSnapshot } from 'firebase/firestore';

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`;

const { width } = Dimensions.get('window');

const EMBASSIES = [
  { country: 'United Kingdom', phone: '+94 11 5390639', address: 'Bauddhaloka Mawatha, Colombo 07' },
  { country: 'United States', phone: '+94 11 2498500', address: 'Galle Road, Colombo 03' },
  { country: 'Germany', phone: '+94 11 2580431', address: 'Alfred House Gardens, Colombo 03' },
  { country: 'China', phone: '+94 11 2688610', address: 'Vidya Mawatha, Colombo 07' },
];

export default function SOSScreen() {
  const [active, setActive] = useState(false);
  const [activeDocId, setActiveDocId] = useState(null);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [search, setSearch] = useState('');

  // Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const countdownRef = useRef(null);
  const cameraRef = useRef(null);
  const lastAudioTimestampRef = useRef(null);
  const lastCameraRequestRef = useRef(null);

  // AI Assistant States
  const [userLoc, setUserLoc] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    const setAudioMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          stayActiveInBackground: true,
        });
      } catch (e) {
        console.log("Audio mode set error:", e);
      }
    };
    setAudioMode();

    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [active]);

  // Breadcrumb Trail & AI Location Fetch
  useEffect(() => {
    let locSub = null;
    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAiLoading(false);
        return;
      }
      let locCoords = { latitude: 6.9271, longitude: 79.8612 }; // Default Colombo
      try {
        // Use getLastKnownPositionAsync first for speed, then try current
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          // Timeout after 3 seconds if GPS is hanging
          loc = await Promise.race([
            Location.getCurrentPositionAsync({}),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
        }
        if (loc && loc.coords) locCoords = loc.coords;
      } catch (e) {
        console.log("GPS fetch failed/timeout, using fallback location.");
      }
      
      setUserLoc(locCoords);
      fetchAISuggestions(locCoords);

      locSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 300000, distanceInterval: 50 },
        (loc) => {
          setBreadcrumbs(prev => [...prev.slice(-5), { lat: loc.coords.latitude, lon: loc.coords.longitude }]);
        }
      );
    };
    startTracking();
    return () => { if (locSub) locSub.remove(); };
  }, []);

  const fetchAISuggestions = async (coords) => {
    try {
      const prompt = `I am in an emergency in Sri Lanka at coordinates Lat: ${coords.latitude}, Lon: ${coords.longitude}. Provide the 1 nearest hospital, 1 nearest police station, and 1 nearest pharmacy/first-aid center. Also provide a 1-sentence quick tip for what to do if I am lost or in an accident here. Return ONLY valid JSON format: {"hospital": {"name": "...", "distance": "...", "phone": "..."}, "police": {"name": "...", "distance": "...", "phone": "..."}, "pharmacy": {"name": "...", "distance": "...", "phone": "..."}, "tip": "..."}`;
      
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      
      const data = await res.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const text = data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
        setAiSuggestions(JSON.parse(text));
      }
    } catch (e) {
      console.error("AI Fetch error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  // Walkie-Talkie & Admin Camera Request Listener
  useEffect(() => {
    let unsub = () => {};
    if (activeDocId) {
      unsub = onSnapshot(doc(db, "sos_alerts", activeDocId), async (snap) => {
        const data = snap.data();
        if (!data) return;

        // Walkie-Talkie Logic
        if (data.adminAudioUrl && data.adminAudioTimestamp) {
          if (lastAudioTimestampRef.current !== data.adminAudioTimestamp) {
            lastAudioTimestampRef.current = data.adminAudioTimestamp;
            try {
              const { sound } = await Audio.Sound.createAsync({ uri: data.adminAudioUrl });
              await sound.playAsync();
            } catch (e) { console.error("Walkie-Talkie playback failed:", e); }
          }
        }

        // Camera Request Logic
        if (data.cameraRequestedAt) {
          const reqTime = data.cameraRequestedAt.toMillis ? data.cameraRequestedAt.toMillis() : Date.now();
          if (lastCameraRequestRef.current !== reqTime) {
            lastCameraRequestRef.current = reqTime;
            // Prevent showing camera if it's an old request from previous sessions
            if (Date.now() - reqTime < 60000) { 
              handleOptionalPhoto();
            }
          }
        }
      });
    }
    return () => unsub();
  }, [activeDocId]);

  const cancelSOS = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  };

  const handleSOSPress = async () => {
    if (active && activeDocId) {
      // Resolve existing alert
      setLoading(true);
      try {
        const alertRef = doc(db, "sos_alerts", activeDocId);
        await updateDoc(alertRef, { status: 'resolved', resolvedAt: serverTimestamp() });
        setActive(false);
        setActiveDocId(null);
      } catch (error) {
        console.error("Error resolving SOS:", error);
      } finally {
        setLoading(false);
      }
    } else {
      if (countdown !== null) {
        // Tap again to cancel during countdown
        cancelSOS();
        return;
      }
      
      // Start 3 second countdown
      setCountdown(3);
      let count = 3;
      countdownRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
        } else {
          cancelSOS();
          submitEmergency();
        }
      }, 1000);
    }
  };

  const submitEmergency = async () => {
    setLoading(true);
    try {
      let location = null;
      let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        location = await Location.getCurrentPositionAsync({});
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Offline Fallback Protocol
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
          const locStr = location ? `Lat: ${location.coords.latitude}, Lon: ${location.coords.longitude}` : 'Unknown Location';
          await SMS.sendSMSAsync(
            ['+94770000000'], // Admin Emergency Number
            `CEYLO OFFLINE SOS: Tourist in danger. Current GPS: ${locStr}. Please dispatch rescue team immediately.`
          );
          Alert.alert("Offline Fallback Sent", "No internet detected. An emergency SMS with your coordinates has been dispatched via cellular signal.");
        } else {
          Alert.alert("Critical Error", "No internet and SMS is unavailable on this device.");
        }
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      const alertData = {
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || 'Tourist',
        phone: user?.phoneNumber || 'N/A',
        status: 'active',
        timestamp: serverTimestamp(),
        photoUrl: null, // Photo can be added later
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        } : null
      };

      const docRef = await addDoc(collection(db, "sos_alerts"), alertData);
      setActive(true);
      setActiveDocId(docRef.id);
      Alert.alert("Emergency Alert Sent!", "Admins and authorities have been notified with your live location.");
    } catch (error) {
      console.error("Error sending SOS:", error);
      Alert.alert("Failed", "Failed to send alert. Please call emergency services directly.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionalPhoto = async () => {
    if (!permission?.granted) {
      const perm = await requestPermission();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Camera access is needed.");
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setCapturedUri(photo.uri);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const submitPhotoEvidence = async () => {
    if (!capturedUri || !activeDocId) return;
    setUploading(true);
    try {
      const res = await fetch(capturedUri);
      const blob = await res.blob();
      const r = ref(storage, `sos_alerts/${activeDocId}_evidence.jpg`);
      
      const photoUrl = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(r, blob);
        task.on('state_changed',
          snap => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });

      const alertRef = doc(db, "sos_alerts", activeDocId);
      await updateDoc(alertRef, { photoUrl });
      
      setShowCamera(false);
      setCapturedUri(null);
      Alert.alert("Evidence Attached", "Photo has been sent to authorities.");
    } catch (e) {
      Alert.alert("Upload Failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const skipPhoto = () => {
    setShowCamera(false);
    setCapturedUri(null);
  };

  const handleCall = (num) => Linking.openURL(`tel:${num}`);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#FF5252', '#D32F2F']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Support</Text>
          <Text style={styles.headerSubtitle}>Immediate assistance across Sri Lanka</Text>
        </LinearGradient>

        <View style={styles.sosSection}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: active ? 0.4 : 0 }]} />
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={[styles.sosBtn, active && { backgroundColor: '#B71C1C' }, countdown !== null && { backgroundColor: '#E65100' }]}
            onPress={handleSOSPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="large" />
            ) : countdown !== null ? (
              <>
                <Text style={styles.sosText}>{countdown}</Text>
                <Text style={styles.tapText}>Tap to Cancel</Text>
              </>
            ) : (
              <>
                <Text style={styles.sosText}>{active ? 'RESOLVE' : 'SOS'}</Text>
                <Text style={styles.tapText}>{active ? 'Tap to end alert' : 'Tap for Help'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {active && (
          <TouchableOpacity style={styles.addPhotoBtn} onPress={handleOptionalPhoto}>
            <MaterialCommunityIcons name="camera-plus" size={20} color="#D32F2F" />
            <Text style={styles.addPhotoText}>Attach Evidence Photo</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actionGrid}>
          <Surface style={styles.actionCard} elevation={2}>
            <IconButton icon="phone-classic" mode="contained" containerColor="#D32F2F" iconColor="#FFF" onPress={() => handleCall('119')} />
            <Text style={styles.actionLabel}>Police</Text>
            <Text style={styles.actionNum}>119</Text>
          </Surface>
          <Surface style={styles.actionCard} elevation={2}>
            <IconButton icon="ambulance" mode="contained" containerColor="#00695C" iconColor="#FFF" onPress={() => handleCall('1990')} />
            <Text style={styles.actionLabel}>Ambulance</Text>
            <Text style={styles.actionNum}>1990</Text>
          </Surface>
          <Surface style={styles.actionCard} elevation={2}>
            <IconButton icon="fire" mode="contained" containerColor="#E65100" iconColor="#FFF" onPress={() => handleCall('110')} />
            <Text style={styles.actionLabel}>Fire</Text>
            <Text style={styles.actionNum}>110</Text>
          </Surface>
        </View>

        <View style={[styles.actionGrid, { marginTop: 15 }]}>
          <Surface style={styles.actionCard} elevation={2}>
            <IconButton icon="shield-account" mode="contained" containerColor="#FFB300" iconColor="#FFF" onPress={() => handleCall('0112421052')} />
            <Text style={styles.actionLabel}>Tourist Police</Text>
            <Text style={styles.actionNum}>011 242 1052</Text>
          </Surface>
          <Surface style={styles.actionCard} elevation={2}>
            <IconButton icon="face-woman" mode="contained" containerColor="#C2185B" iconColor="#FFF" onPress={() => handleCall('1929')} />
            <Text style={styles.actionLabel}>Women Aid</Text>
            <Text style={styles.actionNum}>1929</Text>
          </Surface>
          <Surface style={styles.actionCard} elevation={2}>
            <IconButton icon="hospital-box" mode="contained" containerColor="#1976D2" iconColor="#FFF" onPress={() => handleCall('0112691111')} />
            <Text style={styles.actionLabel}>Gen. Hospital</Text>
            <Text style={styles.actionNum}>011 269 1111</Text>
          </Surface>
        </View>

        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <MaterialCommunityIcons name="robot-outline" size={24} color="#00695C" />
            <Text style={styles.aiTitle}>AI Emergency Assistant</Text>
          </View>
          <Text style={styles.aiSubtitle}>Nearest facilities based on your live GPS</Text>
          
          <Surface style={styles.aiCard} elevation={1}>
            {aiLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#00695C" size="small" />
                <Text style={{ marginTop: 10, fontFamily: 'Outfit-Medium', color: '#666' }}>Scanning area...</Text>
              </View>
            ) : aiSuggestions ? (
              <View style={{ padding: 15, gap: 15 }}>
                <View style={styles.aiItem}>
                  <View style={styles.aiIconBox}><MaterialCommunityIcons name="hospital" size={20} color="#D32F2F" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiItemTitle}>{aiSuggestions.hospital?.name}</Text>
                    <Text style={styles.aiItemSub}>{aiSuggestions.hospital?.distance} away</Text>
                  </View>
                  <IconButton icon="phone" size={20} onPress={() => handleCall(aiSuggestions.hospital?.phone)} />
                </View>
                <View style={styles.aiItem}>
                  <View style={[styles.aiIconBox, { backgroundColor: '#E3F2FD' }]}><MaterialCommunityIcons name="police-badge" size={20} color="#1976D2" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiItemTitle}>{aiSuggestions.police?.name}</Text>
                    <Text style={styles.aiItemSub}>{aiSuggestions.police?.distance} away</Text>
                  </View>
                  <IconButton icon="phone" size={20} onPress={() => handleCall(aiSuggestions.police?.phone)} />
                </View>
                <View style={styles.aiItem}>
                  <View style={[styles.aiIconBox, { backgroundColor: '#E8F5E9' }]}><MaterialCommunityIcons name="medical-bag" size={20} color="#2E7D32" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiItemTitle}>{aiSuggestions.pharmacy?.name}</Text>
                    <Text style={styles.aiItemSub}>{aiSuggestions.pharmacy?.distance} away</Text>
                  </View>
                  <IconButton icon="phone" size={20} onPress={() => handleCall(aiSuggestions.pharmacy?.phone)} />
                </View>
                <View style={styles.aiTipBox}>
                  <MaterialCommunityIcons name="lightbulb-on" size={16} color="#F57F17" />
                  <Text style={styles.aiTipText}>{aiSuggestions.tip}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ padding: 20, textAlign: 'center', color: '#999', fontFamily: 'Outfit-Medium' }}>Could not fetch AI suggestions right now.</Text>
            )}
          </Surface>
        </View>

        <View style={styles.embassySection}>
          <Text style={styles.sectionTitle}>Embassy & Consulates</Text>
          <Searchbar
            placeholder="Search by country..."
            onChangeText={setSearch}
            value={search}
            style={styles.search}
            inputStyle={{ fontFamily: 'Outfit-Regular' }}
          />
          <Surface style={styles.embassyList} elevation={1}>
            {EMBASSIES.filter(e => e.country.toLowerCase().includes(search.toLowerCase())).map((e, i) => (
              <List.Item
                key={i}
                title={e.country}
                titleStyle={styles.listTitle}
                description={e.address}
                descriptionStyle={styles.listDesc}
                left={props => <List.Icon {...props} icon="flag-outline" color="#D32F2F" />}
                right={props => (
                  <IconButton icon="phone" onPress={() => handleCall(e.phone)} />
                )}
              />
            ))}
          </Surface>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {capturedUri ? (
            <View style={{ flex: 1 }}>
              <Image source={{ uri: capturedUri }} style={{ flex: 1, resizeMode: 'cover' }} />
              <View style={styles.previewOverlay}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Emergency Photo</Text>
                </View>
                <View style={styles.previewFooter}>
                  {uploading ? (
                    <View style={styles.uploadingRow}>
                      <ActivityIndicator color="#FFF" size="large" />
                      <Text style={styles.uploadingText}>Sending SOS... {uploadPct}%</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.retakeBtn} onPress={() => setCapturedUri(null)}>
                        <Ionicons name="refresh" size={20} color="#FFF" />
                        <Text style={styles.retakeBtnText}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#D32F2F' }]} onPress={submitPhotoEvidence}>
                        <Ionicons name="cloud-upload" size={20} color="#FFF" />
                        <Text style={styles.submitBtnText}>Upload Evidence</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back" />
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraHeader}>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCamera(false)}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.cameraTitle}>Capture Incident</Text>
                  <View style={{ width: 40 }} />
                </View>
                <View style={styles.cameraFooter}>
                  <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                    <View style={styles.captureOuter}>
                      <View style={styles.captureInner} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 20 }} onPress={skipPhoto}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Outfit-Bold' }}>Cancel Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  backButton: { marginBottom: 10, width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  header: { padding: 40, paddingTop: 50, paddingBottom: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTitle: { fontSize: 28, fontFamily: 'Outfit-Bold', color: '#FFF' },
  headerSubtitle: { fontSize: 16, fontFamily: 'Outfit-Regular', color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  sosSection: { height: 300, justifyContent: 'center', alignItems: 'center' },
  pulseCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#FF5252' },
  sosBtn: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#D32F2F', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15 },
  sosText: { color: '#FFF', fontSize: 36, fontFamily: 'Outfit-Bold' },
  tapText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Outfit-Medium', marginTop: 5 },
  actionGrid: { flexDirection: 'row', justifyContent: 'center', gap: 15, paddingHorizontal: 20 },
  actionCard: { width: width / 3.6, backgroundColor: '#FFF', borderRadius: 20, padding: 15, alignItems: 'center', gap: 5 },
  actionLabel: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#666' },
  actionNum: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#333' },
  embassySection: { padding: 24, marginTop: 20 },
  sectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#333', marginBottom: 15 },
  search: { borderRadius: 15, backgroundColor: '#FFF', marginBottom: 15 },
  embassyList: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  listTitle: { fontFamily: 'Outfit-Bold', fontSize: 16 },
  listDesc: { fontFamily: 'Outfit-Regular', fontSize: 12, color: '#999' },
  // Camera Modal Styles
  cameraOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'space-between'},
  cameraHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:'rgba(0,0,0,0.55)'},
  closeBtn:    {width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
  cameraTitle: {fontSize:18,fontFamily:'Outfit-Bold',color:'#FFF'},
  cameraFooter:{alignItems:'center',paddingBottom:56,backgroundColor:'rgba(0,0,0,0.45)',paddingTop:24},
  captureBtn:  {padding:4},
  captureOuter:{width:76,height:76,borderRadius:38,borderWidth:3,borderColor:'#FFF',alignItems:'center',justifyContent:'center'},
  captureInner:{width:60,height:60,borderRadius:30,backgroundColor:'#D32F2F'},
  previewOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'space-between'},
  previewHeader:{backgroundColor:'rgba(0,0,0,0.6)',paddingTop:56,paddingHorizontal:24,paddingBottom:20,alignItems:'center'},
  previewTitle:{fontSize:22,fontFamily:'Outfit-Bold',color:'#FFF',marginBottom:6},
  previewFooter:{backgroundColor:'rgba(0,0,0,0.6)',padding:24,gap:12,alignItems:'center'},
  uploadingRow:{flexDirection:'row',alignItems:'center',gap:12},
  uploadingText:{color:'#FFF',fontSize:16,fontFamily:'Outfit-Bold'},
  retakeBtn:   {flexDirection:'row',alignItems:'center',gap:8,borderWidth:1.5,borderColor:'rgba(255,255,255,0.6)',borderRadius:14,paddingVertical:12,paddingHorizontal:24,alignSelf:'stretch',justifyContent:'center'},
  retakeBtnText:{color:'#FFF',fontFamily:'Outfit-Bold',fontSize:15},
  submitBtn:   {flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#D32F2F',borderRadius:14,paddingVertical:14,paddingHorizontal:24,alignSelf:'stretch',justifyContent:'center'},
  submitBtnText:{color:'#FFF',fontFamily:'Outfit-Bold',fontSize:16},
  addPhotoBtn: {flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#FFEBEE',marginHorizontal:40,paddingVertical:12,borderRadius:14,borderWidth:1,borderColor:'#FFCDD2'},
  addPhotoText: {color:'#D32F2F',fontFamily:'Outfit-Bold',fontSize:14},
  // AI Section Styles
  aiSection: { padding: 24, marginTop: 10 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#00695C' },
  aiSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#666', marginTop: 2, marginBottom: 15 },
  aiCard: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  aiItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFEBEE', alignItems: 'center', justifyContent: 'center' },
  aiItemTitle: { fontSize: 14, fontFamily: 'Outfit-Bold', color: '#333' },
  aiItemSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#666' },
  aiTipBox: { flexDirection: 'row', backgroundColor: '#FFF9C4', padding: 12, borderRadius: 12, gap: 8, marginTop: 5 },
  aiTipText: { flex: 1, fontSize: 12, fontFamily: 'Outfit-Medium', color: '#F57F17', lineHeight: 18 },
});
