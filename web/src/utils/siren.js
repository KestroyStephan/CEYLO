// Emergency siren and notification chime made with the Web Audio API, so the SOS desk needs no
// sound file from another site. Browsers only allow sound after the user has clicked the page;
// `unlock()` is called on the first click and `blocked()` tells the UI to ask for that click.
let ctx = null;
let sirenNodes = null;

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlock() {
  const c = context();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function blocked() {
  const c = context();
  return !c || c.state !== 'running';
}

export function startSiren() {
  const c = context();
  if (!c || sirenNodes) return;
  // Two-tone wail: a square wave swept between 650 and 1250 Hz by a slow LFO
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 950;
  const lfo = c.createOscillator();
  lfo.type = 'triangle';
  lfo.frequency.value = 0.55;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(osc.frequency);
  const vol = c.createGain();
  vol.gain.value = 0.0001;
  vol.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.3);
  osc.connect(vol).connect(c.destination);
  osc.start();
  lfo.start();
  sirenNodes = { osc, lfo, vol };
}

export function stopSiren() {
  if (!sirenNodes || !ctx) return;
  const { osc, lfo, vol } = sirenNodes;
  sirenNodes = null;
  try {
    vol.gain.cancelScheduledValues(ctx.currentTime);
    vol.gain.setValueAtTime(vol.gain.value, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.stop(ctx.currentTime + 0.25);
    lfo.stop(ctx.currentTime + 0.25);
  } catch { /* already stopped */ }
}

// Short rising three-note chime for a new voice message
export function chime() {
  const c = context();
  if (!c) return;
  [660, 880, 1175].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const t = c.currentTime + i * 0.14;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.32);
  });
}
