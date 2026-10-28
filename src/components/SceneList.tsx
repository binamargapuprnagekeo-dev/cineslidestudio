import React, { useRef } from 'react';
import { Scene } from '../types';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Film,
  Sparkles,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  FileSpreadsheet,
} from 'lucide-react';

interface SceneListProps {
  scenes: Scene[];
  currentIndex: number;
  onSelectScene: (index: number) => void;
  onAddSlide: () => void;
  onAddVideoDub: () => void;
  onAddIntro: () => void;
  onAddOutro: () => void;
  onAddPhotoSlide: (files: File[]) => void;
  onAddMotionGraphic: () => void;
  onOpenGoogleSheets?: () => void;
  onDeleteScene: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}


export const SceneList: React.FC<SceneListProps> = ({
  scenes,
  currentIndex,
  onSelectScene,
  onAddSlide,
  onAddVideoDub,
  onAddIntro,
  onAddOutro,
  onAddPhotoSlide,
  onAddMotionGraphic,
  onOpenGoogleSheets,
  onDeleteScene,
  onMoveUp,
  onMoveDown,
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddPhotoSlide(Array.from(e.target.files).slice(0, 40));
      e.target.value = '';
    }
  };

  return (
    <div className="bg-[#16212e] border border-[#26364a] rounded-xl p-3.5 mb-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider font-bold text-[#8fa1b4]">
          Adegan / Slide ({scenes.length})
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={currentIndex <= 0}
            className="p-1 rounded bg-[#1f2d3e] border border-[#26364a] text-[#e9eef4] hover:bg-[#26364a] disabled:opacity-40 transition-colors"
            title="Pindahkan ke atas"
            aria-label="Naik"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={currentIndex >= scenes.length - 1}
            className="p-1 rounded bg-[#1f2d3e] border border-[#26364a] text-[#e9eef4] hover:bg-[#26364a] disabled:opacity-40 transition-colors"
            title="Pindahkan ke bawah"
            aria-label="Turun"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={onDeleteScene}
            disabled={scenes.length <= 1}
            className="p-1 rounded bg-[#1f2d3e] border border-[#26364a] text-[#e5484d] hover:bg-[#3d1a20] disabled:opacity-40 transition-colors ml-1"
            title="Hapus adegan ini"
            aria-label="Hapus"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Slide Thumbnails List */}
      <div className="max-h-[30vh] overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
        {scenes.map((scene, idx) => {
          const isCurrent = idx === currentIndex;
          const hasAudio = !!scene.audio;
          return (
            <button
              key={scene.id || idx}
              type="button"
              onClick={() => onSelectScene(idx)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 border transition-all ${
                isCurrent
                  ? 'bg-[#22344a] border-[#e0b44c] text-white shadow-sm'
                  : 'bg-[#101824] border-[#1d2a3a] text-[#b0c0d0] hover:bg-[#1a2838] hover:border-[#26364a]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-[11px] text-[#8fa1b4] font-mono shrink-0">
                  {idx + 1}.
                </span>
                <span className="truncate">{scene.title || 'Tanpa judul'}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {hasAudio && (
                  <span
                    className="text-[#2fb36b] text-[11px] font-bold"
                    title="Sudah ada rekaman suara"
                  >
                    ♪
                  </span>
                )}
                <span className="text-[10px] text-[#8fa1b4] bg-[#0b121b] px-1.5 py-0.5 rounded">
                  {scene.layout}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Buttons to Add Scenes */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#26364a]/60">
        <button
          type="button"
          onClick={onAddSlide}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#26364a] bg-[#1f2d3e] text-xs font-semibold text-[#e9eef4] hover:bg-[#26364a] transition-colors"
        >
          <Plus size={13} className="text-[#e0b44c]" />
          <span>+ Slide</span>
        </button>

        <button
          type="button"
          onClick={onAddVideoDub}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#26364a] bg-[#1f2d3e] text-xs font-semibold text-[#e9eef4] hover:bg-[#26364a] transition-colors"
        >
          <VideoIcon size={13} className="text-[#4cc9f0]" />
          <span>+ Dubbing</span>
        </button>

        <button
          type="button"
          onClick={onAddIntro}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#26364a] bg-[#1f2d3e] text-xs font-semibold text-[#e9eef4] hover:bg-[#26364a] transition-colors"
        >
          <Sparkles size={13} className="text-[#ffd166]" />
          <span>+ Pembuka</span>
        </button>

        <button
          type="button"
          onClick={onAddOutro}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#26364a] bg-[#1f2d3e] text-xs font-semibold text-[#e9eef4] hover:bg-[#26364a] transition-colors"
        >
          <Film size={13} className="text-[#ff7ab8]" />
          <span>+ Penutup</span>
        </button>

        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#26364a] bg-[#1f2d3e] text-xs font-semibold text-[#e9eef4] hover:bg-[#26364a] transition-colors"
        >
          <ImageIcon size={13} className="text-[#2fb36b]" />
          <span>+ Slide Foto</span>
        </button>

        <button
          type="button"
          onClick={onAddMotionGraphic}
          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#26364a] bg-[#1f2d3e] text-xs font-semibold text-[#e9eef4] hover:bg-[#26364a] transition-colors"
        >
          <Sparkles size={13} className="text-[#a78bfa]" />
          <span>+ Animasi</span>
        </button>

        {onOpenGoogleSheets && (
          <button
            type="button"
            onClick={onOpenGoogleSheets}
            className="col-span-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-[#2fb36b]/40 bg-[#16291e] text-xs font-bold text-[#8be2ab] hover:bg-[#1f382a] transition-colors shadow-sm"
            title="Impor naskah presentasi langsung dari tautan Google Sheets"
          >
            <FileSpreadsheet size={13} className="text-[#2fb36b]" />
            <span>+ Impor dari Google Sheet</span>
          </button>
        )}

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handlePhotoFiles}
        />
      </div>
    </div>
  );
};
