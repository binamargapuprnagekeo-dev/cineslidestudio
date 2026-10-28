import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

const STORAGE_KEY_WEBHOOK = 'cineslide_sheet_webhook';
const STORAGE_KEY_SHEET = 'cineslide_sheet_url';

// Default starter Google Apps Script snippet generator for user reference
export const DEFAULT_APPS_SCRIPT_CODE = `/**
 * Kode Google Apps Script - Webhook Studio Suara AI & Google Sheets
 * 1. Buka Google Sheets -> Ekstensi -> Apps Script
 * 2. Tempel kode ini, lalu klik "Terapkan" -> "Penerapan Baru"
 * 3. Pilih Jenis: "Aplikasi Web", Akses: "Siapa Saja" (Anyone)
 * 4. Salin URL Aplikasi Web dan tempel di Studio Suara AI
 */

const APP_FOLDER = 'Studio Suara AI';
const LIST_SHEET = 'Daftar File';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  let req = {};
  try {
    req = JSON.parse(e.postData.contents);
  } catch(err) {
    req = e.parameter || {};
  }
  
  const action = req.action;
  let response = { success: true };
  
  try {
    const ss = getSpreadsheet_();
    if (action === 'saveProject') {
      const file = saveProjectFile_(req.name, req.json, req.projectId);
      registerRow_(ss, 'Proyek', req.name, req.scenes, req.duration, file);
      response = { success: true, fileId: file.getId(), url: file.getUrl() };
    } else if (action === 'registerFile') {
      const file = DriveApp.getFileById(req.fileId);
      registerRow_(ss, req.type, req.name, req.scenes, req.duration, file);
      response = { success: true, url: file.getUrl() };
    } else if (action === 'getLibrary') {
      response = { items: getLibraryItems_(ss), sheetUrl: ss.getUrl() };
    } else if (action === 'deleteEntry') {
      deleteEntry_(ss, req.id);
      response = { success: true };
    } else {
      response = { success: true, sheetUrl: ss.getUrl() };
    }
  } catch (err) {
    response = { success: false, error: err.message };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFolder_() {
  const folders = DriveApp.getFoldersByName(APP_FOLDER);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(APP_FOLDER);
}

function getSpreadsheet_() {
  const folder = getFolder_();
  const files = folder.getFilesByName('Studio Suara AI - Daftar File');
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  
  const ss = SpreadsheetApp.create('Studio Suara AI - Daftar File');
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  const sheet = ss.getSheets()[0];
  sheet.setName(LIST_SHEET);
  sheet.getRange('A1:H1').setValues([['Tanggal', 'Jenis', 'Nama', 'Adegan', 'Durasi (dtk)', 'Ukuran (MB)', 'Link Drive', 'File ID']]).setFontWeight('bold');
  return ss;
}

function registerRow_(ss, type, name, scenes, duration, file) {
  const sh = ss.getSheetByName(LIST_SHEET);
  const row = [new Date(), type, name, scenes || '', duration || '', Math.round(file.getSize()/1048576*100)/100, file.getUrl(), file.getId()];
  const hit = sh.createTextFinder(file.getId()).matchEntireCell(true).findNext();
  if (hit) sh.getRange(hit.getRow(), 1, 1, 8).setValues([row]);
  else sh.appendRow(row);
}

function saveProjectFile_(name, jsonStr, existingId) {
  const folder = getFolder_();
  let file = null;
  if (existingId) {
    try { file = DriveApp.getFileById(existingId); } catch(e){}
  }
  const fname = 'Proyek - ' + name + '.studio.json';
  if (file) {
    file.setContent(String(jsonStr));
    file.setName(fname);
  } else {
    file = folder.createFile(fname, String(jsonStr), 'application/json');
  }
  return file;
}

function getLibraryItems_(ss) {
  const sh = ss.getSheetByName(LIST_SHEET);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const tz = ss.getSpreadsheetTimeZone();
  return sh.getRange(2, 1, last - 1, 8).getValues().map(function(r) {
    return {
      date: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'dd MMM yyyy HH:mm') : String(r[0]),
      type: r[1], name: r[2], scenes: r[3], duration: r[4], size: r[5], url: r[6], id: r[7]
    };
  }).reverse();
}

function deleteEntry_(ss, id) {
  try {
    const file = DriveApp.getFileById(id);
    file.setTrashed(true);
  } catch(e){}
  const sh = ss.getSheetByName(LIST_SHEET);
  const hit = sh.createTextFinder(id).matchEntireCell(true).findNext();
  if (hit) sh.deleteRow(hit.getRow());
}
`;

