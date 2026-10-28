import React, { useState } from 'react';
import { SOCIAL_PLATFORMS, SocialPlatformConfig } from '../constants/presets';
import { X, Copy, ExternalLink, Video, Share2, Check } from 'lucide-react';

interface SocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: SocialPlatformConfig, cropMode: 'pas' | 'crop', exportAll: boolean) => Promise<void>;
  isExporting: boolean;
  exportedBlob?: Blob | null;
  projectName: string;
}

export const SocialModal: React.FC<SocialModalProps> = ({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportedBlob,
  projectName,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [cropMode, setCropMode] = useState<'pas' | 'crop'>('pas');
  const [exportAll, setExportAll] = useState(true);
  const [caption, setCaption] = useState(
    'Simak presentasi visual lengkap ini yang dibuat dengan AI Studio.'
  );
  const [hashtag, setHashtag] = useState('#video #presentasi #edukasi #aistudio');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentPlatform = SOCIAL_PLATFORMS[selectedIdx];

  const handleCopy = () => {
    const fullText = `${caption}\n\n${hashtag}`.trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleShare = () => {
    if (exportedBlob && navigator.canShare) {
      const file = new File([exportedBlob], `${projectName}-${currentPlatform.ratio}.webm`, {
        type: exportedBlob.type,
      });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: projectName,
          text: `${caption}\n\n${hashtag}`,
        }).catch(() => {});
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#16212e] border border-[#26364a] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-[#e9eef4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#26364a] bg-[#101824]">
          <h2 className="text-sm font-bold tracking-tight">Ekspor untuk Media Sosial</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8fa1b4] hover:text-[#e9eef4] hover:bg-[#1f2d3e] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          <div>
            <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
              Platform & Format Rasio
            </label>
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-3 py-2 text-xs outline-none"
            >
              {SOCIAL_PLATFORMS.map((p, i) => (
                <option key={i} value={i}>
                  {p.name} · {p.width}x{p.height}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#8fa1b4] mt-1">{currentPlatform.note}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Gaya Pembingkaian
              </label>
              <select
                value={cropMode}
                onChange={(e) => setCropMode(e.target.value as 'pas' | 'crop')}
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none"
              >
                <option value="pas">Pas: Slide utuh dengan latar blur</option>
                <option value="crop">Potong tengah: Isi penuh layar</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Cakupan Adegan
              </label>
              <select
                value={exportAll ? 'all' : 'one'}
                onChange={(e) => setExportAll(e.target.value === 'all')}
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-2.5 py-2 text-xs outline-none"
              >
                <option value="all">Semua adegan</option>
                <option value="one">Adegan yang dipilih saja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg p-2.5 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">Hashtag</label>
            <input
              type="text"
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-3 py-2 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg font-semibold"
            >
              {copied ? <Check size={13} className="text-[#2fb36b]" /> : <Copy size={13} />}
              <span>{copied ? 'Tersalin!' : 'Salin Caption + Tag'}</span>
            </button>

            <a
              href={currentPlatform.uploadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 py-2 px-3 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg font-semibold text-[#e0b44c]"
            >
              <span>Buka Halaman Unggah</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#26364a] bg-[#101824]">
          {exportedBlob && (
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg font-semibold"
            >
              <Share2 size={13} />
              <span>Bagikan ke Aplikasi</span>
            </button>
          )}

          <button
            type="button"
            disabled={isExporting}
            onClick={() => onExport(currentPlatform, cropMode, exportAll)}
            className="flex items-center gap-1.5 py-2 px-4 bg-[#e0b44c] hover:bg-[#f3ca6a] text-[#1a1405] rounded-lg font-bold shadow-md disabled:opacity-50"
          >
            <Video size={14} />
            <span>{isExporting ? 'Sedang Merekam...' : 'Mulai Ekspor Video'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
