import React, { useState, useRef } from 'react';
import { Music, Upload, Trash2, ChevronDown, Volume2 } from 'lucide-react';

interface MusicPanelProps {
  musicName?: string;
  musicVolume: number;
  onVolumeChange: (vol: number) => void;
  ducking: boolean;
  onDuckingChange: (duck: boolean) => void;
  onUploadMusic: (file: File) => void;
  onRemoveMusic: () => void;
}

export const MusicPanel: React.FC<MusicPanelProps> = ({
  musicName,
  musicVolume,
  onVolumeChange,
  ducking,
  onDuckingChange,
  onUploadMusic,
  onRemoveMusic,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadMusic(file);
      e.target.value = '';
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
          <Music size={14} className="text-[#4cc9f0]" />
          <span>Musik Latar {musicName ? '♪' : ''}</span>
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="p-3.5 pt-0 border-t border-[#26364a]/50 flex flex-col gap-3 text-xs text-[#e9eef4]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-xs font-semibold"
          >
            <Upload size={13} className="text-[#4cc9f0]" />
            <span>{musicName ? 'Ganti Musik' : 'Pilih Musik (MP3 / WAV)'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={handleFileChange}
          />

          <p className="text-[11px] text-[#8fa1b4] truncate">
            {musicName ? `Musik: ${musicName}` : 'Belum ada musik latar.'}
          </p>

          {musicName && (
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#8fa1b4] mb-1">
                  <span className="flex items-center gap-1">
                    <Volume2 size={12} />
                    <span>Volume Musik</span>
                  </span>
                  <span className="font-mono text-[#e9eef4]">{musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-full accent-[#e0b44c]"
                />
              </div>

              <label className="flex items-center gap-2 text-[11px] text-[#8fa1b4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={ducking}
                  onChange={(e) => onDuckingChange(e.target.checked)}
                />
                <span>Kecilkan volume saat narasi berbicara (Ducking)</span>
              </label>

              <button
                type="button"
                onClick={onRemoveMusic}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#1f2d3e] hover:bg-[#3d1a20] text-[#e5484d] border border-[#26364a] rounded-lg text-xs font-semibold"
              >
                <Trash2 size={13} />
                <span>Hapus Musik</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
