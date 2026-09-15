// Message notification sound. Synthesized via Web Audio API (no bundled
// audio asset needed) — a short two-note chime, on by default, with a
// mute toggle persisted to localStorage.

const SOUND_MUTED_KEY = 'xenovaa_sound_muted';
const MUTE_CHANGE_EVENT = 'xenovaa:sound-mute-changed';

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function isSoundMuted() {
  try {
    return localStorage.getItem(SOUND_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted) {
  try {
    localStorage.setItem(SOUND_MUTED_KEY, muted ? 'true' : 'false');
  } catch {
    // localStorage unavailable — mute preference just won't persist.
  }
  window.dispatchEvent(new Event(MUTE_CHANGE_EVENT));
}

export function subscribeSoundMuteChange(callback) {
  window.addEventListener(MUTE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(MUTE_CHANGE_EVENT, callback);
}

function playTone(ctx, frequency, startTime, duration) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playMessageTone() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    playTone(ctx, 880, now, 0.14);
    playTone(ctx, 1174.66, now + 0.09, 0.18);
  } catch {
    // Audio unavailable in this environment — sound is a nice-to-have, fail silently.
  }
}
