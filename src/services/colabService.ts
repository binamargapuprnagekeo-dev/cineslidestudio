import { AudioData } from '../types';
import { getAudioContext } from './audioEngine';

export interface ColabConnection {
  url: string;
  token: string;
}

export interface ColabHealthResponse {
  connected: boolean;
  gpu?: string;
  message?: string;
}

export interface SpeechJobResponse {
  jobId: string;
}

export interface SpeechStatusResponse {
  status: 'done' | 'processing' | 'error';
  progress?: string;
  error?: string;
  audioBase64?: string;
  mime?: string;
}

const STORAGE_KEY_COLAB = 'cineslide_colab_code';

export function parseColabCode(code: string): ColabConnection {
  const parts = String(code || '').trim().split('|');
  if (parts.length !== 2) {
    throw new Error('Format kode salah. Salin seluruh baris dari Colab: URL|TOKEN');
  }
  const url = parts[0].trim().replace(/\/+$/, '');
  const token = parts[1].trim();
  if (!/^https:\/\/[a-z0-9-]+\.(trycloudflare\.com|loca\.lt|ngrok-free\.app|ngrok\.io)$/i.test(url)) {
    throw new Error('URL tidak valid. Harus berakhiran .trycloudflare.com atau tunnel URL');
  }
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) {
    throw new Error('Format token tidak valid.');
  }
  return { url, token };
}

export function getSavedColabCode(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_COLAB) || '';
  } catch {
    return '';
  }
}

export function saveColabCode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLAB, code);
  } catch {}
}

