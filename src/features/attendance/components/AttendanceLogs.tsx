import React, { useState, useRef, useEffect } from 'react';
import { Download, Search, RefreshCw, Trash2, CheckCircle2, Clock, AlertTriangle, FileSpreadsheet, ChevronDown, LogIn, LogOut, List } from 'lucide-react';
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isStaffOrGuruRecord = (rec: AttendanceRecord): boolean => {
    const type = (rec.userType || '').toLowerCase();
    if (type.includes('staff') || type.includes('guru')) return true;
    if (type.includes('siswa')) return false;
    if (rec.userId.toUpperCase().startsWith('SG-')) return true;
    return false;
  };

  const isSiswaRecord = (rec: AttendanceRecord): boolean => {
    const type = (rec.userType || '').toLowerCase();
    if (type.includes('siswa')) return true;
    if (type.includes('staff') || type.includes('guru')) return false;
    if (rec.userId.toUpperCase().startsWith('S-')) return true;
    return !isStaffOrGuruRecord(rec);
  };

  type ExportMode = 'ALL' | 'MASUK_STAFF' | 'KELUAR_STAFF' | 'MASUK_SISWA' | 'KELUAR_SISWA' | 'MASUK' | 'KELUAR';

  const handleExport = (exportMode: ExportMode) => {
    const monthsName = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    let yearStr = new Date().getFullYear().toString();
    let monthIndex = new Date().getMonth();

    if (dateFilter) {
      const parts = dateFilter.split('-');
      if (parts.length === 2) {
        yearStr = parts[0];
        monthIndex = parseInt(parts[1], 10) - 1;
      }
    }

    let suffix = 'Semua';
    // Filter base records by the selected month
    let baseRecords = dateFilter ? records.filter(r => r.date.startsWith(dateFilter)) : records;
    let toExport = baseRecords;

    switch (exportMode) {
      case 'MASUK_STAFF':
        suffix = 'Masuk_Guru_Staff';
        toExport = baseRecords.filter(r => r.mode === 'MASUK' && isStaffOrGuruRecord(r));
        break;
      case 'KELUAR_STAFF':
        suffix = 'Keluar_Guru_Staff';
        toExport = baseRecords.filter(r => r.mode === 'KELUAR' && isStaffOrGuruRecord(r));
        break;
      case 'MASUK_SISWA':
        suffix = 'Masuk_Siswa';
        toExport = baseRecords.filter(r => r.mode === 'MASUK' && isSiswaRecord(r));
        break;
      case 'KELUAR_SISWA':
        suffix = 'Keluar_Siswa';
        toExport = baseRecords.filter(r => r.mode === 'KELUAR' && isSiswaRecord(r));
        break;
      case 'MASUK':
        suffix = 'Masuk_Semua';
        toExport = baseRecords.filter(r => r.mode === 'MASUK');
        break;
      case 'KELUAR':
        suffix = 'Keluar_Semua';
        toExport = baseRecords.filter(r => r.mode === 'KELUAR');
        break;
      case 'ALL':
      default:
        suffix = 'Semua';
        toExport = baseRecords;
        break;
    }

    const filename = `Data_Absensi_${suffix}_${monthsName[monthIndex]}_${yearStr}.xlsx`;
    exportRecordsToExcel(toExport, filename);
    setExportMenuOpen(false);
  };

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

          {/* Export Excel with mode selector */}
          <div className="relative" ref={exportMenuRef}>
            <div className="flex items-center rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {/* Main export button */}
              <button
                onClick={() => handleExport('ALL')}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-indigo-50 text-slate-800 text-xs font-semibold transition-colors"
                title="Export semua data ke Excel"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                Export Excel
              </button>
              {/* Chevron to open mode selector */}
              <button
                onClick={() => setExportMenuOpen(prev => !prev)}
                className="flex items-center px-2 py-2.5 bg-white hover:bg-indigo-50 text-slate-500 border-l border-slate-200 transition-colors"
                title="Pilih mode export"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown menu */}
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in">
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pilih Mode Export</p>
                </div>

                <button
                  onClick={() => handleExport('ALL')}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors text-left"
                >
                  <List className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <div className="font-bold">Semua Absensi</div>
                    <div className="text-[10px] text-slate-400 font-normal">Export semua data absensi</div>
                  </div>
                </button>

                {/* Guru / Staff */}
                <div className="px-3.5 py-1.5 bg-slate-50/80 border-y border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Guru &amp; Staff</p>
                </div>
                <button
                  onClick={() => handleExport('MASUK_STAFF')}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-emerald-50 text-xs font-semibold text-slate-700 transition-colors text-left"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800">1. Masuk Guru / Staff</div>
                    <div className="text-[10px] text-slate-400 font-normal">Export data check-in Guru &amp; Staff</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('KELUAR_STAFF')}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-rose-50 text-xs font-semibold text-slate-700 transition-colors text-left border-t border-slate-50"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800">2. Keluar Guru / Staff</div>
                    <div className="text-[10px] text-slate-400 font-normal">Export data check-out Guru &amp; Staff</div>
                  </div>
                </button>

                {/* Siswa */}
                <div className="px-3.5 py-1.5 bg-slate-50/80 border-y border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Siswa</p>
                </div>
                <button
                  onClick={() => handleExport('MASUK_SISWA')}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-emerald-50 text-xs font-semibold text-slate-700 transition-colors text-left"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800">3. Masuk Siswa</div>
                    <div className="text-[10px] text-slate-400 font-normal">Export data check-in Siswa</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('KELUAR_SISWA')}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-rose-50 text-xs font-semibold text-slate-700 transition-colors text-left border-t border-slate-50"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800">4. Keluar Siswa</div>
                    <div className="text-[10px] text-slate-400 font-normal">Export data check-out Siswa</div>
                  </div>
                </button>
              </div>
            )}
          </div>

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
