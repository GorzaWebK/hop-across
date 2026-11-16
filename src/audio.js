// Sound effects synthesised with the Web Audio API (no audio files).

import * as store from './storage.js';

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = !!store.load('muted', false);
  }

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
        // one second of white noise, reused by every noisy sound
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    store.save('muted', m);
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  get ready() {
    return this.ctx && this.ctx.state === 'running' && !this.muted;
  }

  // ------------------------------------------------------------ primitives

  tone({ type = 'square', f0 = 440, f1 = f0, dur = 0.1, vol = 0.2, delay = 0, attack = 0.004 }) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise({ dur = 0.2, vol = 0.3, type = 'lowpass', f0 = 1000, f1 = f0, q = 1, delay = 0 }) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------ sound bank

  play(name) {
    if (!this.ready) return;
    const r = (a) => 1 + (Math.random() - 0.5) * a;
    switch (name) {
      case 'hop':
        this.tone({ type: 'square', f0: 420 * r(0.15), f1: 720 * r(0.15), dur: 0.07, vol: 0.07 });
        break;
      case 'bump':
        this.tone({ type: 'triangle', f0: 180, f1: 120, dur: 0.08, vol: 0.15 });
        break;
      case 'coin':
        this.tone({ type: 'square', f0: 988, dur: 0.07, vol: 0.06 });
        this.tone({ type: 'square', f0: 1319, dur: 0.18, vol: 0.06, delay: 0.07 });
        break;
      case 'squash':
        this.noise({ dur: 0.3, vol: 0.5, f0: 1600, f1: 180 });
        this.tone({ type: 'square', f0: 190, f1: 50, dur: 0.25, vol: 0.18 });
        break;
      case 'splash':
        this.noise({ dur: 0.5, vol: 0.45, type: 'bandpass', f0: 2200, f1: 350, q: 0.8 });
        this.tone({ type: 'sine', f0: 520, f1: 90, dur: 0.3, vol: 0.2 });
        break;
      case 'fling':
        this.noise({ dur: 0.35, vol: 0.55, f0: 2500, f1: 200 });
        this.tone({ type: 'sawtooth', f0: 300, f1: 900, dur: 0.35, vol: 0.08 });
        break;
      case 'bell':
        for (let i = 0; i < 3; i++) {
          this.tone({ type: 'sine', f0: 1480, dur: 0.22, vol: 0.12, delay: i * 0.32 });
          this.tone({ type: 'sine', f0: 2220, dur: 0.12, vol: 0.05, delay: i * 0.32 });
        }
        break;
      case 'horn':
        this.tone({ type: 'sawtooth', f0: 233, dur: 0.55, vol: 0.07, attack: 0.03 });
        this.tone({ type: 'sawtooth', f0: 294, dur: 0.55, vol: 0.07, attack: 0.03 });
        this.noise({ dur: 0.9, vol: 0.25, f0: 320 });
        break;
      case 'screech':
        this.tone({ type: 'sawtooth', f0: 2100, f1: 900, dur: 0.45, vol: 0.07, attack: 0.02 });
        this.tone({ type: 'square', f0: 1700, f1: 1100, dur: 0.3, vol: 0.04, delay: 0.05 });
        break;
      case 'grab':
        this.noise({ dur: 0.18, vol: 0.4, f0: 900, f1: 200 });
        break;
      case 'unlock':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.18, delay: i * 0.08 }));
        break;
      case 'deny':
        this.tone({ type: 'square', f0: 220, f1: 150, dur: 0.16, vol: 0.08 });
        break;
      case 'select':
        this.tone({ type: 'square', f0: 880, dur: 0.035, vol: 0.05 });
        break;
      case 'start':
        this.tone({ type: 'square', f0: 523, dur: 0.06, vol: 0.06 });
        this.tone({ type: 'square', f0: 784, dur: 0.1, vol: 0.06, delay: 0.06 });
        break;
      case 'gameover':
        [523, 415, 330].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.14, delay: i * 0.12 }));
        break;
      case 'best':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.12, vol: 0.06, delay: i * 0.07 }));
        break;
      default:
        break;
    }
  }
}
