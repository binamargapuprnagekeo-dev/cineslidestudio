import React, { useRef, useEffect } from 'react';
import { Play, Square, Maximize, Subtitles } from 'lucide-react';

interface PreviewCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  onPlayCurrentScene: () => void;
  onPlayAllScenes: () => void;
  onStopPlayback: () => void;
  subtitleMode: 'scene' | 'on' | 'off';
  onSubtitleModeChange: (mode: 'scene' | 'on' | 'off') => void;
  embedAudioInPPTX: boolean;
  onEmbedAudioChange: (val: boolean) => void;
  statusMessage: string;
  isStatusError?: boolean;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  canvasRef,
  isPlaying,
  onPlayCurrentScene,
  onPlayAllScenes,
  onStopPlayback,
  subtitleMode,
  onSubtitleModeChange,
  embedAudioInPPTX,
  onEmbedAudioChange,
  statusMessage,
  isStatusError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const handleFullscreen = () => {
    const target = canvasRef.current?.parentElement || canvasRef.current;
    if (!target) return;

    if (!isPlayingRef.current) {
      onPlayAllScenes();
    }

    if (target.requestFullscreen) {
      target.requestFullscreen().catch(() => {});
    } else if ((target as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
      (target as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement;

      if (fsElement && !isPlayingRef.current) {
        onPlayAllScenes();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, [onPlayAllScenes]);

  return (
    <div ref={containerRef} className="flex flex-col gap-3 w-full">
      {/* 16:9 Canvas Viewport */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#26364a] shadow-xl group flex items-center justify-center [&:fullscreen]:w-full [&:fullscreen]:h-full [&:fullscreen]:bg-black [&:fullscreen]:rounded-none [&:fullscreen]:border-none [&:-webkit-full-screen]:w-full [&:-webkit-full-screen]:h-full [&:-webkit-full-screen]:bg-black">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain block select-none"
          aria-label="Pratinjau Presentasi AI Studio"
        />

        {isPlaying && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[11px] text-[#2fb36b] font-medium z-10">
            <span className="w-2 h-2 rounded-full bg-[#2fb36b] animate-ping" />
            <span>Sedang Memutar Layar Penuh...</span>
          </div>
        )}
      </div>

      {/* Playback & Control Bar */}
      <div className="flex items-center gap-2 flex-wrap text-xs bg-[#16212e] border border-[#26364a] p-2.5 rounded-xl">
        <button
          type="button"
          onClick={onPlayCurrentScene}
          className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg bg-[#1f2d3e] border border-[#26364a] text-[#e9eef4] hover:bg-[#26364a] hover:border-[#e0b44c] transition-colors"
          title="Putar adegan aktif"
        >
          <Play size={14} className="text-[#e0b44c]" />
          <span>Putar Adegan</span>
        </button>

        <button
          type="button"
          onClick={onPlayAllScenes}
          className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg bg-[#e0b44c] text-[#1a1405] hover:bg-[#f3ca6a] shadow-sm transition-colors"
          title="Putar seluruh presentasi dari awal sampai selesai"
        >
          <Play size={14} />
          <span>Putar Semua</span>
        </button>

        <button
          type="button"
          onClick={onStopPlayback}
          className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg bg-[#1f2d3e] border border-[#26364a] text-[#e5484d] hover:bg-[#3d1a20] transition-colors"
          title="Hentikan pemutaran"
        >
          <Square size={14} />
          <span>Henti</span>
        </button>

        <button
          type="button"
          onClick={handleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg bg-[#1f2d3e] border border-[#26364a] text-[#8fa1b4] hover:text-[#e9eef4] hover:bg-[#26364a] transition-colors"
          title="Buka layar penuh (Slide berjalan otomatis)"
        >
          <Maximize size={14} />
          <span>Layar Penuh</span>
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Subtitle Selector */}
          <div className="flex items-center gap-1 bg-[#0b121b] border border-[#26364a] rounded-lg px-2 py-1 text-xs text-[#8fa1b4]">
            <Subtitles size={13} className="text-[#4cc9f0]" />
            <select
              value={subtitleMode}
              onChange={(e) => onSubtitleModeChange(e.target.value as 'scene' | 'on' | 'off')}
              className="bg-transparent text-[#e9eef4] outline-none cursor-pointer text-xs"
            >
              <option value="scene" className="bg-[#16212e]">Subtitle: Ikuti adegan</option>
              <option value="on" className="bg-[#16212e]">Subtitle: Tampilkan semua</option>
              <option value="off" className="bg-[#16212e]">Subtitle: Sembunyikan</option>
            </select>
          </div>

          {/* Embed Audio in PPTX */}
          <label className="flex items-center gap-1.5 text-[11px] text-[#8fa1b4] cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={embedAudioInPPTX}
              onChange={(e) => onEmbedAudioChange(e.target.checked)}
            />
            <span>Sematkan audio di PPTX</span>
          </label>
        </div>
      </div>

      {/* Status Bar */}
      <div
        className={`px-3 py-2 rounded-lg text-xs border ${
          isStatusError
            ? 'bg-[#3d1020]/40 border-[#e5484d] text-[#ff7a8a]'
            : 'bg-[#101824] border-[#1d2a3a] text-[#8fa1b4]'
        }`}
        role="status"
      >
        <div className="flex items-center justify-between gap-2">
          <span>{statusMessage}</span>
          <span className="text-[10px] text-[#8fa1b4]/60">1280x720 · 30 FPS Canvas</span>
        </div>
      </div>
    </div>
  );
};