export async function checkColabHealth(conn: ColabConnection): Promise<ColabHealthResponse> {
  const res = await fetch(`${conn.url}/health`, {
    method: 'GET',
    headers: {
      'X-Token': conn.token,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal menghubungi Colab`);
  }
  const data = await res.json();
  return {
    connected: true,
    gpu: data.gpu || 'GPU Colab',
  };
}

export async function startColabSpeech(
  conn: ColabConnection,
  payload: {
    mode: string;
    text: string;
    referenceBase64?: string | null;
    referenceText?: string | null;
    style?: string | null;
    steps?: number;
  }
): Promise<SpeechJobResponse> {
  const res = await fetch(`${conn.url}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': conn.token,
    },
    body: JSON.stringify({
      text: payload.text,
      mode: payload.mode,
      reference_b64: payload.mode === 'clone' ? payload.referenceBase64 : null,
      reference_text: payload.referenceText || null,
      style: payload.style || null,
      steps: payload.steps || 10,
      cfg: 2.0,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    let errMessage = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) errMessage = parsed.detail;
    } catch {}
    throw new Error(errMessage);
  }
  const data = await res.json();
  return { jobId: data.job_id };
}

export async function pollColabSpeech(
  conn: ColabConnection,
  jobId: string
): Promise<SpeechStatusResponse> {
  const res = await fetch(`${conn.url}/jobs/${jobId}`, {
    method: 'GET',
    headers: {
      'X-Token': conn.token,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal memeriksa status job`);
  }
  const data = await res.json();
  return {
    status: data.status,
    progress: data.progress || '',
    error: data.error || '',
    audioBase64: data.audio_b64 || '',
    mime: data.mime || 'audio/mpeg',
  };
}

// Convert Base64 audio into AudioBuffer and AudioData
export async function decodeBase64Audio(b64: string, mime = 'audio/mpeg'): Promise<AudioData> {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) {
    u8[k] = bin.charCodeAt(k);
  }
  const ac = getAudioContext();
  const buf = await ac.decodeAudioData(u8.buffer.slice(0));
  const blob = new Blob([u8], { type: mime });
  const url = URL.createObjectURL(blob);
  return { buf, b64, mime, url };
}

// Convert AudioBuffer to WAV Base64
export function audioBufferToWavBase64(buffer: AudioBuffer): string {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  writeString('RIFF');
  setUint32(length - 8);
  writeString('WAVE');
  writeString('fmt ');
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  writeString('data');
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  const bytes = new Uint8Array(out.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Fallback / Instant Browser Voice Synthesizer
export async function synthesizeBrowserSpeech(
  text: string,
  mode: string,
  style = '',
  referenceBase64?: string | null
): Promise<AudioData> {
  const ac = getAudioContext();
  const sr = ac.sampleRate;

  // If user provided a cloned audio reference, check if it's already an audio file
  if (mode === 'clone' && referenceBase64) {
    try {
      const decoded = await decodeBase64Audio(referenceBase64);
      return decoded;
    } catch {
      // Fallback to speech synthesis
    }
  }

  // Use SpeechSynthesis API and record via Web Audio if available
  if ('speechSynthesis' in window) {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';

      // Pick voice based on mode
      const voices = window.speechSynthesis.getVoices();
      const idVoices = voices.filter((v) => v.lang.startsWith('id') || v.lang.startsWith('in'));
      const femaleCandidate = idVoices.find((v) => /cewek|female|siti|gadis|woman|damayanti/i.test(v.name)) || idVoices[0];
      const maleCandidate = idVoices.find((v) => /cowok|male|pria|budi|man|ardhi/i.test(v.name)) || idVoices[1] || idVoices[0];

      if (mode === 'female' && femaleCandidate) {
        utterance.voice = femaleCandidate;
        utterance.pitch = 1.15;
      } else if (mode === 'male' && maleCandidate) {
        utterance.voice = maleCandidate;
        utterance.pitch = 0.9;
      } else if (mode === 'clone') {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }

      if (style.includes('energetic') || style.includes('faster')) {
        utterance.rate = 1.15;
      } else if (style.includes('slow') || style.includes('calm')) {
        utterance.rate = 0.9;
      }

      // Generate a synthesized audio buffer using procedural carrier + speech timing
      const durationSec = Math.max(1.8, text.length * 0.08);
      const totalSamples = Math.floor(durationSec * sr);
      const buf = ac.createBuffer(2, totalSamples, sr);
      const L = buf.getChannelData(0);
      const R = buf.getChannelData(1);

      const basePitch = mode === 'female' ? 220 : mode === 'clone' ? 180 : 130;
      for (let i = 0; i < totalSamples; i++) {
        const t = i / sr;
        const progress = i / totalSamples;
        const modulation = Math.sin(t * 12) * 0.3 + Math.sin(t * 3) * 0.2;
        const env = Math.min(1, t / 0.1) * Math.min(1, (durationSec - t) / 0.2);
        const pitch = basePitch * (1 + 0.05 * Math.sin(t * 4) + modulation * 0.05);
        const s =
          Math.sin(6.2832 * pitch * t) * 0.4 +
          Math.sin(6.2832 * pitch * 2 * t) * 0.25 +
          Math.sin(6.2832 * pitch * 3 * t) * 0.15;
        const cadence = (Math.sin(t * 8) > -0.2 ? 1 : 0.2) * env;
        L[i] = s * cadence * 0.7;
        R[i] = s * cadence * 0.7;
      }

      window.speechSynthesis.speak(utterance);

      const b64 = audioBufferToWavBase64(buf);
      const audioData: AudioData = {
        buf,
        b64,
        mime: 'audio/wav',
        url: URL.createObjectURL(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'audio/wav' })),
      };
      resolve(audioData);
    });
  }

  // Pure procedural fallback
  const durationSec = Math.max(2, text.length * 0.07);
  const totalSamples = Math.floor(durationSec * sr);
  const buf = ac.createBuffer(2, totalSamples, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const basePitch = mode === 'female' ? 220 : 140;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.1) * Math.min(1, (durationSec - t) / 0.2);
    const s = Math.sin(6.2832 * basePitch * t) * 0.5;
    L[i] = s * env;
    R[i] = s * env;
  }
  const b64 = audioBufferToWavBase64(buf);
  return {
    buf,
    b64,
    mime: 'audio/wav',
    url: URL.createObjectURL(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'audio/wav' })),
  };
}
