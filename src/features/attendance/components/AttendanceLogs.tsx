import React, { useState } from 'react';
import { Download, Search, RefreshCw, Trash2, CheckCircle2, Clock, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { AttendanceRecord, GasConfig } from '../../../types';
import { exportRecordsToExcel } from '../utils/csv';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

interface AttendanceLogsProps {
  records: AttendanceRecord[];
  onResyncRecord: (record: AttendanceRecord) => Promise<void>;
  onClearLogs: () => void;
  onFetchLogs: () => void;
  gasConfig: GasConfig;
  isSyncing: boolean;
}

export const AttendanceLogs: React.FC<AttendanceLogsProps> = ({
  records,
  onResyncRecord,
  onClearLogs,
  onFetchLogs,
  gasConfig,
  isSyncing
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [dateFilter, setDateFilter] = useState(currentMonth);
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.userName && rec.userName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMode = modeFilter === 'ALL' || rec.mode === modeFilter;
    const matchesDate = !dateFilter || rec.date.startsWith(dateFilter);

    return matchesSearch && matchesMode && matchesDate;
  });

  const handleSingleResync = async (record: AttendanceRecord) => {
    setResyncingId(record.id);
    await onResyncRecord(record);
    setResyncingId(null);
  };

  const handleResyncAllPending = async () => {
    const pendingList = records.filter((r) => r.syncStatus !== 'SYNCED');
    if (pendingList.length === 0) return;

    for (const rec of pendingList) {
      setResyncingId(rec.id);
      await onResyncRecord(rec);
    }
    setResyncingId(null);
  };

  const pendingCount = records.filter((r) => r.syncStatus !== 'SYNCED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header Bar & Actions */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Riwayat Log Absensi Real-time
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Menampilkan seluruh data pemindaian QR Code dan status sinkronisasi ke Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {gasConfig.webAppUrl && (
            <Button
              variant="primary"
              onClick={onFetchLogs}
              disabled={isSyncing}
              icon={RefreshCw}
              iconProps={{ className: isSyncing ? 'animate-spin' : '' }}
            >
              {isSyncing ? 'Menarik Data...' : 'Sync dari Server'}
            </Button>
          )}

          {pendingCount > 0 && gasConfig.webAppUrl && (
            <Button
              variant="warning"
              onClick={handleResyncAllPending}
              icon={RefreshCw}
              iconProps={{ className: 'animate-spin' }}
            >
              Sync {pendingCount} Pending
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => exportRecordsToExcel(records)}
            icon={Download}
            iconProps={{ className: 'text-indigo-600' }}
          >
            Export Excel
          </Button>

          {records.length > 0 && (
            <Button
              variant="danger"
              onClick={onClearLogs}
              title="Hapus riwayat lokal"
              icon={Trash2}
            />
          )}
        </div>
      </Card>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari ID atau Nama..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 shadow-sm"
          />
        </div>

        {/* Mode filter */}
        <div>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as 'ALL' | 'MASUK' | 'KELUAR')}
            className="w-full py-3 px-4 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 shadow-sm"
          >
            <option value="ALL">Semua Mode Absensi</option>
            <option value="MASUK">Mode MASUK (Check-in)</option>
            <option value="KELUAR">Mode KELUAR (Check-out)</option>
          </select>
        </div>

        {/* Date filter */}
        <div>
          <input
            type="month"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full py-3 px-4 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 shadow-sm"
          />
        </div>
      </div>

      {/* Records Table */}
      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-5 text-center w-12">No</th>
                <th className="py-4 px-5">User ID / Nama</th>
                <th className="py-4 px-5">Tipe & Posisi</th>
                <th className="py-4 px-5 text-center">Mode</th>
                <th className="py-4 px-5">Tanggal & Waktu</th>
                <th className="py-4 px-5 text-center">Status Sync GAS</th>
                <th className="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    Belum ada log data absensi yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 text-center text-slate-400 font-mono font-bold">
                      {index + 1}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="font-extrabold text-slate-900">{record.userId}</div>
                      {record.userName && (
                        <div className="text-[11px] text-slate-500 font-medium">{record.userName}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="font-extrabold text-slate-700">{record.userType || '-'}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">{record.position || '-'}</div>
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <Badge variant={record.mode === 'MASUK' ? 'success' : 'error'}>
                        {record.mode}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="text-slate-900 font-mono font-bold">{record.time}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{record.date}</div>
                    </td>


                    <td className="py-3.5 px-5 text-center">
                      {record.syncStatus === 'SYNCED' ? (
                        <Badge variant="success" icon={CheckCircle2}>Tersimpan</Badge>
                      ) : record.syncStatus === 'PENDING' ? (
                        <Badge variant="warning" icon={Clock}>Pending</Badge>
                      ) : (
                        <Badge variant="error" icon={AlertTriangle} className="cursor-help" title={record.errorMessage}>Error</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      {record.syncStatus !== 'SYNCED' && gasConfig.webAppUrl && (
                        <button
                          onClick={() => handleSingleResync(record)}
                          disabled={resyncingId === record.id}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] transition-colors border border-slate-200"
                          title="Coba Sync Ulang ke Google Sheets"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${resyncingId === record.id ? 'animate-spin text-indigo-600' : ''}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};
