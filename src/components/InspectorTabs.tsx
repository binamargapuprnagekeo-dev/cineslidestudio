import React, { useRef } from 'react';
import { Scene, CrowdFxItem, VideoCue } from '../types';
import {
  OPENING_PRESETS,
  PHOTO_PRESETS,
  DRAMA_SOUNDSCAPES,
  OVERLAY_MODELS,
  SLIDE_IMAGE_MODELS,
  TRANSITION_MODES,
  JEDAG_JEDUG_STYLES,
  TEXT_COLORS_25,
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

            {/* 35 Slide Transition Modes Selector */}
            <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] text-[#e0b44c] font-bold uppercase tracking-wider">
                  Mode Peralihan Adegan (35 Mode Transisi)
                </label>
                <span className="text-[10px] text-[#8fa1b4] font-medium">
                  {TRANSITION_MODES[scene.tr || 0]?.category}
                </span>
              </div>
              <select
                value={scene.tr || 0}
                onChange={(e) => onUpdateScene({ tr: Number(e.target.value) })}
                className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs text-[#e9eef4] outline-none"
              >
                {TRANSITION_MODES.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.id + 1}. [{tm.category}] {tm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* CapCut / TikTok / Vameo Jedag-Jedug Viral Beat Card */}
            <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!scene.jj}
                    onChange={(e) => onUpdateScene({ jj: e.target.checked })}
                    className="accent-[#e0b44c]"
                  />
                  <span className="text-[11px] text-[#e0b44c] font-bold uppercase tracking-wider">
                    Efek Jedag-Jedug Viral (CapCut/TikTok)
                  </span>
                </label>
                <Sparkles size={13} className={scene.jj ? 'text-[#e0b44c] animate-pulse' : 'text-[#6b7a8a]'} />
              </div>

              {scene.jj && (
                <div className="flex flex-col gap-2 pt-1 border-t border-[#26364a]/60">
                  <label className="block text-[10px] text-[#8fa1b4]">Model Animasi Beat Jedag-Jedug</label>
                  <select
                    value={scene.jjStyle || 0}
                    onChange={(e) => onUpdateScene({ jjStyle: Number(e.target.value) })}
                    className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2.5 py-1.5 text-xs text-[#e9eef4] outline-none"
                  >
                    {JEDAG_JEDUG_STYLES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.id + 1}. {st.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#8fa1b4] italic">
                    {JEDAG_JEDUG_STYLES[scene.jjStyle || 0]?.desc}
                  </p>
                </div>
              )}
            </div>

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
                Isi Slide / Paragraf Teks (Mendukung Teks Panjang)
              </label>
              <textarea
                value={scene.body}
                onChange={(e) => onUpdateScene({ body: e.target.value })}
                rows={8}
                placeholder="Tuliskan paragraf teks panjang atau poin-poin presentasi di sini...&#10;• Poin pertama&#10;• Poin kedua..."
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg p-3 text-xs text-[#e9eef4] outline-none font-sans leading-relaxed"
              />
              <p className="text-[11px] text-[#8fa1b4] mt-1 leading-relaxed">
                Ketik <code className="text-[#e0b44c]">---</code> di baris tersendiri untuk memecah slide otomatis. Teks panjang otomatis diperkecil agar pas pada layar.
              </p>
            </div>

            {/* PowerPoint-Style Formatting Controls Card */}
            <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-3">
              <label className="block text-[11px] text-[#e0b44c] font-bold uppercase tracking-wider">
                Pengaturan Teks Ala PowerPoint
              </label>

              {/* Row 1: Font Size & Font Weight */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#8fa1b4] mb-1">Ukuran Font</label>
                  <select
                    value={scene.fontSize ?? 1.0}
                    onChange={(e) => onUpdateScene({ fontSize: Number(e.target.value) })}
                    className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    <option value={0.75}>Sangat Kecil (0.75x)</option>
                    <option value={0.9}>Kecil (0.9x)</option>
                    <option value={1.0}>Normal (1.0x)</option>
                    <option value={1.25}>Besar (1.25x)</option>
                    <option value={1.5}>Sangat Besar (1.5x)</option>
                    <option value={2.0}>Ekstra Besar (2.0x)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8fa1b4] mb-1">Ketebalan Font</label>
                  <select
                    value={scene.fontWeight ?? 600}
                    onChange={(e) => onUpdateScene({ fontWeight: Number(e.target.value) })}
                    className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    <option value={400}>Regular (400)</option>
                    <option value={500}>Medium (500)</option>
                    <option value={600}>Semibold (600)</option>
                    <option value={700}>Bold (700)</option>
                    <option value={800}>Heavy (800)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Alignment Buttons & Line Height */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#8fa1b4] mb-1">Rataan Teks</label>
                  <div className="flex border border-[#26364a] rounded-lg overflow-hidden bg-[#16212e]">
                    {[
                      { id: 'left', label: 'Kiri' },
                      { id: 'center', label: 'Tengah' },
                      { id: 'right', label: 'Kanan' },
                      { id: 'justify', label: 'Rata' },
                    ].map((align) => (
                      <button
                        key={align.id}
                        type="button"
                        onClick={() =>
                          onUpdateScene({
                            fontAlign: align.id as 'left' | 'center' | 'right' | 'justify',
                          })
                        }
                        className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${
                          (scene.fontAlign || 'left') === align.id
                            ? 'bg-[#e0b44c] text-[#1a1405]'
                            : 'text-[#8fa1b4] hover:text-white'
                        }`}
                      >
                        {align.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8fa1b4] mb-1">Jarak Baris (Spacing)</label>
                  <select
                    value={scene.lineHeight ?? 1.3}
                    onChange={(e) => onUpdateScene({ lineHeight: Number(e.target.value) })}
                    className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    <option value={1.1}>Rapat (1.1x)</option>
                    <option value={1.3}>Normal (1.3x)</option>
                    <option value={1.6}>Renggang (1.6x)</option>
                    <option value={1.9}>Sangat Renggang (1.9x)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Text Box Card Backplate & Multi-Column Layout */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#8fa1b4] mb-1">Kotak Latar Teks (Box)</label>
                  <select
                    value={scene.boxBg || 'none'}
                    onChange={(e) =>
                      onUpdateScene({
                        boxBg: e.target.value as 'none' | 'glass' | 'dark' | 'light',
                      })
                    }
                    className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="none">Tanpa Kotak</option>
                    <option value="glass">Kartu Kaca (Frosted Glass)</option>
                    <option value="dark">Kartu Gelap (Kontras)</option>
                    <option value="light">Kartu Terang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#8fa1b4] mb-1">Penataan Kolom</label>
                  <select
                    value={scene.cols || 1}
                    onChange={(e) =>
                      onUpdateScene({
                        cols: Number(e.target.value) as 1 | 2 | 3,
                      })
                    }
                    className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    <option value={1}>1 Kolom (Penuh)</option>
                    <option value={2}>2 Kolom Seimbang</option>
                    <option value={3}>3 Kolom Paragraf</option>
                  </select>
                </div>
              </div>

              {/* Row 4: 25 Text Color Swatches Palette */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#26364a]/70">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-[#e0b44c] font-semibold">
                    Warna Teks Slide (25 Pilihan Warna)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {scene.textColor && (
                      <button
                        type="button"
                        onClick={() => onUpdateScene({ textColor: '' })}
                        className="px-2 py-0.5 bg-[#16212e] border border-[#26364a] rounded-md text-[10px] text-[#8fa1b4] hover:text-white transition-colors"
                        title="Kembali ke warna bawaan tema"
                      >
                        Reset Tema
                      </button>
                    )}
                    <span
                      className="w-4 h-4 rounded-full border border-white/30 inline-block shadow-sm"
                      style={{ backgroundColor: scene.textColor || '#ffffff' }}
                    />
                    <input
                      type="color"
                      value={scene.textColor || '#ffffff'}
                      onChange={(e) => onUpdateScene({ textColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                      title="Pilih warna bebas (Hex Color)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#0b121b] border border-[#26364a] rounded-lg max-h-48 overflow-y-auto">
                  {TEXT_COLORS_25.map((c) => {
                    const isSelected = (scene.textColor || '').toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => onUpdateScene({ textColor: c.hex })}
                        className={`group relative h-8 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-[#e0b44c] ring-2 ring-[#e0b44c]/50 scale-105 z-10'
                            : 'border-white/10 hover:border-white/40 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={`${c.name} (${c.hex})`}
                      >
                        {isSelected && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              ['#ffffff', '#e9eef4', '#ffd166', '#fde047', '#a7f3d0'].includes(c.hex)
                                ? 'bg-black'
                                : 'bg-white'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
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

            {/* 35 Slide Image Insertion Models */}
            <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-[#8fa1b4] font-medium">
                  Gambar Sisipan pada Tema Slide ({scene.ov?.length || 0}/3)
                </label>
                <button
                  type="button"
                  onClick={() => overlayInputRef.current?.click()}
                  disabled={(scene.ov?.length || 0) >= 3}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 bg-[#1f2d3e] border border-[#26364a] rounded-lg text-[#e9eef4] hover:bg-[#26364a] disabled:opacity-40"
                >
                  <Plus size={11} className="text-[#e0b44c]" />
                  <span>+ Sisipkan Gambar</span>
                </button>
                <input
                  ref={overlayInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const img = new Image();
                      const url = URL.createObjectURL(f);
                      img.src = url;
                      const newOv = [...(scene.ov || []), { el: img, type: 'img' as const, dataUrl: url, file: f }];
                      onUpdateScene({ ov: newOv });
                    }
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Inserted Image Thumbnails */}
              {scene.ov && scene.ov.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {scene.ov.map((imgItem, k) => (
                    <div key={k} className="relative group w-14 h-11 rounded-lg overflow-hidden border border-[#26364a]">
                      <img src={imgItem.dataUrl || ''} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = scene.ov?.filter((_, idx) => idx !== k);
                          onUpdateScene({ ov: updated });
                        }}
                        className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 35 Models Selector */}
              <div>
                <label className="block text-[10px] text-[#8fa1b4] mb-1">
                  Model Tampilan Gambar Sisipan (35 Pilihan)
                </label>
                <select
                  value={scene.ovs || 0}
                  onChange={(e) => onUpdateScene({ ovs: Number(e.target.value) })}
                  className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2.5 py-1.5 text-xs outline-none"
                >
                  {SLIDE_IMAGE_MODELS.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {idx + 1}. {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {scene.bg && scene.bg.type === 'vid' && (
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#26364a]/60 pb-1.5">
                  <label className="text-[11px] text-[#e0b44c] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors size={13} />
                    <span>Editor Pemotong & Kecepatan Video</span>
                  </label>
                  <span className="text-[10px] text-[#8fa1b4]">Format Klip Dubbing</span>
                </div>

                {/* Start & Duration handles */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Mulai Potongan (detik)</label>
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
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Durasi Klip (0 = Ikut Narasi)</label>
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

                {/* Video Speed Multiplier */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Kecepatan Putar Video</label>
                    <select
                      value={scene.gs || 1}
                      onChange={(e) => onUpdateScene({ gs: Number(e.target.value) })}
                      className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                    >
                      <option value={0.5}>0.5x (Lambat / Slowmo)</option>
                      <option value={0.75}>0.75x (Sedikit Lambat)</option>
                      <option value={1}>1.0x (Normal)</option>
                      <option value={1.25}>1.25x (Sedikit Cepat)</option>
                      <option value={1.5}>1.5x (Cepat)</option>
                      <option value={2}>2.0x (Sangat Cepat)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#8fa1b4] mb-1">Suara Asli Video</label>
                    <select
                      value={scene.va || 'mute'}
                      onChange={(e) => onUpdateScene({ va: e.target.value as 'mute' | 'low' | 'full' })}
                      className="w-full bg-[#16212e] border border-[#26364a] rounded-lg px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="mute">Bisukan (Dubbing AI Penuh)</option>
                      <option value="low">Kecil (di belakang narasi)</option>
                      <option value="full">Normal (Latar Asli)</option>
                    </select>
                  </div>
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
