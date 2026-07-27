import React from 'react';
import { LogIn, LogOut, CalendarCheck, CloudCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { AttendanceRecord, GasConfig } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { useGasConnection } from '../../../hooks/useGasConnection';

interface StatsOverviewProps {
  records: AttendanceRecord[];
  gasConfig: GasConfig;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ records, gasConfig }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.date === todayStr);

  const checkInsToday = todayRecords.filter(r => r.mode === 'MASUK').length;
  const checkOutsToday = todayRecords.filter(r => r.mode === 'KELUAR').length;
  const pendingSyncCount = records.filter(r => r.syncStatus === 'PENDING' || r.syncStatus === 'FAILED').length;

  const { isConnected: isOnline, isChecking } = useGasConnection();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
      
      {/* Total Today */}
      <Card className="flex items-center justify-between" noPadding={false}>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Scan Hari Ini</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{todayRecords.length}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
          <CalendarCheck className="w-6 h-6" />
        </div>
      </Card>

      {/* Masuk (Check-in) */}
      <Card className="flex items-center justify-between" noPadding={false}>
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Presensi Masuk</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{checkInsToday}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
          <LogIn className="w-6 h-6" />
        </div>
      </Card>

      {/* Keluar (Check-out) */}
      <Card className="flex items-center justify-between" noPadding={false}>
        <div>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Presensi Keluar</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{checkOutsToday}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
          <LogOut className="w-6 h-6" />
        </div>
      </Card>

      {/* Sync Status */}
      <Card className="flex items-center justify-between" noPadding={false}>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google Sheets Sync</p>
          {gasConfig.webAppUrl ? (
            isChecking ? (
              <p className="text-sm font-black text-indigo-600 mt-1 flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" /> <span>Menghubungkan...</span>
              </p>
            ) : !isOnline ? (
              <p className="text-sm font-black text-rose-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> <span>Offline</span>
              </p>
            ) : pendingSyncCount > 0 ? (
              <p className="text-sm font-black text-amber-600 mt-1 flex items-center gap-1">
                <span>{pendingSyncCount} Pending</span>
              </p>
            ) : (
              <p className="text-sm font-black text-emerald-600 mt-1 flex items-center gap-1">
                <CloudCheck className="w-4 h-4" /> <span>Connected</span>
              </p>
            )
          ) : (
            <p className="text-sm font-black text-rose-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> <span>Belum URL</span>
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
          isChecking ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
          (!gasConfig.webAppUrl || !isOnline ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600')
        }`}>
          {isChecking ? <Loader2 className="w-6 h-6 animate-spin" /> : 
          (!isOnline ? <AlertTriangle className="w-6 h-6" /> : <CloudCheck className="w-6 h-6" />)}
        </div>
      </Card>

    </div>
  );
};
