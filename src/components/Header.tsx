import React from 'react';
import { THEMES } from '../constants/presets';
import { Play, FileText, Video, Share2, FolderOpen, Radio } from 'lucide-react';

interface HeaderProps {
  currentTheme: number;
  onThemeChange: (index: number) => void;
  onOpenProjects: () => void;
  onOpenSocial: () => void;
  onOpenGoogleSheets: () => void;
  onExportPPTX: () => void;
  onExportVideo: () => void;
  isColabConnected: boolean;
  colabGpu?: string;
  isBusy: boolean;
  googleUser: { displayName?: string | null; photoURL?: string | null; email?: string | null } | null;
  isSheetConnected?: boolean;
  isWebhookConnected?: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  onThemeChange,
  onOpenProjects,
  onOpenSocial,
  onOpenGoogleSheets,
  onExportPPTX,
  onExportVideo,
  isColabConnected,
  colabGpu,
  isBusy,
  googleUser,
  isSheetConnected,
  isWebhookConnected,
  onGoogleSignIn,
  onGoogleSignOut,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[#26364a] bg-[#16212e] text-[#e9eef4] flex-wrap select-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#e0b44c] flex items-center justify-center text-[#1a1405] font-black text-lg shadow-md">
          CS
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight leading-tight">CineSlide Studio AI</h1>
          <div className="flex items-center gap-2 text-[11px] text-[#8fa1b4]">
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isColabConnected ? 'bg-[#2fb36b]' : 'bg-[#6b7a8a]'
                }`}
              />
              {isColabConnected ? `Colab (${colabGpu || 'GPU'})` : 'Mode Studio Mandiri'}
            </span>
            <span>·</span>
            <span>50 Tema & Kloning Suara</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Theme Selector */}
        <div className="flex items-center gap-1.5 bg-[#0b121b] border border-[#26364a] rounded-lg px-2.5 py-1 text-xs">
          <span className="text-[#8fa1b4] text-[11px] font-medium">Tema:</span>
          <select
            value={currentTheme}
            onChange={(e) => onThemeChange(Number(e.target.value))}
            className="bg-transparent text-[#e9eef4] font-medium outline-none cursor-pointer max-w-[160px] truncate"
            aria-label="Pilih tema tampilan"
          >
            <optgroup label="Tema Warna">
              {THEMES.slice(0, 10).map((t, i) => (
                <option key={i} value={i} className="bg-[#16212e]">
                  {t.n}
                </option>
              ))}
            </optgroup>
            <optgroup label="Tema Gambar & Pemandangan">
              {THEMES.slice(10).map((t, i) => (
                <option key={i + 10} value={i + 10} className="bg-[#16212e]">
                  {t.n}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Google Workspace & Sheets Connection Button */}
        {isSheetConnected || isWebhookConnected || googleUser ? (
          <button
            type="button"
            onClick={onOpenGoogleSheets}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[#2fb36b]/40 bg-[#101824] text-[#e9eef4] hover:bg-[#16212e] transition-colors"
            title="Kelola koneksi Google Sheets & Drive"
          >
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt=""
                className="w-4 h-4 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#2fb36b] animate-pulse" />
            )}
            <span className="text-[11px] font-semibold text-[#2fb36b]">
              {isSheetConnected ? 'Sheet Terhubung' : isWebhookConnected ? 'Webhook Sheet' : 'Google Aktif'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenGoogleSheets}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#26364a] bg-[#1f2d3e] text-[#e9eef4] hover:bg-[#26364a] hover:border-[#2fb36b] transition-colors"
            title="Hubungkan Google Sheet dengan link URL atau Webhook"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span className="hidden sm:inline">Google Sheet & Drive</span>
          </button>
        )}


        {/* Project Manager Button */}
        <button
          type="button"
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#26364a] bg-[#1f2d3e] text-[#e9eef4] hover:bg-[#26364a] hover:border-[#7aa7ff] transition-colors"
          title="Buka daftar proyek yang tersimpan"
        >
          <FolderOpen size={14} className="text-[#8fa1b4]" />
          <span>Proyek</span>
        </button>

        {/* Social Media Export Button */}
        <button
          type="button"
          onClick={onOpenSocial}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#26364a] bg-[#1f2d3e] text-[#e9eef4] hover:bg-[#26364a] hover:border-[#7aa7ff] transition-colors"
          title="Ekspor video untuk TikTok, Reels, Shorts (9:16) dll"
        >
          <Share2 size={14} className="text-[#8fa1b4]" />
          <span>Sosmed</span>
        </button>

        {/* PPTX Export Button */}
        <button
          type="button"
          disabled={isBusy}
          onClick={onExportPPTX}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#26364a] bg-[#1f2d3e] text-[#e9eef4] hover:bg-[#26364a] hover:border-[#e0b44c] disabled:opacity-50 transition-colors"
          title="Unduh presentasi PowerPoint dengan audio"
        >
          <FileText size={14} className="text-[#e0b44c]" />
          <span>Ekspor PPTX</span>
        </button>

        {/* Video Export Button */}
        <button
          type="button"
          disabled={isBusy}
          onClick={onExportVideo}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#e0b44c] text-[#1a1405] hover:bg-[#f3ca6a] disabled:opacity-50 shadow-sm transition-colors"
          title="Rekam video lengkap (WebM / MP4)"
        >
          <Video size={14} />
          <span>Ekspor Video</span>
        </button>
      </div>
    </header>
  );
};
