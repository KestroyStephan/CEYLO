import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { onAuthStateChanged } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { onCallChange, setActiveCall, watchIncoming, watchCall, updateCall, callCredentials } from '../services/calls';
import { playAlert, stopAlert } from '../utils/alertSound';
import { toast } from './Toast';

/**
 * Global call screen, mounted once in App.js. It shows an incoming call (ringing, Accept / Decline)
 * and the call itself (mute, speaker, timer, hang up) over whatever screen is open, for every role.
 * Voice goes through Agora once the call is accepted.
 */
const RING_TIMEOUT_MS = 40000;
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function loadAgora() {
  try { return require('react-native-agora'); } catch { return null; }
}

export default function CallHost() {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [incoming, setIncoming] = useState(null);
  const [active, setActive] = useState(null); // { callId, role, otherName }
  const [status, setStatus] = useState('ringing');
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const engineRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, u => setUid(u && !u.isAnonymous ? u.uid : null)), []);
  useEffect(() => onCallChange(setActive), []);

  // Ring for calls addressed to me
  useEffect(() => {
    if (!uid) { setIncoming(null); return undefined; }
    return watchIncoming(uid, (list) => {
      const fresh = list.filter(c => {
        const t = c.createdAt?.toMillis ? c.createdAt.toMillis() : Date.now();
        return Date.now() - t < RING_TIMEOUT_MS + 5000;
      });
      setIncoming(fresh[0] || null);
    });
  }, [uid]);

  useEffect(() => {
    if (incoming && !active) { playAlert('ride', { loop: true, maxMs: RING_TIMEOUT_MS }); return undefined; }
    stopAlert();
    return undefined;
  }, [incoming?.id, active?.callId]);

  // Follow the active call's status
  useEffect(() => {
    if (!active) return undefined;
    setStatus('ringing'); setConnected(false); setSeconds(0); setMuted(false); setSpeaker(false);
    let timeout = null;
    if (active.role === 'caller') {
      timeout = setTimeout(() => updateCall(active.callId, { status: 'missed', endedAt: serverTimestamp() }).catch(() => {}), RING_TIMEOUT_MS);
    }
    const unsub = watchCall(active.callId, (call) => {
      const st = call?.status || 'ended';
      setStatus(st);
      if (st === 'accepted') { clearTimeout(timeout); joinVoice(active.callId); }
      if (['declined', 'missed', 'ended'].includes(st)) {
        clearTimeout(timeout);
        if (st === 'declined' && active.role === 'caller') toast.info('Call declined', `${active.otherName} could not answer.`);
        if (st === 'missed' && active.role === 'caller') toast.info('No answer', `${active.otherName} did not pick up. Try again or send a message.`);
        finish(false);
      }
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, [active?.callId]);

  // Call timer
  useEffect(() => {
    if (!connected) return undefined;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const joinVoice = async (callId) => {
    if (engineRef.current) return;
    const Agora = loadAgora();
    if (!Agora) { toast.error('Calls not available', 'This build of the app has no calling module.'); hangUp(); return; }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { toast.warning('Microphone needed', 'Allow the microphone to talk on the call.'); hangUp(); return; }
      const { appId, channel, token } = await callCredentials(callId);
      const engine = Agora.createAgoraRtcEngine();
      engine.initialize({ appId, channelProfile: Agora.ChannelProfileType.ChannelProfileCommunication });
      engine.registerEventHandler({
        onUserJoined: () => { startRef.current = Date.now(); setConnected(true); },
        onUserOffline: () => hangUp(),
        onError: (code) => console.warn('Agora error', code),
      });
      engine.enableAudio();
      engine.setDefaultAudioRouteToSpeakerphone(false);
      engine.joinChannel(token, channel, 0, {
        clientRoleType: Agora.ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      });
      engineRef.current = engine;
    } catch (e) {
      console.warn('Call failed:', e.message);
      toast.error('Call failed', 'Could not connect the call. Check your internet and try again.');
      hangUp();
    }
  };

  const leaveVoice = () => {
    const engine = engineRef.current;
    engineRef.current = null;
    if (!engine) return;
    try { engine.leaveChannel(); engine.release(); } catch { /* already closed */ }
  };

  const finish = (writeEnded) => {
    const call = active;
    leaveVoice();
    stopAlert();
    if (writeEnded && call) {
      const durationSec = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0;
      updateCall(call.callId, { status: 'ended', endedAt: serverTimestamp(), durationSec }).catch(() => {});
    }
    startRef.current = null;
    setConnected(false);
    setActiveCall(null);
  };

  const hangUp = () => finish(true);

  const accept = async () => {
    const call = incoming;
    if (!call) return;
    stopAlert();
    Vibration.cancel();
    try {
      await updateCall(call.id, { status: 'accepted', answeredAt: serverTimestamp() });
      setIncoming(null);
      setActiveCall({ callId: call.id, role: 'callee', otherName: call.callerName || 'Caller' });
    } catch (e) {
      toast.error('Could not answer', e.message);
    }
  };

  const decline = async () => {
    const call = incoming;
    stopAlert();
    setIncoming(null);
    if (call) updateCall(call.id, { status: 'declined', endedAt: serverTimestamp() }).catch(() => {});
  };

  const toggleMute = () => { const v = !muted; setMuted(v); engineRef.current?.muteLocalAudioStream(v); };
  const toggleSpeaker = () => { const v = !speaker; setSpeaker(v); engineRef.current?.setEnableSpeakerphone(v); };

  // ---------------------------------------------------------------- incoming call
  if (incoming && !active) {
    return (
      <Modal visible transparent={false} animationType="slide" statusBarTranslucent onRequestClose={decline}>
        <View style={styles.screen}>
          <Text style={styles.kicker}>CEYLO call</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(incoming.callerName || '?').charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.name}>{incoming.callerName || 'CEYLO user'}</Text>
          <Text style={styles.state}>Incoming voice call…</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.round, styles.red]} onPress={decline} accessibilityLabel="Decline call">
              <MaterialCommunityIcons name="phone-hangup" size={30} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.round, styles.green]} onPress={accept} accessibilityLabel="Accept call">
              <MaterialCommunityIcons name="phone" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.labels}><Text style={styles.label}>Decline</Text><Text style={styles.label}>Accept</Text></View>
        </View>
      </Modal>
    );
  }

  // ---------------------------------------------------------------- active call
  if (!active) return null;
  const stateText = connected ? fmt(seconds)
    : status === 'accepted' ? 'Connecting…'
    : active.role === 'caller' ? 'Ringing…' : 'Connecting…';
  return (
    <Modal visible transparent={false} animationType="slide" statusBarTranslucent onRequestClose={hangUp}>
      <View style={styles.screen}>
        <Text style={styles.kicker}>CEYLO voice call</Text>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(active.otherName || '?').charAt(0).toUpperCase()}</Text></View>
        <Text style={styles.name}>{active.otherName}</Text>
        <Text style={styles.state}>{stateText}</Text>
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.ctrl, muted && styles.ctrlOn]} onPress={toggleMute} disabled={!connected} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
            <MaterialCommunityIcons name={muted ? 'microphone-off' : 'microphone'} size={26} color={muted ? '#004D40' : '#FFF'} />
            <Text style={[styles.ctrlText, muted && { color: '#004D40' }]}>{muted ? 'Muted' : 'Mute'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctrl, speaker && styles.ctrlOn]} onPress={toggleSpeaker} disabled={!connected} accessibilityLabel="Speaker">
            <MaterialCommunityIcons name="volume-high" size={26} color={speaker ? '#004D40' : '#FFF'} />
            <Text style={[styles.ctrlText, speaker && { color: '#004D40' }]}>Speaker</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.round, styles.red, { marginTop: 40 }]} onPress={hangUp} accessibilityLabel="End call">
          <MaterialCommunityIcons name="phone-hangup" size={30} color="#FFF" />
        </TouchableOpacity>
        <Text style={[styles.label, { marginTop: 10 }]}>End call</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E2F27', alignItems: 'center', justifyContent: 'center', padding: 24 },
  kicker: { color: '#9FC9B9', fontSize: 13, fontFamily: 'Outfit-SemiBold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 28 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1F5A4C', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  avatarText: { color: '#FFFFFF', fontSize: 48, fontFamily: 'Outfit-Bold' },
  name: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Outfit-Bold', textAlign: 'center' },
  state: { color: '#CFE8DD', fontSize: 16, fontFamily: 'Outfit-Medium', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 90, marginTop: 70 },
  labels: { flexDirection: 'row', gap: 100, marginTop: 10 },
  label: { color: '#CFE8DD', fontSize: 13, fontFamily: 'Outfit-Medium' },
  round: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  red: { backgroundColor: '#C62828' },
  green: { backgroundColor: '#1B8A4B' },
  controls: { flexDirection: 'row', gap: 24, marginTop: 60 },
  ctrl: { width: 96, paddingVertical: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', gap: 6 },
  ctrlOn: { backgroundColor: '#CFE8DD' },
  ctrlText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Outfit-SemiBold' },
});
