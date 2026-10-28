import React, { useRef } from 'react';
import { Scene, CrowdFxItem, VideoCue } from '../types';
import {
  OPENING_PRESETS,
  PHOTO_PRESETS,
  DRAMA_SOUNDSCAPES,
  OVERLAY_MODELS,
} from '../constants/presets';
import {
  Sliders,
  Type,
  Image as ImageIcon,
  Mic,
  Volume2,
  ExternalLink,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Scissors,
  Users,
  TreePine,
  Sparkles,
} from 'lucide-react';

interface InspectorTabsProps {
  scene: Scene;
  onUpdateScene: (updated: Partial<Scene>) => void;
  activeTab: 'tampil' | 'teks' | 'media' | 'narasi' | 'suara';
  onTabChange: (tab: 'tampil' | 'teks' | 'media' | 'narasi' | 'suara') => void;
  // Voice & Colab
  colabCode: string;
  onColabCodeChange: (code: string) => void;
  onConnectColab: () => void;
  isColabConnected: boolean;
  colabGpu?: string;
  voiceMode: string;
  onVoiceModeChange: (mode: string) => void;
  voiceStyle: string;
  onVoiceStyleChange: (style: string) => void;
  voiceQuality: string;
  onVoiceQualityChange: (q: string) => void;
  voiceRefText: string;
  onVoiceRefTextChange: (text: string) => void;
  refAudioBase64?: string | null;
  onUploadVoiceRef: (file: File) => void;
  onStartRecordVoiceRef: () => void;
  onStopRecordVoiceRef: () => void;
  isRecordingVoiceRef: boolean;
  voiceRecordSeconds: number;
  onGenerateCurrentNarration: () => void;
  onGenerateAllNarrations: () => void;
  isBusy: boolean;
}

