import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { LogIn, LogOut, Camera, AlertTriangle, Keyboard, RefreshCw, Clock } from 'lucide-react';
import { AttendanceMode, AttendanceRecord } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import toast from 'react-hot-toast';

interface QRScannerProps {
  mode: AttendanceMode;
  setMode: (mode: AttendanceMode) => void;
  onScanSuccess: (data: { userId: string; userName?: string; position?: string; userType?: string; mode: AttendanceMode }) => Promise<AttendanceRecord>;
  lastScanRecord: AttendanceRecord | null;
  isSyncing: boolean;
}

interface ParsedQR {
  userId: string;
  userName: string;
  position: string;
  userType?: string;
  isValid: boolean;
}

const QR_SIGNATURE = '[ABSENSI_QR_VALID]';
const COOLDOWN_SECONDS = 3;

/**
 * Parses raw QR/manual text into structured user data.
 * Supports JSON, dash-separated, and pipe-separated formats.
 */
function parseQRContent(decodedText: string, isManual = false): ParsedQR {
  const trimmed = decodedText.trim();
  const hasSignature = trimmed.endsWith(QR_SIGNATURE);

  if (!isManual && !hasSignature) {
    return { userId: '', userName: '', position: '', isValid: false };
  }

  const textToParse = hasSignature
    ? trimmed.substring(0, trimmed.lastIndexOf(QR_SIGNATURE)).replace(/ -\s*$/, '').trim()
    : trimmed;

  // Try JSON parsing first
  try {
    const parsed = JSON.parse(textToParse);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        userId: String(parsed.userId || parsed.id || parsed.code || parsed.nik || parsed.npm || textToParse),
        userName: String(parsed.userName || parsed.name || parsed.nama || ''),
        position: String(parsed.position || parsed.role || parsed.jabatan || parsed.posisi || ''),
        userType: String(parsed.userType || parsed.type || parsed.tipe || ''),
        isValid: true
      };
    }
  } catch {
    // Not JSON — continue to string pattern matching
  }

  // Check dash-separated format: "ID - NAME - POSITION - TYPE"
  if (textToParse.includes(' - ')) {
    const parts = textToParse.split(' - ');
    if (parts.length >= 4) {
      return {
        userId: parts[0].trim(),
        userName: parts[1]?.trim() || '',
        position: parts.slice(2, parts.length - 1).join(' - ').trim(),
        userType: parts[parts.length - 1].trim(),
        isValid: true
      };
    } else {
      return {
        userId: parts[0].trim(),
        userName: parts[1]?.trim() || '',
        position: parts.slice(2).join(' - ').trim(),
        isValid: true
      };
    }
  }

  // Check pipe-separated format: "ID | NAME | POSITION | TYPE"
  if (textToParse.includes(' | ')) {
    const parts = textToParse.split(' | ');
    if (parts.length >= 4) {
      return {
        userId: parts[0].trim(),
        userName: parts[1]?.trim() || '',
        position: parts.slice(2, parts.length - 1).join(' | ').trim(),
        userType: parts[parts.length - 1].trim(),
        isValid: true
      };
    } else {
      return {
        userId: parts[0].trim(),
        userName: parts[1]?.trim() || '',
        position: parts.slice(2).join(' | ').trim(),
        isValid: true
      };
    }
  }

  // Plain text — treat entire string as userId
  return { userId: textToParse, userName: '', position: '', userType: '', isValid: true };
}