export function getSavedWebhookUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_WEBHOOK) || '';
  } catch {
    return '';
  }
}

export function saveWebhookUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
  } catch {}
}

export function getSavedSheetUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_SHEET) || '';
  } catch {
    return '';
  }
}

export function saveSheetUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SHEET, url.trim());
  } catch {}
}

// Send request to Webhook / Apps Script Web App Endpoint
export async function sendWebhookRequest(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  const webhookUrl = getSavedWebhookUrl();
  if (!webhookUrl) {
    throw new Error('URL Webhook / Google Apps Script belum diisi');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', // Apps Script accepts text/plain to avoid CORS preflight options
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Respon Webhook bukan format JSON yang valid');
  }

  if (data.success === false) {
    throw new Error(data.error || 'Gagal mengeksekusi aksi Webhook Sheet');
  }

  if (data.sheetUrl) {
    saveSheetUrl(data.sheetUrl);
  }

  return data;
}

// Firebase Auth Login
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Workspace');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
      throw new Error(
        'Domain preview belum diotorisasi di Firebase. Gunakan koneksi "URL Webhook Google Sheet" langsung tanpa login popup!'
      );
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

// ================= GOOGLE DRIVE API & WEBHOOK WRAPPERS =================
const FOLDER_NAME = 'Studio Suara AI';
const SPREADSHEET_NAME = 'Studio Suara AI - Daftar File';
const LIST_SHEET = 'Daftar File';

let cachedFolderId: string | null = null;
let cachedSpreadsheetId: string | null = null;

export async function getOrCreateFolder(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google atau gunakan Webhook Sheet');

  const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    cachedFolderId = data.files[0].id;
    return cachedFolderId!;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const newFolder = await createRes.json();
  cachedFolderId = newFolder.id;
  return cachedFolderId!;
}

