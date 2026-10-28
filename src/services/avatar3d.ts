import * as THREE from 'three';
import { AvatarConfig } from '../types';

export interface ThreeAvatarContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  group: THREE.Group;
  geometry: THREE.SphereGeometry;
  origPositions: Float32Array;
  material: THREE.MeshLambertMaterial;
  mouthCavity: THREE.Mesh;
  teeth: THREE.Mesh;
  cacheKey: string;
  skinColor: string;
  texture?: THREE.Texture;
}

const CAMERA_DISTANCE = 10.2;
let globalThreeContext: ThreeAvatarContext | null = null;

export function initThreeAvatar(): ThreeAvatarContext | null {
  if (globalThreeContext) return globalThreeContext;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(512, 512);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(14, 1, 0.1, 50);
    camera.position.set(0, 0, CAMERA_DISTANCE);

    scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.28);
    dirLight.position.set(-2, 3, 5);
    scene.add(dirLight);

    const geometry = new THREE.SphereGeometry(1, 56, 56);
    const origPositions = new Float32Array(geometry.attributes.position.array);

    const material = new THREE.MeshLambertMaterial({ transparent: true });
    const group = new THREE.Group();
    const headMesh = new THREE.Mesh(geometry, material);

    const mouthCavity = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({ color: 0x2a0a10 })
    );

    const teeth = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xf6f1ec })
    );

    group.add(headMesh);
    group.add(mouthCavity);
    group.add(teeth);
    scene.add(group);

    globalThreeContext = {
      renderer,
      scene,
      camera,
      group,
      geometry,
      origPositions,
      material,
      mouthCavity,
      teeth,
      cacheKey: '',
      skinColor: '#e8b88f',
    };
    return globalThreeContext;
  } catch (e) {
    console.error('Failed to initialize Three.js 3D avatar:', e);
    return null;
  }
}

export function sampleSkinColor(imgEl: HTMLImageElement, av: AvatarConfig): string {
  try {
    const S = imgEl.naturalWidth;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const g = c.getContext('2d');
    if (!g) return '#e8b88f';
    g.drawImage(imgEl, 0, 0);
    const f = av.fr || 0;
    const hx = 0.55 * av.sx;
    const hy = -0.1;
    const u = 0.5 + av.fx + (hx * Math.cos(f) - hy * Math.sin(f)) * 0.5 * av.fz;
    const v = 0.5 + av.fy + (hx * Math.sin(f) + hy * Math.cos(f)) * 0.5 * av.fz;
    const px = Math.round(u * S);
    const py = Math.round((1 - v) * S);
    const d = g.getImageData(Math.max(0, px - 4), Math.max(0, py - 4), 8, 8).data;
    let r = 0, gg = 0, b = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
    }
    return `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(b / n)})`;
  } catch {
    return '#e8b88f';
  }
}

export function updateThreeAvatarMesh(photoImg: HTMLImageElement, av: AvatarConfig): boolean {
  const ctx = initThreeAvatar();
  if (!ctx || !photoImg.naturalWidth) return false;

  const key = [photoImg.src.length, av.fz, av.fx, av.fy, av.sx, av.fr].join(',');
  if (ctx.cacheKey === key) return true;

  if (!ctx.texture || ctx.texture.image !== photoImg) {
    ctx.texture = new THREE.Texture(photoImg);
    ctx.texture.needsUpdate = true;
    ctx.material.map = ctx.texture;
  }

  const P = ctx.geometry.attributes.position as THREE.BufferAttribute;
  const uv = ctx.geometry.attributes.uv as THREE.BufferAttribute;
  const O = ctx.origPositions;
  const Z = av.fz;
  const sx = av.sx;
  const sz = Math.max(0.7, sx * 1.03);
  const f = av.fr || 0;
  const c = Math.cos(f);
  const sn = Math.sin(f);

  for (let i = 0; i < P.count; i++) {
    const x0 = O[i * 3] * sx;
    const y0 = O[i * 3 + 1];
    P.setX(i, x0);
    P.setZ(i, O[i * 3 + 2] * sz);
    uv.setXY(
      i,
      0.5 + av.fx + (x0 * c - y0 * sn) * 0.5 * Z,
      0.5 + av.fy + (x0 * sn + y0 * c) * 0.5 * Z
    );
  }
  P.needsUpdate = true;
  uv.needsUpdate = true;
  ctx.geometry.computeVertexNormals();

  // Alpha mask canvas for smooth head border blending
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = 256;
  alphaCanvas.height = 256;
  const ag = alphaCanvas.getContext('2d');
  if (ag) {
    const R = 0.5 * Z * 256;
    const gr = ag.createRadialGradient(0, 0, R * 0.72, 0, 0, R);
    gr.addColorStop(0, '#fff');
    gr.addColorStop(1, '#000');
    ag.fillStyle = '#000';
    ag.fillRect(0, 0, 256, 256);
    ag.save();
    ag.translate((0.5 + av.fx) * 256, (1 - (0.5 + av.fy)) * 256);
    ag.rotate(-f);
    ag.scale(sx, 1);
    ag.fillStyle = gr;
    ag.fillRect(-1024, -1024, 2048, 2048);
    ag.restore();
    ctx.material.alphaMap = new THREE.CanvasTexture(alphaCanvas);
    ctx.material.needsUpdate = true;
  }

  ctx.skinColor = sampleSkinColor(photoImg, av);
  ctx.cacheKey = key;
  return true;
}