export const InspectorTabs: React.FC<InspectorTabsProps> = ({
  scene,
  onUpdateScene,
  activeTab,
  onTabChange,
  colabCode,
  onColabCodeChange,
  onConnectColab,
  isColabConnected,
  colabGpu,
  voiceMode,
  onVoiceModeChange,
  voiceStyle,
  onVoiceStyleChange,
  voiceQuality,
  onVoiceQualityChange,
  voiceRefText,
  onVoiceRefTextChange,
  refAudioBase64,
  onUploadVoiceRef,
  onStartRecordVoiceRef,
  onStopRecordVoiceRef,
  isRecordingVoiceRef,
  voiceRecordSeconds,
  onGenerateCurrentNarration,
  onGenerateAllNarrations,
  isBusy,
}) => {
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const photoAddInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const voiceSampleInputRef = useRef<HTMLInputElement>(null);

  const TABS = [
    { id: 'tampil', label: 'Tampilan', icon: Sliders },
    { id: 'teks', label: 'Teks', icon: Type },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'narasi', label: 'Narasi', icon: Mic },
    { id: 'suara', label: 'Suara AI', icon: Volume2 },
  ] as const;

  return (
    <div className="bg-[#16212e] border border-[#26364a] rounded-xl overflow-hidden flex flex-col h-full text-xs text-[#e9eef4]">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-[#26364a] bg-[#101824] p-1 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#e0b44c] text-[#1a1405] shadow-sm'
                  : 'text-[#8fa1b4] hover:text-[#e9eef4] hover:bg-[#1a2838]'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
              {tab.id === 'suara' && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isColabConnected ? 'bg-[#2fb36b]' : 'bg-[#6b7a8a]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Container */}
      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 scrollbar-thin">
        {/* ================= TAB 1: TAMPILAN ================= */}
        {activeTab === 'tampil' && (
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Tata Letak Slide
              </label>
              <select
                value={scene.layout}
                onChange={(e) =>
                  onUpdateScene({
                    layout: e.target.value as Scene['layout'],
                    cap: e.target.value === 'video',
                  })
                }
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none"
              >
                <option value="pembuka">Pembuka (intro animasi)</option>
                <option value="foto">Slide foto (animasi & slideshow)</option>
                <option value="judul">Slide judul besar</option>
                <option value="poin">Poin-poin naratif</option>
                <option value="split">Teks + gambar (kanan)</option>
                <option value="splitL">Gambar kiri + teks</option>
                <option value="kartu">Gambar berbingkai (kartu)</option>
                <option value="atas">Gambar atas + teks</option>
                <option value="tengah">Gambar tengah + keterangan</option>
                <option value="kutipan">Kutipan ucapan (quote)</option>
                <option value="dua">Dua kolom seimbang</option>
                <option value="angka">Angka / statistik highlight</option>
                <option value="garis">Linimasa langkah</option>
                <option value="bagian">Pembatas bagian (chapter)</option>
                <option value="penutup">Penutup (outro animasi)</option>
                <option value="video">Video dubbing</option>
              </select>
            </div>

            {/* Intro / Outro Style Gallery */}
            {(scene.layout === 'pembuka' || scene.layout === 'penutup') && (
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] text-[#8fa1b4] font-medium">
                    Gaya Animasi Pembuka / Penutup (25 Pilihan)
                  </label>
                  <span className="text-[11px] text-[#e0b44c] font-semibold truncate max-w-[150px]">
                    {OPENING_PRESETS[scene.ps || 0]?.[0]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {OPENING_PRESETS.map((op, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onUpdateScene({ ps: i })}
                      className={`flex items-center gap-2 min-h-[38px] px-2.5 py-1.5 rounded-lg text-left text-xs leading-normal border transition-all ${
                        (scene.ps ?? 0) === i
                          ? 'bg-[#22344a] border-[#e0b44c] text-white font-semibold shadow-sm ring-1 ring-[#e0b44c]/30'
                          : 'bg-[#16212e] border-[#26364a] text-[#b0c0d0] hover:text-[#e9eef4] hover:bg-[#1f2d3e]'
                      }`}
                      title={`${i + 1}. ${op[0]}`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${op[2]}, ${op[4]})` }}
                      />
                      <span className="truncate block w-full leading-normal">
                        {i + 1}. {op[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Slide Style Gallery (50 Styles) */}
            {scene.layout === 'foto' && (
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-[#8fa1b4] font-medium">
                    Foto di Slide Ini ({scene.imgs?.length || 0}/5)
                  </label>
                  <button
                    type="button"
                    onClick={() => photoAddInputRef.current?.click()}
                    disabled={(scene.imgs?.length || 0) >= 5}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 bg-[#1f2d3e] border border-[#26364a] rounded-lg text-[#e9eef4] hover:bg-[#26364a] disabled:opacity-40"
                  >
                    <Plus size={11} className="text-[#e0b44c]" />
                    <span>+ Foto</span>
                  </button>
                  <input
                    ref={photoAddInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const img = new Image();
                        const url = URL.createObjectURL(f);
                        img.src = url;
                        const newImgs = [...(scene.imgs || []), { el: img, type: 'img' as const, dataUrl: url, file: f }];
                        onUpdateScene({ imgs: newImgs, bg: newImgs[0] });
                      }
                      e.target.value = '';
                    }}
                  />
                </div>

                {/* Photo Previews */}
                <div className="flex gap-2 flex-wrap">
                  {scene.imgs?.map((photo, k) => (
                    <div key={k} className="relative group w-14 h-11 rounded-lg overflow-hidden border border-[#26364a]">
                      <img src={photo.dataUrl || ''} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = scene.imgs.filter((_, idx) => idx !== k);
                          onUpdateScene({ imgs: updated, bg: updated[0] || null });
                        }}
                        className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <label className="block text-[11px] text-[#8fa1b4] font-medium">
                    Gaya Animasi Foto (50 Pilihan)
                  </label>
                  <span className="text-[11px] text-[#e0b44c] font-semibold truncate max-w-[150px]">
                    {PHOTO_PRESETS[scene.fs || 0]?.[0]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {PHOTO_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onUpdateScene({ fs: i })}
                      className={`flex items-center min-h-[38px] px-2.5 py-1.5 rounded-lg text-left text-xs leading-normal border transition-all ${
                        scene.fs === i
                          ? 'bg-[#22344a] border-[#e0b44c] text-white font-semibold shadow-sm ring-1 ring-[#e0b44c]/30'
                          : 'bg-[#16212e] border-[#26364a] text-[#b0c0d0] hover:text-[#e9eef4] hover:bg-[#1f2d3e]'
                      }`}
                      title={`${i + 1}. ${p[0]}`}
                    >
                      <span className="truncate block w-full leading-normal">
                        {i + 1}. {p[0]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Efek Teks</label>
                    <select
                      value={scene.ta ?? 2}
                      onChange={(e) => onUpdateScene({ ta: Number(e.target.value) })}
                      className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                      <option value={2}>Ketik (kursor)</option>
                      <option value={0}>Muncul perlahan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Posisi Teks</label>
                    <select
                      value={scene.tp ?? 0}
                      onChange={(e) => onUpdateScene({ tp: Number(e.target.value) })}
                      className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                      <option value={0}>Bawah</option>
                      <option value={1}>Tengah</option>
                      <option value={2}>Atas</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* General Tampilan settings */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#26364a]/50">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scene.av !== false}
                  onChange={(e) => onUpdateScene({ av: e.target.checked })}
                />
                <span>Tampilkan avatar presenter di adegan ini</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scene.cap}
                  onChange={(e) => onUpdateScene({ cap: e.target.checked })}
                />
                <span>Tampilkan subtitle teks narasi</span>
              </label>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TEKS ================= */}
        {activeTab === 'teks' && (
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Judul Slide
              </label>
              <input
                type="text"
                value={scene.title}
                onChange={(e) => onUpdateScene({ title: e.target.value })}
                placeholder="Tuliskan judul slide..."
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-3 py-2 text-xs text-[#e9eef4] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Isi Slide (Satu baris = satu poin)
              </label>
              <textarea
                value={scene.body}
                onChange={(e) => onUpdateScene({ body: e.target.value })}
                rows={6}
                placeholder="Poin pertama&#10;Poin kedua&#10;Poin ketiga..."
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg p-3 text-xs text-[#e9eef4] outline-none font-sans"
              />
              <p className="text-[11px] text-[#8fa1b4] mt-1 leading-relaxed">
                Ketik <code className="text-[#e0b44c]">---</code> di baris tersendiri untuk membuat halaman tambahan otomatis.
                Untuk tata letak Angka, tulis: <code className="text-[#e0b44c]">85% | Kepuasan Pengguna</code>.
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB 3: MEDIA ================= */}
        {activeTab === 'media' && (
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Latar / Klip Adegan (Gambar atau Video)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <ImageIcon size={13} className="text-[#4cc9f0]" />
                  <span>{scene.bg ? 'Ganti File Latar' : 'Pilih Gambar / Video'}</span>
                </button>
                {scene.bg && (
                  <button
                    type="button"
                    onClick={() => onUpdateScene({ bg: null })}
                    className="p-2 bg-[#1f2d3e] hover:bg-[#3d1a20] border border-[#26364a] text-[#e5484d] rounded-lg"
                    title="Hapus latar"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const isVid = f.type.startsWith('video');
                      const url = URL.createObjectURL(f);
                      const el = document.createElement(isVid ? 'video' : 'img');
                      el.src = url;
                      if (isVid) {
                        (el as HTMLVideoElement).muted = true;
                        (el as HTMLVideoElement).loop = true;
                        (el as HTMLVideoElement).playsInline = true;
                      }
                      onUpdateScene({
                        bg: { el, type: isVid ? 'vid' : 'img', dataUrl: url, file: f },
                      });
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {scene.bg && scene.bg.type === 'vid' && (
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Mulai Klip (detik)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={scene.vs || 0}
                      onChange={(e) => onUpdateScene({ vs: Number(e.target.value) })}
                      className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Durasi (0 = ikut narasi)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={scene.vd || 0}
                      onChange={(e) => onUpdateScene({ vd: Number(e.target.value) })}
                      className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8fa1b4] mb-1">Suara Asli Video</label>
                  <select
                    value={scene.va || 'mute'}
                    onChange={(e) => onUpdateScene({ va: e.target.value as 'mute' | 'low' | 'full' })}
                    className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  >
                    <option value="mute">Bisukan (dubbing penuh)</option>
                    <option value="low">Kecil, di belakang narasi</option>
                    <option value="full">Normal</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: NARASI ================= */}
        {activeTab === 'narasi' && (
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Teks Narasi (Dibacakan AI)
              </label>
              <textarea
                value={scene.text}
                onChange={(e) => onUpdateScene({ text: e.target.value, audio: null })}
                rows={4}
                placeholder="Tuliskan naskah yang akan dibacakan oleh suara AI pada adegan ini..."
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg p-3 text-xs text-[#e9eef4] outline-none"
              />
            </div>

            {/* Generate voice buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBusy || !scene.text.trim()}
                onClick={onGenerateCurrentNarration}
                className="flex-1 py-2 px-3 bg-[#e0b44c] hover:bg-[#f3ca6a] text-[#1a1405] rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>Buat Suara AI</span>
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={onGenerateAllNarrations}
                className="py-2 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                <span>Buat Semua</span>
              </button>
            </div>

            {/* Audio player if generated */}
            {scene.audio && (
              <div className="p-2.5 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-[#2fb36b] font-medium">
                  <span>✓ Suara Narasi Siap</span>
                  <a
                    href={scene.audio.url}
                    download="narasi.mp3"
                    className="text-[#8fa1b4] hover:text-[#e0b44c] underline"
                  >
                    Unduh Audio
                  </a>
                </div>
                <audio src={scene.audio.url} controls className="w-full h-8" />
              </div>
            )}

            {/* Drama Soundscapes (35 Themes) */}
            <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
              <label className="block text-[11px] text-[#8fa1b4] font-medium">
                Suara Latar Drama (35 Tema: Burung, Laut, Angin, Api, dll.)
              </label>
              <select
                value={scene.amT ?? -2}
                onChange={(e) => onUpdateScene({ amT: Number(e.target.value) })}
                className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none"
              >
                <option value={-2}>Lanjutkan dari adegan sebelumnya</option>
                <option value={-1}>Tanpa suara latar (hentikan)</option>
                {DRAMA_SOUNDSCAPES.map((d, idx) => (
                  <option key={idx} value={idx}>
                    {idx + 1}. {d[0]}
                  </option>
                ))}
              </select>

              {(scene.amT === undefined || scene.amT >= 0) && (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between text-[11px] text-[#8fa1b4]">
                    <span>Volume Suara Latar</span>
                    <span className="font-mono text-[#e9eef4]">{scene.amV ?? 60}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={scene.amV ?? 60}
                    onChange={(e) => onUpdateScene({ amV: Number(e.target.value) })}
                    className="w-full accent-[#e0b44c]"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: SUARA AI & KONEKSI ================= */}
        {activeTab === 'suara' && (
          <div className="flex flex-col gap-3.5">
            {/* Colab Connection Card */}
            <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8fa1b4] uppercase tracking-wider flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isColabConnected ? 'bg-[#2fb36b]' : 'bg-[#6b7a8a]'
                    }`}
                  />
                  <span>Koneksi Colab VoxCPM2</span>
                </span>
                <a
                  href="https://colab.research.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-[#e0b44c] hover:underline"
                >
                  <span>Buka Colab</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={colabCode}
                  onChange={(e) => onColabCodeChange(e.target.value)}
                  placeholder="Tempel kode koneksi (URL|TOKEN)"
                  className="flex-1 bg-[#16212e] border border-[#26364a] rounded-lg px-2.5 py-1.5 text-xs text-[#e9eef4] outline-none"
                />
                <button
                  type="button"
                  onClick={onConnectColab}
                  className="px-3 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-xs font-semibold text-[#e9eef4]"
                >
                  Hubungkan
                </button>
              </div>
              <p className="text-[11px] text-[#8fa1b4]">
                Jika Colab tidak terhubung, studio otomatis menggunakan synthesizer browser berkecepatan tinggi secara mandiri.
              </p>
            </div>

            {/* Voice Mode */}
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Karakter Suara
              </label>
              <select
                value={voiceMode}
                onChange={(e) => onVoiceModeChange(e.target.value)}
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none"
              >
                <option value="clone">Suaraku (Kloning suara)</option>
                <option value="female">Cewek AI</option>
                <option value="male">Cowok AI</option>
              </select>
            </div>

            {/* Voice clone sample recording / upload */}
            {voiceMode === 'clone' && (
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
                <label className="block text-[11px] text-[#8fa1b4] font-medium">
                  Contoh Suara untuk Kloning
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isRecordingVoiceRef ? onStopRecordVoiceRef : onStartRecordVoiceRef}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                      isRecordingVoiceRef
                        ? 'bg-[#e5484d] border-[#e5484d] text-white animate-pulse'
                        : 'bg-[#1f2d3e] border-[#26364a] text-[#e9eef4] hover:bg-[#26364a]'
                    }`}
                  >
                    <Mic size={13} />
                    <span>
                      {isRecordingVoiceRef ? `Stop Rekam (${voiceRecordSeconds}s)` : 'Rekam Suara (5-15s)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => voiceSampleInputRef.current?.click()}
                    className="py-1.5 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-xs font-semibold"
                  >
                    Unggah Audio
                  </button>
                  <input
                    ref={voiceSampleInputRef}
                    type="file"
                    accept="audio/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadVoiceRef(f);
                      e.target.value = '';
                    }}
                  />
                </div>

                {refAudioBase64 && (
                  <p className="text-[11px] text-[#2fb36b]">✓ Contoh suara kloning siap digunakan.</p>
                )}
              </div>
            )}

            {/* Voice Style Preset */}
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Gaya Suara
              </label>
              <select
                value={voiceStyle}
                onChange={(e) => onVoiceStyleChange(e.target.value)}
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none mb-1.5"
              >
                <option value="">Bawaan (Netral)</option>
                <option value="deep, authoritative, confident, steady, slow and clear">
                  Berwibawa & Tenang
                </option>
                <option value="calm, professional news anchor, clear and measured">
                  Pembaca Berita Profesional
                </option>
                <option value="warm, friendly, gentle and reassuring">Hangat & Ramah</option>
                <option value="energetic, cheerful, slightly faster">Ceria & Bersemangat</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Kualitas Synthesizer
              </label>
              <select
                value={voiceQuality}
                onChange={(e) => onVoiceQualityChange(e.target.value)}
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none"
              >
                <option value="6">Cepat (6 Steps)</option>
                <option value="10">Seimbang (10 Steps - Rekomendasi)</option>
                <option value="16">Terbaik (16 Steps)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
