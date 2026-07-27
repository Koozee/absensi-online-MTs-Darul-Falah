import React, { useState, useEffect, useCallback } from 'react';
import { StatsOverview } from './features/attendance/components/StatsOverview';
import { QRScanner } from './features/qr-scanner/components/QRScanner';
import { AttendanceLogs } from './features/attendance/components/AttendanceLogs';
import { QRGenerator } from './features/qr-generator/components/QRGenerator';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster, toast } from 'react-hot-toast';
import { ActiveTab, AttendanceMode, AttendanceRecord } from './types';
import { sendRecordToGAS, fetchLogsFromGAS } from './features/gas-sync/utils/gasApi';
import { APP_CONFIG } from './config';

const STORAGE_KEY_RECORDS = 'absensi_online_records_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [mode, setMode] = useState<AttendanceMode>('MASUK');
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lastScanRecord, setLastScanRecord] = useState<AttendanceRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { webAppUrl } = APP_CONFIG.gasConfig;

  // Persist records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (err) {
      console.error('Failed to save records to localStorage:', err);
    }
  }, [records]);

  // Process new QR scan event
  const handleScanSuccess = useCallback(async (data: { userId: string; userName?: string; position?: string; userType?: string; mode: AttendanceMode }): Promise<AttendanceRecord> => {
    const now = new Date();
    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId: data.userId,
      userName: data.userName || '',
      position: data.position || '',
      userType: data.userType,
      mode: data.mode,
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('id-ID', { hour12: false }),
      timestamp: now.getTime(),
      syncStatus: 'PENDING'
    };

    if (!webAppUrl || webAppUrl.trim().length <= 10) {
      throw new Error('URL Google Apps Script belum diatur. Validasi gagal.');
    }

    setIsSyncing(true);
    const syncResult = await sendRecordToGAS(webAppUrl, newRecord);
    setIsSyncing(false);

    if (!syncResult.success) {
      throw new Error(syncResult.message);
    }

    if (syncResult.userData) {
      newRecord.userName = syncResult.userData.name || newRecord.userName;
      newRecord.position = syncResult.userData.position || newRecord.position;
      newRecord.userType = syncResult.userData.type || newRecord.userType;
    }

    newRecord.syncStatus = 'SYNCED';
    setRecords(prev => [newRecord, ...prev]);
    setLastScanRecord(newRecord);

    return newRecord;
  }, [webAppUrl]);

  // Re-sync a single failed/pending record
  const handleResyncRecord = async (record: AttendanceRecord) => {
    if (!webAppUrl) return;

    setIsSyncing(true);
    const syncResult = await sendRecordToGAS(webAppUrl, record);
    setIsSyncing(false);

    setRecords(prev => prev.map(r =>
      r.id === record.id
        ? { ...r, syncStatus: syncResult.success ? 'SYNCED' : 'FAILED', errorMessage: syncResult.success ? undefined : syncResult.message }
        : r
    ));
  };

  // Clear all local records
  const handleClearLogs = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat log lokal? Data di Google Sheets (jika ada) tidak akan terhapus.')) {
      setRecords([]);
      setLastScanRecord(null);
    }
  };

  // Fetch logs from Google Sheets
  const handleFetchLogs = async () => {
    if (!webAppUrl || webAppUrl.trim().length < 10) {
      toast.error('URL Google Apps Script belum dikonfigurasi.');
      return;
    }

    setIsSyncing(true);
    const result = await fetchLogsFromGAS(webAppUrl);
    setIsSyncing(false);

    if (result.success && result.data) {
      setRecords(result.data);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = records.filter(r => r.date === todayStr).length;

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      todayCount={todayCount}
    >
      <StatsOverview records={records} gasConfig={APP_CONFIG.gasConfig} />

      {activeTab === 'scanner' && (
        <QRScanner
          mode={mode}
          setMode={setMode}
          onScanSuccess={handleScanSuccess}
          lastScanRecord={lastScanRecord}
          isSyncing={isSyncing}
        />
      )}

      {activeTab === 'logs' && (
        <AttendanceLogs
          records={records}
          onResyncRecord={handleResyncRecord}
          onClearLogs={handleClearLogs}
          onFetchLogs={handleFetchLogs}
          gasConfig={APP_CONFIG.gasConfig}
          isSyncing={isSyncing}
        />
      )}

      {activeTab === 'generator' && (
        <QRGenerator />
      )}

      <Toaster position="top-center" />
    </MainLayout>
  );
}