export function drawPhotoAvatar(
  ctx2d: CanvasRenderingContext2D,
  cx: number,
  by: number,
  hh: number,
  time: number,
  mouthOpen: number,
  av: AvatarConfig,
  photoImg: HTMLImageElement | null,
  showGuideMarks = false
): void {
  const u = hh / 280;
  const S = hh * 0.495;
  const hcy = by - hh * 0.529;
  const unit = S / 2.505;
  const sx = av.sx;
  const sz = Math.max(0.7, sx * 1.03);

  const t3 = initThreeAvatar();
  const ok = photoImg ? updateThreeAvatarMesh(photoImg, av) : false;

  ctx2d.fillStyle = ok && t3 ? t3.skinColor : '#e8b88f';
  ctx2d.fillRect(cx - 17 * u, by - 102 * u, 34 * u, 44 * u);

  if (ok && t3) {
    const P = t3.geometry.attributes.position as THREE.BufferAttribute;
    const O = t3.origPositions;
    const jy = av.jy;
    const mx = av.jx;
    const my = jy - mouthOpen * 0.06;
    const zz = sz * Math.sqrt(Math.max(0, 1 - (mx / sx) * (mx / sx) - my * my)) + 0.012;
    const mwid = av.jw * 0.5 * (1 - mouthOpen * 0.1);
    const mh = Math.max(0.001, mouthOpen * 0.16);

    for (let i = 0; i < P.count; i++) {
      const y0 = O[i * 3 + 1];
      let w = Math.max(0, Math.min(1, (jy - y0) / 0.35));
      w = w * w * (3 - 2 * w);
      P.setY(i, y0 - mouthOpen * 0.17 * w);
    }
    P.needsUpdate = true;

    t3.mouthCavity.visible = mouthOpen > 0.08;
    t3.mouthCavity.position.set(mx, my, zz);
    t3.mouthCavity.scale.set(mwid, mh * 0.9, 1);

    t3.teeth.visible = mouthOpen > 0.2;
    t3.teeth.position.set(mx, my + mh * 0.9 - 0.02, zz + 0.003);
    t3.teeth.scale.set(mwid * 1.6, 0.045 + mouthOpen * 0.03, 1);

    t3.group.rotation.y = Math.sin(time * 0.9) * 0.07 + mouthOpen * Math.sin(time * 5) * 0.025;
    t3.group.rotation.x = Math.sin(time * 1.3) * 0.025 + mouthOpen * 0.03 * Math.sin(time * 7);
    t3.group.position.y = Math.sin(time * 1.6) * 0.015 - mouthOpen * 0.02;

    t3.renderer.render(t3.scene, t3.camera);
    ctx2d.drawImage(t3.renderer.domElement, cx - S / 2, hcy - S / 2, S, S);
  } else if (photoImg && photoImg.naturalWidth) {
    const Sq = (0.396 * hh) / av.fz;
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.ellipse(cx, hcy, 0.16 * hh, 0.198 * hh, 0, 0, 7);
    ctx2d.clip();
    ctx2d.drawImage(photoImg, cx - (0.5 + av.fx) * Sq, hcy - (0.5 - av.fy) * Sq, Sq, Sq);
    ctx2d.restore();
  }

  if (showGuideMarks) {
    const zm = sz * Math.sqrt(Math.max(0, 1 - (av.jx / sx) * (av.jx / sx) - av.jy * av.jy));
    const pf = CAMERA_DISTANCE / (CAMERA_DISTANCE - zm);
    ctx2d.save();
    ctx2d.strokeStyle = 'rgba(255, 70, 70, 0.95)';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([6, 5]);
    ctx2d.beginPath();
    ctx2d.ellipse(cx + av.jx * unit * pf, hcy - av.jy * unit * pf, av.jw * 0.5 * unit * pf, 0.07 * unit, 0, 0, 7);
    ctx2d.stroke();
    ctx2d.restore();
  }
}
