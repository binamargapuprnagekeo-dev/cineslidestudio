import React, { useState, useEffect } from 'react';
import { Scene } from '../types';
import {
  parseGoogleSheetUrl,
  fetchSheetDataFromUrl,
  convertSheetRowsToScenes,
  generateGoogleSheetCsv,
  saveSheetUrl,
  getSavedSheetUrl,
  saveWebhookUrl,
  getSavedWebhookUrl,
  saveDriveFolderUrl,
  getSavedDriveFolderUrl,
  DEFAULT_APPS_SCRIPT_CODE,
  SheetSlideRow,
  parseCSV,
} from '../services/googleWorkspace';
import {
  X,
  FileSpreadsheet,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Upload,
  Check,
  AlertCircle,
  Copy,
  Folder,
  Code,
  Layers,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  onImportScenes: (newScenes: Scene[], mode: 'replace' | 'append') => void;
  projectName: string;
  googleUser: { displayName?: string | null; email?: string | null } | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onShowFeedback: (msg: string, isError?: boolean) => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  scenes,
  onImportScenes,
  projectName,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onShowFeedback,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'paste' | 'export' | 'drive'>('url');
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(getSavedSheetUrl());
  const [driveFolderInput, setDriveFolderInput] = useState<string>(getSavedDriveFolderUrl());
  const [webhookInput, setWebhookInput] = useState<string>(getSavedWebhookUrl());
  const [pastedContent, setPastedContent] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [previewRows, setPreviewRows] = useState<SheetSlideRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);
  const [showScriptBox, setShowScriptBox] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedSheetUrl();
      if (saved) {
        setSheetUrlInput(saved);
      }
      setDriveFolderInput(getSavedDriveFolderUrl());
      setWebhookInput(getSavedWebhookUrl());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFetchSheet = async () => {
    const trimmed = sheetUrlInput.trim();
    if (!trimmed) {
      setStatusMsg({ text: 'Masukkan URL Google Sheet terlebih dahulu.', isError: true });
      return;
    }

    const parsed = parseGoogleSheetUrl(trimmed);
    if (!parsed.isValid) {
      setStatusMsg({
        text: 'URL tidak valid. Format yang benar contohnya: https://docs.google.com/spreadsheets/d/.../edit',
        isError: true,
      });
      return;
    }

    setIsLoading(true);
    setStatusMsg({ text: 'Mengambil data dari Google Sheet...', isError: false });

    try {
      const result = await fetchSheetDataFromUrl(trimmed);
      if (result.success && result.rows.length > 0) {
        setPreviewRows(result.rows);
        setPreviewHeaders(result.rawHeaders);
        saveSheetUrl(trimmed);
        setStatusMsg({
          text: `Berhasil terhubung! Ditemukan ${result.rows.length} baris slide siap diimpor.`,
          isError: false,
        });
      } else {
        setStatusMsg({
          text: result.error || 'Gagal membaca sheet. Pastikan izin akses diatur ke "Siapa saja yang memiliki link".',
          isError: true,
        });
      }
    } catch (e: any) {
      setStatusMsg({
        text: `Koneksi gagal: ${e.message}. Pastikan izin Google Sheets "Siapa saja yang memiliki link" sudah aktif.`,
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = (mode: 'replace' | 'append') => {
    if (previewRows.length === 0) {
      setStatusMsg({ text: 'Tidak ada data slide yang dapat diimpor.', isError: true });
      return;
    }

    const newScenes = convertSheetRowsToScenes(previewRows);
    onImportScenes(newScenes, mode);
    onShowFeedback(
      mode === 'replace'
        ? `Berhasil mengimpor ${newScenes.length} slide dari Google Sheet.`
        : `Berhasil menambahkan ${newScenes.length} slide dari Google Sheet.`
    );
    onClose();
  };

  const handleParsePastedData = () => {
    if (!pastedContent.trim()) {
      setStatusMsg({ text: 'Silakan tempel teks tabel atau CSV terlebih dahulu.', isError: true });
      return;
    }

    try {
      const table = parseCSV(pastedContent);
      if (table.length === 0) {
        setStatusMsg({ text: 'Teks yang ditempel kosong atau tidak valid.', isError: true });
        return;
      }

      const headers = table[0];
      const dataRows = table.length > 1 && !headers.some((h) => ['judul', 'title', 'isi', 'slide'].includes(h.toLowerCase()))
        ? table
        : table.slice(1);

      const rows: SheetSlideRow[] = dataRows.map((row, i) => ({
        title: row[0] || `Slide ${i + 1}`,
        body: row[1] || '',
        text: row[2] || '',
        layout: row[3] || undefined,
        duration: row[4] ? parseFloat(row[4]) : undefined,
      }));

      setPreviewRows(rows);
      setPreviewHeaders(['Judul', 'Isi', 'Naskah Narasi', 'Layout', 'Durasi']);
      setStatusMsg({ text: `Berhasil memproses ${rows.length} baris slide dari tempelan.`, isError: false });
    } catch (e: any) {
      setStatusMsg({ text: `Gagal membaca format tabel: ${e.message}`, isError: true });
    }
  };

  const handleSaveDriveFolder = () => {
    saveDriveFolderUrl(driveFolderInput);
    onShowFeedback('Link Google Drive Folder tersimpan.');
  };

  const handleSaveWebhook = () => {
    saveWebhookUrl(webhookInput);
    onShowFeedback('URL Webhook tersimpan.');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(DEFAULT_APPS_SCRIPT_CODE).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyCsvData = () => {
    const csv = generateGoogleSheetCsv(scenes);
    navigator.clipboard.writeText(csv).then(() => {
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2000);
    });
  };

  const handleDownloadCsv = () => {
    const csv = generateGoogleSheetCsv(scenes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'CineSlide'}-GoogleSheet.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowFeedback('File CSV Google Sheet berhasil diunduh.');
  };

  const parsedCurrent = parseGoogleSheetUrl(sheetUrlInput);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#16212e] border border-[#26364a] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs text-[#e9eef4] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#26364a] bg-[#101824]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#2fb36b]/20 text-[#2fb36b] border border-[#2fb36b]/30 flex items-center justify-center font-bold">
              <FileSpreadsheet size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#e9eef4]">
                Koneksi Google Sheet & Google Drive
              </h2>
              <p className="text-[11px] text-[#8fa1b4]">
                Hubungkan langsung menggunakan URL link sheet tanpa hambatan login popup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8fa1b4] hover:text-[#e9eef4] hover:bg-[#1f2d3e] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 pt-2 border-b border-[#26364a] bg-[#101824]/60 gap-1 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'url'
                ? 'border-[#2fb36b] text-[#2fb36b] bg-[#16212e]'
                : 'border-transparent text-[#8fa1b4] hover:text-[#e9eef4]'
            }`}
          >
            <LinkIcon size={13} />
            <span>Link URL Google Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'paste'
                ? 'border-[#2fb36b] text-[#2fb36b] bg-[#16212e]'
                : 'border-transparent text-[#8fa1b4] hover:text-[#e9eef4]'
            }`}
          >
            <Layers size={13} />
            <span>Tempel Tabel / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'export'
                ? 'border-[#2fb36b] text-[#2fb36b] bg-[#16212e]'
                : 'border-transparent text-[#8fa1b4] hover:text-[#e9eef4]'
            }`}
          >
            <Download size={13} />
            <span>Ekspor / Template Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'drive'
                ? 'border-[#2fb36b] text-[#2fb36b] bg-[#16212e]'
                : 'border-transparent text-[#8fa1b4] hover:text-[#e9eef4]'
            }`}
          >
            <Folder size={13} />
            <span>Drive & Webhook</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-4">
          {/* Status Alert Banner */}
          {statusMsg && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                statusMsg.isError
                  ? 'bg-[#3d1a20]/40 border-[#e5484d]/50 text-[#ff8b8e]'
                  : 'bg-[#1b3d2b]/40 border-[#2fb36b]/50 text-[#8be2ab]'
              }`}
            >
              {statusMsg.isError ? <AlertCircle size={15} /> : <Check size={15} />}
              <span className="flex-1 font-medium">{statusMsg.text}</span>
            </div>
          )}

          {/* TAB 1: Direct Google Sheet URL */}
          {activeTab === 'url' && (
            <div className="flex flex-col gap-3.5">
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-2.5">
                <label className="text-[11px] font-bold text-[#8fa1b4] flex items-center justify-between">
                  <span>URL Google Sheet Anda (Publik / Siapa Saja yang Memiliki Link):</span>
                  {parsedCurrent.isValid && (
                    <span className="text-[10px] text-[#2fb36b] font-normal flex items-center gap-1">
                      <Check size={11} /> Format URL Terbaca
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={sheetUrlInput}
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    className="flex-1 bg-[#16212e] border border-[#26364a] rounded-lg px-3 py-2 text-xs font-mono text-[#e9eef4] outline-none focus:border-[#2fb36b]"
                  />
                  <button
                    type="button"
                    disabled={isLoading || !sheetUrlInput.trim()}
                    onClick={handleFetchSheet}
                    className="px-4 py-2 bg-[#2fb36b] hover:bg-[#38cd7b] text-[#071e11] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                  >
                    {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    <span>{isLoading ? 'Memuat...' : 'Muat & Uji Sheet'}</span>
                  </button>
                </div>

                {/* Helpful Guide Accordion */}
                <div className="flex items-start gap-2 p-2.5 bg-[#101824] rounded-lg border border-[#1f2d3e] text-[11px] text-[#8fa1b4]">
                  <HelpCircle size={15} className="text-[#e0b44c] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 leading-relaxed">
                    <span className="font-semibold text-[#e9eef4]">
                      Cara Mengatur Akses Google Sheet agar Terhubung Otomatis:
                    </span>
                    <span>
                      1. Di Google Sheet, klik tombol hijau <strong>"Bagikan" (Share)</strong> di kanan atas.
                    </span>
                    <span>
                      2. Pada bagian Akses Umum, ubah dari Dibatasi menjadi{' '}
                      <strong>"Siapa saja yang memiliki link"</strong> (Pelihat / Viewer).
                    </span>
                    <span>
                      3. Klik <strong>"Salin Link"</strong> dan tempel di kotak di atas. Tanpa perlu popup login!
                    </span>
                  </div>
                </div>

                {parsedCurrent.isValid && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <a
                      href={parsedCurrent.cleanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#2fb36b] hover:underline"
                    >
                      <ExternalLink size={11} />
                      <span>Buka Google Sheet di Tab Baru</span>
                    </a>
                    {parsedCurrent.sheetId && (
                      <span className="text-[10px] text-[#8fa1b4] bg-[#16212e] px-2 py-0.5 rounded border border-[#26364a]">
                        ID: {parsedCurrent.sheetId.substring(0, 16)}...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Sheet Preview Table & Import Action */}
              {previewRows.length > 0 && (
                <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#e0b44c]" />
                      <span className="font-bold text-xs text-[#e9eef4]">
                        Pratinjau Data ({previewRows.length} Slide Terdeteksi)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyImport('replace')}
                        className="px-3 py-1.5 bg-[#e0b44c] hover:bg-[#f3ca6a] text-[#1a1405] font-bold rounded-lg text-xs shadow-sm transition-colors"
                      >
                        Ganti Semua Slide ({previewRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyImport('append')}
                        className="px-3 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] text-[#e9eef4] font-semibold rounded-lg text-xs transition-colors"
                      >
                        + Tambah ke Slide Ada
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-[#26364a] rounded-lg bg-[#101824] scrollbar-thin">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-[#16212e] text-[#8fa1b4] border-b border-[#26364a]">
                          <th className="py-1.5 px-2.5">#</th>
                          <th className="py-1.5 px-2.5">Judul</th>
                          <th className="py-1.5 px-2.5">Isi / Poin</th>
                          <th className="py-1.5 px-2.5">Naskah Narasi / Suara</th>
                          <th className="py-1.5 px-2.5">Model</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r, i) => (
                          <tr key={i} className="border-b border-[#26364a]/30 hover:bg-[#1a2838]">
                            <td className="py-1.5 px-2.5 text-[#8fa1b4]">{i + 1}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-[#e9eef4] max-w-[150px] truncate">
                              {r.title}
                            </td>
                            <td className="py-1.5 px-2.5 text-[#8fa1b4] max-w-[180px] truncate">
                              {r.body}
                            </td>
                            <td className="py-1.5 px-2.5 text-[#8fa1b4] max-w-[200px] truncate">
                              {r.text || '-'}
                            </td>
                            <td className="py-1.5 px-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1f2d3e] border border-[#26364a] text-[#e0b44c]">
                                {r.layout || (i === 0 ? 'pembuka' : 'poin')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Paste CSV / Table */}
          {activeTab === 'paste' && (
            <div className="flex flex-col gap-3.5">
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-2.5">
                <label className="text-[11px] font-bold text-[#8fa1b4] flex items-center justify-between">
                  <span>Tempel Tabel Salinan dari Google Sheets atau Teks CSV:</span>
                  <span className="text-[10px] text-[#8fa1b4]">
                    (Blok sel di Google Sheets &rarr; Ctrl+C &rarr; Tempel di sini)
                  </span>
                </label>

                <textarea
                  rows={6}
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder="Judul Slide&#9;Isi Konten&#9;Naskah Narasi Suara&#9;Model Layout&#10;Pembukaan Presentasi&#9;Poin utama materi&#9;Halo selamat datang&#9;pembuka"
                  className="w-full bg-[#16212e] border border-[#26364a] rounded-lg p-2.5 text-xs font-mono text-[#e9eef4] outline-none focus:border-[#2fb36b]"
                />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#8fa1b4]">
                    Kolom otomatis dideteksi: Judul, Isi, Narasi Suara, Layout.
                  </span>
                  <button
                    type="button"
                    onClick={handleParsePastedData}
                    className="px-4 py-2 bg-[#2fb36b] hover:bg-[#38cd7b] text-[#071e11] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Layers size={13} />
                    <span>Konversi Jadi Slide</span>
                  </button>
                </div>
              </div>

              {previewRows.length > 0 && (
                <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#e9eef4]">
                      Hasil Pembacaan: {previewRows.length} Slide
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyImport('replace')}
                        className="px-3 py-1.5 bg-[#e0b44c] hover:bg-[#f3ca6a] text-[#1a1405] font-bold rounded-lg text-xs"
                      >
                        Terapkan ke Proyek (Ganti Semua)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyImport('append')}
                        className="px-3 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] text-[#e9eef4] font-semibold rounded-lg text-xs"
                      >
                        + Tambah ke Akhir
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Export & Google Sheet Template */}
          {activeTab === 'export' && (
            <div className="flex flex-col gap-3.5">
              <div className="p-3.5 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-[#e9eef4]">
                      Format Template Google Sheet untuk CineSlide
                    </h3>
                    <p className="text-[11px] text-[#8fa1b4]">
                      Gunakan format ini di Google Sheets agar terbaca dengan presisi 100%
                    </p>
                  </div>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] text-[#2fb36b] rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Buka Google Sheets Baru</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div className="p-2.5 bg-[#16212e] rounded-lg border border-[#26364a] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#8fa1b4]">
                      Kolom Standar: Judul | Isi / Konten | Naskah Narasi / Suara AI | Model Layout | Durasi
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyCsvData}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded text-[11px] text-[#e0b44c]"
                      >
                        {copiedCsv ? <Check size={12} className="text-[#2fb36b]" /> : <Copy size={12} />}
                        <span>{copiedCsv ? 'Tersalin!' : 'Salin Data Slide Saat Ini'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadCsv}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#2fb36b] hover:bg-[#38cd7b] text-[#071e11] font-bold rounded text-[11px]"
                      >
                        <Download size={12} />
                        <span>Unduh File CSV</span>
                      </button>
                    </div>
                  </div>

                  <pre className="text-[10px] text-[#8fa1b4] bg-[#070b12] p-2.5 rounded border border-[#1d2a3a] font-mono overflow-x-auto">
                    {`No,Judul Slide,Isi / Konten,Naskah Narasi / Suara AI,Model Layout,Durasi (dtk)
