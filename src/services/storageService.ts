import { ProjectMetadata, ProjectData, Scene, AvatarConfig } from '../types';

const DB_NAME = 'studio-suara-ai';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getIndexedDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
  return dbPromise;
}

export function generateUid(): string {
  return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function getAllProjectMetadata(): Promise<ProjectMetadata[]> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['meta'], 'readonly');
      const store = tx.objectStore('meta');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as Array<ProjectMetadata & { id: string }>).filter(
          (m) => m.id !== '__cur'
        );
        list.sort((a, b) => b.updated - a.updated);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getCurrentProjectId(): Promise<string | null> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['meta'], 'readonly');
      const store = tx.objectStore('meta');
      const req = store.get('__cur');
      req.onsuccess = () => {
        resolve(req.result ? req.result.cur : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCurrentProjectId(id: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['meta'], 'readwrite');
      const store = tx.objectStore('meta');
      store.put({ id: '__cur', cur: id, updated: 0 });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

export async function saveProjectDraft(
  id: string,
  name: string,
  scenes: Scene[],
  totalDuration: number,
  themeIndex: number,
  subtitleMode: 'scene' | 'on' | 'off',
  avatar: AvatarConfig,
  avatarPhotoUrl?: string | null,
  avatarImgUrl?: string | null,
  refAudio?: string | null,
  voiceConfig?: { mode: string; style: string; q: string; rt: string },
  bgMusic?: { name: string; vol: number; duck: boolean; dataUrl?: string } | null,
  driveId?: string | null
): Promise<void> {
  const db = await getIndexedDB();
  const packedScenes = scenes.map((s) => ({
    id: s.id,
    layout: s.layout,
    title: s.title,
    body: s.body,
    text: s.text,
    cap: s.cap,
    fit: s.fit,
    vs: s.vs,
    vd: s.vd,
    va: s.va,
    av: s.av,
    ps: s.ps,
    fs: s.fs,
    fmix: s.fmix,
    ta: s.ta,
    tp: s.tp,
    kc: s.kc,
    amT: s.amT,
    amV: s.amV,
    amD: s.amD,
    gm: s.gm,
    gs: s.gs,
    gp: s.gp,
    ga: s.ga,
    gd: s.gd,
    ovs: s.ovs,
    ov: s.ov?.map((q) => q.dataUrl).filter(Boolean),
    sg: s.sg,
    cues: s.cues?.map((c) => ({
      vt: c.vt,
      text: c.text,
      vm: c.vm,
      used: c.used,
      audio: c.audio ? { b64: c.audio.b64, mime: c.audio.mime } : null,
    })),
    cf: s.cf,
    cm: s.cm,
    fx: s.fx?.map((f) => ({
      type: f.type,
      t: f.t,
      vol: f.vol,
      dur: f.dur,
      size: f.size,
      mode: f.mode,
      text: f.text,
      seed: f.seed,
      cheer: f.cheer,
      name: f.name,
      takes: f.takes,
    })),
    bg: s.bg?.dataUrl ? { type: s.bg.type, dataUrl: s.bg.dataUrl } : null,
    imgs: s.imgs?.map((q) => q.dataUrl).filter(Boolean),
    audio: s.audio ? { b64: s.audio.b64, mime: s.audio.mime } : null,
  }));

  const projectPayload: ProjectData = {
    v: 1,
    theme: themeIndex,
    sm: subtitleMode,
    avatar,
    avatarImg: avatarImgUrl,
    avatarPhoto: avatarPhotoUrl,
    ref: refAudio,
    voice: voiceConfig || { mode: 'clone', style: '', q: '10', rt: '' },
    scenes: packedScenes,
    music: bgMusic
      ? {
          fileId: null,
          size: 0,
          mime: 'audio/mpeg',
          name: bgMusic.name,
          vol: bgMusic.vol,
          duck: bgMusic.duck,
          dataUrl: bgMusic.dataUrl,
        }
      : null,
  };

  const updated = Date.now();
  const meta: ProjectMetadata = {
    id,
    name,
    updated,
    scenes: scenes.length,
    duration: totalDuration,
    driveId,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['drafts', 'meta'], 'readwrite');
    tx.objectStore('drafts').put({ id, data: projectPayload });
    tx.objectStore('meta').put(meta);
    tx.oncomplete = () => {
      setCurrentProjectId(id);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadProjectDraft(id: string): Promise<{ data: ProjectData; meta: ProjectMetadata } | null> {
  const db = await getIndexedDB();
  return new Promise((resolve) => {
    const tx = db.transaction(['drafts', 'meta'], 'readonly');
    const dReq = tx.objectStore('drafts').get(id);
    const mReq = tx.objectStore('meta').get(id);
    tx.oncomplete = () => {
      if (!dReq.result) {
        resolve(null);
      } else {
        resolve({
          data: dReq.result.data,
          meta: mReq.result || { id, name: 'Proyek', updated: Date.now(), scenes: 0, duration: 0 },
        });
      }
    };
    tx.onerror = () => resolve(null);
  });
}

export async function deleteProjectDraft(id: string): Promise<void> {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['drafts', 'meta'], 'readwrite');
    tx.objectStore('drafts').delete(id);
    tx.objectStore('meta').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
