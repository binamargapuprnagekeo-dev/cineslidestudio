import { CrowdFxItem } from '../types';
import { DRAMA_SOUNDSCAPES, DramaSoundscape } from '../constants/presets';

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

// Linear Congruential Generator for deterministic audio randomness
export function lcg(seed: number): () => number {
  let a = (Math.floor(seed * 977) + 12345) >>> 0 || 1;
  return function () {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

export function createStereoBuffer(L: Float32Array, R: Float32Array, sr: number): AudioBuffer {
  const ac = getAudioContext();
  const b = ac.createBuffer(2, L.length, sr);
  b.getChannelData(0).set(L);
  b.getChannelData(1).set(R);
  return b;
}

export function normalizeBuffer(L: Float32Array, R: Float32Array, targetPeak = 0.9): void {
  let m = 0;
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]);
    const c = Math.abs(R[i]);
    if (a > m) m = a;
    if (c > m) m = c;
  }
  if (m > 0) {
    const g = targetPeak / m;
    for (let i = 0; i < L.length; i++) {
      L[i] *= g;
      R[i] *= g;
    }
  }
}

export function applyStereoEcho(L: Float32Array, R: Float32Array, sr: number): void {
  const n = L.length;
  const L2 = new Float32Array(L);
  const R2 = new Float32Array(R);
  const delays: [number, number][] = [
    [0.031, 0.3],
    [0.067, 0.2],
    [0.109, 0.13],
    [0.163, 0.08],
  ];
  delays.forEach(([time, gain]) => {
    const d = Math.floor(time * sr);
    for (let i = d; i < n; i++) {
      L2[i] += R[i - d] * gain;
      R2[i] += L[i - d] * gain;
    }
  });
  L.set(L2);
  R.set(R2);
}

// Biquad bandpass filter coefficients
interface BiquadCoeffs {
  b0: number;
  b2: number;
  a1: number;
  a2: number;
}

export function makeBandpass(f: number, Q: number, sr: number): BiquadCoeffs {
  const w = (2 * Math.PI * f) / sr;
  const al = Math.sin(w) / (2 * Q);
  const a0 = 1 + al;
  return {
    b0: al / a0,
    b2: -al / a0,
    a1: (-2 * Math.cos(w)) / a0,
    a2: (1 - al) / a0,
  };
}

export function runBandpass(c: BiquadCoeffs, s: number[], v: number): number {
  const y = c.b0 * v + c.b2 * s[1] - c.a1 * s[2] - c.a2 * s[3];
  s[1] = s[0];
  s[0] = v;
  s[3] = s[2];
  s[2] = y;
  return y;
}

export function getMonoChannel(buf: AudioBuffer): Float32Array {
  const a = buf.getChannelData(0);
  if (buf.numberOfChannels === 1) return a;
  const b = buf.getChannelData(1);
  const o = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    o[i] = (a[i] + b[i]) / 2;
  }
  return o;
}

// Mix single voice into stereo buffer with pitch/speed, delay, volume, and panning
export function mixVoice(
  L: Float32Array,
  R: Float32Array,
  src: Float32Array,
  rate: number,
  offset: number,
  gain: number,
  pan: number
): void {
  const n = L.length;
  const m = src.length;
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; ; i++) {
    const p = i * rate;
    const j = Math.floor(p);
    if (j >= m - 1) break;
    const idx = offset + i;
    if (idx >= n) break;
    const f = p - j;
    const v = src[j] * (1 - f) + src[j + 1] * f;
    L[idx] += v * gl;
    R[idx] += v * gr;
  }
}

// --- Crowd audio synthesizer ---
const FXN = { k: 6, s: 14, b: 26, x: 40 };
const FXC = { k: 20, s: 50, b: 100, x: 170 };

export function synthSorakRaw(dur: number, N: number, seed: number, sr: number) {
  const len = Math.floor((dur + 0.4) * sr);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (let v = 0; v < N; v++) {
    const rg = lcg(seed * 31 + v);
    const f0 = 170 + rg() * 230;
    const st = Math.floor(rg() * 0.25 * sr);
    const pan = (rg() - 0.5) * 1.8;
    const gl = Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = Math.sin(((pan + 1) * Math.PI) / 4);
    const b1 = makeBandpass(650 + rg() * 250, 5, sr);
    const b2 = makeBandpass(1100 + rg() * 450, 7, sr);
    const s1 = [0, 0, 0, 0];
    const s2 = [0, 0, 0, 0];
    let ph = rg() * 6.28;
    for (let i = 0; i < Math.floor(dur * sr); i++) {
      const idx = st + i;
      if (idx >= len) break;
      const tt = i / sr;
      const env =
        Math.min(1, tt / 0.14) *
        Math.min(1, Math.max(0, (dur - tt) / 0.5)) *
        (1 - 0.15 * Math.sin(tt * 3 + v));
      const fr = f0 * (0.92 + 0.2 * Math.min(1, tt / 0.5)) * (1 + 0.02 * Math.sin(tt * 34 + v));
      ph += (6.2832 * fr) / sr;
      if (ph > 6.2832) ph -= 6.2832;
      const inp = (ph / 3.1416 - 1) * 0.8 + (rg() * 2 - 1) * 0.35;
      const y = (runBandpass(b1, s1, inp) + 0.6 * runBandpass(b2, s2, inp)) * env;
      L[idx] += y * gl;
      R[idx] += y * gr;
    }
  }
  return { L, R };
}