export const QRScanner: React.FC<QRScannerProps> = ({
  mode,
  setMode,
  onScanSuccess,
  lastScanRecord,
  isSyncing
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const isInitializingRef = useRef(false);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const handleDecodedText = useCallback(async (decodedText: string, isManual = false) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const { userId, userName, position, userType, isValid } = parseQRContent(decodedText, isManual);

    if (!isValid) {
      toast.error('QR Code ini tidak dikenali (bukan dari generator web absensi resmi).', { duration: 2500 });
      setTimeout(() => { isProcessingRef.current = false; }, 2500);
      return;
    }

    if (!userId) {
      toast.error('Konten QR Code tidak berisi ID pengguna yang valid.', { duration: 2000 });
      setTimeout(() => { isProcessingRef.current = false; }, 2000);
      return;
    }

    try {
      const currentMode = modeRef.current;
      const record = await onScanSuccess({ userId, userName, position, userType, mode: currentMode });
      toast.success(`Absensi ${currentMode} Berhasil!\n[${record.userId}] ${record.userName || ''} - Jam ${record.time}`);

      setCooldown(COOLDOWN_SECONDS);
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            isProcessingRef.current = false;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      console.error('Scan error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal Mencatat Absensi: ${errorMsg}`);
      setTimeout(() => { isProcessingRef.current = false; }, 2500);
    }
  }, [onScanSuccess]);

  const startScanner = useCallback(async (cameraIdToUse?: string) => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setCameraError(null);

    try {
      if (html5QrcodeRef.current?.isScanning) {
        try {
          await html5QrcodeRef.current.stop();
          html5QrcodeRef.current.clear();
        } catch (e) {
          console.warn('Cleanup before restart failed', e);
        }
      }

      const html5Qrcode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qrcode;

      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) {
        setCameraError('Kamera tidak ditemukan pada perangkat ini.');
        return;
      }

      setCameras(devices.map(d => ({ id: d.id, label: d.label || `Kamera ${d.id}` })));
      const targetCamId = cameraIdToUse || selectedCameraId || devices[0].id;
      setSelectedCameraId(targetCamId);

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5Qrcode.start(
        targetCamId,
        config,
        (decodedText) => handleDecodedText(decodedText, false),
        () => { /* QR scan frame error — normal while scanning */ }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Error starting camera:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (errorMsg.includes('Permission') || errorMsg.includes('NotAllowedError')) {
        setCameraError('Akses kamera ditolak. Mohon izinkan akses kamera pada peramban browser Anda.');
      } else {
        setCameraError(`Gagal membuka kamera: ${errorMsg}`);
      }
      setIsScanning(false);
    } finally {
      isInitializingRef.current = false;
    }
  }, [selectedCameraId, handleDecodedText]);

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current?.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Stop scanner error:', err);
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCamId = e.target.value;
    setSelectedCameraId(newCamId);
    startScanner(newCamId);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await handleDecodedText(manualInput.trim(), true);
    setManualInput('');
    setIsManualModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Mode Switcher */}
      <Card noPadding={false} className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <Button
              variant={mode === 'MASUK' ? 'outline' : 'ghost'}
              onClick={() => setMode('MASUK')}
              className={`flex-1 sm:flex-none ${mode === 'MASUK' ? 'text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              icon={LogIn}
            >
              MASUK (Check-in)
            </Button>
            <Button
              variant={mode === 'KELUAR' ? 'outline' : 'ghost'}
              onClick={() => setMode('KELUAR')}
              className={`flex-1 sm:flex-none ${mode === 'KELUAR' ? 'text-rose-600 shadow-sm' : 'text-slate-500'}`}
              icon={LogOut}
            >
              KELUAR (Check-out)
            </Button>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsManualModalOpen(true)}
              icon={Keyboard}
              iconProps={{ className: 'text-indigo-600' }}
            >
              <span className="hidden sm:inline">Input Manual</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Scanner Card */}
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
              <h2 className="text-xl font-black text-slate-900">Pindai QR Code</h2>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Arahkan kartu akses Anda ke area pemindaian <span className="text-indigo-600 font-bold">({mode === 'MASUK' ? 'Mode Check-in' : 'Mode Check-out'})</span>
            </p>
          </div>

          {cameras.length > 1 && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
              <Camera className="w-4 h-4 text-indigo-600" />
              <select
                value={selectedCameraId}
                onChange={handleCameraChange}
                className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none"
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Camera Feed */}
        <div className="relative bg-slate-950 rounded-3xl overflow-hidden border-4 border-slate-900 min-h-[340px] flex flex-col items-center justify-center">
          <div id="qr-reader" className="w-full max-w-md mx-auto rounded-xl overflow-hidden" />

          {/* Scanning Overlay */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-64 border-2 border-indigo-500/50 rounded-3xl relative flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl -mb-1 -mr-1" />
                <div className="w-full h-0.5 bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-pulse relative top-1/2 -translate-y-1/2" />
              </div>
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <div className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-slate-800 tracking-wider uppercase">Posisikan QR Code di Bingkai</span>
                </div>
              </div>
            </div>
          )}

          {/* Cooldown Overlay */}
          {cooldown > 0 && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20 transition-all">
              <Clock className="w-10 h-10 text-indigo-400 animate-bounce mb-2" />
              <p className="text-xl font-black text-white">Scan Berhasil!</p>
              <p className="text-xs text-slate-300 mt-1">Siap untuk scan berikutnya dalam:</p>
              <span className="mt-3 text-2xl font-black text-indigo-400 bg-indigo-500/20 border border-indigo-500/30 w-12 h-12 rounded-full flex items-center justify-center">
                {cooldown}
              </span>
            </div>
          )}

          {/* Camera Error */}
          {cameraError && (
            <div className="p-6 text-center max-w-md bg-slate-900 rounded-2xl m-4 border border-slate-800">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Gagal Mengakses Kamera</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">{cameraError}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button onClick={() => startScanner()} icon={RefreshCw} className="w-full sm:w-auto">
                  Coba Lagi Kamera
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsManualModalOpen(true)}
                  icon={Keyboard}
                  iconProps={{ className: 'text-indigo-400' }}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                >
                  Gunakan Input Manual
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Last Scan Info */}
        {lastScanRecord && (
          <div className="mt-6 bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl border border-white/20 shrink-0">
                {lastScanRecord.userId.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Scan Terakhir Berhasil</p>
                <h3 className="font-black text-xl leading-none mt-1">
                  {lastScanRecord.userName || lastScanRecord.userId}
                </h3>
                <p className="text-indigo-100 text-xs mt-1 font-mono font-medium">
                  ID: {lastScanRecord.userId} • Mode: {lastScanRecord.mode}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-6 text-right w-full sm:w-auto justify-between sm:justify-end">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-extrabold text-indigo-200">Jam {lastScanRecord.mode}</p>
                <p className="text-base font-black font-mono">{lastScanRecord.time}</p>
              </div>
              <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase border ${lastScanRecord.syncStatus === 'SYNCED'
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : 'bg-amber-400 text-slate-900 border-amber-300'
                }`}>
                {lastScanRecord.syncStatus === 'SYNCED' ? 'Synced Sheet' : 'Pending Sync'}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Manual Input Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-1">
              <Keyboard className="w-5 h-5 text-indigo-600" />
              Presensi Manual Tanpa Kamera
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-5">
              Ketik ID Pengguna / NIK / NIS untuk mencatat absensi mode <b>{mode}</b>.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                label="User ID / NIP / NIS *"
                type="text"
                required
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Masukkan ID Pengguna / NIP / NIS"
              />

              <div className="flex items-center justify-end space-x-2 pt-3">
                <Button type="button" variant="secondary" onClick={() => setIsManualModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSyncing}>
                  Submit Absensi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
