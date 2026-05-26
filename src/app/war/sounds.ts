// Tiny Web Audio FX layer — no deps. Generates impact sounds on the fly.
// Safe in SSR: only touches `window` inside the exported functions.

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Anyone = (window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  });
  const Ctor = Anyone.AudioContext ?? Anyone.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/** Resume audio after the user has interacted (browser autoplay policy). */
export function unlockAudio(): void {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
}

/** Single tone with a quick decay. Used for hits. */
export function playHit(intensity: 1 | 2 | 3): void {
  const c = ensureCtx();
  if (!c) return;
  const freq = intensity === 3 ? 80 : intensity === 2 ? 140 : 220;
  const dur = intensity === 3 ? 0.35 : intensity === 2 ? 0.22 : 0.14;
  const gain = intensity === 3 ? 0.45 : intensity === 2 ? 0.3 : 0.2;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = intensity === 3 ? "sawtooth" : "square";
  osc.frequency.setValueAtTime(freq, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

/** Soft UI click — used for state transitions, button presses. */
export function playClick(): void {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, c.currentTime);
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.08);
}

/** Long victory / defeat sting at the end. */
export function playSting(outcome: "victory" | "defeat" | "stalemate"): void {
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const notes = outcome === "victory"
    ? [261.63, 329.63, 392.0, 523.25] // C-major arpeggio up
    : outcome === "defeat"
    ? [220.0, 174.61, 138.59, 110.0]  // descending minor
    : [196.0, 196.0, 233.08, 246.94]; // unresolved
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = outcome === "defeat" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.22);
    g.gain.setValueAtTime(0.0001, now + i * 0.22);
    g.gain.linearRampToValueAtTime(0.22, now + i * 0.22 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.5);
    osc.connect(g).connect(c.destination);
    osc.start(now + i * 0.22);
    osc.stop(now + i * 0.22 + 0.55);
  });
}