export function renderCheer(f: CrowdFxItem): AudioBuffer {
  const ac = getAudioContext();
  const sr = ac.sampleRate;
  const d = f.dur || 3;
  const count = (f.size && f.size in FXN ? FXN[f.size as keyof typeof FXN] : FXN.s);
  const r = synthSorakRaw(d, count, f.seed || 1, sr);
  applyStereoEcho(r.L, r.R, sr);
  normalizeBuffer(r.L, r.R, 0.9);
  return createStereoBuffer(r.L, r.R, sr);
}

export function renderApplause(f: CrowdFxItem): AudioBuffer {
  const ac = getAudioContext();
  const sr = ac.sampleRate;
  const d = f.dur || 4;
  const rate = (f.size && f.size in FXC ? FXC[f.size as keyof typeof FXC] : FXC.s);
  const len = Math.floor((d + 1) * sr);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const rg = lcg((f.seed || 1) * 7);
  const N = Math.floor(d * rate * 1.6);
  for (let c = 0; c < N; c++) {
    const tt = rg() * d;
    const e = Math.min(1, tt / (d * 0.3)) * Math.min(1, (d - tt) / (d * 0.35) + 0.15);
    if (rg() > e * 0.62) continue;
    const off = Math.floor(tt * sr);
    const bl = Math.floor((0.008 + rg() * 0.014) * sr);
    const a = 0.25 + 0.75 * rg();
    const pn = (rg() - 0.5) * 1.8;
    const gl = Math.cos(((pn + 1) * Math.PI) / 4);
    const gr = Math.sin(((pn + 1) * Math.PI) / 4);
    let prev = 0;
    for (let i = 0; i < bl && off + i < len; i++) {
      const nz = rg() * 2 - 1;
      const v = (nz - prev * 0.95) * a * Math.exp(-i / (sr * 0.0045));
      prev = nz;
      L[off + i] += v * gl;
      R[off + i] += v * gr;
    }
  }
  applyStereoEcho(L, R, sr);
  normalizeBuffer(L, R, 0.9);
  return createStereoBuffer(L, R, sr);
}

export function renderCrowdBuzz(f: CrowdFxItem): AudioBuffer {
  const ac = getAudioContext();
  const sr = ac.sampleRate;
  const d = f.dur || 8;
  const N = (f.size && f.size in FXN ? FXN[f.size as keyof typeof FXN] : FXN.s);
  const len = Math.floor((d + 0.5) * sr);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const rg = lcg((f.seed || 1) * 11);
  const bb = makeBandpass(850, 0.7, sr);
  const sb = [0, 0, 0, 0];
  const vw: [number, number][] = [
    [700, 1200],
    [450, 1900],
    [300, 800],
    [500, 1000],
  ];
  const ev = Math.floor((N * d) / 2.2);

  for (let i = 0; i < len; i++) {
    const y = runBandpass(bb, sb, rg() * 2 - 1) * (0.6 + 0.4 * Math.sin((6.2832 * 0.35 * i) / sr + 1));
    L[i] += y * 0.5;
    R[i] += y * 0.5;
  }

  for (let k = 0; k < ev; k++) {
    const st = Math.floor(rg() * d * sr);
    const bl = Math.floor((0.09 + rg() * 0.19) * sr);
    const f0 = 100 + rg() * 160;
    const vFormant = vw[Math.floor(rg() * 4)];
    const a = 0.3 + 0.7 * rg();
    const pn = (rg() - 0.5) * 1.8;
    const gl = Math.cos(((pn + 1) * Math.PI) / 4);
    const gr = Math.sin(((pn + 1) * Math.PI) / 4);
    const b1 = makeBandpass(vFormant[0], 5, sr);
    const b2 = makeBandpass(vFormant[1], 7, sr);
    const s1 = [0, 0, 0, 0];
    const s2 = [0, 0, 0, 0];
    let ph = rg() * 6.28;

    for (let i = 0; i < bl; i++) {
      const idx = st + i;
      if (idx >= len) break;
      const e = Math.sin((Math.PI * i) / bl);
      const fr = f0 * (1 + (0.1 * i) / bl);
      ph += (6.2832 * fr) / sr;
      if (ph > 6.2832) ph -= 6.2832;
      const inp = (ph / 3.1416 - 1) * 0.8 + (rg() * 2 - 1) * 0.3;
      const y = (runBandpass(b1, s1, inp) + 0.6 * runBandpass(b2, s2, inp)) * e * a * 0.9;
      L[idx] += y * gl;
      R[idx] += y * gr;
    }
  }

  const fi = Math.floor(0.8 * sr);
  for (let i = 0; i < len; i++) {
    const g = Math.min(1, i / fi, (len - i) / fi);
    L[i] *= g;
    R[i] *= g;
  }

  applyStereoEcho(L, R, sr);
  normalizeBuffer(L, R, 0.55);
  return createStereoBuffer(L, R, sr);
}

