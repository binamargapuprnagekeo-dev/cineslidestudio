import React, { useState, useRef } from 'react';
import { AvatarConfig } from '../types';
import { UserCheck, Upload, ChevronDown, CheckSquare, Crosshair } from 'lucide-react';

interface AvatarPanelProps {
  avatar: AvatarConfig;
  onAvatarChange: (newConfig: AvatarConfig) => void;
  onUploadPhoto: (file: File) => void;
  onUploadCustomImage: (file: File) => void;
  avatarPhotoUrl?: string | null;
  avatarImgUrl?: string | null;
}

export const AvatarPanel: React.FC<AvatarPanelProps> = ({
  avatar,
  onAvatarChange,
  onUploadPhoto,
  onUploadCustomImage,
  avatarPhotoUrl,
  avatarImgUrl,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showManualAlign, setShowManualAlign] = useState(false);
  const [alignPoints, setAlignPoints] = useState<[number, number][]>([]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const customImgInputRef = useRef<HTMLInputElement>(null);
  const alignCanvasRef = useRef<HTMLCanvasElement>(null);

  const updateProp = <K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
    onAvatarChange({ ...avatar, [key]: val });
  };

  const handleManualClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (alignPoints.length >= 3 || !alignCanvasRef.current) return;
    const rect = alignCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const nextPoints = [...alignPoints, [x, y] as [number, number]];
    setAlignPoints(nextPoints);

    if (nextPoints.length === 3) {
      // 3 clicks: Left eye, Right eye, Mouth center
      const [p1, p2, p3] = nextPoints;
      const eyeDx = p2[0] - p1[0];
      const eyeDy = p2[1] - p1[1];
      const eyeDist = Math.hypot(eyeDx, eyeDy);
      const angle = Math.atan2(eyeDy, eyeDx);

      const eyeMidX = (p1[0] + p2[0]) / 2;
      const eyeMidY = (p1[1] + p2[1]) / 2;
      const mouthYDiff = p3[1] - eyeMidY;

      onAvatarChange({
        ...avatar,
        fz: Math.max(0.6, Math.min(1.8, 0.45 / (eyeDist || 0.3))),
        fx: Number(((0.5 - eyeMidX) * 0.8).toFixed(3)),
        fy: Number(((0.5 - eyeMidY) * 0.8).toFixed(3)),
        fr: Number((-angle).toFixed(3)),
        jy: Number((-(mouthYDiff * 1.6)).toFixed(3)),
      });
      setShowManualAlign(false);
      setAlignPoints([]);
    }
  };

  return (
    <div className="bg-[#16212e] border border-[#26364a] rounded-xl mb-3 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 text-left text-xs uppercase tracking-wider font-bold text-[#8fa1b4] hover:text-[#e9eef4] select-none"
      >
        <span className="flex items-center gap-1.5">
          <UserCheck size={14} className="text-[#e0b44c]" />
          <span>Avatar Presenter</span>
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="p-3.5 pt-0 border-t border-[#26364a]/50 flex flex-col gap-3 text-xs text-[#e9eef4]">
          {/* Character selection */}
          <div>
            <label className="block text-[11px] text-[#8fa1b4] mb-1">Pilihan Karakter</label>
            <select
              value={avatar.type}
              onChange={(e) => updateProp('type', e.target.value as AvatarConfig['type'])}
              className="w-full bg-[#0b121b] text-[#e9eef4] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none"
            >
              <option value="">Tanpa avatar</option>
              <option value="f1">Cewek profesional (kuncir, blazer)</option>
              <option value="f2">Cewek berhijab (blazer)</option>
              <option value="f3">Cewek CS (headset)</option>
              <option value="m1">Cowok profesional (jas & dasi)</option>
              <option value="m2">Cowok berkacamata (jas)</option>
              <option value="m3">Cowok CS (headset)</option>
              <option value="foto">Foto saya (kepala 3D)</option>
              <option value="img">Gambar sendiri (PNG transparan)</option>
            </select>
          </div>

          {avatar.type && avatar.type !== 'img' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#8fa1b4] mb-1">Warna Kulit</label>
                <select
                  value={avatar.skin}
                  onChange={(e) => updateProp('skin', Number(e.target.value))}
                  className="w-full bg-[#0b121b] text-[#e9eef4] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  <option value={0}>Cerah</option>
                  <option value={1}>Sawo muda</option>
                  <option value={2}>Sawo matang</option>
                  <option value={3}>Gelap</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8fa1b4] mb-1">Pakaian</label>
                <select
                  value={avatar.col}
                  onChange={(e) => updateProp('col', e.target.value as AvatarConfig['col'])}
                  className="w-full bg-[#0b121b] text-[#e9eef4] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  <option value="">Navy (bawaan)</option>
                  <option value="a">Ikuti tema</option>
                  <option value="b">Biru</option>
                  <option value="r">Merah</option>
                  <option value="g">Hijau</option>
                  <option value="u">Ungu</option>
                  <option value="k">Hitam</option>
                  <option value="w">Putih</option>
                </select>
              </div>
            </div>
          )}

          {avatar.type && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#8fa1b4] mb-1">Posisi</label>
                <select
                  value={avatar.pos}
                  onChange={(e) => updateProp('pos', e.target.value as AvatarConfig['pos'])}
                  className="w-full bg-[#0b121b] text-[#e9eef4] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  <option value="r">Kanan bawah</option>
                  <option value="l">Kiri bawah</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8fa1b4] mb-1">Ukuran</label>
                <select
                  value={avatar.size}
                  onChange={(e) => updateProp('size', e.target.value as AvatarConfig['size'])}
                  className="w-full bg-[#0b121b] text-[#e9eef4] border border-[#26364a] rounded-lg px-2 py-1.5 text-xs outline-none"
                >
                  <option value="s">Kecil</option>
                  <option value="m">Sedang</option>
                  <option value="l">Besar</option>
                </select>
              </div>
            </div>
          )}

          {/* 3D Photo Avatar Controls */}
          {avatar.type === 'foto' && (
            <div className="p-2.5 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-xs font-semibold"
              >
                <Upload size={13} className="text-[#e0b44c]" />
                <span>{avatarPhotoUrl ? 'Ganti Foto Wajah' : 'Unggah Foto Wajah'}</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadPhoto(f);
                  e.target.value = '';
                }}
              />

              {avatarPhotoUrl && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualAlign(!showManualAlign);
                        setAlignPoints([]);
                      }}
                      className="flex-1 py-1.5 px-2 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Crosshair size={12} className="text-[#4cc9f0]" />
                      <span>{showManualAlign ? 'Tutup Penanda' : 'Tandai Manual (3 Klik)'}</span>
                    </button>
                  </div>

                  {showManualAlign && (
                    <div className="p-2 bg-[#16212e] rounded-lg border border-[#26364a] flex flex-col items-center">
                      <p className="text-[11px] text-[#8fa1b4] mb-2 text-center">
                        {alignPoints.length === 0
                          ? '1. Klik MATA KIRI'
                          : alignPoints.length === 1
                          ? '2. Klik MATA KANAN'
                          : '3. Klik TENGAH MULUT'}
                      </p>
                      <div className="relative">
                        <canvas
                          ref={alignCanvasRef}
                          width={260}
                          height={260}
                          onClick={handleManualClick}
                          className="w-[260px] h-[260px] rounded border border-[#26364a] cursor-crosshair object-cover bg-black"
                          style={{
                            backgroundImage: `url(${avatarPhotoUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                        {alignPoints.map(([px, py], i) => (
                          <div
                            key={i}
                            className="absolute w-3 h-3 bg-red-500 rounded-full border border-white -translate-x-1.5 -translate-y-1.5 pointer-events-none"
                            style={{ left: `${px * 100}%`, top: `${py * 100}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="flex items-start gap-2 text-[11px] text-[#8fa1b4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avatar.ok}
                      onChange={(e) => updateProp('ok', e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>Saya memakai foto saya sendiri atau memiliki izin pemilik foto.</span>
                  </label>

                  <label className="flex items-center gap-2 text-[11px] text-[#8fa1b4] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avatar.lb}
                      onChange={(e) => updateProp('lb', e.target.checked)}
                    />
                    <span>Tampilkan label "Dibuat dengan AI"</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#8fa1b4]">Zoom Foto</label>
                      <input
                        type="range"
                        min="0.4"
                        max="1.8"
                        step="0.02"
                        value={avatar.fz}
                        onChange={(e) => updateProp('fz', Number(e.target.value))}
                        className="w-full accent-[#e0b44c]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#8fa1b4]">Posisi Mulut (Y)</label>
                      <input
                        type="range"
                        min="-0.8"
                        max="-0.1"
                        step="0.02"
                        value={avatar.jy}
                        onChange={(e) => updateProp('jy', Number(e.target.value))}
                        className="w-full accent-[#e0b44c]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Custom PNG Avatar Controls */}
          {avatar.type === 'img' && (
            <div className="p-2.5 bg-[#0b121b] border border-[#26364a] rounded-lg flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => customImgInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-xs font-semibold"
              >
                <Upload size={13} className="text-[#e0b44c]" />
                <span>{avatarImgUrl ? 'Ganti Gambar PNG' : 'Pilih Gambar Karakter (PNG)'}</span>
              </button>
              <input
                ref={customImgInputRef}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadCustomImage(f);
                  e.target.value = '';
                }}
              />

              {avatarImgUrl && (
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="block text-[10px] text-[#8fa1b4]">
                      Posisi Mulut: Kiri-Kanan ({avatar.mx}%)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={avatar.mx}
                      onChange={(e) => updateProp('mx', Number(e.target.value))}
                      className="w-full accent-[#e0b44c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8fa1b4]">
                      Posisi Mulut: Atas-Bawah ({avatar.my}%)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={avatar.my}
                      onChange={(e) => updateProp('my', Number(e.target.value))}
                      className="w-full accent-[#e0b44c]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