1,"Selamat Datang","Subjudul presentasi","Halo, selamat datang di materi kami","pembuka",5
2,"Tujuan Pembahasan","Poin 1\nPoin 2","Berikut adalah pokok bahasan kita","poin",6
3,"Terima Kasih","Kontak: info@email.com","Terima kasih atas perhatian Anda","penutup",4`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Google Drive & Webhook */}
          {activeTab === 'drive' && (
            <div className="flex flex-col gap-3.5">
              {/* Google Drive Folder Link */}
              <div className="p-3.5 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder size={15} className="text-[#4285F4]" />
                    <span className="font-bold text-xs text-[#e9eef4]">
                      Link Google Drive (Folder / Penyimpanan Aset)
                    </span>
                  </div>
                  {driveFolderInput && (
                    <a
                      href={driveFolderInput}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#4285F4] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} />
                      <span>Buka Folder Drive</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={driveFolderInput}
                    onChange={(e) => setDriveFolderInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="flex-1 bg-[#16212e] border border-[#26364a] rounded-lg px-3 py-2 text-xs font-mono text-[#e9eef4] outline-none focus:border-[#4285F4]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDriveFolder}
                    className="px-3.5 py-2 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] text-[#e9eef4] font-semibold rounded-lg text-xs"
                  >
                    Simpan Link
                  </button>
                </div>
              </div>

              {/* Webhook Apps Script for Saving to Google Drive & Sheets */}
              <div className="p-3.5 bg-[#0b121b] border border-[#26364a] rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code size={15} className="text-[#e0b44c]" />
                    <span className="font-bold text-xs text-[#e9eef4]">
                      URL Webhook Google Apps Script (Simpan Otomatis Tanpa Login Popup)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScriptBox(!showScriptBox)}
                    className="text-[11px] text-[#e0b44c] hover:underline flex items-center gap-1"
                  >
                    <span>{showScriptBox ? 'Tutup Kode' : 'Lihat Kode Script'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-[#16212e] border border-[#26364a] rounded-lg px-3 py-2 text-xs font-mono text-[#e9eef4] outline-none focus:border-[#e0b44c]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveWebhook}
                    className="px-3.5 py-2 bg-[#e0b44c] hover:bg-[#f3ca6a] text-[#1a1405] font-bold rounded-lg text-xs"
                  >
                    Simpan Webhook
                  </button>
                </div>

                {showScriptBox && (
                  <div className="mt-2 p-3 bg-[#101824] border border-[#26364a] rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#8fa1b4]">
                        Kode Apps Script (Tempel di Google Sheets &rarr; Ekstensi &rarr; Apps Script)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] rounded text-[11px] font-semibold text-[#e0b44c]"
                      >
                        {copiedCode ? <Check size={12} className="text-[#2fb36b]" /> : <Copy size={12} />}
                        <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                      </button>
                    </div>
                    <pre className="text-[10px] text-[#8fa1b4] bg-[#070b12] p-2 rounded border border-[#1d2a3a] max-h-36 overflow-y-auto font-mono scrollbar-thin">
                      {DEFAULT_APPS_SCRIPT_CODE}
                    </pre>
                  </div>
                )}
              </div>

              {/* Firebase Google Auth (Optional fallback) */}
              <div className="p-3 bg-[#0b121b] border border-[#26364a] rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-[#e9eef4]">
                    Login Akun Google (Firebase Auth)
                  </span>
                  <p className="text-[10px] text-[#8fa1b4]">
                    {googleUser
                      ? `Terhubung sebagai: ${googleUser.email || googleUser.displayName}`
                      : 'Opsi tambahan untuk akun terdaftar. Catatan: Pada domain preview cloud, gunakan Link URL / Webhook di atas untuk keandalan maksimal.'}
                  </p>
                </div>
                {googleUser ? (
                  <button
                    type="button"
                    onClick={onGoogleSignOut}
                    className="px-3 py-1.5 bg-[#3d1a20] hover:bg-[#52232b] text-[#ff8b8e] font-semibold rounded-lg text-xs"
                  >
                    Keluar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="px-3 py-1.5 bg-[#1f2d3e] hover:bg-[#26364a] border border-[#26364a] text-[#e9eef4] font-semibold rounded-lg text-xs flex items-center gap-1.5"
                  >
                    <span>Masuk Google</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