export function renderChant(f: CrowdFxItem): AudioBuffer | null {
  if (!f.tb || !f.tb.length) return null;
  const ac = getAudioContext();
  const sr = ac.sampleRate;
  const tk = f.tb;
  const N = (f.size && f.size in FXN ? FXN[f.size as keyof typeof FXN] : FXN.s);
  const mode = f.mode || 0;
  const d = tk[0].length / sr;
  const seg = d * 1.1 + 0.25;
  const starts: number[] = [];
  const solo = mode === 1;
  const reps = mode === 2 ? 3 : 1;
  const seed = f.seed || 1;

  if (solo) {
    starts.push(d + 0.4);
  } else {
    for (let i = 0; i < reps; i++) starts.push(i * seg);
  }

  const total = (solo ? d + 0.4 + (d * 1.1 + 0.3) : reps * seg) + (f.cheer ? 2.6 : 0) + 1.2;
  const len = Math.floor(total * sr);
  const L = new Float32Array(len);
  const R = new Float32Array(len);

  if (solo) {
    mixVoice(L, R, tk[0], 1, 0, 0.9, 0);
  }

  starts.forEach((st, ri) => {
    for (let v = 0; v < N; v++) {
      const r = 1 + (Math.sin(seed + v * 7 + ri * 131) * 0.5) * 0.26;
      const dl = Math.floor(Math.abs(Math.sin(seed + v * 13 + ri * 17)) * 0.09 * sr);
      const g =
        ((0.55 + 0.45 * Math.abs(Math.sin(seed + v * 5 + ri))) / Math.sqrt(N)) *
        (1 + 0.1 * ri);
      const pn = (Math.sin(seed + v * 3 + ri * 29) * 0.5) * 1.7;
      mixVoice(L, R, tk[v % tk.length], r, Math.floor(st * sr) + dl, g, pn);
    }
  });

  normalizeBuffer(L, R, 0.8);

  if (f.cheer) {
    const cs = Math.floor((starts[starts.length - 1] + d * 1.1 + 0.15) * sr);
    const sk = synthSorakRaw(2, N, seed + 99, sr);
    normalizeBuffer(sk.L, sk.R, 0.55);
    for (let i = 0; i < sk.L.length && cs + i < len; i++) {
      L[cs + i] += sk.L[i];
      R[cs + i] += sk.R[i];
    }
  }

  applyStereoEcho(L, R, sr);
  normalizeBuffer(L, R, 0.9);
  return createStereoBuffer(L, R, sr);
}

// --- Procedural 35 Drama Soundscapes ---
interface DramaContext {
  L: Float32Array;
  R: Float32Array;
  n: number;
  f: number;
  sr: number;
  rg: () => number;
}

const AM_CACHE: Record<number, AudioBuffer> = {};

function amLowpass(f: number, sr: number) {
  const a = 1 - Math.exp((-6.2832 * f) / sr);
  let y = 0;
  return function (v: number) {
    y += a * (v - y);
    return y;
  };
}

function amBandpass(f: number, Q: number, sr: number) {
  const w = (6.2832 * f) / sr;
  const al = Math.sin(w) / (2 * Q);
  const a0 = 1 + al;
  const b0 = al / a0;
  const b2 = -al / a0;
  const a1 = (-2 * Math.cos(w)) / a0;
  const a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return function (v: number) {
    const y = b0 * v + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = v;
    y2 = y1;
    y1 = y;
    return y;
  };
}

function amBed(sc: DramaContext, g: number, fn: (tL: Float32Array, tR: Float32Array) => void) {
  const n = sc.n;
  const f = sc.f;
  const N = n + f;
  const tL = new Float32Array(N);
  const tR = new Float32Array(N);
  fn(tL, tR);
  let s = 0;
  for (let i = 0; i < n; i += 3) {
    s += tL[i] * tL[i] + tR[i] * tR[i];
  }
  const k = (0.1 * g) / Math.sqrt(s / ((n / 3) * 2) + 1e-12);
  for (let i = 0; i < N; i++) {
    const w = i < f ? Math.sin((1.5708 * i) / f) : i >= n ? Math.cos((1.5708 * (i - n)) / f) : 1;
    sc.L[i] += tL[i] * k * w;
    sc.R[i] += tR[i] * k * w;
  }
}

