export type AttendanceMode = 'MASUK' | 'KELUAR';

export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  position?: string;
  mode: AttendanceMode;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm:ss
  timestamp: number;  // Epoch ms
  syncStatus: SyncStatus;
  errorMessage?: string;
  userType?: string;
}

export interface GasConfig {
  webAppUrl: string;
  autoSync: boolean;
}

export type ActiveTab = 'scanner' | 'logs' | 'generator';
