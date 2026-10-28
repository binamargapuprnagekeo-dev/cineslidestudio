export interface AudioData {
  buf: AudioBuffer;
  b64: string;
  mime: string;
  url: string;
}

export interface MediaAsset {
  el: HTMLImageElement | HTMLVideoElement;
  type: 'img' | 'vid';
  dataUrl?: string | null;
  file?: File | Blob | null;
  fileId?: string | null;
}

export interface PhotoAsset {
  el: HTMLImageElement;
  type: 'img';
  dataUrl?: string | null;
  file?: File | null;
  fileId?: string | null;
}

export interface VideoCue {
  vt: number; // video timestamp in seconds
  text: string;
  audio?: AudioData | null;
  vm?: string; // voice mode override
  used?: string;
}

export interface CrowdFxItem {
  type: 'yel' | 'sorak' | 'tepuk' | 'ramai' | 'berkas';
  t: number; // start time in scene
  vol: number; // 0..1
  dur?: number; // duration in seconds
  size?: 'k' | 's' | 'b' | 'x'; // small, medium, large, stadium
  mode?: number; // 0: unison, 1: call-and-response, 2: 3x repeat
  text?: string;
  seed?: number;
  cheer?: boolean;
  name?: string;
  takes?: Array<{ b64: string; mime: string }> | null;
  tb?: Float32Array[] | null;
  buf?: AudioBuffer | null;
}

export interface VideoSegmentConfig {
  cuts: number[];
  rates: number[];
}

export type SceneLayout =
  | 'pembuka'
  | 'foto'
  | 'judul'
  | 'poin'
  | 'split'
  | 'splitL'
  | 'kartu'
  | 'atas'
  | 'tengah'
  | 'kutipan'
  | 'dua'
  | 'angka'
  | 'garis'
  | 'bagian'
  | 'penutup'
  | 'video'
  | 'gerak';

export interface Scene {
  id: string;
  layout: SceneLayout;
  title: string;
  body: string;
  text: string; // Narasi dibacakan AI
  cap: boolean; // Tampilkan subtitle narasi
  fit: 'pas' | 'penuh' | null;
  bg: MediaAsset | null;
  imgs: PhotoAsset[];
  audio: AudioData | null;
  vs: number; // Mulai klip video (detik)
  vd: number; // Durasi klip video (0 = ikut narasi)
  va: 'mute' | 'low' | 'full'; // Suara asli video
  av: boolean; // Tampilkan avatar di adegan ini
  ps: number; // Preset pembuka/penutup 0..24
  fs: number; // Preset animasi slide foto 0..49
  fmix: number[] | null; // Urutan animasi gabungan (maks 5)
  ta: number; // Efek teks (0: naik, 1: zoom, 2: ketik, 3: geser)
  tp: number; // Posisi teks (0: bawah, 1: tengah, 2: atas)
  kc: number; // Bunyi ketikan keyboard (1: ya, 0: tidak)
  kb?: number;
  cues?: VideoCue[]; // Narasi sesuai video per waktu
  cf?: boolean; // Percepat audio otomatis jika perlu
  cm?: number; // Batas percepatan (1.1, 1.25, 1.4)
  fx?: CrowdFxItem[]; // Suara ramai (yel-yel, sorak, dll.)
  amT?: number; // Tema suara latar drama (-2: ikut sebelumnya, -1: henti, 0..34)
  amV?: number; // Volume suara latar (0..100)
  amD?: number; // Tahan adegan minimal (detik)
  gm?: number; // Tema animasi gerak 0..49
  gs?: number; // Kecepatan gerak (0.5, 1, 1.5, 2)
  gp?: number; // Posisi teks gerak (0: tengah, 1: bawah, 2: atas, 3: tanpa teks)
  ga?: number; // Efek teks gerak (0..3)
  gd?: number; // Durasi minimal gerak (detik)
  ov?: PhotoAsset[]; // Overlay foto kecil pada video (maks 3)
  ovs?: number; // Model overlay 0..24
  sg?: VideoSegmentConfig | null; // Pemotong & pengatur kecepatan video
}

export interface AvatarConfig {
  type: '' | 'f1' | 'f2' | 'f3' | 'm1' | 'm2' | 'm3' | 'foto' | 'img';
  skin: number; // 0..3
  col: '' | 'a' | 'b' | 'r' | 'g' | 'u' | 'k' | 'w';
  pos: 'r' | 'l';
  size: 's' | 'm' | 'l';
  mx: number;
  my: number;
  mw: number;
  fz: number;
  fx: number;
  fy: number;
  sx: number;
  fr: number;
  jy: number;
  jx: number;
  jw: number;
  bd: 'f' | 'm' | '';
  ok: boolean;
  lb: boolean;
}

export interface ThemeConfig {
  n: string;
  bg: string;
  b2: string;
  ink: string;
  ac: string;
  art?: string;
  c?: HTMLCanvasElement;
  u?: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  updated: number;
  scenes: number;
  duration: number;
  driveId?: string | null;
}

export interface ProjectData {
  v: number;
  theme: number;
  sm: 'scene' | 'on' | 'off';
  avatar: AvatarConfig;
  avatarImg?: string | null;
  avatarPhoto?: string | null;
  ref?: string | null;
  voice: {
    mode: string;
    style: string;
    q: string;
    rt: string;
  };
  scenes: Array<Record<string, unknown>>;
  music?: {
    fileId?: string | null;
    size: number;
    mime: string;
    name: string;
    vol: number;
    duck: boolean;
    blob?: Blob;
    dataUrl?: string;
  } | null;
}