function amVo(
  sc: DramaContext,
  stSec: number,
  dur: number,
  ff: (u: number, t: number) => number,
  aa: (u: number, t: number) => number,
  hs: number[],
  pan: number,
  g: number
) {
  const sr = sc.sr;
  const m = Math.floor(dur * sr);
  let ph = 0;
  const gl = g * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = g * Math.sin(((pan + 1) * Math.PI) / 4);
  const N = sc.n + sc.f;
  const st = Math.floor(stSec * sr);
  for (let i = 0; i < m; i++) {
    const idx = st + i;
    if (idx >= N) break;
    const u = i / m;
    const t = i / sr;
    ph += (ff(u, t) * 6.2832) / sr;
    let v = 0;
    for (let k = 0; k < hs.length; k++) {
      v += hs[k] * Math.sin((k + 1) * ph);
    }
    v *= aa(u, t);
    sc.L[idx] += v * gl;
    sc.R[idx] += v * gr;
  }
}

const AML_ENGINES: Record<string, (sc: DramaContext, g: number, o?: string) => void> = {
  wind(sc, g, o) {
    const n = sc.n, sr = sc.sr, rg = sc.rg, k = o === 'k';
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T, ch) => {
        let y1 = 0, y2 = 0, a = 0.01;
        const p1 = rg() * 6.28, p2 = rg() * 6.28, p3 = rg() * 6.28;
        for (let i = 0; i < T.length; i++) {
          if (!(i & 255)) {
            const c =
              (k ? 650 : 380) +
              (k ? 900 : 450) *
                (0.5 + 0.5 * Math.sin((6.2832 * 3 * i) / n + p1)) *
                (0.6 + 0.4 * Math.sin((6.2832 * 7 * i) / n + p2));
            a = 1 - Math.exp((-6.2832 * c) / sr);
          }
          const v = rg() * 2 - 1;
          y1 += a * (v - y1);
          y2 += a * (y1 - y2);
          const e = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin((6.2832 * 2 * i) / n + p3 + ch * 0.4), k ? 1 : 1.6);
          T[i] = y2 * e;
        }
      });
    });
  },

  leaves(sc, g) {
    const n = sc.n, sr = sc.sr, rg = sc.rg;
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T) => {
        let h = 0, gs = 0;
        const ag = 1 - Math.exp((-6.2832 * 7) / sr);
        const p = rg() * 6.28;
        for (let i = 0; i < T.length; i++) {
          const v = rg() * 2 - 1;
          h += 0.25 * (v - h);
          gs += ag * (rg() * 2 - 1 - gs);
          const e = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((6.2832 * 2 * i) / n + p));
          T[i] = (v - h) * Math.min(1, Math.abs(gs) * 18) * e;
        }
      });
    });
  },

  stream(sc, g) {
    const sr = sc.sr, n = sc.n, rg = sc.rg;
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T) => {
        const b1 = amBandpass(900, 0.8, sr), b2 = amBandpass(2600, 0.9, sr);
        let m = 0;
        const am = 1 - Math.exp((-6.2832 * 25) / sr);
        for (let i = 0; i < T.length; i++) {
          const v = rg() * 2 - 1;
          m += am * (rg() * 2 - 1 - m);
          T[i] = (b1(v) + 0.8 * b2(v)) * (0.4 + Math.min(1.6, Math.abs(m) * 14));
        }
        for (let j = 0; j < 320; j++) {
          const st = Math.floor(rg() * n);
          const f0 = 700 + rg() * 2400;
          const len = Math.floor((0.02 + 0.04 * rg()) * sr);
          const amp = 0.05 + 0.12 * rg();
          let ph = 0;
          for (let i = 0; i < len && st + i < T.length; i++) {
            ph += (6.2832 * f0 * (1 + (0.6 * i) / len)) / sr;
            T[st + i] += Math.sin(ph) * Math.exp(-i / (0.012 * sr)) * amp;
          }
        }
      });
    });
  },

  fall(sc, g) {
    const sr = sc.sr, n = sc.n, rg = sc.rg;
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T) => {
        let y1 = 0, y2 = 0;
        const a1 = 1 - Math.exp((-6.2832 * 6500) / sr);
        const a2 = 1 - Math.exp((-6.2832 * 300) / sr);
        for (let i = 0; i < T.length; i++) {
          const v = rg() * 2 - 1;
          y1 += a1 * (v - y1);
          y2 += a2 * (v - y2);
          T[i] = (y1 * 0.8 + y2 * 1.3) * (0.85 + 0.15 * Math.sin((6.2832 * 13 * i) / n));
        }
      });
    });
  },

  waves(sc, g, o) {
    const n = sc.n, sr = sc.sr, rg = sc.rg, soft = o === 'l';
    const ph = rg() * 6.28;
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T, ch) => {
        let y1 = 0, y2 = 0, h1 = 0, a = 0.01;
        for (let i = 0; i < T.length; i++) {
          const p = 0.5 + 0.5 * Math.sin((6.2832 * 2 * i) / n + ph + ch * 0.5);
          const e = p * p * (soft ? 0.6 : 1);
          const q = 0.5 + 0.5 * Math.sin((6.2832 * 2 * i) / n + ph + ch * 0.5 - 0.9);
          const e2 = q * q * q;
          if (!(i & 255)) {
            const c = (soft ? 250 : 350) + (soft ? 500 : 1100) * p;
            a = 1 - Math.exp((-6.2832 * c) / sr);
          }
          const v = rg() * 2 - 1;
          y1 += a * (v - y1);
          y2 += a * (y1 - y2);
          h1 += 0.3 * (v - h1);
          T[i] = y2 * (0.15 + e * 1.4) * 3 + (v - h1) * e2 * (soft ? 0.12 : 0.3);
        }
      });
    });
  },

  rain(sc, g, o) {
    const sr = sc.sr, n = sc.n, rg = sc.rg;
    const cnt = o === 'l' ? 260 : o === 'h' ? 1500 : 700;
    const fc = o === 'l' ? 5000 : 2200;
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T) => {
        let h = 0;
        const a = 1 - Math.exp((-6.2832 * fc) / sr);
        for (let i = 0; i < T.length; i++) {
          const v = rg() * 2 - 1;
          h += a * (v - h);
          T[i] = (v - h) * (0.5 + 0.3 * Math.sin((6.2832 * 3 * i) / n));
        }
        for (let j = 0; j < cnt; j++) {
          const st = Math.floor(rg() * n);
          const f0 = 3000 + rg() * 6000;
          const len = Math.floor(0.004 * sr);
          const amp = 0.2 + 0.8 * rg() * rg();
          let ph = 0;
          for (let i = 0; i < len && st + i < T.length; i++) {
            ph += (6.2832 * f0) / sr;
            T[st + i] += Math.sin(ph) * Math.exp(-i / (0.0012 * sr)) * amp;
          }
        }
      });
    });
  },

  thunder(sc, g, o) {
    const sr = sc.sr, rg = sc.rg, N = sc.n + sc.f;
    const cnt = o === '2' ? 2 : 1;
    for (let c = 0; c < cnt; c++) {
      const st = Math.floor((3 + c * 9 + rg() * (c ? 5 : 8)) * sr);
      const len = Math.floor(7 * sr);
      const a = 1 - Math.exp((-6.2832 * (90 + rg() * 60)) / sr);
      let y1 = 0, y2 = 0, h = 0;
      const bm: [number, number][] = [];
      for (let k = 0; k < 4; k++) bm.push([rg() * 3, 0.3 + 0.7 * rg()]);
      for (let i = 0; i < len && st + i < N; i++) {
        const t = i / sr;
        let e = Math.min(1, t / 0.08) * Math.exp(-t / 1.6);
        for (let k = 0; k < 4; k++) {
          const b = t - bm[k][0];
          if (b > 0) e += bm[k][1] * Math.min(1, b / 0.1) * Math.exp(-b / 1.1) * 0.6;
        }
        const v = rg() * 2 - 1;
        y1 += a * (v - y1);
        y2 += a * (y1 - y2);
        h += 0.2 * (v - h);
        const crack = t < 0.25 ? (v - h) * Math.exp(-t / 0.06) * 0.35 : 0;
        const s = (y2 * 14 * e + crack) * g * 0.3;
        sc.L[st + i] += s;
        sc.R[st + i] += s * (0.9 + 0.1 * Math.sin(t));
      }
    }
  },

  birds(sc, g, o) {
    const rg = sc.rg, n = sc.n / sc.sr;
    const cnt = o === 'l' ? 8 : o === 'h' ? 30 : 17;
    for (let i = 0; i < cnt; i++) {
      const t = 0.3 + rg() * (n - 2);
      const pan = (rg() - 0.5) * 1.8;
      const gg = g * (0.35 + 0.65 * rg());
      const ty = Math.floor(rg() * 3);
      if (ty === 0) {
        const f0 = 2600 + rg() * 2800;
        const r = 0.7 + rg() * 0.9;
        const reps = 2 + Math.floor(rg() * 4);
        const d = 0.06 + rg() * 0.06;
        for (let k = 0; k < reps; k++) {
          amVo(sc, t + k * (d + 0.08), d, (u) => f0 * (1 + (r - 1) * u), (u) => Math.pow(Math.sin(Math.PI * u), 0.7), [1, 0.25], pan, 0.25 * gg);
        }
      } else if (ty === 1) {
        const d = 0.5 + rg() * 0.6;
        const f0 = 3200 + rg() * 1200;
        const vr = 18 + rg() * 14;
        amVo(sc, t, d, (_u, tm) => f0 + 550 * Math.sin(6.2832 * vr * tm), (u) => Math.sqrt(Math.sin(Math.PI * u)), [1, 0.15], pan, 0.2 * gg);
      } else {
        const f1 = 1800 + rg() * 1200;
        const d = 0.2 + 0.1 * rg();
        amVo(sc, t, d, (u, tm) => f1 * (1 + 0.2 * u) * (1 + 0.01 * Math.sin(6.2832 * 30 * tm)), (u) => Math.sin(Math.PI * u), [1, 0.1], pan, 0.25 * gg);
        amVo(sc, t + d + 0.06, d, (u) => f1 * (1.2 - 0.3 * u), (u) => Math.sin(Math.PI * u), [1, 0.1], pan, 0.25 * gg);
      }
    }
  },

  gull(sc, g, o) {
    const rg = sc.rg, n = sc.n / sc.sr;
    const cnt = o === 'h' ? 7 : o === 'l' ? 2 : 4;
    for (let i = 0; i < cnt; i++) {
      const t = 1 + rg() * (n - 6);
      const pan = (rg() - 0.5) * 1.6;
      const gg = g * (0.5 + 0.5 * rg());
      const sh = 0.85 + 0.35 * rg();
      if (rg() < 0.6) {
        const calls = 3 + Math.floor(rg() * 3);
        for (let k = 0; k < calls; k++) {
          const d = 0.5 + 0.35 * rg() - k * 0.03;
          amVo(sc, t + k * (0.75 + 0.1 * rg()), d, (u, tm) => {
            const b = u < 0.22 ? 1400 + 4300 * u : 2350 - 1350 * Math.pow((u - 0.22) / 0.78, 0.8);
            return b * sh * (1 + 0.035 * Math.sin(6.2832 * 30 * tm));
          }, (u) => Math.pow(Math.sin(Math.PI * u), 0.6), [1, 0.6, 0.4, 0.25, 0.15], pan, 0.17 * gg);
        }
      } else {
        const calls = 5 + Math.floor(rg() * 4);
        const sp = 0.28 + 0.06 * rg();
        for (let k = 0; k < calls; k++) {
          amVo(sc, t + k * sp, 0.2, (u) => (1900 - 90 * k) * sh * (0.9 + 0.2 * Math.sin(Math.PI * u)), (u) => Math.pow(Math.sin(Math.PI * u), 0.6), [1, 0.7, 0.4, 0.3, 0.15], pan, 0.17 * gg);
        }
      }
    }
  },

  crow(sc, g) {
    const rg = sc.rg, n = sc.n / sc.sr;
    for (let i = 0; i < 3; i++) {
      const t = 1 + i * 6 + rg() * 4;
      const pan = (rg() - 0.5) * 1.6;
      const gg = g * (0.5 + 0.5 * rg());
      const caws = 2 + Math.floor(rg() * 2);
      for (let k = 0; k < caws; k++) {
        amVo(sc, t + k * 0.5, 0.32, (u) => 520 - 150 * u, (u, tm) => Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(6.2832 * 85 * tm)), [1, 0.8, 0.7, 0.55, 0.45, 0.35, 0.25, 0.2], pan, 0.07 * gg);
      }
    }
  },

  owl(sc, g) {
    const rg = sc.rg;
    for (let c = 0; c < 2; c++) {
      const t = 2 + c * 8 + rg() * 6;
      const pan = (rg() - 0.5) * 1.4;
      const seq: [number, number, number, number][] = [
        [0, 0.2, 410, 380],
        [0.34, 0.2, 410, 380],
        [0.95, 0.75, 370, 320],
      ];
      seq.forEach(([offset, dur, startF, endF]) => {
        amVo(sc, t + offset, dur, (u) => startF + (endF - startF) * u, (u) => Math.pow(Math.sin(Math.PI * u), 1.3), [1, 0.12], pan, 0.28 * g);
      });
    }
  },

  rooster(sc, g, o) {
    const rg = sc.rg, n = sc.n / sc.sr;
    const cnt = o === '2' ? 2 : 1;
    for (let c = 0; c < cnt; c++) {
      const t = 2 + c * 9 + rg() * 6;
      const pan = (rg() - 0.5) * 1.2;
      const seq: [number, number, number, number][] = [
        [0, 0.18, 480, 760],
        [0.22, 0.2, 760, 700],
        [0.46, 0.22, 720, 740],
        [0.72, 1, 740, 520],
      ];
      seq.forEach(([offset, dur, startF, endF]) => {
        amVo(sc, t + offset, dur, (u, tm) => (startF + (endF - startF) * u) * (1 + 0.02 * Math.sin(6.2832 * 24 * tm)), (u) => Math.min(1, u * 12) * Math.min(1, (1 - u) * 5), [1, 0.8, 0.6, 0.5, 0.35, 0.2], pan, 0.09 * g);
      });
    }
  },

  crickets(sc, g, o) {
    const sr = sc.sr, n = sc.n / sr, rg = sc.rg;
    const cnt = o === 'l' ? 5 : o === 'h' ? 14 : 9;
    for (let c = 0; c < cnt; c++) {
      const fc = 4200 + rg() * 1100;
      const T = n / Math.round(n / (0.33 + rg() * 0.25));
      const off = rg() * T;
      const pan = (rg() - 0.5) * 1.8;
      const am = (0.04 + 0.05 * rg()) * g;
      for (let gs = off; gs < n; gs += T) {
        for (let p = 0; p < 3; p++) {
          amVo(sc, gs + p * 0.052, 0.024, () => fc, (u) => Math.sin(Math.PI * u), [1], pan, am);
        }
      }
    }
  },

  frogs(sc, g, o) {
    const rg = sc.rg, n = sc.n / sc.sr;
    const cnt = o === 'l' ? 4 : 7;
    for (let c = 0; c < cnt; c++) {
      const f0 = 260 + rg() * 180;
      const pan = (rg() - 0.5) * 1.8;
      const ng = 5 + Math.floor(rg() * 5);
      const gg = (0.6 + 0.4 * rg()) * g;
      for (let q = 0; q < ng; q++) {
        const t = rg() * (n - 2.5);
        const pl = 4 + Math.floor(rg() * 5);
        for (let p = 0; p < pl; p++) {
          amVo(sc, t + p * 0.034, 0.026, (u) => f0 * (1 - 0.15 * u), (u) => Math.sin(Math.PI * u), [1, 0.7, 0.35, 0.15], pan, 0.14 * gg);
        }
      }
    }
  },

  cicada(sc, g) {
    const sr = sc.sr, n = sc.n, rg = sc.rg;
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T, ch) => {
        const b = amBandpass(6400, 3, sr);
        const fc = 6200 + ch * 150;
        const p1 = rg() * 6.28;
        for (let i = 0; i < T.length; i++) {
          const e = Math.pow(0.5 + 0.5 * Math.sin((6.2832 * 3 * i) / n + p1), 0.7);
          const am = 0.5 + 0.5 * Math.sin((6.2832 * 85 * i) / sr);
          T[i] = (b(rg() * 2 - 1) * 0.9 + Math.sin((6.2832 * fc * i) / sr) * 0.3) * am * e;
        }
      });
    });
  },

  fire(sc, g) {
    const sr = sc.sr, n = sc.n, rg = sc.rg, N = n + sc.f;
    amBed(sc, g * 0.8, (tL, tR) => {
      [tL, tR].forEach((T) => {
        let y1 = 0, y2 = 0;
        const a = 1 - Math.exp((-6.2832 * 220) / sr);
        let fl = 0;
        const af = 1 - Math.exp((-6.2832 * 3) / sr);
        for (let i = 0; i < T.length; i++) {
          const v = rg() * 2 - 1;
          y1 += a * (v - y1);
          y2 += a * (y1 - y2);
          fl += af * (rg() * 2 - 1 - fl);
          T[i] = y2 * (0.7 + Math.min(1, Math.abs(fl) * 8));
        }
      });
    });
    for (let j = 0; j < 190; j++) {
      const t = Math.floor(rg() * n);
      const len = Math.floor((0.002 + 0.007 * rg()) * sr);
      const amp = (0.04 + Math.pow(rg(), 3) * 0.5) * g;
      const pan = (rg() - 0.5) * 1.6;
      const gl = Math.cos(((pan + 1) * Math.PI) / 4);
      const gr = Math.sin(((pan + 1) * Math.PI) / 4);
      for (let i = 0; i < len && t + i < N; i++) {
        const v = (rg() * 2 - 1) * Math.exp(-i / (len * 0.35)) * amp;
        sc.L[t + i] += v * gl;
        sc.R[t + i] += v * gr;
      }
    }
  },

  chimes(sc, g, o) {
    const rg = sc.rg, n = sc.n / sc.sr;
    const SCL = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];
    const cnt = o === 'l' ? 3 : 6;
    for (let i = 0; i < cnt; i++) {
      const t = 0.5 + rg() * (n - 5);
      const pan = (rg() - 0.5) * 1.4;
      const nn = 2 + Math.floor(rg() * 3);
      let tt = t;
      for (let k = 0; k < nn; k++) {
        const f = SCL[Math.floor(rg() * 8)];
        tt += 0.1 + 0.12 * rg();
        const partials: [number, number, number][] = [
          [1, 1, 1.3],
          [2.76, 0.45, 0.6],
          [5.4, 0.2, 0.3],
        ];
        partials.forEach(([mult, amp, decay]) => {
          amVo(sc, tt, decay * 5, () => f * mult, (_u, tm) => Math.exp(-tm / decay) * Math.min(1, tm / 0.003), [1], pan, 0.12 * amp * g);
        });
      }
    }
  },

  drone(sc, g, o) {
    const sr = sc.sr, n = sc.n, rg = sc.rg;
    const t = o === 't';
    const P: [number, number][] = t
      ? [
          [55, 1],
          [58.3, 0.7],
          [77.8, 0.5],
          [82.5, 0.6],
          [110, 0.4],
          [116.5, 0.3],
          [233, 0.15],
        ]
      : [
          [55, 1],
          [82.5, 0.6],
          [110, 0.5],
          [165, 0.3],
          [220, 0.15],
        ];
    amBed(sc, g, (tL, tR) => {
      [tL, tR].forEach((T, ch) => {
        P.forEach(([freq, amp], qi) => {
          const f = Math.round(freq * 20) / 20 + (ch ? 0.05 : -0.05);
          const ph = rg() * 6.28;
          const lf = 2 + (qi % 3);
          const lp = rg() * 6.28;
          let a = 1;
          for (let i = 0; i < T.length; i++) {
            if (!(i & 63)) a = 0.65 + 0.35 * Math.sin((6.2832 * lf * i) / n + lp);
            T[i] += amp * a * Math.sin((6.2832 * f * i) / sr + ph);
          }
        });
      });
    });
  },

  heart(sc, g) {
    const n = sc.n / sc.sr;
    for (let b = 0; b < 24; b++) {
      const t = (b * n) / 24 + 0.1;
      amVo(sc, t, 0.75, (_u, tm) => 60 * (1 - 0.3 * Math.min(1, tm / 0.15)), (_u, tm) => Math.exp(-tm / 0.15) * Math.min(1, tm / 0.006), [1, 0.35], 0, 0.6 * g);
      amVo(sc, t + 0.32, 0.5, (_u, tm) => 75 * (1 - 0.3 * Math.min(1, tm / 0.1)), (_u, tm) => Math.exp(-tm / 0.1) * Math.min(1, tm / 0.006), [1, 0.35], 0, 0.4 * g);
    }
  },

  clock(sc, g) {
    for (let s = 0; s < 20; s++) {
      const f = s % 2 ? 1500 : 1900;
      amVo(sc, s + 0.1, 0.05, () => f, (_u, t) => Math.exp(-t / 0.008), [1, 0.5, 0.25], 0, 0.5 * g);
    }
  },
};

