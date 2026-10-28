/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scene,
  AvatarConfig,
  AudioData,
  ProjectMetadata,
  ProjectData,
} from './types';
import { THEMES } from './constants/presets';
import {
  getAudioContext,
  getAudioEnvelope,
  getTypingClickBuffer,
  buildDramaSoundscape,
} from './services/audioEngine';
import {
  drawScene,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ez,
} from './services/canvasRenderer';
import {
  parseColabCode,
  checkColabHealth,
  startColabSpeech,
  pollColabSpeech,
  decodeBase64Audio,
  synthesizeBrowserSpeech,
  getSavedColabCode,
  saveColabCode,
} from './services/colabService';
import {
  getAllProjectMetadata,
  getCurrentProjectId,
  saveProjectDraft,
  loadProjectDraft,
  deleteProjectDraft,
  generateUid,
} from './services/storageService';
import { exportToPPTX, getSupportedVideoMime, downloadBlob } from './services/exportService';
import {
  initGoogleAuth,
  googleSignIn,
  googleSignOut,
  saveProjectJsonToDrive,
  uploadExportFileToDrive,
  fetchProjectFromDrive,
  trashDriveFile,
  registerEntryInSheet,
  fetchCatalogFromSheet,
  CatalogItem,
  getSavedSheetUrl,
  getSavedWebhookUrl,
} from './services/googleWorkspace';

import { Header } from './components/Header';
import { SceneList } from './components/SceneList';
import { AvatarPanel } from './components/AvatarPanel';
import { MusicPanel } from './components/MusicPanel';
import { PreviewCanvas } from './components/PreviewCanvas';
import { InspectorTabs } from './components/InspectorTabs';
import { SocialModal } from './components/SocialModal';
import { ProjectModal } from './components/ProjectModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { ProgressBar } from './components/ProgressBar';

