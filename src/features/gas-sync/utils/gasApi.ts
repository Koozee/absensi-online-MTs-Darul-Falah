import { AttendanceRecord } from '../../../types';

interface GASResponse {
  result: string;
  message?: string;
  error?: string;
  userData?: { name: string; position: string; type?: string };
  data?: AttendanceRecord[];
  [key: string]: unknown;
}

/**
 * Sends a POST request to the GAS Web App and parses the JSON response.
 * Uses text/plain content-type to avoid CORS preflight issues.
 */
async function postToGAS(webAppUrl: string, payload: Record<string, unknown>): Promise<GASResponse> {
  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { result: 'success', raw: text };
  }
}

/**
 * Sends an attendance record to Google Apps Script.
 */
export async function sendRecordToGAS(
  webAppUrl: string,
  record: AttendanceRecord
): Promise<{ success: boolean; message: string; userData?: { name: string; position: string; type?: string } }> {
  if (!webAppUrl?.trim()) {
    return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
  }

  try {
    const data = await postToGAS(webAppUrl.trim(), { action: 'attendance', data: record });

    if (data.result === 'error') {
      return { success: false, message: data.error || 'Google Apps Script mengembalikan error.' };
    }

    return {
      success: true,
      message: data.message || 'Berhasil disimpan ke Google Sheets!',
      userData: data.userData
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg || 'Gagal menghubungi server.' };
  }
}

/**
 * Registers a new member to Google Apps Script (Siswa / Staff sheet).
 */
export async function registerToGAS(
  webAppUrl: string,
  payload: { userId: string; name: string; position: string; type: string }
): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl?.trim()) {
    return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
  }

  try {
    const data = await postToGAS(webAppUrl.trim(), { action: 'register', data: payload });

    if (data.result === 'error') {
      return { success: false, message: data.error || 'Google Apps Script mengembalikan error saat registrasi.' };
    }

    return { success: true, message: data.message || 'Berhasil didaftarkan.' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg || 'Gagal menghubungi server.' };
  }
}

/**
 * Fetches attendance logs from Google Apps Script via GET request.
 */
export async function fetchLogsFromGAS(
  webAppUrl: string
): Promise<{ success: boolean; data?: AttendanceRecord[]; message: string }> {
  if (!webAppUrl?.trim()) {
    return { success: false, message: 'URL Google Apps Script kosong.' };
  }

  try {
    const url = new URL(webAppUrl.trim());
    url.searchParams.append('action', 'getLogs');

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const json = await response.json();

    if (json.result === 'success' && Array.isArray(json.data)) {
      return { success: true, data: json.data, message: 'Berhasil menarik data.' };
    }

    return { success: false, message: json.error || 'Gagal mengambil data absensi.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal koneksi: ${msg}` };
  }
}