export function buildDramaSoundscape(idx: number): AudioBuffer {
  if (AM_CACHE[idx]) return AM_CACHE[idx];
  const ac = getAudioContext();
  const sr = ac.sampleRate;
  const n = Math.floor(20 * sr);
  const f = Math.floor(1.5 * sr);
  const N = n + f;
  const sc: DramaContext = {
    L: new Float32Array(N),
    R: new Float32Array(N),
    n,
    f,
    sr,
    rg: lcg(idx * 7 + 3),
  };

  const preset = DRAMA_SOUNDSCAPES[idx];
  if (preset) {
    preset[1].forEach(([name, gain, opt]) => {
      if (AML_ENGINES[name]) {
        AML_ENGINES[name](sc, gain, opt);
      }
    });
  }

  const buf = ac.createBuffer(2, n, sr);
  const l = buf.getChannelData(0);
  const r = buf.getChannelData(1);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = sc.L[i] + (i < f ? sc.L[n + i] : 0);
    const b = sc.R[i] + (i < f ? sc.R[n + i] : 0);
    l[i] = a;
    r[i] = b;
    if (!(i & 3)) s += a * a + b * b;
  }
  const k = 0.12 / Math.sqrt(s / ((n / 4) * 2) + 1e-12);
  for (let i = 0; i < n; i++) {
    l[i] = Math.tanh(l[i] * k);
    r[i] = Math.tanh(r[i] * k);
  }

  // Keep cache size bounded
  const keys = Object.keys(AM_CACHE);
  if (keys.length >= 8) {
    delete AM_CACHE[Number(keys[0])];
  }
  AM_CACHE[idx] = buf;
  return buf;
}