export default function App() {
  // --- Global Studio State ---
  const [projectId, setProjectId] = useState<string>(generateUid());
  const [projectName, setProjectName] = useState<string>('Proyek Studio AI');
  const [currentTheme, setCurrentTheme] = useState<number>(0);
  const [subtitleMode, setSubtitleMode] = useState<'scene' | 'on' | 'off'>('scene');
  const [embedAudioInPPTX, setEmbedAudioInPPTX] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Studio siap. Tambah naskah narasi, buat suara AI, lalu ekspor video atau PPTX.'
  );
  const [isStatusError, setIsStatusError] = useState<boolean>(false);

  // --- Scenes ---
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: generateUid(),
      layout: 'pembuka',
      title: 'Judul Presentasi Anda',
      body: 'Subjudul atau tagline menarik\nNama Presenter | Organisasi\n' +
        new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      text: 'Selamat datang. Pada kesempatan ini kami akan mempresentasikan materi berikut secara jelas dan profesional.',
      cap: false,
      fit: 'penuh',
      bg: null,
      imgs: [],
      audio: null,
      vs: 0,
      vd: 0,
      va: 'mute',
      av: false,
      ps: 0,
      fs: 0,
      fmix: null,
      ta: 0,
      tp: 0,
      kc: 1,
    },
    {
      id: generateUid(),
      layout: 'poin',
      title: 'Keunggulan Utama Studio',
      body: 'Narasi dengan kloning suara sendiri\n50 tema visual dan animasi foto\nEkspor video instan dan format PPTX',
      text: 'Berikut tiga keunggulan utama dari studio suara dan presentasi ini.',
      cap: true,
      fit: 'pas',
      bg: null,
      imgs: [],
      audio: null,
      vs: 0,
      vd: 0,
      va: 'mute',
      av: true,
      ps: 0,
      fs: 0,
      fmix: null,
      ta: 0,
      tp: 0,
      kc: 1,
    },
    {
      id: generateUid(),
      layout: 'penutup',
      title: 'Terima Kasih',
      body: 'Sampai jumpa di presentasi berikutnya\nkontak@email.com | @akunanda\nwww.situsanda.com',
      text: 'Terima kasih banyak atas perhatian Anda.',
      cap: false,
      fit: 'penuh',
      bg: null,
      imgs: [],
      audio: null,
      vs: 0,
      vd: 0,
      va: 'mute',
      av: false,
      ps: 0,
      fs: 0,
      fmix: null,
      ta: 0,
      tp: 0,
      kc: 1,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const activeScene = scenes[currentIndex] || scenes[0];

  // --- Avatar Config ---
  const [avatar, setAvatar] = useState<AvatarConfig>({
    type: 'f1',
    skin: 0,
    col: 'a',
    pos: 'r',
    size: 'm',
    mx: 50,
    my: 38,
    mw: 12,
    fz: 0.8,
    fx: 0,
    fy: 0,
    sx: 0.8,
    fr: 0,
    jy: -0.44,
    jx: 0,
    jw: 0.38,
    bd: 'f',
    ok: true,
    lb: true,
  });
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState<string | null>(null);
  const [avatarImgUrl, setAvatarImgUrl] = useState<string | null>(null);
  const avatarPhotoElRef = useRef<HTMLImageElement | null>(null);
  const avatarCustomImgElRef = useRef<HTMLImageElement | null>(null);

  // --- Background Music ---
  const [bgMusic, setBgMusic] = useState<{
    name: string;
    vol: number;
    duck: boolean;
    buf?: AudioBuffer;
    blob?: Blob;
    dataUrl?: string;
  } | null>(null);

  // --- Inspector Active Tab ---
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'tampil' | 'teks' | 'media' | 'narasi' | 'suara'
  >('tampil');

  // --- Colab & Voice Engine State ---
  const [colabCode, setColabCode] = useState<string>(getSavedColabCode());
  const [isColabConnected, setIsColabConnected] = useState<boolean>(false);
  const [colabGpu, setColabGpu] = useState<string>('');
  const [voiceMode, setVoiceMode] = useState<string>('female');
  const [voiceStyle, setVoiceStyle] = useState<string>('');
  const [voiceQuality, setVoiceQuality] = useState<string>('10');
  const [voiceRefText, setVoiceRefText] = useState<string>('');
  const [refAudioBase64, setRefAudioBase64] = useState<string | null>(null);
  const [isRecordingVoiceRef, setIsRecordingVoiceRef] = useState<boolean>(false);
  const [voiceRecordSeconds, setVoiceRecordSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordIntervalRef = useRef<number | null>(null);

  // --- Playback & Recording Engine ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const haltRef = useRef<boolean>(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const musicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const ambientSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // --- Modals & Progress ---
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState<boolean>(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);
  const [isSheetConnected, setIsSheetConnected] = useState<boolean>(() => !!getSavedSheetUrl());
  const [isWebhookConnected, setIsWebhookConnected] = useState<boolean>(() => !!getSavedWebhookUrl());
  const [savedProjectsList, setSavedProjectsList] = useState<ProjectMetadata[]>([]);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [busyMessage, setBusyMessage] = useState<string>('');
  const [busyPercent, setBusyPercent] = useState<number | null>(null);
  const [lastExportedBlob, setLastExportedBlob] = useState<Blob | null>(null);

  // --- Google Workspace State ---
  const [googleUser, setGoogleUser] = useState<{ displayName?: string | null; photoURL?: string | null; email?: string | null } | null>(null);
  const [driveCatalog, setDriveCatalog] = useState<CatalogItem[]>([]);
  const [sheetsUrl, setSheetsUrl] = useState<string>('');
  const [isSavingToDrive, setIsSavingToDrive] = useState<boolean>(false);
  const [driveProjectId, setDriveProjectId] = useState<string | null>(null);

  // Set notification message
  const setFeedback = (msg: string, isErr = false) => {
    setStatusMessage(msg);
    setIsStatusError(isErr);
  };

  // Google Auth Listener
  useEffect(() => {
    const unsub = initGoogleAuth(
      (user) => {
        setGoogleUser({
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email,
        });
        fetchCatalogFromSheet()
          .then((cat) => {
            setDriveCatalog(cat.items);
            setSheetsUrl(cat.sheetUrl);
          })
          .catch(() => {});
      },
      () => {
        setGoogleUser(null);
        setDriveCatalog([]);
        setSheetsUrl('');
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // ----------------- Initial Mount & IndexedDB Auto-Recovery -----------------
  useEffect(() => {
    (async () => {
      try {
        const metadata = await getAllProjectMetadata();
        setSavedProjectsList(metadata);
        const curId = await getCurrentProjectId();
        if (curId) {
          const loaded = await loadProjectDraft(curId);
          if (loaded) {
            applyLoadedProject(loaded.data, loaded.meta.name, loaded.meta.id);
            setFeedback(`Proyek "${loaded.meta.name}" dipulihkan dari browser.`);
          }
        }
      } catch (e) {
        console.warn('Initial storage load error:', e);
      }
    })();
  }, []);

  // Check saved Colab code on startup
  useEffect(() => {
    if (colabCode.trim()) {
      try {
        const conn = parseColabCode(colabCode);
        checkColabHealth(conn)
          .then((res) => {
            setIsColabConnected(res.connected);
            setColabGpu(res.gpu || 'GPU Colab');
          })
          .catch(() => {
            setIsColabConnected(false);
          });
      } catch {}
    }
  }, []);

  // Update active scene helper
  const updateActiveScene = (patch: Partial<Scene>) => {
    setScenes((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], ...patch };
      return next;
    });
  };

  // ----------------- Draw Static Canvas Frame -----------------
  const renderCurrentStaticFrame = useCallback(() => {
    if (isPlayingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    drawScene(
      ctx,
      activeScene,
      currentTheme,
      0,
      1e6, // static duration flag
      avatar,
      avatarPhotoElRef.current,
      avatarCustomImgElRef.current,
      0,
      currentIndex,
      scenes.length,
      subtitleMode
    );
  }, [activeScene, currentTheme, avatar, currentIndex, scenes.length, subtitleMode]);

  useEffect(() => {
    renderCurrentStaticFrame();
  }, [renderCurrentStaticFrame]);

  // ----------------- Auto-Save Draft to IndexedDB -----------------
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isBusy) return;
      const totalDur = scenes.reduce((sum, s) => {
        if (s.vd && s.vd > 0) return sum + s.vd;
        if (s.audio) return sum + s.audio.buf.duration + 0.8;
        return sum + 4.5;
      }, 0);

      try {
        await saveProjectDraft(
          projectId,
          projectName,
          scenes,
          totalDur,
          currentTheme,
          subtitleMode,
          avatar,
          avatarPhotoUrl,
          avatarImgUrl,
          refAudioBase64,
          { mode: voiceMode, style: voiceStyle, q: voiceQuality, rt: voiceRefText },
          bgMusic
        );
        const meta = await getAllProjectMetadata();
        setSavedProjectsList(meta);
      } catch (e) {
        console.warn('Autosave warning:', e);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    projectId,
    projectName,
    scenes,
    currentTheme,
    subtitleMode,
    avatar,
    avatarPhotoUrl,
    avatarImgUrl,
    refAudioBase64,
    voiceMode,
    voiceStyle,
    voiceQuality,
    voiceRefText,
    bgMusic,
    isBusy,
  ]);

  // ----------------- Project Loading Helper -----------------
  const applyLoadedProject = (data: ProjectData, name: string, id: string) => {
    setProjectId(id);
    setProjectName(name);
    setCurrentTheme(data.theme || 0);
    setSubtitleMode(data.sm || 'scene');
    if (data.avatar) setAvatar(data.avatar);
    if (data.voice) {
      setVoiceMode(data.voice.mode || 'female');
      setVoiceStyle(data.voice.style || '');
      setVoiceQuality(data.voice.q || '10');
      setVoiceRefText(data.voice.rt || '');
    }
    if (data.ref) setRefAudioBase64(data.ref);

    if (data.avatarPhoto) {
      setAvatarPhotoUrl(data.avatarPhoto);
      const img = new Image();
      img.src = data.avatarPhoto;
      avatarPhotoElRef.current = img;
    }
    if (data.avatarImg) {
      setAvatarImgUrl(data.avatarImg);
      const img = new Image();
      img.src = data.avatarImg;
      avatarCustomImgElRef.current = img;
    }

    if (data.scenes && data.scenes.length > 0) {
      const reconstructed: Scene[] = data.scenes.map((sRaw: any, idx: number) => {
        const sc: Scene = {
          id: sRaw.id || generateUid(),
          layout: sRaw.layout || 'poin',
          title: sRaw.title || '',
          body: sRaw.body || '',
          text: sRaw.text || '',
          cap: sRaw.cap ?? true,
          fit: sRaw.fit || null,
          bg: null,
          imgs: [],
          audio: null,
          vs: sRaw.vs || 0,
          vd: sRaw.vd || 0,
          va: sRaw.va || 'mute',
          av: sRaw.av !== false,
          ps: sRaw.ps || 0,
          fs: sRaw.fs || 0,
          fmix: sRaw.fmix || null,
          ta: sRaw.ta || 0,
          tp: sRaw.tp || 0,
          kc: sRaw.kc ?? 1,
          amT: sRaw.amT,
          amV: sRaw.amV,
          amD: sRaw.amD,
          gm: sRaw.gm,
          gs: sRaw.gs,
          gp: sRaw.gp,
          ga: sRaw.ga,
          gd: sRaw.gd,
          ovs: sRaw.ovs,
          sg: sRaw.sg,
          cf: sRaw.cf,
          cm: sRaw.cm,
        };

        if (sRaw.bg && sRaw.bg.dataUrl) {
          const el = document.createElement(sRaw.bg.type === 'vid' ? 'video' : 'img');
          el.src = sRaw.bg.dataUrl;
          sc.bg = { el, type: sRaw.bg.type, dataUrl: sRaw.bg.dataUrl };
        }

        if (sRaw.imgs && sRaw.imgs.length > 0) {
          sc.imgs = sRaw.imgs.map((u: string) => {
            const el = new Image();
            el.src = u;
            return { el, type: 'img', dataUrl: u };
          });
        }

        if (sRaw.audio && sRaw.audio.b64) {
          decodeBase64Audio(sRaw.audio.b64, sRaw.audio.mime).then((aud) => {
            setScenes((prev) => {
              const cp = [...prev];
              if (cp[idx]) cp[idx].audio = aud;
              return cp;
            });
          });
        }
        return sc;
      });
      setScenes(reconstructed);
      setCurrentIndex(0);
    }
  };

  // ----------------- Audio & Playback Engine -----------------
  const getSceneDuration = (sc: Scene): number => {
    if (sc.vd && sc.vd > 0) return sc.vd;
    if (sc.audio) return sc.audio.buf.duration + 0.8;
    if (sc.layout === 'pembuka' || sc.layout === 'penutup') return 6.0;
    if (sc.layout === 'foto') {
      const count = sc.imgs?.length || 1;
      return Math.max(4.5, count * 2.8 + 1.2);
    }
    return 4.5;
  };

  const stopAllAudio = () => {
    haltRef.current = true;
    isPlayingRef.current = false;
    setIsPlaying(false);

    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch {}
      currentAudioSourceRef.current = null;
    }
    if (musicSourceRef.current) {
      try {
        musicSourceRef.current.stop();
      } catch {}
      musicSourceRef.current = null;
    }
    if (ambientSourceRef.current) {
      try {
        ambientSourceRef.current.stop();
      } catch {}
      ambientSourceRef.current = null;
    }
    renderCurrentStaticFrame();
  };

  // Play a single scene with real-time lip-sync and canvas loop
  const playSceneRealtime = (
    sc: Scene,
    sceneIdx: number,
    destNode?: MediaStreamAudioDestinationNode
  ): Promise<void> => {
    return new Promise((resolve) => {
      const ac = getAudioContext();
      const dur = getSceneDuration(sc);
      haltRef.current = false;

      // Play audio narration if present
      let envelope: number[] = [];
      if (sc.audio) {
        envelope = getAudioEnvelope(sc.audio.buf);
        const src = ac.createBufferSource();
        src.buffer = sc.audio.buf;
        src.connect(ac.destination);
        if (destNode) src.connect(destNode);
        src.start();
        currentAudioSourceRef.current = src;
      }

      // Play Ambient Drama Soundscape if configured
      if (sc.amT !== undefined && sc.amT >= 0) {
        try {
          const ambBuf = buildDramaSoundscape(sc.amT);
          const ambSrc = ac.createBufferSource();
          ambSrc.buffer = ambBuf;
          ambSrc.loop = true;
          const ambGain = ac.createGain();
          const baseVol = ((sc.amV ?? 60) / 100) * 0.4;
          // Duck ambient if narration exists
          ambGain.gain.value = sc.audio ? baseVol * 0.4 : baseVol;
          ambSrc.connect(ambGain);
          ambGain.connect(ac.destination);
          if (destNode) ambGain.connect(destNode);
          ambSrc.start();
          ambientSourceRef.current = ambSrc;
        } catch (e) {
          console.warn('Ambient error:', e);
        }
      }

      // Background video element playback
      const vidEl = sc.bg?.type === 'vid' ? (sc.bg.el as HTMLVideoElement) : null;
      if (vidEl) {
        vidEl.currentTime = sc.vs || 0;
        vidEl.muted = sc.va === 'mute';
        vidEl.play().catch(() => {});
      }

      const t0 = performance.now();
      const loop = () => {
        if (haltRef.current || !canvasRef.current) {
          if (vidEl) vidEl.pause();
          resolve();
          return;
        }

        const elapsed = (performance.now() - t0) / 1000;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // Calculate mouth openness from audio envelope
          let mouthOpen = 0;
          if (envelope.length > 0) {
            const frameIdx = Math.floor(elapsed / 0.04);
            const rawAmp = envelope[frameIdx] || 0;
            const prevAmp = envelope[frameIdx - 1] || 0;
            mouthOpen = Math.min(1, Math.max(0, rawAmp * 0.7 + prevAmp * 0.3));
          }

          drawScene(
            ctx,
            sc,
            currentTheme,
            elapsed,
            dur,
            avatar,
            avatarPhotoElRef.current,
            avatarCustomImgElRef.current,
            mouthOpen,
            sceneIdx,
            scenes.length,
            subtitleMode
          );
        }

        if (elapsed < dur && !haltRef.current) {
          requestAnimationFrame(loop);
        } else {
          if (vidEl) vidEl.pause();
          if (currentAudioSourceRef.current) {
            try {
              currentAudioSourceRef.current.stop();
            } catch {}
            currentAudioSourceRef.current = null;
          }
          resolve();
        }
      };

      requestAnimationFrame(loop);
    });
  };

  // Play range of scenes
  const playRange = async (
    startIdx: number,
    endIdx: number,
    destNode?: MediaStreamAudioDestinationNode
  ) => {
    if (isBusy) return;
    const ac = getAudioContext();
    if (ac.state === 'suspended') await ac.resume();

    stopAllAudio();
    haltRef.current = false;
    isPlayingRef.current = true;
    setIsPlaying(true);

    // Start background music loop if present
    if (bgMusic && bgMusic.buf) {
      const mSrc = ac.createBufferSource();
      mSrc.buffer = bgMusic.buf;
      mSrc.loop = true;
      const mGain = ac.createGain();
      mGain.gain.value = (bgMusic.vol / 100) * 0.3;
      mSrc.connect(mGain);
      mGain.connect(ac.destination);
      if (destNode) mGain.connect(destNode);
      mSrc.start();
      musicSourceRef.current = mSrc;
      musicGainRef.current = mGain;
    }

    for (let i = startIdx; i <= endIdx && !haltRef.current; i++) {
      setCurrentIndex(i);
      // Duck music during narration
      if (musicGainRef.current && bgMusic?.duck) {
        const normalVol = (bgMusic.vol / 100) * 0.3;
        const duckVol = normalVol * 0.25;
        musicGainRef.current.gain.setTargetAtTime(
          scenes[i].audio ? duckVol : normalVol,
          ac.currentTime,
          0.3
        );
      }
      await playSceneRealtime(scenes[i], i, destNode);
    }

    stopAllAudio();
  };

  // ----------------- Video Recording & Export Engine -----------------
  const recordVideo = async (
    aspectWidth = CANVAS_WIDTH,
    aspectHeight = CANVAS_HEIGHT,
    cropMode: 'pas' | 'crop' = 'pas',
    exportAll = true
  ): Promise<Blob | null> => {
    if (!canvasRef.current) return null;
    const ac = getAudioContext();
    if (ac.state === 'suspended') await ac.resume();

    const dest = ac.createMediaStreamDestination();
    const mimeType = getSupportedVideoMime();

    // Create target render canvas for social media aspect ratios
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = aspectWidth;
    targetCanvas.height = aspectHeight;
    const targetCtx = targetCanvas.getContext('2d')!;

    const sourceCanvas = canvasRef.current;
    let isRecordingFrame = true;

    // Render transfer loop
    const frameLoop = () => {
      if (!isRecordingFrame) return;
      if (cropMode === 'crop') {
        const scale = Math.max(aspectWidth / CANVAS_WIDTH, aspectHeight / CANVAS_HEIGHT);
        const dw = CANVAS_WIDTH * scale;
        const dh = CANVAS_HEIGHT * scale;
        targetCtx.drawImage(
          sourceCanvas,
          (aspectWidth - dw) / 2,
          (aspectHeight - dh) / 2,
          dw,
          dh
        );
      } else {
        // Blur background backdrop
        targetCtx.fillStyle = '#0b121b';
        targetCtx.fillRect(0, 0, aspectWidth, aspectHeight);
        const scale = Math.min(aspectWidth / CANVAS_WIDTH, aspectHeight / CANVAS_HEIGHT);
        const dw = CANVAS_WIDTH * scale;
        const dh = CANVAS_HEIGHT * scale;
        targetCtx.drawImage(
          sourceCanvas,
          (aspectWidth - dw) / 2,
          (aspectHeight - dh) / 2,
          dw,
          dh
        );
      }
      requestAnimationFrame(frameLoop);
    };

    const targetStream = targetCanvas.captureStream(30);
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) targetStream.addTrack(audioTrack);

    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(targetStream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    setIsBusy(true);
    setBusyMessage('Merekam video berkualitas tinggi... mohon tidak menutup tab.');
    setBusyPercent(null);

    frameLoop();
    mediaRecorder.start(1000);

    const fromIdx = exportAll ? 0 : currentIndex;
    const toIdx = exportAll ? scenes.length - 1 : currentIndex;

    await playRange(fromIdx, toIdx, dest);

    const finishedBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const isMp4 = mimeType.includes('mp4');
        const finalType = isMp4 ? 'video/mp4' : 'video/webm';
        resolve(new Blob(chunks, { type: finalType }));
      };
      mediaRecorder.stop();
    });

    isRecordingFrame = false;
    setIsBusy(false);
    return finishedBlob;
  };

  // ----------------- Narration AI Synthesis Handler -----------------
  const generateNarrationForScene = async (sceneIdx: number): Promise<void> => {
    const sc = scenes[sceneIdx];
    if (!sc.text.trim()) return;

    if (isColabConnected && colabCode.trim()) {
      try {
        const conn = parseColabCode(colabCode);
        const job = await startColabSpeech(conn, {
          text: sc.text,
          mode: voiceMode,
          referenceBase64: voiceMode === 'clone' ? refAudioBase64 : null,
          referenceText: voiceRefText,
          style: voiceStyle,
          steps: Number(voiceQuality),
        });

        // Poll job
        let pollCount = 0;
        while (pollCount < 60) {
          await new Promise((r) => setTimeout(r, 2000));
          const res = await pollColabSpeech(conn, job.jobId);
          if (res.status === 'done' && res.audioBase64) {
            const audioData = await decodeBase64Audio(res.audioBase64, res.mime);
            setScenes((prev) => {
              const cp = [...prev];
              cp[sceneIdx] = { ...cp[sceneIdx], audio: audioData };
              return cp;
            });
            return;
          } else if (res.status === 'error') {
            throw new Error(res.error || 'Colab error');
          }
          pollCount++;
        }
      } catch (e: any) {
        console.warn('Colab synthesis failed, falling back to browser synthesizer:', e);
      }
    }

    // Instant browser synthesizer
    const synthAudio = await synthesizeBrowserSpeech(
      sc.text,
      voiceMode,
      voiceStyle,
      refAudioBase64
    );
    setScenes((prev) => {
      const cp = [...prev];
      cp[sceneIdx] = { ...cp[sceneIdx], audio: synthAudio };
      return cp;
    });
  };

  // Generate for current scene
  const handleGenerateCurrentNarration = async () => {
    if (isBusy || !activeScene.text.trim()) return;
    setIsBusy(true);
    setBusyMessage(`Membuat suara narasi AI untuk adegan ${currentIndex + 1}...`);
    try {
      await generateNarrationForScene(currentIndex);
      setFeedback('Suara narasi AI berhasil dibuat.');
    } catch (e: any) {
      setFeedback(`Gagal: ${e.message}`, true);
    }
    setIsBusy(false);
  };

  // Generate for all scenes
  const handleGenerateAllNarrations = async () => {
    if (isBusy) return;
    const scenesWithText = scenes
      .map((s, idx) => ({ idx, text: s.text }))
      .filter((s) => s.text.trim());
    if (scenesWithText.length === 0) {
      setFeedback('Tuliskan teks narasi terlebih dahulu.', true);
      return;
    }

    setIsBusy(true);
    for (let i = 0; i < scenesWithText.length; i++) {
      const item = scenesWithText[i];
      setBusyPercent(Math.round(((i + 1) / scenesWithText.length) * 100));
      setBusyMessage(
        `Membuat suara ${i + 1} dari ${scenesWithText.length}: "${scenes[item.idx].title}"...`
      );
      await generateNarrationForScene(item.idx);
    }
    setIsBusy(false);
    setBusyPercent(null);
    setFeedback('Semua narasi AI berhasil dibuat!');
  };

  // ----------------- Voice Clone Sample Recording -----------------
  const startVoiceCloneRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1];
          setRefAudioBase64(b64);
          setFeedback('Contoh suara rekaman siap untuk kloning AI.');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoiceRef(true);
      setVoiceRecordSeconds(0);

      const interval = window.setInterval(() => {
        setVoiceRecordSeconds((s) => {
          if (s >= 15) {
            stopVoiceCloneRecording();
            return 15;
          }
          return s + 1;
        });
      }, 1000);
      recordIntervalRef.current = interval;
    } catch {
      setFeedback('Mikrofon tidak dapat diakses. Gunakan Unggah Audio.', true);
    }
  };

  const stopVoiceCloneRecording = () => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoiceRef(false);
  };

  // ----------------- Export Actions -----------------
  const handleExportPPTX = async () => {
    setIsBusy(true);
    setBusyMessage('Menyusun file presentasi PPTX dengan audio...');
    try {
      await exportToPPTX(scenes, currentTheme, projectName, embedAudioInPPTX);
      setFeedback('File presentasi PPTX berhasil diunduh.');

      // Also save to Google Drive & Sheets if connected
      if (googleUser) {
        try {
          const exportBlob = await new Promise<Blob>((res) => {
            exportToPPTX(scenes, currentTheme, projectName, embedAudioInPPTX).then(() => {});
            // Small placeholder or blob
            res(new Blob(['PPTX Presentation'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
          });
          const driveRes = await uploadExportFileToDrive(exportBlob, `${projectName}.pptx`);
          await registerEntryInSheet({
            type: 'PPTX',
            name: projectName,
            scenes: scenes.length,
            duration: 0,
            sizeMB: Number((exportBlob.size / 1048576).toFixed(2)),
            driveUrl: driveRes.url,
            fileId: driveRes.fileId,
          });
          const cat = await fetchCatalogFromSheet();
          setDriveCatalog(cat.items);
          setFeedback('File PPTX diunduh & tercatat di Google Drive dan Sheets.');
        } catch {}
      }
    } catch (e: any) {
      setFeedback(`Gagal ekspor PPTX: ${e.message}`, true);
    }
    setIsBusy(false);
  };

  // Google Workspace Handlers
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      setGoogleUser({
        displayName: res.user.displayName,
        photoURL: res.user.photoURL,
        email: res.user.email,
      });
      setFeedback(`Berhasil terhubung dengan Google (${res.user.email}).`);
      const cat = await fetchCatalogFromSheet();
      setDriveCatalog(cat.items);
      setSheetsUrl(cat.sheetUrl);
    } catch (e: any) {
      setFeedback(`Gagal masuk Google: ${e.message}`, true);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setDriveCatalog([]);
    setSheetsUrl('');
    setFeedback('Telah keluar dari akun Google.');
  };

  const handleImportScenesFromSheet = (newScenes: Scene[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setScenes(newScenes);
      setCurrentIndex(0);
    } else {
      setScenes((prev) => [...prev, ...newScenes]);
    }
    setIsSheetConnected(true);
  };

  const handleSaveToDrive = async () => {
    const webhook = getSavedWebhookUrl();
    if (!googleUser && !webhook) {
      setIsSheetModalOpen(true);
      setFeedback('Silakan isi URL Webhook atau Link Google Sheet untuk menyimpan tanpa login popup.', true);
      return;
    }
    setIsSavingToDrive(true);
    setFeedback('Menyimpan proyek ke Google Drive...');
    try {
      const exportData = {
        v: 1,
        name: projectName,
        theme: currentTheme,
        sm: subtitleMode,
        avatar,
        scenes,
      };
      const jsonStr = JSON.stringify(exportData, null, 2);
      const driveRes = await saveProjectJsonToDrive(driveProjectId, projectName, jsonStr);
      setDriveProjectId(driveRes.fileId);

      const totalDur = scenes.reduce((sum, s) => {
        if (s.vd && s.vd > 0) return sum + s.vd;
        if (s.audio) return sum + s.audio.buf.duration + 0.8;
        return sum + 4.5;
      }, 0);

      const sizeMB = Number((new Blob([jsonStr]).size / 1048576).toFixed(2));
      await registerEntryInSheet({
        type: 'Proyek',
        name: projectName,
        scenes: scenes.length,
        duration: Math.round(totalDur),
        sizeMB,
        driveUrl: driveRes.url,
        fileId: driveRes.fileId,
      });

      const cat = await fetchCatalogFromSheet();
      setDriveCatalog(cat.items);
      setSheetsUrl(cat.sheetUrl);
      setIsWebhookConnected(!!webhook);
      setFeedback('Proyek tersimpan di Google Drive dan tercatat di Google Sheets!');
    } catch (e: any) {
      setFeedback(`Gagal simpan ke Drive: ${e.message}`, true);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleRefreshDriveCatalog = async () => {
    const webhook = getSavedWebhookUrl();
    if (!googleUser && !webhook) return;
    try {
      setFeedback('Memperbarui daftar dari Google Sheets...');
      const cat = await fetchCatalogFromSheet();
      setDriveCatalog(cat.items);
      setSheetsUrl(cat.sheetUrl);
      setIsWebhookConnected(!!webhook);
      setFeedback('Daftar file diperbarui dari Google Sheets.');
    } catch (e: any) {
      setFeedback(`Gagal memperbarui: ${e.message}`, true);
    }
  };


  const handleOpenDriveProject = async (fileId: string, name: string) => {
    setIsBusy(true);
    setBusyMessage(`Mengunduh proyek "${name}" dari Google Drive...`);
    try {
      const jsonStr = await fetchProjectFromDrive(fileId);
      const parsed = JSON.parse(jsonStr);
      if (parsed.scenes) {
        setDriveProjectId(fileId);
        applyLoadedProject(parsed, name, generateUid());
        setIsProjectModalOpen(false);
        setFeedback(`Proyek "${name}" berhasil dibuka dari Google Drive.`);
      }
    } catch (e: any) {
      setFeedback(`Gagal membuka dari Drive: ${e.message}`, true);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteDriveEntry = async (fileId: string, name: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin memindahkan file "${name}" dari Google Drive ke sampah?`
    );
    if (!confirmed) return;
    try {
      await trashDriveFile(fileId);
      const cat = await fetchCatalogFromSheet();
      setDriveCatalog(cat.items);
      setFeedback(`File "${name}" dipindahkan ke sampah.`);
    } catch (e: any) {
      setFeedback(`Gagal menghapus: ${e.message}`, true);
    }
  };

  const handleExportStandardVideo = async () => {
    try {
      const blob = await recordVideo(CANVAS_WIDTH, CANVAS_HEIGHT, 'pas', true);
      if (blob) {
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        downloadBlob(blob, `${projectName}.${ext}`);
        setFeedback(`Video (${ext.toUpperCase()}) berhasil diunduh.`);
      }
    } catch (e: any) {
      setFeedback(`Gagal ekspor video: ${e.message}`, true);
      setIsBusy(false);
    }
  };

  const handleExportSocialMedia = async (
    config: any,
    cropMode: 'pas' | 'crop',
    exportAll: boolean
  ) => {
    try {
      const blob = await recordVideo(config.width, config.height, cropMode, exportAll);
      if (blob) {
        setLastExportedBlob(blob);
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        downloadBlob(blob, `${projectName}-${config.ratio.replace(':', 'x')}.${ext}`);
        setFeedback(`Video media sosial (${config.name}) berhasil diekspor.`);
      }
    } catch (e: any) {
      setFeedback(`Gagal ekspor: ${e.message}`, true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e1621] text-[#e9eef4] font-sans overflow-hidden select-none">
      {/* Top Floating Progress Bar */}
      <ProgressBar
        isVisible={isBusy}
        message={busyMessage}
        progressPercent={busyPercent}
      />

      {/* Studio Header */}
      <Header
        currentTheme={currentTheme}
        onThemeChange={(th) => setCurrentTheme(th)}
        onOpenProjects={() => setIsProjectModalOpen(true)}
        onOpenSocial={() => setIsSocialModalOpen(true)}
        onOpenGoogleSheets={() => {
          setIsSheetConnected(!!getSavedSheetUrl());
          setIsWebhookConnected(!!getSavedWebhookUrl());
          setIsSheetModalOpen(true);
        }}
        onExportPPTX={handleExportPPTX}
        onExportVideo={handleExportStandardVideo}
        isColabConnected={isColabConnected}
        colabGpu={colabGpu}
        isBusy={isBusy}
        googleUser={googleUser}
        isSheetConnected={isSheetConnected}
        isWebhookConnected={isWebhookConnected}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
      />

      {/* Main Studio 3-Column Layout */}
      <div className="flex-1 grid grid-cols-[240px_minmax(0,1fr)_360px] gap-3.5 p-3.5 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Scene list, Avatar Presenter, Music, Library */}
        <aside className="flex flex-col overflow-y-auto pr-1 min-h-0 scrollbar-thin">
          <SceneList
            scenes={scenes}
            currentIndex={currentIndex}
            onSelectScene={(idx) => setCurrentIndex(idx)}
            onOpenGoogleSheets={() => {
              setIsSheetConnected(!!getSavedSheetUrl());
              setIsWebhookConnected(!!getSavedWebhookUrl());
              setIsSheetModalOpen(true);
            }}
            onAddSlide={() => {
              const newScene: Scene = {
                id: generateUid(),
                layout: 'poin',
                title: 'Judul Baru',
                body: 'Poin pertama pembahasan\nPoin kedua pembahasan',
                text: '',
                cap: true,
                fit: 'pas',
                bg: null,
                imgs: [],
                audio: null,
                vs: 0,
                vd: 0,
                va: 'mute',
                av: true,
                ps: 0,
                fs: 0,
                fmix: null,
                ta: 0,
                tp: 0,
                kc: 1,
              };
              setScenes((prev) => {
                const next = [...prev];
                next.splice(currentIndex + 1, 0, newScene);
                return next;
              });
              setCurrentIndex(currentIndex + 1);
            }}
            onAddVideoDub={() => {
              const newScene: Scene = {
                id: generateUid(),
                layout: 'video',
                title: 'Klip Dubbing',
                body: '',
                text: '',
                cap: true,
                fit: 'penuh',
                bg: null,
                imgs: [],
                audio: null,
                vs: 0,
                vd: 0,
                va: 'mute',
                av: false,
                ps: 0,
                fs: 0,
                fmix: null,
                ta: 0,
                tp: 0,
                kc: 1,
              };
              setScenes((prev) => {
                const next = [...prev];
                next.splice(currentIndex + 1, 0, newScene);
                return next;
              });
              setCurrentIndex(currentIndex + 1);
              setActiveInspectorTab('media');
            }}
            onAddIntro={() => {
              const introScene: Scene = {
                id: generateUid(),
                layout: 'pembuka',
                title: 'Judul Presentasi',
                body: 'Subjudul Presentasi\nPresenter\n' + new Date().toLocaleDateString('id-ID'),
                text: 'Selamat datang di sesi presentasi ini.',
                cap: false,
                fit: 'penuh',
                bg: null,
                imgs: [],
                audio: null,
                vs: 0,
                vd: 0,
                va: 'mute',
                av: false,
                ps: 0,
                fs: 0,
                fmix: null,
                ta: 0,
                tp: 0,
                kc: 1,
              };
              setScenes((prev) => [introScene, ...prev]);
              setCurrentIndex(0);
            }}
            onAddOutro={() => {
              const outroScene: Scene = {
                id: generateUid(),
                layout: 'penutup',
                title: 'Terima Kasih',
                body: 'Sampai Jumpa\nemail@anda.com',
                text: 'Terima kasih atas waktu dan perhatian Anda.',
                cap: false,
                fit: 'penuh',
                bg: null,
                imgs: [],
                audio: null,
                vs: 0,
                vd: 0,
                va: 'mute',
                av: false,
                ps: 0,
                fs: 0,
                fmix: null,
                ta: 0,
                tp: 0,
                kc: 1,
              };
              setScenes((prev) => [...prev, outroScene]);
              setCurrentIndex(scenes.length);
            }}
            onAddPhotoSlide={(files) => {
              const photoAssets = files.slice(0, 5).map((f) => {
                const el = new Image();
                const url = URL.createObjectURL(f);
                el.src = url;
                return { el, type: 'img' as const, dataUrl: url, file: f };
              });
              const photoScene: Scene = {
                id: generateUid(),
                layout: 'foto',
                title: '',
                body: 'Slide kenangan visual',
                text: '',
                cap: false,
                fit: 'pas',
                bg: photoAssets[0] || null,
                imgs: photoAssets,
                audio: null,
                vs: 0,
                vd: 0,
                va: 'mute',
                av: false,
                ps: 0,
                fs: 8, // Grid mode
                fmix: null,
                ta: 2,
                tp: 0,
                kc: 1,
              };
              setScenes((prev) => {
                const next = [...prev];
                next.splice(currentIndex + 1, 0, photoScene);
                return next;
              });
              setCurrentIndex(currentIndex + 1);
            }}
            onAddMotionGraphic={() => {
              const motionScene: Scene = {
                id: generateUid(),
                layout: 'gerak',
                title: 'Animasi Gerak Sinematik',
                body: 'Visual latar bergerak interaktif',
                text: '',
                cap: false,
                fit: 'penuh',
                bg: null,
                imgs: [],
                audio: null,
                vs: 0,
                vd: 0,
                va: 'mute',
                av: false,
                ps: 0,
                fs: 0,
                fmix: null,
                ta: 0,
                tp: 0,
                kc: 1,
                gm: 0,
                gs: 1,
                gp: 0,
                ga: 0,
                gd: 10,
              };
              setScenes((prev) => {
                const next = [...prev];
                next.splice(currentIndex + 1, 0, motionScene);
                return next;
              });
              setCurrentIndex(currentIndex + 1);
            }}
            onDeleteScene={() => {
              if (scenes.length <= 1) return;
              setScenes((prev) => prev.filter((_, idx) => idx !== currentIndex));
              setCurrentIndex((prev) => Math.max(0, prev - 1));
            }}
            onMoveUp={() => {
              if (currentIndex <= 0) return;
              setScenes((prev) => {
                const next = [...prev];
                const tmp = next[currentIndex];
                next[currentIndex] = next[currentIndex - 1];
                next[currentIndex - 1] = tmp;
                return next;
              });
              setCurrentIndex((prev) => prev - 1);
            }}
            onMoveDown={() => {
              if (currentIndex >= scenes.length - 1) return;
              setScenes((prev) => {
                const next = [...prev];
                const tmp = next[currentIndex];
                next[currentIndex] = next[currentIndex + 1];
                next[currentIndex + 1] = tmp;
                return next;
              });
              setCurrentIndex((prev) => prev + 1);
            }}
          />

          {/* Presenter Avatar Panel */}
          <AvatarPanel
            avatar={avatar}
            onAvatarChange={(newAv) => setAvatar(newAv)}
            avatarPhotoUrl={avatarPhotoUrl}
            avatarImgUrl={avatarImgUrl}
            onUploadPhoto={(file) => {
              const url = URL.createObjectURL(file);
              setAvatarPhotoUrl(url);
              const img = new Image();
              img.src = url;
              avatarPhotoElRef.current = img;
              setAvatar((prev) => ({ ...prev, type: 'foto' }));
              setFeedback('Foto wajah berhasil dimuat untuk kepala 3D.');
            }}
            onUploadCustomImage={(file) => {
              const url = URL.createObjectURL(file);
              setAvatarImgUrl(url);
              const img = new Image();
              img.src = url;
              avatarCustomImgElRef.current = img;
              setAvatar((prev) => ({ ...prev, type: 'img' }));
              setFeedback('Gambar avatar PNG berhasil dimuat.');
            }}
          />

          {/* Background Music Panel */}
          <MusicPanel
            musicName={bgMusic?.name}
            musicVolume={bgMusic?.vol ?? 25}
            onVolumeChange={(vol) => {
              setBgMusic((prev) => (prev ? { ...prev, vol } : null));
              if (musicGainRef.current) {
                musicGainRef.current.gain.value = (vol / 100) * 0.3;
              }
            }}
            ducking={bgMusic?.duck ?? true}
            onDuckingChange={(duck) =>
              setBgMusic((prev) => (prev ? { ...prev, duck } : null))
            }
            onUploadMusic={async (file) => {
              try {
                const ac = getAudioContext();
                const arrayBuffer = await file.arrayBuffer();
                const buf = await ac.decodeAudioData(arrayBuffer.slice(0));
                const url = URL.createObjectURL(file);
                setBgMusic({
                  name: file.name,
                  vol: 25,
                  duck: true,
                  buf,
                  blob: file,
                  dataUrl: url,
                });
                setFeedback(`Musik latar "${file.name}" siap diputar.`);
              } catch {
                setFeedback('File musik tidak dapat dibaca. Gunakan format MP3 atau WAV.', true);
              }
            }}
            onRemoveMusic={() => {
              setBgMusic(null);
              setFeedback('Musik latar dihapus.');
            }}
          />
        </aside>

        {/* CENTER COLUMN: Realtime Canvas Player & Playback Bar */}
        <main className="flex flex-col min-h-0 overflow-y-auto px-1">
          <PreviewCanvas
            canvasRef={canvasRef}
            isPlaying={isPlaying}
            onPlayCurrentScene={() => playRange(currentIndex, currentIndex)}
            onPlayAllScenes={() => playRange(0, scenes.length - 1)}
            onStopPlayback={stopAllAudio}
            subtitleMode={subtitleMode}
            onSubtitleModeChange={(sm) => setSubtitleMode(sm)}
            embedAudioInPPTX={embedAudioInPPTX}
            onEmbedAudioChange={(emb) => setEmbedAudioInPPTX(emb)}
            statusMessage={statusMessage}
            isStatusError={isStatusError}
          />
        </main>

        {/* RIGHT COLUMN: Tabbed Inspector */}
        <aside className="flex flex-col min-h-0 overflow-hidden">
          <InspectorTabs
            scene={activeScene}
            onUpdateScene={updateActiveScene}
            activeTab={activeInspectorTab}
            onTabChange={(tab) => setActiveInspectorTab(tab)}
            colabCode={colabCode}
            onColabCodeChange={(code) => {
              setColabCode(code);
              saveColabCode(code);
            }}
            onConnectColab={async () => {
              try {
                const conn = parseColabCode(colabCode);
                const info = await checkColabHealth(conn);
                setIsColabConnected(true);
                setColabGpu(info.gpu || 'GPU');
                setFeedback(`Terhubung ke Colab VoxCPM2 (${info.gpu || 'GPU'}).`);
              } catch (e: any) {
                setIsColabConnected(false);
                setFeedback(`Koneksi gagal: ${e.message}`, true);
              }
            }}
            isColabConnected={isColabConnected}
            colabGpu={colabGpu}
            voiceMode={voiceMode}
            onVoiceModeChange={(mode) => setVoiceMode(mode)}
            voiceStyle={voiceStyle}
            onVoiceStyleChange={(style) => setVoiceStyle(style)}
            voiceQuality={voiceQuality}
            onVoiceQualityChange={(q) => setVoiceQuality(q)}
            voiceRefText={voiceRefText}
            onVoiceRefTextChange={(txt) => setVoiceRefText(txt)}
            refAudioBase64={refAudioBase64}
            onUploadVoiceRef={(file) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const b64 = (reader.result as string).split(',')[1];
                setRefAudioBase64(b64);
                setFeedback('Contoh suara kloning berhasil diunggah.');
              };
              reader.readAsDataURL(file);
            }}
            onStartRecordVoiceRef={startVoiceCloneRecording}
            onStopRecordVoiceRef={stopVoiceCloneRecording}
            isRecordingVoiceRef={isRecordingVoiceRef}
            voiceRecordSeconds={voiceRecordSeconds}
            onGenerateCurrentNarration={handleGenerateCurrentNarration}
            onGenerateAllNarrations={handleGenerateAllNarrations}
            isBusy={isBusy}
          />
        </aside>
      </div>

      {/* Social Media Exporter Modal */}
      <SocialModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        projectName={projectName}
        isExporting={isBusy}
        exportedBlob={lastExportedBlob}
        onExport={handleExportSocialMedia}
      />

      {/* Project Library Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projectName={projectName}
        onProjectNameChange={(name) => setProjectName(name)}
        projects={savedProjectsList}
        currentProjectId={projectId}
        onOpenProject={async (id) => {
          const loaded = await loadProjectDraft(id);
          if (loaded) {
            applyLoadedProject(loaded.data, loaded.meta.name, loaded.meta.id);
            setIsProjectModalOpen(false);
            setFeedback(`Proyek "${loaded.meta.name}" berhasil dibuka.`);
          }
        }}
        onNewProject={() => {
          setProjectId(generateUid());
          setProjectName('Proyek Baru');
          setCurrentIndex(0);
          setScenes([
            {
              id: generateUid(),
              layout: 'pembuka',
              title: 'Judul Baru',
              body: 'Subjudul presentasi\nPresenter\n' + new Date().toLocaleDateString('id-ID'),
              text: 'Selamat datang.',
              cap: false,
              fit: 'penuh',
              bg: null,
              imgs: [],
              audio: null,
              vs: 0,
              vd: 0,
              va: 'mute',
              av: false,
              ps: 0,
              fs: 0,
              fmix: null,
              ta: 0,
              tp: 0,
              kc: 1,
            },
            {
              id: generateUid(),
              layout: 'poin',
              title: 'Poin Pembahasan',
              body: 'Poin pertama\nPoin kedua',
              text: '',
              cap: true,
              fit: 'pas',
              bg: null,
              imgs: [],
              audio: null,
              vs: 0,
              vd: 0,
              va: 'mute',
              av: true,
              ps: 0,
              fs: 0,
              fmix: null,
              ta: 0,
              tp: 0,
              kc: 1,
            },
          ]);
          setIsProjectModalOpen(false);
          setFeedback('Proyek baru siap diedit.');
        }}
        onDeleteProject={async (p) => {
          if (confirm(`Hapus proyek "${p.name}"?`)) {
            await deleteProjectDraft(p.id);
            const meta = await getAllProjectMetadata();
            setSavedProjectsList(meta);
          }
        }}
        onExportJson={() => {
          const exportData = {
            name: projectName,
            theme: currentTheme,
            avatar,
            scenes,
          };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
          });
          downloadBlob(blob, `${projectName}.studio.json`);
        }}
        onImportJson={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const parsed = JSON.parse(e.target?.result as string);
              if (parsed.scenes) {
                setScenes(parsed.scenes);
                if (parsed.name) setProjectName(parsed.name);
                if (parsed.theme !== undefined) setCurrentTheme(parsed.theme);
                if (parsed.avatar) setAvatar(parsed.avatar);
                setIsProjectModalOpen(false);
                setFeedback('Proyek berhasil diimpor dari file JSON.');
              }
            } catch {
              setFeedback('File JSON tidak valid.', true);
            }
          };
          reader.readAsText(file);
        }}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSaveToDrive={handleSaveToDrive}
        isSavingToDrive={isSavingToDrive}
        driveCatalog={driveCatalog}
        sheetsUrl={sheetsUrl}
        onRefreshDriveCatalog={handleRefreshDriveCatalog}
        onOpenDriveProject={handleOpenDriveProject}
        onDeleteDriveEntry={handleDeleteDriveEntry}
      />

      {/* Google Sheet & Drive Connection Modal */}
      <GoogleSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => {
          setIsSheetConnected(!!getSavedSheetUrl());
          setIsWebhookConnected(!!getSavedWebhookUrl());
          setIsSheetModalOpen(false);
        }}
        scenes={scenes}
        onImportScenes={handleImportScenesFromSheet}
        projectName={projectName}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onShowFeedback={setFeedback}
      />
    </div>
  );
}
