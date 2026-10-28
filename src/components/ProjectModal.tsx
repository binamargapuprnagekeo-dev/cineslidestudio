import React, { useRef } from 'react';
import { ProjectMetadata } from '../types';
import { CatalogItem } from '../services/googleWorkspace';
import {
  X,
  Plus,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  ExternalLink,
  Cloud,
  FileSpreadsheet,
  Check,
  RefreshCw,
} from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  projects: ProjectMetadata[];
  currentProjectId?: string | null;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (meta: ProjectMetadata) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  // Google Workspace Props
  googleUser: { displayName?: string | null; email?: string | null } | null;
  onGoogleSignIn: () => void;
  onSaveToDrive: () => void;
  isSavingToDrive: boolean;
  driveCatalog: CatalogItem[];
  sheetsUrl?: string;
  onRefreshDriveCatalog: () => void;
  onOpenDriveProject: (fileId: string, name: string) => void;
  onDeleteDriveEntry: (fileId: string, name: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectName,
  onProjectNameChange,
  projects,
  currentProjectId,
  onOpenProject,
  onNewProject,
  onDeleteProject,
  onExportJson,
  onImportJson,
  googleUser,
  onGoogleSignIn,
  onSaveToDrive,
  isSavingToDrive,
  driveCatalog,
  sheetsUrl,
  onRefreshDriveCatalog,
  onOpenDriveProject,
  onDeleteDriveEntry,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatDuration = (sec: number | string) => {
    const num = Number(sec) || 0;
    const m = Math.floor(num / 60);
    const s = Math.floor(num % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDate = (ts: number | string) => {
    if (typeof ts === 'string') return ts;
    return new Date(ts).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#16212e] border border-[#26364a] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-[#e9eef4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#26364a] bg-[#101824]">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-[#e0b44c]" />
            <h2 className="text-sm font-bold tracking-tight">Pustaka & Manajemen Proyek</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8fa1b4] hover:text-[#e9eef4] hover:bg-[#1f2d3e] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* Current Project Name Field */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[11px] text-[#8fa1b4] font-medium mb-1">
                Nama Proyek Aktif
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => onProjectNameChange(e.target.value)}
                className="w-full bg-[#0b121b] border border-[#26364a] rounded-lg px-3 py-2 text-xs font-semibold outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onNewProject}
              className="mt-5 flex items-center gap-1.5 px-3.5 py-2 bg-[#e0b44c] hover:bg-[#f3ca6a] text-[#1a1405] rounded-lg font-bold shadow-sm transition-colors shrink-0"
            >
              <Plus size={14} />
              <span>+ Proyek Baru</span>
            </button>
          </div>

          {/* Google Workspace Drive & Sheets Integration Card */}
          <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Cloud size={15} className="text-[#4285F4]" />
                <span className="font-semibold text-xs">Pustaka Google Drive & Sheets</span>
                {googleUser && (
                  <span className="text-[10px] bg-[#2fb36b]/20 text-[#2fb36b] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Check size={11} />
                    <span>Terhubung: {googleUser.email}</span>
                  </span>
                )}
              </div>

              {!googleUser ? (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] hover:border-[#4285F4] rounded-lg font-semibold text-xs transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Masuk dengan Google</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingToDrive}
                    onClick={onSaveToDrive}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] hover:border-[#e0b44c] rounded-lg font-semibold text-xs text-[#e0b44c] transition-colors disabled:opacity-50"
                  >
                    <Upload size={12} />
                    <span>{isSavingToDrive ? 'Menyimpan...' : 'Simpan Proyek ke Drive'}</span>
                  </button>

                  {sheetsUrl && (
                    <a
                      href={sheetsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg font-medium text-xs text-[#2fb36b] transition-colors"
                    >
                      <FileSpreadsheet size={13} />
                      <span>Buka Sheets</span>
                      <ExternalLink size={11} />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={onRefreshDriveCatalog}
                    className="p-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded-lg text-[#8fa1b4]"
                    title="Perbarui daftar dari Google Sheets"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Drive / Sheets Catalog Table if connected */}
            {googleUser && driveCatalog.length > 0 && (
              <div className="border border-[#26364a] rounded-lg overflow-hidden bg-[#101824] mt-1">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#26364a] text-[#8fa1b4] bg-[#16212e]">
                      <th className="py-1.5 px-2.5">File di Drive / Sheet</th>
                      <th className="py-1.5 px-2.5">Jenis</th>
                      <th className="py-1.5 px-2.5">Waktu</th>
                      <th className="py-1.5 px-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driveCatalog.map((item, idx) => (
                      <tr key={idx} className="border-b border-[#26364a]/40 hover:bg-[#1a2838]">
                        <td className="py-1.5 px-2.5 font-medium truncate max-w-[200px]">
                          {item.name}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              item.type === 'Proyek'
                                ? 'bg-[#e0b44c]/20 text-[#e0b44c]'
                                : item.type === 'Video'
                                ? 'bg-[#4cc9f0]/20 text-[#4cc9f0]'
                                : 'bg-[#ff7ab8]/20 text-[#ff7ab8]'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-[#8fa1b4] whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          {item.type === 'Proyek' ? (
                            <button
                              type="button"
                              onClick={() => onOpenDriveProject(item.id, item.name)}
                              className="px-2 py-0.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded text-[10px] font-semibold text-[#e0b44c] mr-1"
                            >
                              Buka
                            </button>
                          ) : (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded text-[10px] font-semibold text-[#4cc9f0] mr-1"
                            >
                              <span>Drive</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteDriveEntry(item.id, item.name)}
                            className="p-1 text-[#e5484d] hover:bg-[#3d1a20] rounded"
                            title="Hapus dari Drive & Sheet"
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Backup JSON Actions */}
          <div className="flex items-center gap-2 p-2.5 bg-[#0b121b] border border-[#26364a] rounded-lg">
            <span className="text-[11px] text-[#8fa1b4]">File Cadangan JSON:</span>
            <button
              type="button"
              onClick={onExportJson}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded text-[11px] font-medium"
            >
              <Download size={12} className="text-[#4cc9f0]" />
              <span>Simpan ke JSON</span>
            </button>
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded text-[11px] font-medium"
            >
              <Upload size={12} className="text-[#e0b44c]" />
              <span>Muat dari JSON</span>
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportJson(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* Saved Browser Drafts Table */}
          <div className="border border-[#26364a] rounded-xl overflow-hidden bg-[#0b121b]">
            <div className="px-3 py-2 bg-[#101824] border-b border-[#26364a] text-[11px] font-semibold text-[#8fa1b4]">
              Draf Tersimpan di Browser Lokal (IndexedDB)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#26364a] text-[#8fa1b4]">
                  <th className="py-2.5 px-3 font-semibold">Nama Proyek</th>
                  <th className="py-2.5 px-3 font-semibold">Adegan</th>
                  <th className="py-2.5 px-3 font-semibold">Durasi</th>
                  <th className="py-2.5 px-3 font-semibold">Diubah</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#8fa1b4]">
                      Belum ada draf lain yang tersimpan di browser.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => {
                    const isCurrent = p.id === currentProjectId;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-[#26364a]/50 transition-colors ${
                          isCurrent ? 'bg-[#22344a]/40 font-semibold text-white' : 'hover:bg-[#16212e]'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <span className="truncate">{p.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-[#e0b44c]/20 text-[#e0b44c] px-1.5 py-0.5 rounded">
                                Dibuka
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#8fa1b4]">{p.scenes} slide</td>
                        <td className="py-2.5 px-3 font-mono text-[#8fa1b4]">
                          {formatDuration(p.duration)}
                        </td>
                        <td className="py-2.5 px-3 text-[#8fa1b4] whitespace-nowrap">
                          {formatDate(p.updated)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => onOpenProject(p.id)}
                            className="px-2.5 py-1 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded text-[11px] font-semibold text-[#e9eef4] disabled:opacity-30 mr-1.5"
                          >
                            Buka
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProject(p)}
                            className="px-2 py-1 bg-[#1f2d3e] hover:bg-[#3d1a20] border border-[#26364a] text-[#e5484d] rounded text-[11px]"
                            title="Hapus proyek"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