// Envelope follower for 2D/3D avatar mouth lip-sync
const ENV_CACHE = new WeakMap<AudioBuffer, number[]>();

export function getAudioEnvelope(buf: AudioBuffer): number[] {
  if (ENV_CACHE.has(buf)) return ENV_CACHE.get(buf)!;
  const data = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(buf.sampleRate * 0.04)); // 40ms frames (~25fps)
  const env: number[] = [];
  let maxRms = 0;
  for (let i = 0; i < data.length; i += step) {
    let sum = 0;
    let count = 0;
    const end = Math.min(i + step, data.length);
    for (let j = i; j < end; j += 4) {
      sum += data[j] * data[j];
      count++;
    }
    const rms = Math.sqrt(sum / Math.max(1, count));
    env.push(rms);
    if (rms > maxRms) maxRms = rms;
  }
  const normalized = env.map((v) => Math.min(1, v / (maxRms * 0.6 || 1)));
  ENV_CACHE.set(buf, normalized);
  return normalized;
}

// Typing sound effect generator
let clickBuffer: AudioBuffer | null = null;

export function getTypingClickBuffer(): AudioBuffer {
  if (clickBuffer) return clickBuffer;
  const ac = getAudioContext();
  const n = Math.floor(ac.sampleRate * 0.02);
  const b = ac.createBuffer(1, n, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.18));
  }
  clickBuffer = b;
  return b;
}
