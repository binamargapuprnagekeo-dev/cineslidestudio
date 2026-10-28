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

// ================= GOOGLE DRIVE API =================
const FOLDER_NAME = 'Studio Suara AI';
const SPREADSHEET_NAME = 'Studio Suara AI - Daftar File';
const LIST_SHEET = 'Daftar File';

let cachedFolderId: string | null = null;
let cachedSpreadsheetId: string | null = null;

export async function getOrCreateFolder(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu');

  // Search folder
  const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    cachedFolderId = data.files[0].id;
    return cachedFolderId!;
  }

  // Create folder
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
  jsonContent: string
): Promise<{ fileId: string; url: string }> {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu');
  const folderId = await getOrCreateFolder();
  const fileName = `Proyek - ${projectName}.studio.json`;

  if (projectId) {
    // Update existing file
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

  // Create new project file
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
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
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu');
  const folderId = await getOrCreateFolder();

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: blob.type || 'application/octet-stream',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
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

// ================= GOOGLE SHEETS API =================
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
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu');

  // Search existing sheet
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

  // Create new spreadsheet
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

  // Move to folder
  await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?addParents=${folderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  // Add header row
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
  const token = getGoogleAccessToken();
  if (!token) return { items: [], sheetUrl: '' };
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
