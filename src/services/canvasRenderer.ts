import { Scene, AvatarConfig, ThemeConfig, PhotoAsset } from '../types';
import {
  THEMES,
  SCENE_CONFIGS,
  OPENING_PRESETS,
  PHOTO_PRESETS,
  OVERLAY_MODELS,
  OVERLAY_COORDS,
  SLIDE_IMAGE_MODELS,
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

// Reset shadow properties to prevent blurry ghosting/shadow leakage on text
export function resetShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
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

  // Base Gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, theme.bg);
  grad.addColorStop(1, theme.b2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const art = theme.art;
  if (!art) return;

  if (SCENE_CONFIGS[art]) {
    drawProceduralSky(ctx, SCENE_CONFIGS[art]);
    return;
  }

  ctx.save();

  if (art === 'mount') {
    ctx.fillStyle = theme.b2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H * 0.65);
    ctx.lineTo(W * 0.25, H * 0.4);
    ctx.lineTo(W * 0.5, H * 0.68);
    ctx.lineTo(W * 0.75, H * 0.35);
    ctx.lineTo(W, H * 0.6);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (art === 'circ') {
    const circles = [
      [W * 0.85, H * 0.2, 180, 0.25],
      [W * 0.15, H * 0.8, 220, 0.2],
      [W * 0.7, H * 0.85, 140, 0.18],
    ];
    circles.forEach(([cx, cy, r, a]) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = theme.ac;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  } else if (art === 'line') {
    ctx.strokeStyle = theme.ac;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 110);
      ctx.lineTo(W * 0.6, i * 110 + 200);
      ctx.lineTo(W, i * 110 + 50);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (art === 'sun') {
    const sunGrad = ctx.createRadialGradient(W * 0.8, H * 0.25, 20, W * 0.8, H * 0.25, 300);
    sunGrad.addColorStop(0, `${theme.ac}bb`);
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, W, H);
  } else if (art === 'dot') {
    ctx.fillStyle = theme.ac;
    ctx.globalAlpha = 0.12;
    for (let x = 40; x < W; x += 60) {
      for (let y = 40; y < H; y += 60) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (art === 'tri') {
    ctx.strokeStyle = theme.ac;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.18;
    for (let x = 0; x < W + 200; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 80, H);
      ctx.lineTo(x + 80, H);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (art === 'grid') {
    ctx.strokeStyle = theme.ac;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    for (let x = 0; x < W; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 70) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (art === 'ring') {
    ctx.strokeStyle = theme.ac;
    ctx.globalAlpha = 0.3;
    for (let r = 80; r <= 360; r += 70) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.28, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (art === 'topo') {
    ctx.strokeStyle = theme.ac;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.22;
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(W * 0.2, H * 0.7, i * 75, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (art === 'boke') {
    const bokehs = [
      [W * 0.2, H * 0.3, 90],
      [W * 0.5, H * 0.7, 140],
      [W * 0.8, H * 0.4, 110],
      [W * 0.85, H * 0.8, 70],
    ];
    bokehs.forEach(([bx, by, br]) => {
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, `${theme.ac}66`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
  } else if (art === 'hexa') {
    ctx.strokeStyle = theme.ac;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.14;
    const r = 35;
    for (let y = 0; y < H + 50; y += r * 1.5) {
      for (let x = 0; x < W + 50; x += r * Math.sqrt(3)) {
        const cx = x + (Math.floor(y / (r * 1.5)) % 2 ? (r * Math.sqrt(3)) / 2 : 0);
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (Math.PI / 3) * a;
          const px = cx + r * Math.cos(angle);
          const py = y + r * Math.sin(angle);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  } else {
    // Default studio ambient corner glow & slash accents for all other themes
    const g = ctx.createRadialGradient(W * 0.85, H * 0.15, 10, W * 0.85, H * 0.15, 450);
    g.addColorStop(0, `${theme.ac}44`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = theme.ac;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.85);
    ctx.lineTo(W * 0.35, H);
    ctx.moveTo(W * 0.7, 0);
    ctx.lineTo(W, H * 0.4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
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

// ----------------- 35 Slide Image Insertion Models -----------------
export function drawSlideImages(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  time: number,
  accentColor: string
): void {
  const A = sc.ov;
  if (!A || !A.length) return;

  const count = Math.min(3, A.length);
  const modelIdx = sc.ovs || 0;
  const model = SLIDE_IMAGE_MODELS[modelIdx] || SLIDE_IMAGE_MODELS[0];
  const frameStyle = model.frameStyle;
  const arrStyle = model.arrStyle;

  // Determine positions based on arrangement style
  const coords: Array<{ x: number; y: number; w: number; h: number; rot: number }> = [];

  if (arrStyle === 0) {
    // Right Column
    const baseX = 980;
    const startY = count === 1 ? 360 : count === 2 ? 260 : 180;
    const gapY = count === 3 ? 170 : 200;
    for (let i = 0; i < count; i++) {
      coords.push({ x: baseX, y: startY + i * gapY, w: 230, h: 150, rot: (i % 2 === 0 ? -1 : 1) * 0.03 });
    }
  } else if (arrStyle === 1) {
    // Left Column
    const baseX = 200;
    const startY = count === 1 ? 360 : count === 2 ? 260 : 180;
    const gapY = count === 3 ? 170 : 200;
    for (let i = 0; i < count; i++) {
      coords.push({ x: baseX, y: startY + i * gapY, w: 230, h: 150, rot: (i % 2 === 0 ? 1 : -1) * 0.03 });
    }
  } else if (arrStyle === 2) {
    // Bottom Row
    const baseY = 560;
    const startX = count === 1 ? 640 : count === 2 ? 460 : 320;
    const gapX = count === 3 ? 320 : 360;
    for (let i = 0; i < count; i++) {
      coords.push({ x: startX + i * gapX, y: baseY, w: 220, h: 140, rot: (i - 1) * 0.04 });
    }
  } else if (arrStyle === 3) {
    // Top Banner
    const baseY = 140;
    const startX = count === 1 ? 640 : count === 2 ? 460 : 320;
    const gapX = count === 3 ? 320 : 360;
    for (let i = 0; i < count; i++) {
      coords.push({ x: startX + i * gapX, y: baseY, w: 220, h: 130, rot: (1 - i) * 0.03 });
    }
  } else {
    // Diagonal Floating
    const points = [
      { x: 960, y: 220, w: 230, h: 150, rot: -0.06 },
      { x: 220, y: 460, w: 220, h: 145, rot: 0.05 },
      { x: 920, y: 520, w: 210, h: 140, rot: -0.04 },
    ];
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const floatY = Math.sin(time * 1.6 + i * 2) * 8;
      coords.push({ x: p.x, y: p.y + floatY, w: p.w, h: p.h, rot: p.rot });
    }
  }

  // Draw each inserted image
  coords.forEach((pos, i) => {
    const asset = A[i];
    if (!asset || !asset.el) return;

    const { x, y, w, h, rot } = pos;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // Frame Style 0: Glassmorphism Card
    if (frameStyle === 0) {
      ctx.fillStyle = 'rgba(10, 16, 28, 0.55)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 5;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 16);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 12);
      ctx.clip();
      placeMedia(asset.el, -w / 2, -h / 2, w, h, 'penuh', ctx);
      ctx.restore();
    }
    // Frame Style 1: Polaroid Klasik
    else if (frameStyle === 1) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 42, 8);
      ctx.fill();

      // Tape at top
      ctx.fillStyle = 'rgba(235, 220, 180, 0.7)';
      ctx.fillRect(-20, -h / 2 - 18, 40, 12);

      ctx.shadowBlur = 0;
      placeMedia(asset.el, -w / 2, -h / 2, w, h, 'penuh', ctx);
    }
    // Frame Style 2: Lingkaran Lensa
    else if (frameStyle === 2) {
      const radius = Math.min(w, h) / 2;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.clip();
      placeMedia(asset.el, -radius, -radius, radius * 2, radius * 2, 'penuh', ctx);
      ctx.restore();
    }
    // Frame Style 3: Sinematik 16:9
    else if (frameStyle === 3) {
      ctx.fillStyle = '#0b0f17';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 8);
      ctx.clip();
      placeMedia(asset.el, -w / 2, -h / 2, w, h, 'penuh', ctx);
      ctx.restore();
    }
    // Frame Style 4: Tumpukan Melayang
    else if (frameStyle === 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-w / 2 + 10, -h / 2 + 10, w, h);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 12;
      ctx.fillRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);

      ctx.shadowBlur = 0;
      placeMedia(asset.el, -w / 2, -h / 2, w, h, 'penuh', ctx);
    }
    // Frame Style 5: Bingkai Emas (Gold Luxury)
    else if (frameStyle === 5) {
      const goldGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      goldGrad.addColorStop(0, '#e0b44c');
      goldGrad.addColorStop(0.5, '#fff3a8');
      goldGrad.addColorStop(1, '#b38224');

      ctx.fillStyle = goldGrad;
      ctx.shadowColor = 'rgba(224, 180, 76, 0.4)';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 12);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 8);
      ctx.clip();
      placeMedia(asset.el, -w / 2, -h / 2, w, h, 'penuh', ctx);
      ctx.restore();
    }
    // Frame Style 6: Polos Minimal
    else {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 14);
      ctx.clip();
      placeMedia(asset.el, -w / 2, -h / 2, w, h, 'penuh', ctx);
      ctx.restore();
    }

    ctx.restore();
  });
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
    const userInk = sc.textColor || ink;

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

    // Main Title with crisp rendering (reset shadow to prevent ghosting)
    resetShadow(ctx);
    ctx.fillStyle = userInk;
    setCanvasFont(ctx, 60, 800);
    ctx.fillText(sc.title || (layout === 'pembuka' ? 'Judul Presentasi' : 'Terima Kasih'), W / 2, cardY + 140);

    // Animated Underline Bar (Expanding from center)
    const lineW = 180 * Math.min(1, ez(time / 0.7));
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.roundRect(W / 2 - lineW / 2, cardY + 168, lineW, 5, 2.5);
    ctx.fill();

    // Body Text
    resetShadow(ctx);
    ctx.fillStyle = userInk;
    ctx.globalAlpha = 0.95;
    setCanvasFont(ctx, 26, 500);
    const bodyLines = sc.body.split('\n').filter(Boolean);
    bodyLines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, cardY + 225 + idx * 40);
    });
    ctx.textAlign = 'left';
    ctx.restore();
  } else if (layout === 'judul') {
    const userInk = sc.textColor || ink;
    resetShadow(ctx);
    ctx.fillStyle = ac;
    ctx.fillRect(80, 190, 110, 9);
    ctx.fillStyle = userInk;
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
    const userInk = sc.textColor || ink;
    resetShadow(ctx);
    ctx.fillStyle = ac;
    setCanvasFont(ctx, 220, 800);
    ctx.fillText('\u201C', 70, 310);
    ctx.fillStyle = userInk;
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
    const userInk = sc.textColor || ink;
    resetShadow(ctx);
    ctx.fillStyle = ac;
    ctx.fillRect(80, 70, 90, 8);
    ctx.fillStyle = userInk;
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
      ctx.fillStyle = userInk;
      setCanvasFont(ctx, n > 3 ? 56 : 76, 800);
      ctx.fillText(val, X + 24, 340);
      setCanvasFont(ctx, 24, 500);
      const descLines = wrapText(lbl, cardW - 48, ctx).slice(0, 3);
      descLines.forEach((l, j) => {
        ctx.fillText(l, X + 24, 390 + j * 32);
      });
    });
  } else if (layout === 'video') {
    resetShadow(ctx);
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
    // PowerPoint-style Slide Content Layout
    const userInk = sc.textColor || ink;
    const fontMult = sc.fontSize || 1.0;
    const fontWeight = sc.fontWeight || 500;
    const lineHeightMult = sc.lineHeight || 1.3;
    const numCols = sc.cols || 1;

    resetShadow(ctx);

    // Optional Container Card Box
    if (sc.boxBg && sc.boxBg !== 'none') {
      ctx.save();
      if (sc.boxBg === 'glass') {
        ctx.fillStyle = 'rgba(10, 16, 28, 0.45)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      } else if (sc.boxBg === 'dark') {
        ctx.fillStyle = 'rgba(5, 8, 15, 0.85)';
        ctx.strokeStyle = ac;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      }
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(60, 50, W - 120, H - 100, 20);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Title
    resetShadow(ctx);
    ctx.fillStyle = ac;
    ctx.fillRect(80, 70, 90, 8);
    ctx.fillStyle = userInk;
    const titleSize = Math.round(52 * fontMult);
    setCanvasFont(ctx, titleSize, Math.max(700, fontWeight));

    let y = 140;
    const titleLines = wrapText(sc.title, 1100, ctx).slice(0, 2);
    titleLines.forEach((l) => {
      ctx.fillText(l, 80, y);
      y += titleSize * 1.2;
    });

    const items = sc.body.split('\n').filter(Boolean);
    const bodySize = Math.max(16, Math.min(36, Math.round(32 * fontMult * (items.length > 8 ? 0.75 : 1.0))));
    setCanvasFont(ctx, bodySize, fontWeight);

    const lineGap = Math.round(bodySize * lineHeightMult * 1.25);

    if (numCols > 1 && items.length > 1) {
      // Multi-column layout
      const colWidth = (W - 160 - (numCols - 1) * 40) / numCols;
      const itemsPerCol = Math.ceil(items.length / numCols);

      items.forEach((item, idx) => {
        const colIdx = Math.floor(idx / itemsPerCol);
        const rowIdx = idx % itemsPerCol;
        const colX = 80 + colIdx * (colWidth + 40);
        const itemY = y + rowIdx * lineGap;

        ctx.fillStyle = ac;
        ctx.beginPath();
        ctx.arc(colX + 10, itemY - bodySize * 0.3, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = userInk;
        const wrapped = wrapText(item, colWidth - 30, ctx);
        wrapped.forEach((wl, wIdx) => {
          ctx.fillText(wl, colX + 25, itemY + wIdx * (bodySize * 1.2));
        });
      });
    } else {
      // Single column layout with auto-fit
      items.forEach((item) => {
        const wrapped = wrapText(item, 1050, ctx);
        wrapped.forEach((wl, wIdx) => {
          if (wIdx === 0) {
            ctx.fillStyle = ac;
            ctx.beginPath();
            ctx.arc(90, y - bodySize * 0.3, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = userInk;
          ctx.fillText(wl, 115, y);
          y += lineGap;
        });
      });
    }
  }

  // Draw Inserted Slide Images (Up to 3 images with 35 Models)
  drawSlideImages(ctx, sc, time, ac);

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

  // CapCut / TikTok / Vameo Jedag-Jedug Viral Beat Animations
  applyJedagJedugEffect(ctx, sc, time, W, H);
}

// CapCut / TikTok Jedag-Jedug Beat Effect Renderer
function applyJedagJedugEffect(
  ctx: CanvasRenderingContext2D,
  sc: Scene,
  time: number,
  W: number,
  H: number
): void {
  if (!sc.jj) return;
  const style = sc.jjStyle || 0;
  const beatPeriod = 0.45; // ~133 BPM
  const phase = (time % beatPeriod) / beatPeriod;
  const beatIntensity = Math.pow(Math.max(0, 1 - phase * 3.5), 2);

  if (style === 0) {
    // 0: Beat Flash White (CapCut Flash)
    if (beatIntensity > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${beatIntensity * 0.75})`;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (style === 1) {
    // 1: Zoom Bounce Beat
    if (beatIntensity > 0.05) {
      ctx.fillStyle = `rgba(224, 180, 76, ${beatIntensity * 0.15})`;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (style === 2) {
    // 2: RGB Glitch Shake (Vameo Style)
    if (beatIntensity > 0.1) {
      ctx.fillStyle = `rgba(0, 245, 212, ${beatIntensity * 0.25})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(241, 91, 181, ${beatIntensity * 0.25})`;
      ctx.fillRect((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 10, W, H);
    }
  } else if (style === 3) {
    // 3: Strobe Light Disco
    if (beatIntensity > 0.2) {
      ctx.fillStyle = phase < 0.25 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, W, H);
    }
  } else if (style === 4) {
    // 4: Heartbeat Pulse
    const heartBeat = Math.sin(time * 12) * Math.exp(-3 * (phase % 0.5));
    if (heartBeat > 0.3) {
      ctx.fillStyle = `rgba(230, 57, 70, ${heartBeat * 0.2})`;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (style === 5) {
    // 5: Neon Flicker Party
    if (beatIntensity > 0.05) {
      const colors = ['#00f5d4', '#f15bb5', '#fee440', '#3a86ff'];
      const c = colors[Math.floor((time * 8) % colors.length)];
      ctx.strokeStyle = c;
      ctx.lineWidth = 12 * beatIntensity;
      ctx.strokeRect(6, 6, W - 12, H - 12);
    }
  }
}

// ----------------- 35 Slide Transition Engine -----------------
export function drawSlideTransition(
  ctx: CanvasRenderingContext2D,
  prevCanvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  progress: number,
  trModeIndex = 0
): void {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const p = Math.max(0, Math.min(1, progress));

  ctx.clearRect(0, 0, W, H);

  switch (trModeIndex) {
    case 1: { // Kilat Flash Jedag-Jedug
      ctx.drawImage(p < 0.5 ? prevCanvas : nextCanvas, 0, 0);
      const flash = Math.sin(p * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.9})`;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case 2: { // Zoom Bounce Beat JJ
      const scale = 1 + Math.sin(p * Math.PI) * 0.3;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(p < 0.5 ? prevCanvas : nextCanvas, -W / 2, -H / 2);
      ctx.restore();
      break;
    }
    case 3: { // RGB Glitch Shake Beat
      const shift = Math.sin(p * Math.PI) * 30;
      ctx.drawImage(prevCanvas, -shift * (1 - p), 0);
      ctx.globalAlpha = p;
      ctx.drawImage(nextCanvas, shift * p, 0);
      ctx.globalAlpha = 1;
      break;
    }
    case 4: { // Push Left
      ctx.drawImage(prevCanvas, -p * W, 0);
      ctx.drawImage(nextCanvas, (1 - p) * W, 0);
      break;
    }
    case 5: { // Push Right
      ctx.drawImage(prevCanvas, p * W, 0);
      ctx.drawImage(nextCanvas, -(1 - p) * W, 0);
      break;
    }
    case 6: { // Push Up
      ctx.drawImage(prevCanvas, 0, -p * H);
      ctx.drawImage(nextCanvas, 0, (1 - p) * H);
      break;
    }
    case 7: { // Push Down
      ctx.drawImage(prevCanvas, 0, p * H);
      ctx.drawImage(nextCanvas, 0, -(1 - p) * H);
      break;
    }
    case 8: { // Wipe Left
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect((1 - p) * W, 0, p * W, H);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 9: { // Wipe Right
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, p * W, H);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 10: { // Circle Iris In
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, (p * Math.hypot(W, H)) / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 11: { // Circle Iris Out
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ((1 - p) * Math.hypot(W, H)) / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 12: { // Split Horizontal
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      const midY = H / 2;
      const hHalf = (p * H) / 2;
      ctx.beginPath();
      ctx.rect(0, midY - hHalf, W, hHalf * 2);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 13: { // Split Vertical
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      const midX = W / 2;
      const wHalf = (p * W) / 2;
      ctx.beginPath();
      ctx.rect(midX - wHalf, 0, wHalf * 2, H);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 14: { // 3D Card Flip X
      const rot = p * Math.PI;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(Math.cos(rot), 1);
      ctx.drawImage(rot < Math.PI / 2 ? prevCanvas : nextCanvas, -W / 2, -H / 2);
      ctx.restore();
      break;
    }
    case 15: { // 3D Card Flip Y
      const rot = p * Math.PI;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(1, Math.cos(rot));
      ctx.drawImage(rot < Math.PI / 2 ? prevCanvas : nextCanvas, -W / 2, -H / 2);
      ctx.restore();
      break;
    }
    case 16: { // Cube Rotate 3D
      ctx.save();
      ctx.drawImage(prevCanvas, -p * W * 0.7, 0, W * (1 - p * 0.3), H);
      ctx.drawImage(nextCanvas, (1 - p) * W * 0.7, 0, W * (0.7 + p * 0.3), H);
      ctx.restore();
      break;
    }
    case 17: { // Zoom In Burst
      const scaleNext = 0.5 + p * 0.5;
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.globalAlpha = p;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(scaleNext, scaleNext);
      ctx.drawImage(nextCanvas, -W / 2, -H / 2);
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    case 18: { // Zoom Out Blur
      const scalePrev = 1 + p * 0.4;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(scalePrev, scalePrev);
      ctx.drawImage(prevCanvas, -W / 2, -H / 2);
      ctx.restore();
      ctx.globalAlpha = p;
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.globalAlpha = 1;
      break;
    }
    case 19: { // Spin 180
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(p * Math.PI);
      const s = 1 - Math.sin(p * Math.PI) * 0.4;
      ctx.scale(s, s);
      ctx.drawImage(p < 0.5 ? prevCanvas : nextCanvas, -W / 2, -H / 2);
      ctx.restore();
      break;
    }
    case 20: { // Spin 360
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(p * Math.PI * 2);
      const s = 1 - Math.sin(p * Math.PI) * 0.3;
      ctx.scale(s, s);
      ctx.drawImage(p < 0.5 ? prevCanvas : nextCanvas, -W / 2, -H / 2);
      ctx.restore();
      break;
    }
    case 21: { // Light Leak Flash
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.globalAlpha = p;
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.globalAlpha = 1;
      const leakGrad = ctx.createRadialGradient(W * p, H / 2, 50, W * p, H / 2, 400);
      leakGrad.addColorStop(0, 'rgba(255, 215, 0, 0.85)');
      leakGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
      ctx.fillStyle = leakGrad;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case 22: { // Whip Pan Left
      const offset = Math.pow(p, 2) * W;
      ctx.drawImage(prevCanvas, -offset, 0);
      ctx.drawImage(nextCanvas, W - offset, 0);
      break;
    }
    case 23: { // Whip Pan Right
      const offset = Math.pow(p, 2) * W;
      ctx.drawImage(prevCanvas, offset, 0);
      ctx.drawImage(nextCanvas, -W + offset, 0);
      break;
    }
    case 24: { // Glitch Slice Distortion
      ctx.drawImage(p < 0.5 ? prevCanvas : nextCanvas, 0, 0);
      const numSlices = 10;
      const sliceH = H / numSlices;
      for (let i = 0; i < numSlices; i++) {
        const dx = (Math.random() - 0.5) * 60 * Math.sin(p * Math.PI);
        ctx.drawImage(p < 0.5 ? prevCanvas : nextCanvas, 0, i * sliceH, W, sliceH, dx, i * sliceH, W, sliceH);
      }
      break;
    }
    case 25: { // Wave Distortion
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.globalAlpha = p;
      const waveOffset = Math.sin(p * Math.PI * 4) * 20;
      ctx.drawImage(nextCanvas, waveOffset, 0);
      ctx.globalAlpha = 1;
      break;
    }
    case 26: { // Horizontal Blinds
      ctx.drawImage(prevCanvas, 0, 0);
      const blinds = 8;
      const bH = H / blinds;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < blinds; i++) {
        ctx.rect(0, i * bH, W, bH * p);
      }
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 27: { // Vertical Blinds
      ctx.drawImage(prevCanvas, 0, 0);
      const blinds = 12;
      const bW = W / blinds;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < blinds; i++) {
        ctx.rect(i * bW, 0, bW * p, H);
      }
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 28: { // Radial Clock Wipe
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W / 2, H / 2);
      ctx.arc(W / 2, H / 2, Math.hypot(W, H), -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.lineTo(W / 2, H / 2);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 29: { // Diagonal Slant Wipe
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(p * (W + H), 0);
      ctx.lineTo(p * (W + H) - H, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 30: { // Checkerboard Grid
      ctx.drawImage(prevCanvas, 0, 0);
      const rows = 6;
      const cols = 10;
      const cW = W / cols;
      const rH = H / rows;
      ctx.save();
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const szW = cW * p;
          const szH = rH * p;
          ctx.rect(c * cW + (cW - szW) / 2, r * rH + (rH - szH) / 2, szW, szH);
        }
      }
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 31: { // Heart Shape Bloom
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      const hSize = p * W * 0.8;
      const cx = W / 2;
      const cy = H / 2;
      ctx.moveTo(cx, cy - hSize * 0.3);
      ctx.bezierCurveTo(cx - hSize * 0.5, cy - hSize * 0.8, cx - hSize, cy - hSize * 0.1, cx, cy + hSize * 0.6);
      ctx.bezierCurveTo(cx + hSize, cy - hSize * 0.1, cx + hSize * 0.5, cy - hSize * 0.8, cx, cy - hSize * 0.3);
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 32: { // Star Burst Zoom
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.save();
      ctx.beginPath();
      const outerR = p * W * 0.9;
      const innerR = outerR * 0.5;
      const points = 5;
      const cx = W / 2;
      const cy = H / 2;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.restore();
      break;
    }
    case 33: { // Neon Glow Pulse Flash
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.globalAlpha = p;
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.globalAlpha = 1;
      const nGlow = Math.sin(p * Math.PI);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = nGlow * 30;
      ctx.strokeRect(0, 0, W, H);
      break;
    }
    case 34: default: { // TikTok Beat Zoom Shake
      const shakeX = Math.sin(p * Math.PI * 10) * 15;
      const shakeY = Math.cos(p * Math.PI * 10) * 10;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.globalAlpha = p;
      ctx.drawImage(nextCanvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.restore();
      break;
    }
  }
}