export async function saveProjectJsonToDrive(
  projectId: string | null,
  projectName: string,
  jsonContent: string,
  sceneCount = 0,
  durationSec = 0
): Promise<{ fileId: string; url: string }> {
  const webhookUrl = getSavedWebhookUrl();
  if (webhookUrl) {
    const res = await sendWebhookRequest('saveProject', {
      name: projectName,
      json: jsonContent,
      projectId,
      scenes: sceneCount,
      duration: durationSec,
    });
    return {
      fileId: res.fileId,
      url: res.url,
    };
  }

  const token = getGoogleAccessToken();
  if (!token) throw new Error('Gunakan koneksi Webhook Google Sheet atau login Google');
  const folderId = await getOrCreateFolder();
  const fileName = `Proyek - ${projectName}.studio.json`;

  if (projectId) {
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${projectId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: jsonContent,
      }
    );
    if (updateRes.ok) {
      return {
        fileId: projectId,
        url: `https://drive.google.com/file/d/${projectId}/view`,
      };
    }
  }

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([jsonContent], { type: 'application/json' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  const result = await res.json();
  return {
    fileId: result.id,
    url: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}

export async function uploadExportFileToDrive(
  blob: Blob,
  fileName: string
): Promise<{ fileId: string; url: string }> {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Silakan hubungkan akun Google untuk menyimpan file ekspor ke Drive');
  const folderId = await getOrCreateFolder();

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: blob.type || 'application/octet-stream',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  const result = await res.json();
  return {
    fileId: result.id,
    url: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}

export async function fetchProjectFromDrive(fileId: string): Promise<string> {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu');
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gagal mengunduh file dari Drive (HTTP ${res.status})`);
  return res.text();
}

export async function trashDriveFile(fileId: string): Promise<void> {
  const webhookUrl = getSavedWebhookUrl();
  if (webhookUrl) {
    await sendWebhookRequest('deleteEntry', { id: fileId });
    return;
  }

  const token = getGoogleAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu');
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });
}

// ================= GOOGLE SHEETS API & WEBHOOK CATALOG =================
export interface CatalogItem {
  date: string;
  type: string;
  name: string;
  scenes: string | number;
  duration: string | number;
  size: string | number;
  url: string;
  id: string;
}

export async function getOrCreateSpreadsheet(): Promise<{ id: string; url: string }> {
  if (cachedSpreadsheetId) {
    return {
      id: cachedSpreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${cachedSpreadsheetId}/edit`,
    };
  }
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google');

  const query = encodeURIComponent(`name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    cachedSpreadsheetId = data.files[0].id;
    return {
      id: cachedSpreadsheetId!,
      url: data.files[0].webViewLink || `https://docs.google.com/spreadsheets/d/${cachedSpreadsheetId}/edit`,
    };
  }

  const folderId = await getOrCreateFolder();
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: SPREADSHEET_NAME },
      sheets: [{ properties: { title: LIST_SHEET } }],
    }),
  });
  const newSheet = await createRes.json();
  const sheetId = newSheet.spreadsheetId;

  await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?addParents=${folderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${LIST_SHEET}!A1:H1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [['Tanggal', 'Jenis', 'Nama', 'Adegan', 'Durasi (dtk)', 'Ukuran (MB)', 'Link Drive', 'File ID']],
    }),
  });

  cachedSpreadsheetId = sheetId;
  return {
    id: sheetId,
    url: newSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
  };
}

export async function registerEntryInSheet(entry: {
  type: 'Proyek' | 'Video' | 'PPTX';
  name: string;
  scenes: number;
  duration: number;
  sizeMB: number;
  driveUrl: string;
  fileId: string;
}): Promise<void> {
  const webhookUrl = getSavedWebhookUrl();
  if (webhookUrl) {
    await sendWebhookRequest('registerFile', {
      type: entry.type,
      name: entry.name,
      scenes: entry.scenes,
      duration: entry.duration,
      size: entry.sizeMB,
      fileId: entry.fileId,
    });
    return;
  }

  const token = getGoogleAccessToken();
  if (!token) return;
  const sheet = await getOrCreateSpreadsheet();
  const now = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const row = [
    now,
    entry.type,
    entry.name,
    entry.scenes,
    entry.duration,
    entry.sizeMB,
    entry.driveUrl,
    entry.fileId,
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${LIST_SHEET}!A:H:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
}

export async function fetchCatalogFromSheet(): Promise<{ items: CatalogItem[]; sheetUrl: string }> {
  const webhookUrl = getSavedWebhookUrl();
  if (webhookUrl) {
    const res = await sendWebhookRequest('getLibrary');
    return {
      items: res.items || [],
      sheetUrl: res.sheetUrl || getSavedSheetUrl() || 'https://docs.google.com/spreadsheets/',
    };
  }

  const token = getGoogleAccessToken();
  if (!token) return { items: [], sheetUrl: getSavedSheetUrl() };
  const sheet = await getOrCreateSpreadsheet();

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${LIST_SHEET}!A2:H50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  const values = (data.values as string[][]) || [];

  const items: CatalogItem[] = values
    .map((r) => ({
      date: r[0] || '',
      type: r[1] || '',
      name: r[2] || '',
      scenes: r[3] || '',
      duration: r[4] || '',
      size: r[5] || '',
      url: r[6] || '',
      id: r[7] || '',
    }))
    .reverse();

  return { items, sheetUrl: sheet.url };
}
