import { Vibration } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Loud alert tones bundled with the app: a looping ringtone for new ride requests and an
 * urgent tone for SOS updates. They play even when the phone is on silent (iOS) and vibrate too.
 */
const SOURCES = {
  ride: require('../assets/sounds/ride_request.wav'),
  sos: require('../assets/sounds/sos_alert.wav'),
};

let current = null; // { sound, name, timer }

export async function stopAlert() {
  const c = current;
  current = null;
  Vibration.cancel();
  if (!c) return;
  clearTimeout(c.timer);
  try { await c.sound.stopAsync(); await c.sound.unloadAsync(); } catch { /* already unloaded */ }
}

/**
 * Plays a tone. `loop` repeats it until stopAlert() or `maxMs` (default 30 s) has passed.
 */
export async function playAlert(name, { loop = false, maxMs = 30000 } = {}) {
  await stopAlert();
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: false });
    const { sound } = await Audio.Sound.createAsync(SOURCES[name], { shouldPlay: true, isLooping: loop, volume: 1.0 });
    const entry = { sound, name, timer: null };
    current = entry;
    Vibration.vibrate(loop ? [0, 700, 500] : [0, 400, 150, 400], loop);
    entry.timer = setTimeout(() => { if (current === entry) stopAlert(); }, loop ? maxMs : 4000);
    if (!loop) sound.setOnPlaybackStatusUpdate(st => { if (st.didJustFinish && current === entry) stopAlert(); });
  } catch (e) {
    console.warn('Alert sound failed:', e.message);
    Vibration.vibrate([0, 500, 200, 500]);
  }
}
