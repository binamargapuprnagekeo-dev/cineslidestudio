import { Scene, AvatarConfig, ThemeConfig, PhotoAsset } from '../types';
import {
  THEMES,
  SCENE_CONFIGS,
  OPENING_PRESETS,
  PHOTO_PRESETS,
  OVERLAY_MODELS,
  OVERLAY_COORDS,
} from '../constants/presets';
import { drawPhotoAvatar } from './avatar3d';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

// Deterministic pseudo-random number generator
export function rnd(i: number): number {
  const v = Math.sin(i * 127.1) * 43758.5453;
  return v - Math.floor(v);
}

// Triangle wave helper
export function tri(u: number): number {
  return Math.abs((((u % 2) + 2) % 2) - 1);
}

// Cubic ease-out
export function ez(v: number): number {
  const clamped = Math.max(0, Math.min(1, v));
  return 1 - Math.pow(1 - clamped, 3);
}

// Text measurement and word wrapping
export function wrapText(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] {
  const lines: string[] = [];
  let currentLine = '';
  const words = String(text || '').split(/\s+/);
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Set font helper
export function setCanvasFont(ctx: CanvasRenderingContext2D, size: number, weight: number | string = 500) {
  ctx.font = `${weight} ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
}

// Place image or video onto canvas respecting aspect ratio (fit: 'pas' or 'penuh')
export function placeMedia(
  el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: 'pas' | 'penuh' = 'pas',
  ctx: CanvasRenderingContext2D
): void {
  const iw = (el as HTMLVideoElement).videoWidth || (el as HTMLImageElement).naturalWidth || el.width;
  const ih = (el as HTMLVideoElement).videoHeight || (el as HTMLImageElement).naturalHeight || el.height;
  if (!iw || !ih) return;
  const scale = (mode === 'pas' ? Math.min : Math.max)(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function getMediaAspect(el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): number {
  const w = (el as HTMLVideoElement).videoWidth || (el as HTMLImageElement).naturalWidth || el.width;
  const h = (el as HTMLVideoElement).videoHeight || (el as HTMLImageElement).naturalHeight || el.height;
  return w && h ? w / h : 1.5;
}

export function hug(aspect: number, maxWidth: number, maxHeight: number): [number, number] {
  return aspect >= maxWidth / maxHeight ? [maxWidth, maxWidth / aspect] : [maxHeight * aspect, maxHeight];
}

// Ambient blurred background buffer
let ambientCanvas: HTMLCanvasElement | null = null;
let ambientCtx: CanvasRenderingContext2D | null = null;

export function drawAmbientBackground(
  ctx: CanvasRenderingContext2D,
  el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  x = 0,
  y = 0,
  w = CANVAS_WIDTH,
  h = CANVAS_HEIGHT,
  darkness = 0.4
): void {
  if (!ambientCanvas) {
    ambientCanvas = document.createElement('canvas');
    ambientCanvas.width = 48;
    ambientCanvas.height = 27;
    ambientCtx = ambientCanvas.getContext('2d');
  }
  if (!ambientCtx) return;
  ambientCtx.fillStyle = '#000';
  ambientCtx.fillRect(0, 0, 48, 27);
  placeMedia(el, 0, 0, 48, 27, 'penuh', ambientCtx);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(ambientCanvas, x, y, w, h);
  ctx.fillStyle = `rgba(0,0,0,${darkness})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ----------------- Procedural Theme Landscapes -----------------
function drawProceduralSky(ctx: CanvasRenderingContext2D, config: { sky: string[]; stars?: number; sun?: { x: number; y: number; r: number; c: string; a?: number }; L: Array<[string, number, number, string, number?]> }) {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  config.sky.forEach((color, i) => {
    grad.addColorStop(i / (config.sky.length - 1), color);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (config.stars) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 130; i++) {
      ctx.globalAlpha = 0.25 + rnd(i + 9) * 0.7;
      ctx.beginPath();
      ctx.arc(rnd(i) * W, rnd(i + 500) * H * 0.7, rnd(i + 900) * 1.5 + 0.4, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (config.sun) {
    const u = config.sun;
    const passes: [number, number][] = [[1, 0.25], [0.7, 0.35], [0.45, 1]];
    passes.forEach(([scale, alpha]) => {
      ctx.globalAlpha = alpha * (u.a || 1);
      ctx.fillStyle = u.c;
      ctx.beginPath();
      ctx.arc(W * u.x, H * u.y, u.r * scale, 0, 7);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  config.L.forEach(([color, yRatio, amp, type, freqMult = 1], i) => {
    const baseY = H * yRatio;
    const phase = i * 1.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);

    if (type === 'h' || type === 'd') {
      for (let X = 0; X <= W; X += 8) {
        ctx.lineTo(
          X,
          baseY +
            Math.sin(X * 0.0045 * freqMult + phase) * amp +
            (type === 'h' ? Math.sin(X * 0.011 * freqMult + phase * 2) * amp * 0.3 : 0)
        );
      }
    } else if (type === 'm') {
      for (let X = 0; X <= W; X += 8) {
        ctx.lineTo(
          X,
          baseY - amp * (0.65 * tri(X / (260 * freqMult) + phase) + 0.35 * tri(X / (110 * freqMult) + phase))
        );
      }
    } else if (type === 's') {
      ctx.lineTo(0, baseY);
      ctx.lineTo(W, baseY);
    } else if (type === 'p') {
      ctx.lineTo(0, baseY);
      for (let X = 0; X <= W; X += 40 * freqMult) {
        ctx.lineTo(X, baseY);
        ctx.lineTo(X + 20 * freqMult, baseY - amp * (0.55 + 0.45 * rnd(X * 0.7 + i * 31)));
        ctx.lineTo(X + 40 * freqMult, baseY);
      }
    } else if (type === 'c') {
      ctx.lineTo(0, baseY);
      for (let X = 0; X < W; X += 44 * freqMult) {
        const h = amp * (0.3 + 0.7 * rnd(X * 0.37 + i * 53));
        ctx.lineTo(X, baseY - h);
        ctx.lineTo(X + 40 * freqMult, baseY - h);
        ctx.lineTo(X + 40 * freqMult, baseY);
      }
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  });
}

// Procedural Theme Canvas Backgrounds
export function renderThemeBackground(ctx: CanvasRenderingContext2D, theme: ThemeConfig): void {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  if (!theme.art) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.bg);
    grad.addColorStop(1, theme.b2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  if (SCENE_CONFIGS[theme.art]) {
    drawProceduralSky(ctx, SCENE_CONFIGS[theme.art]);
    return;
  }

  // Abstract theme art
  if (theme.art === 'wave') {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f7fbff');
    grad.addColorStop(1, '#d9e8fb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    const waves: [string, number, number, number][] = [
      ['#bcd4f6', 0.8, 38, 0.006],
      ['#8fb6ee', 0.86, 32, 0.008],
      ['#5b8fe0', 0.92, 26, 0.011],
    ];
    waves.forEach(([col, yR, amp, freq], idx) => {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let X = 0; X <= W; X += 10) {
        ctx.lineTo(X, H * yR + Math.sin(X * freq + idx * 2) * amp);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  } else if (theme.art === 'star') {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#050816');
    grad.addColorStop(1, '#14204a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 150; i++) {
      ctx.globalAlpha = 0.3 + rnd(i + 9) * 0.7;
      ctx.beginPath();
      ctx.arc(rnd(i) * W, rnd(i + 500) * H * 0.9, rnd(i + 900) * 1.6 + 0.4, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fdf6d8';
    ctx.beginPath();
    ctx.arc(W * 0.85, H * 0.2, 52, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#080d20';
    ctx.beginPath();
    ctx.arc(W * 0.85 + 24, H * 0.2 - 10, 48, 0, 7);
    ctx.fill();
  } else if (theme.art === 'aur') {
    ctx.fillStyle = '#070b1a';
    ctx.fillRect(0, 0, W, H);
    const auroras: [number, number, number, string][] = [
      [1000, 160, 520, '124,92,255'],
      [1150, 620, 480, '0,200,180'],
      [420, 780, 420, '255,100,170'],
    ];
    auroras.forEach(([ox, oy, or, rgb]) => {
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
      g.addColorStop(0, `rgba(${rgb},0.55)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
  } else {
    // Default fallback gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.bg);
    grad.addColorStop(1, theme.b2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

// ----------------- Procedural Opening Presets -----------------
export function renderOpeningPreset(
  ctx: CanvasRenderingContext2D,
  psIndex: number,
  time: number,
  dur: number
): { ink: string; ac: string; ac2: string } {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const op = OPENING_PRESETS[psIndex] || OPENING_PRESETS[0];
  const [name, type, bg1, bg2, ac1, ac2, textColor, option] = op;

  // Modern studio background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, bg1);
  bgGrad.addColorStop(1, bg2);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();

  // Floating ambient lighting orb
  const orbX = W * 0.5 + Math.sin(time * 0.8) * 120;
  const orbY = H * 0.4 + Math.cos(time * 0.6) * 80;
  const orbGlow = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, 520);
  orbGlow.addColorStop(0, `${ac1}33`);
  orbGlow.addColorStop(0.6, `${ac2}18`);
  orbGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = orbGlow;
  ctx.fillRect(0, 0, W, H);

  // Subtle modern studio tech grid
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 1. WIPE (Sleek Slashes)
  if (type === 'wipe') {
    const shift = (time * 140) % 400;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = ac1;
    ctx.beginPath();
    ctx.moveTo(-120 + shift, 0);
    ctx.lineTo(180 + shift, 0);
    ctx.lineTo(-20 + shift, H);
    ctx.lineTo(-320 + shift, H);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.35;
    ctx.shadowColor = ac2;
    ctx.shadowBlur = 15;
    ctx.fillStyle = ac2;
    ctx.beginPath();
    ctx.moveTo(W - 220 - shift, 0);
    ctx.lineTo(W - 40 - shift, 0);
    ctx.lineTo(W + 160 - shift, H);
    ctx.lineTo(W - shift, H);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  // 2. CIRCLE (Glowing Pulsing Concentric Rings)
  else if (type === 'circle') {
    const cx = W / 2;
    const cy = H / 2;
    const pulse = Math.sin(time * 1.8) * 20;
    if (option === 2) {
      // Sunburst rays
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = ac1;
      for (let i = 0; i < 16; i++) {
        const ang = (i * Math.PI) / 8 + time * 0.08;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 700, ang - 0.08, ang + 0.08);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    for (let r = 110; r <= 420; r += 85) {
      ctx.strokeStyle = r % 170 === 0 ? ac1 : ac2;
      ctx.globalAlpha = 0.2 + (r / 600) * 0.25;
      ctx.shadowColor = ac1;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5 + r / 120;
      ctx.beginPath();
      ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  // 3. LINES (Laser Neon Lines)
  else if (type === 'lines') {
    ctx.lineWidth = 2.5;
    const count = 18;
    for (let i = 0; i < count; i++) {
      const x = ((i * (W / count) + time * 50) % (W + 240)) - 120;
      ctx.strokeStyle = i % 2 === 0 ? ac1 : ac2;
      ctx.shadowColor = i % 2 === 0 ? ac1 : ac2;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.15 + (i % 3) * 0.18;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 280, H);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  // 4. PART (Glowing Floating Particles: Stars, Bubbles, Confetti)
  else if (type === 'part') {
    for (let i = 0; i < 50; i++) {
      const px = (rnd(i * 17) * W + Math.sin(time + i * 0.7) * 25 + W) % W;
      const py = H - ((time * (35 + rnd(i) * 45) + rnd(i * 3) * H) % H);
      const size = 3 + rnd(i * 7) * 9;
      ctx.globalAlpha = 0.35 + rnd(i * 11) * 0.6;
      ctx.fillStyle = i % 2 === 0 ? ac1 : ac2;
      ctx.shadowColor = i % 2 === 0 ? ac1 : ac2;
      ctx.shadowBlur = 8;

      if (option === 0) {
        ctx.beginPath();
        ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (option === 1) {
        ctx.strokeStyle = ac1;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(time * 2 + i);
        ctx.fillRect(-size / 2, -size / 2, size, size * 0.7);
        ctx.restore();
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  // 5. BLOCKS (Pulsing Grid Tiles)
  else if (type === 'blocks') {
    const cols = 10;
    const rows = 6;
    const bw = W / cols;
    const bh = H / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const opacity = 0.04 + 0.16 * Math.abs(Math.sin(time * 1.6 + idx * 0.3));
        ctx.fillStyle = (r + c) % 2 === 0 ? ac1 : ac2;
        ctx.globalAlpha = opacity;
        ctx.fillRect(c * bw + 5, r * bh + 5, bw - 10, bh - 10);
      }
    }
    ctx.globalAlpha = 1;
  }
  // 6. WAVE (Smooth Motion Waves)
  else if (type === 'wave') {
    const waves = [
      { col: ac1, y: H * 0.72, amp: 40, freq: 0.0045, speed: 1.8 },
      { col: ac2, y: H * 0.82, amp: 50, freq: 0.0065, speed: -1.3 },
    ];
    waves.forEach((w) => {
      ctx.fillStyle = w.col;
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) {
        const y = w.y + Math.sin(x * w.freq + time * w.speed) * w.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  // 7. SPOT (Cinema Studio Beam)
  else if (type === 'spot') {
    ctx.globalCompositeOperation = 'screen';
    const g1 = ctx.createRadialGradient(W * 0.25, 0, 10, W * 0.4, H * 0.65, 550);
    g1.addColorStop(0, `${ac1}cc`);
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.moveTo(W * 0.25, 0);
    ctx.lineTo(W * 0.65, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    const g2 = ctx.createRadialGradient(W * 0.75, 0, 10, W * 0.6, H * 0.65, 550);
    g2.addColorStop(0, `${ac2}cc`);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(W * 0.75, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.35, H);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // 8. FRAME (Modern Glass Frame)
  else if (type === 'frame') {
    const pad = 42;
    ctx.strokeStyle = ac1;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.75;
    ctx.shadowColor = ac1;
    ctx.shadowBlur = 10;
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    ctx.strokeStyle = ac2;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.shadowBlur = 0;
    ctx.strokeRect(pad + 14, pad + 14, W - (pad + 14) * 2, H - (pad + 14) * 2);

    ctx.fillStyle = ac1;
    ctx.globalAlpha = 0.9;
    const cs = 18;
    [[pad, pad], [W - pad, pad], [pad, H - pad], [W - pad, H - pad]].forEach(([cx, cy]) => {
      ctx.fillRect(cx - cs / 2, cy - cs / 2, cs, cs);
    });
    ctx.globalAlpha = 1;
  }
  // 9. CURTAIN (Theater Curtain Shader)
  else if (type === 'curtain') {
    const curtainWidth = 150;
    for (let x = 0; x < curtainWidth; x += 20) {
      const foldGrad = ctx.createLinearGradient(x, 0, x + 20, 0);
      foldGrad.addColorStop(0, ac1);
      foldGrad.addColorStop(0.5, ac2);
      foldGrad.addColorStop(1, bg1);
      ctx.fillStyle = foldGrad;
      ctx.fillRect(x, 0, 20, H);
    }
    for (let x = W - curtainWidth; x < W; x += 20) {
      const foldGrad = ctx.createLinearGradient(x, 0, x + 20, 0);
      foldGrad.addColorStop(0, bg1);
      foldGrad.addColorStop(0.5, ac2);
      foldGrad.addColorStop(1, ac1);
      ctx.fillStyle = foldGrad;
      ctx.fillRect(x, 0, 20, H);
    }
    ctx.fillStyle = ac1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= W; x += 80) {
      ctx.quadraticCurveTo(x + 40, 50, x + 80, 0);
    }
    ctx.lineTo(W, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  return { ink: textColor, ac: ac1, ac2 };
}

// ----------------- 2D Vector Presenter Avatar -----------------
const SKIN_TONES = ['#f6d3b5', '#e8b88f', '#c98b5e', '#8d5a3b'];
const CLOTHING_COLORS: Record<string, string> = {
  b: '#2563eb',
  r: '#c63a3a',
  g: '#2a8a5c',
  u: '#6d3fc4',
  k: '#26282e',
  w: '#e9edf2',
};

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(percent > 0 ? v + (255 - v) * percent : v * (1 + percent))));
  return `rgb(${clamp(num >> 16)},${clamp((num >> 8) & 255)},${clamp(num & 255)})`;
}

export function draw2DAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  by: number,
  hh: number,
  av: AvatarConfig,
  time: number,
  mouthOpen: number,
  accentColor: string
): void {
  const u = hh / 280;
  const skin = SKIN_TONES[av.skin || 0];
  const ty = av.type;
  const isFemale = ty.startsWith('f');
  const isHijab = ty === 'f2';
  const suitColor = av.col === 'a' ? accentColor : CLOTHING_COLORS[av.col] || '#2a3a57';
  const hairColor = '#2b1a14';

  const sway = Math.sin(time * 1.4) * 0.015 + mouthOpen * Math.sin(time * 6) * 0.012;
  const bob = Math.sin(time * 1.6) * 1.5 + mouthOpen * Math.sin(time * 9) * 2.5;
  const isBlink = time % 3.7 < 0.13;
  const mouthHeight = 2 + mouthOpen * 14;
  const mouthWidth = 13 - mouthOpen * 3;
  const lipColor = isFemale ? '#c9606f' : '#b5656a';

  ctx.save();
  ctx.translate(cx, by);
  ctx.scale(u, u);

  // Suit / Blazer Body
  const suitGrad = ctx.createLinearGradient(-110, -84, 110, 0);
  suitGrad.addColorStop(0, shadeColor(suitColor, 0.18));
  suitGrad.addColorStop(1, shadeColor(suitColor, -0.22));
  ctx.fillStyle = suitGrad;
  ctx.beginPath();
  ctx.moveTo(-110, 0);
  ctx.bezierCurveTo(-112, -52, -92, -74, -46, -84);
  ctx.lineTo(46, -84);
  ctx.bezierCurveTo(92, -74, 112, -52, 110, 0);
  ctx.closePath();
  ctx.fill();

  // White shirt collar
  ctx.fillStyle = '#f4f6f8';
  ctx.beginPath();
  ctx.moveTo(-27, -85);
  ctx.lineTo(27, -85);
  ctx.lineTo(0, -28);
  ctx.closePath();
  ctx.fill();

  // Tie (male) or necklace (female)
  if (!isFemale) {
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(-7, -80);
    ctx.lineTo(7, -80);
    ctx.lineTo(11, -34);
    ctx.lineTo(0, -22);
    ctx.lineTo(-11, -34);
    ctx.closePath();
    ctx.fill();
  }

  // Lapels
  ctx.fillStyle = shadeColor(suitColor, -0.08);
  ctx.strokeStyle = shadeColor(suitColor, 0.3);
  ctx.lineWidth = 2;
  [-1, 1].forEach((q) => {
    ctx.beginPath();
    ctx.moveTo(q * 44, -85);
    ctx.lineTo(q * 27, -85);
    ctx.lineTo(0, -28);
    ctx.lineTo(q * 8, -12);
    ctx.lineTo(q * 52, -40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Head container with head rotation & bobbing
  ctx.translate(0, -90);
  ctx.rotate(sway);
  ctx.translate(0, bob);

  // Neck
  if (!isHijab) {
    ctx.fillStyle = shadeColor(skin, -0.1);
    ctx.fillRect(-17, -12, 34, 40);
  }

  // Ears
  if (!isHijab && ty !== 'f3') {
    ctx.fillStyle = skin;
    [-1, 1].forEach((q) => {
      ctx.beginPath();
      ctx.ellipse(q * 47, -58, 8, 11, 0, 0, 7);
      ctx.fill();
    });
  }

  // Face Oval
  const faceGrad = ctx.createRadialGradient(-14, -84, 6, 0, -58, 66);
  faceGrad.addColorStop(0, shadeColor(skin, 0.28));
  faceGrad.addColorStop(1, shadeColor(skin, -0.1));
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.moveTo(0, -114);
  ctx.bezierCurveTo(34, -114, 48, -90, 47, -62);
  ctx.bezierCurveTo(46, -30, 26, -4, 0, -3);
  ctx.bezierCurveTo(-26, -4, -46, -30, -47, -62);
  ctx.bezierCurveTo(-48, -90, -34, -114, 0, -114);
  ctx.closePath();
  ctx.fill();

  // Hijab or Hair
  if (isHijab) {
    ctx.fillStyle = shadeColor(suitColor, 0.15);
    ctx.beginPath();
    ctx.ellipse(0, -70, 44, 36, 0, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(0, -62, 50, 46, 0, Math.PI, 0);
    ctx.fill();
  }

  // Eyebrows
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-31, -77 - mouthOpen * 2);
  ctx.quadraticCurveTo(-21, -84 - mouthOpen * 2, -10, -79 - mouthOpen * 2);
  ctx.moveTo(10, -79 - mouthOpen * 2);
  ctx.quadraticCurveTo(21, -84 - mouthOpen * 2, 31, -77 - mouthOpen * 2);
  ctx.stroke();

  // Eyes with blink animation
  [-1, 1].forEach((q) => {
    const ex = q * 20;
    const ey = -58;
    if (isBlink) {
      ctx.strokeStyle = '#2b1a14';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - 8, ey);
      ctx.quadraticCurveTo(ex, ey + 3, ex + 8, ey);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 9, 8, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#4a2810';
      ctx.beginPath();
      ctx.arc(ex, ey + 0.5, 5.8, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(ex, ey + 0.5, 2.8, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 2, ey - 2, 1.9, 0, 7);
      ctx.fill();
    }
  });

  // Nose
  ctx.strokeStyle = 'rgba(120,60,40,0.3)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-3, -46);
  ctx.quadraticCurveTo(-7, -39, 0, -38);
  ctx.quadraticCurveTo(7, -39, 3, -46);
  ctx.stroke();

  // Mouth animated by speech volume
  if (mouthHeight < 5) {
    ctx.fillStyle = lipColor;
    ctx.beginPath();
    ctx.moveTo(-13, -27);
    ctx.quadraticCurveTo(0, -20, 13, -27);
    ctx.quadraticCurveTo(0, -31, -13, -27);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -25, mouthWidth, mouthHeight, 0, 0, 7);
    ctx.clip();
    ctx.fillStyle = '#4a121c';
    ctx.fillRect(-20, -45, 40, 40);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-20, -25 - mouthHeight, 40, 4 + mouthHeight * 0.35);
    ctx.fillStyle = '#d9707e';
    ctx.beginPath();
    ctx.ellipse(0, -25 + mouthHeight * 0.9, mouthWidth * 0.65, mouthHeight * 0.6, 0, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = lipColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, -25, mouthWidth, mouthHeight, 0, 0, 7);
    ctx.stroke();
  }

  // Headset customer service (f3 or m3)
  if (ty === 'f3' || ty === 'm3') {
    ctx.strokeStyle = '#23262e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -62, 56, Math.PI * 1.04, Math.PI * 1.96);
    ctx.stroke();
    ctx.fillStyle = '#23262e';
    [-1, 1].forEach((q) => {
      ctx.beginPath();
      ctx.ellipse(q * 54, -56, 7, 13, 0, 0, 7);
      ctx.fill();
    });
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-54, -46);
    ctx.quadraticCurveTo(-48, -18, -22, -18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-21, -18, 4.5, 0, 7);
    ctx.fill();
  }

  // Glasses (m2)
  if (ty === 'm2') {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    [-22, 22].forEach((gx) => {
      ctx.beginPath();
      ctx.arc(gx, -58, 15, 0, 7);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(-7, -58);
    ctx.lineTo(7, -58);
    ctx.stroke();
  }

  ctx.restore();
}

// ----------------- Video Picture-in-Picture Overlay -----------------
export function drawVideoOverlay(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  time: number,
  dur: number
): void {
  const A = sc.ov;
  if (!A || !A.length) return;

  const n = Math.min(3, A.length);
  const modelIdx = sc.ovs || 0;
  const model = OVERLAY_MODELS[modelIdx] || OVERLAY_MODELS[0];
  const animType = model.anim;
  const P = OVERLAY_COORDS[model.pos] || OVERLAY_COORDS[0];
  const isStatic = dur > 1e5;
  const slot = isStatic ? 1 : dur / n;
  const showTime = isStatic ? 1 : Math.min(4.5, slot * 0.7);
  const curIdx = isStatic ? 0 : Math.min(n - 1, Math.floor(time / slot));
  const u = isStatic ? 1 : time - curIdx * slot - (slot - showTime) / 2;

  if (!isStatic && (u < 0 || u > showTime)) return;
  const asset = A[curIdx];
  if (!asset || !asset.el) return;

  const ei = isStatic ? 1 : ez(u / 0.5);
  const eo = isStatic ? 1 : ez((showTime - u) / 0.5);
  const m = Math.min(ei, eo);
  const a0 = getMediaAspect(asset.el);
  const bx = animType === 4 ? hug(a0, 150, 150) : hug(a0, 240, 170);
  const w = bx[0];
  const h = bx[1];
  const r = Math.hypot(w, h) / 2 + 8;
  let dx = 0;
  let dy = 0;
  let z = 1;
  let rot = 0;
  let a = m;
  const dir = P[0] < CANVAS_WIDTH / 2 ? -1 : 1;
  const sg = model.pos % 2 ? 1 : -1;

  if (animType === 1) {
    dx = dir * (1 - ei + (1 - eo)) * 260;
    a = Math.min(1, m * 3);
  } else if (animType === 2) {
    z = 0.45 + 0.55 * m;
  } else if (animType === 3) {
    dy = -(1 - ei) * 180;
    rot = sg * 0.05 + sg * (1 - ei) * 0.6;
    a = Math.min(1, m * 2.5);
  } else if (animType === 4) {
    z = 0.55 + 0.45 * m;
  }

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(P[0] + dx, P[1] + dy);
  ctx.rotate(rot);
  ctx.scale(z, z);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';

  if (animType === 4) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, 0, 7);
    ctx.clip();
    placeMedia(asset.el, -w / 2, -h / 2, w, h, 'pas', ctx);
  } else if (animType === 3) {
    ctx.fillRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 38);
    ctx.shadowBlur = 0;
    placeMedia(asset.el, -w / 2, -h / 2, w, h, 'pas', ctx);
  } else {
    ctx.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
    ctx.shadowBlur = 0;
    placeMedia(asset.el, -w / 2, -h / 2, w, h, 'pas', ctx);
  }
  ctx.restore();
}

// ----------------- Master Slide Canvas Drawing -----------------
export function drawScene(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  themeIndex: number,
  time: number,
  dur: number,
  av: AvatarConfig,
  photoImg: HTMLImageElement | null,
  customAvatarImg: HTMLImageElement | null,
  mouthOpen = 0,
  sceneIndex = 0,
  totalScenes = 1,
  subtitleMode: 'scene' | 'on' | 'off' = 'scene'
): void {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const theme = THEMES[themeIndex] || THEMES[0];
  const layout = sc.layout;

  // Background & Opening Preset Model
  let ink = theme.ink;
  let ac = theme.ac;

  if ((layout === 'pembuka' || layout === 'penutup') && sc.ps !== undefined && OPENING_PRESETS[sc.ps]) {
    const presetStyle = renderOpeningPreset(ctx, sc.ps, time, dur);
    ink = presetStyle.ink;
    ac = presetStyle.ac;
  } else {
    renderThemeBackground(ctx, theme);
  }

  // If scene has background media (image/video)
  if (sc.bg && sc.bg.el) {
    if (layout === 'video') {
      placeMedia(sc.bg.el, 0, 0, W, H, 'penuh', ctx);
    } else if (sc.fit === 'pas') {
      drawAmbientBackground(ctx, sc.bg.el);
      placeMedia(sc.bg.el, 0, 0, W, H, 'pas', ctx);
    } else {
      placeMedia(sc.bg.el, 0, 0, W, H, 'penuh', ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Slide content based on layout
  const alphaAnim = Math.min(1, time / 0.6);

  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = alphaAnim;

  if (layout === 'pembuka' || layout === 'penutup') {
    // Ultra-modern studio frosted glass card & typography
    const cardW = 980;
    const cardH = 360;
    const cardX = (W - cardW) / 2;
    const cardY = H * 0.24;

    ctx.save();
    // Translucent glass card
    ctx.fillStyle = 'rgba(10, 16, 28, 0.42)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    // Top Category Pill Tag / Badge
    const tagText = layout === 'pembuka' ? '• PRESENTASI STUDIO' : '• CINESLIDE STUDIO AI';
    setCanvasFont(ctx, 16, 700);
    const tagW = ctx.measureText(tagText).width + 32;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = ac;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - tagW / 2, cardY + 28, tagW, 30, 15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ac;
    ctx.textAlign = 'center';
    ctx.fillText(tagText, W / 2, cardY + 49);

    // Main Title with subtle shadow
    ctx.fillStyle = ink;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    setCanvasFont(ctx, 60, 800);
    ctx.fillText(sc.title || (layout === 'pembuka' ? 'Judul Presentasi' : 'Terima Kasih'), W / 2, cardY + 140);
    ctx.shadowBlur = 0;

    // Animated Underline Bar (Expanding from center)
    const lineW = 180 * Math.min(1, ez(time / 0.7));
    ctx.shadowColor = ac;
    ctx.shadowBlur = 12;
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.roundRect(W / 2 - lineW / 2, cardY + 168, lineW, 5, 2.5);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Body Text
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.9;
    setCanvasFont(ctx, 26, 500);
    const bodyLines = sc.body.split('\n').filter(Boolean);
    bodyLines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, cardY + 225 + idx * 40);
    });
    ctx.textAlign = 'left';
    ctx.restore();
  } else if (layout === 'judul') {
    ctx.fillStyle = ac;
    ctx.fillRect(80, 190, 110, 9);
    ctx.fillStyle = ink;
    setCanvasFont(ctx, 76, 800);
    let y = 300;
    const titleLines = wrapText(sc.title, 1050, ctx).slice(0, 3);
    titleLines.forEach((l) => {
      ctx.fillText(l, 80, y);
      y += 88;
    });

    setCanvasFont(ctx, 32, 400);
    ctx.globalAlpha = 0.85;
    const bullets = sc.body.split('\n').filter(Boolean);
    bullets.slice(0, 3).forEach((line, idx) => {
      ctx.fillText(line, 80, y - 10 + idx * 46);
    });
  } else if (layout === 'kutipan') {
    ctx.fillStyle = ac;
    setCanvasFont(ctx, 220, 800);
    ctx.fillText('\u201C', 70, 310);
    ctx.fillStyle = ink;
    setCanvasFont(ctx, 42, 600);
    let y = 250;
    const quoteLines = wrapText(sc.body, 980, ctx).slice(0, 5);
    quoteLines.forEach((l) => {
      ctx.fillText(l, 190, y);
      y += 60;
    });
    if (sc.title) {
      setCanvasFont(ctx, 28, 500);
      ctx.fillStyle = ac;
      ctx.fillText(`\u2014 ${sc.title}`, 190, y + 25);
    }
  } else if (layout === 'angka') {
    ctx.fillStyle = ac;
    ctx.fillRect(80, 70, 90, 8);
    ctx.fillStyle = ink;
    setCanvasFont(ctx, 52, 800);
    ctx.fillText(sc.title, 80, 140);

    const items = sc.body.split('\n').filter(Boolean).slice(0, 4);
    const n = Math.max(1, items.length);
    const cardW = (1120 - (n - 1) * 30) / n;
    items.forEach((item, i) => {
      const parts = item.split('|');
      const val = parts[0]?.trim() || '';
      const lbl = parts[1]?.trim() || '';
      const X = 80 + i * (cardW + 30);
      ctx.fillStyle = 'rgba(128,128,128,0.16)';
      ctx.fillRect(X, 220, cardW, 250);
      ctx.fillStyle = ac;
      ctx.fillRect(X, 220, cardW, 8);
      ctx.fillStyle = ink;
      setCanvasFont(ctx, n > 3 ? 56 : 76, 800);
      ctx.fillText(val, X + 24, 340);
      setCanvasFont(ctx, 24, 500);
      const descLines = wrapText(lbl, cardW - 48, ctx).slice(0, 3);
      descLines.forEach((l, j) => {
        ctx.fillText(l, X + 24, 390 + j * 32);
      });
    });
  } else if (layout === 'video') {
    // Title overlay on video for first 4.5 seconds
    if (sc.title && time < 4.5) {
      ctx.globalAlpha = Math.min(1, Math.max(0, 4.5 - time));
      setCanvasFont(ctx, 36, 700);
      const tw = Math.min(1000, ctx.measureText(sc.title).width);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(60, 60, tw + 50, 70);
      ctx.fillStyle = ac;
      ctx.fillRect(60, 60, 8, 70);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sc.title, 85, 108);
    }
    // Picture-in-picture video overlays
    drawVideoOverlay(ctx, sc, time, dur);
  } else {
    // Default bullet slide (poin, split, splitL, etc.)
    ctx.fillStyle = ac;
    ctx.fillRect(80, 70, 90, 8);
    ctx.fillStyle = ink;
    setCanvasFont(ctx, 52, 800);
    let y = 140;
    const titleLines = wrapText(sc.title, 1100, ctx).slice(0, 2);
    titleLines.forEach((l) => {
      ctx.fillText(l, 80, y);
      y += 62;
    });

    const items = sc.body.split('\n').filter(Boolean);
    setCanvasFont(ctx, 32, 500);
    items.slice(0, 7).forEach((item, idx) => {
      ctx.fillStyle = ac;
      ctx.beginPath();
      ctx.arc(90, y + 26, 6, 0, 7);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillText(item, 115, y + 36);
      y += 54;
    });
  }

  ctx.globalAlpha = 1;

  // Slide index / footer counter (except video / intro)
  if (layout !== 'video' && layout !== 'pembuka' && layout !== 'penutup') {
    setCanvasFont(ctx, 20, 600);
    ctx.fillStyle = ac;
    ctx.fillText(`${sceneIndex + 1} / ${totalScenes}`, W - 140, 60);
  }

  // Narration Subtitles
  const showSub = subtitleMode === 'on' || (subtitleMode === 'scene' && sc.cap);
  const activeNarration = sc.text || (sc.cues && sc.cues[0]?.text);
  if (showSub && activeNarration) {
    setCanvasFont(ctx, 28, 500);
    const boxX = 80;
    const boxW = W - 160;
    const lines = wrapText(activeNarration, boxW - 50, ctx).slice(0, 2);
    const boxH = lines.length * 38 + 24;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(boxX, H - 40 - boxH, boxW, boxH);
    ctx.fillStyle = '#ffffff';
    lines.forEach((l, i) => {
      ctx.fillText(l, boxX + 25, H - 40 - boxH + 34 + i * 38);
    });
  }

  // Presenter Avatar
  if (av.type && sc.av !== false) {
    const isLeft = av.pos === 'l';
    const avatarH = av.size === 's' ? 220 : av.size === 'l' ? 360 : 280;
    const avatarX = isLeft ? 130 : W - 150;

    if (av.type === 'foto' && photoImg) {
      drawPhotoAvatar(ctx, avatarX, H, avatarH, time, mouthOpen, av, photoImg);
      if (av.lb) {
        setCanvasFont(ctx, 14, 600);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(avatarX - 55, H - 32, 110, 22);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('Dibuat dengan AI', avatarX, H - 16);
        ctx.textAlign = 'left';
      }
    } else if (av.type === 'img' && customAvatarImg) {
      // Custom PNG avatar
      const asp = customAvatarImg.naturalWidth / customAvatarImg.naturalHeight || 1;
      const aw = avatarH * asp;
      ctx.drawImage(customAvatarImg, avatarX - aw / 2, H - avatarH, aw, avatarH);
      // Mouth overlay
      if (mouthOpen > 0.1) {
        const mx = avatarX - aw / 2 + (aw * av.mx) / 100;
        const my = H - avatarH + (avatarH * av.my) / 100;
        const mw = (aw * av.mw) / 100;
        ctx.fillStyle = '#4a121c';
        ctx.beginPath();
        ctx.ellipse(mx, my, mw * 0.5, mw * 0.35 * mouthOpen, 0, 0, 7);
        ctx.fill();
      }
    } else if (av.type.startsWith('f') || av.type.startsWith('m')) {
      draw2DAvatar(ctx, avatarX, H, avatarH, av, time, mouthOpen, ac);
    }
  }

  // Bottom progress bar
  if (dur > 0 && dur < 1e5) {
    const prog = Math.min(1, Math.max(0, time / dur));
    ctx.fillStyle = ac;
    ctx.fillRect(0, H - 6, prog * W, 6);
  }
}
