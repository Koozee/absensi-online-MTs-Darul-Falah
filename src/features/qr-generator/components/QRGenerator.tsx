import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IdCard, UserPlus, Printer, Copy, Check, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { registerToGAS } from '../../gas-sync/utils/gasApi';
import { APP_CONFIG } from '../../../config';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import toast from 'react-hot-toast';

export const QRGenerator: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [userType, setUserType] = useState('Siswa');
  const [copied, setCopied] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const prefix = userType === 'Staff/ Guru' ? 'SG-' : 'S-';
  const cleanId = userId.replace(/^(SG|S)-?/i, '');
  const finalUserId = cleanId ? `${prefix}${cleanId}` : '';

  const qrValue = finalUserId ? `${finalUserId} - ${name} - ${position} - ${userType} - [ABSENSI_QR_VALID]` : '';

  const handleCopyQRValue = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = async () => {
    if (!finalUserId || !name || !position) {
      toast.error("Harap lengkapi semua kolom: ID, Nama, dan Posisi.");
      return;
    }

    setIsRegistering(true);
    const result = await registerToGAS(APP_CONFIG.gasConfig.webAppUrl, {
      userId: finalUserId,
      name,
      position,
      type: userType
    });
    setIsRegistering(false);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(`Gagal: ${result.message}`);
    }
  };

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;

    try {
      setIsDownloading(true);
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      const safeName = (name || 'Kartu').replace(/[^a-zA-Z0-9]/g, '_');
      const safeId = (finalUserId || 'ID').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Kartu_Absensi_${safeName}_${safeId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Kartu berhasil diunduh sebagai gambar PNG!');
    } catch (err) {
      console.error('Gagal mengunduh kartu:', err);
      toast.error('Gagal mengunduh kartu PNG.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Top Banner */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <IdCard className="w-5 h-5 text-indigo-600" />
            Generator QR Code & Kartu ID Anggota
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Buat dan unduh QR Code khusus pegawai / mahasiswa untuk di-scan dengan kamera aplikasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleDownloadPNG}
            disabled={isDownloading}
            isLoading={isDownloading}
            icon={Download}
          >
            {isDownloading ? 'Mengunduh...' : 'Unduh Kartu (PNG)'}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Form Inputs & Presets */}
        <div className="md:col-span-6 space-y-6">
          <Card className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Detail Identitas Anggota
            </h3>

            <Input
              label="User ID / NIK / NIS *"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Masukkan Nomor Induk Pegawai/Siswa"
              className="font-mono font-bold"
            />

            <Input
              label="Nama Lengkap *"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan Nama Lengkap"
            />

            <Input
              label="Posisi / Jabatan *"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Guru Informatika/ Siswa Kelas 7"
            />

            <div className="pt-2 pb-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">Tipe Anggota *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    value="Siswa"
                    checked={userType === 'Siswa'}
                    onChange={(e) => setUserType(e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  Siswa
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="userType"
                    value="Staff/ Guru"
                    checked={userType === 'Staff/ Guru'}
                    onChange={(e) => setUserType(e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  Staff / Guru
                </label>
              </div>
            </div>

            <Button
              onClick={handleRegister}
              disabled={isRegistering}
              className="w-full mt-2"
              icon={UserPlus}
            >
              {isRegistering ? 'Menyimpan...' : 'Simpan ke Database & Buat QR'}
            </Button>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Format Teks Terencode di QR:</label>
              <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-2xl border border-indigo-100 text-xs font-mono font-bold text-indigo-700">
                <span className="flex-1 truncate">{qrValue}</span>
                <button
                  onClick={handleCopyQRValue}
                  className="p-1 hover:bg-indigo-100 rounded text-indigo-600"
                  title="Copy QR Text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </Card>

        </div>

        {/* Live ID Card Preview */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          <div ref={cardRef} className={`w-full max-w-sm rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden text-center group border transition-all duration-300 ${userType === 'Staff/ Guru'
            ? 'bg-amber-600 border-amber-500 shadow-amber-300/40'
            : 'bg-emerald-600 border-emerald-500 shadow-emerald-300/40'
            }`}>

            {/* Card Decorative background element */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="border-b border-white/20 pb-3 mb-5 flex items-center justify-between">
              <span className={`text-[10px] font-black tracking-widest uppercase ${userType === 'Staff/ Guru' ? 'text-amber-100' : 'text-emerald-100'
                }`}>
                {userType === 'Staff/ Guru' ? 'KARTU ABSENSI GURU / STAFF' : 'KARTU ABSENSI SISWA'}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-5 rounded-3xl inline-block shadow-xl my-2">
              <QRCodeSVG
                value={qrValue}
                size={180}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: '/logo.png',
                  height: 38,
                  width: 38,
                  excavate: true,
                }}
              />
            </div>

            {/* Member Details */}
            <div className="mt-5 space-y-1">
              <h4 className="text-2xl font-black text-white tracking-wide">{name || 'Nama Anggota'}</h4>
              <p className={`text-xl font-mono font-bold inline-block whitespace-nowrap px-3.5 py-1 rounded-full border mt-1 text-white ${userType === 'Staff/ Guru'
                ? 'bg-amber-700/60 border-amber-400/40'
                : 'bg-emerald-700/60 border-emerald-400/40'
                }`}>
                {finalUserId || 'ID-000'}
              </p>
              <p className={`text-lg font-semibold pt-2 ${userType === 'Staff/ Guru' ? 'text-amber-100' : 'text-emerald-100'
                }`}>
                {position || 'Posisi/Jabatan'}
              </p>
            </div>

            <div className={`mt-6 pt-3 border-t border-white/20 text-[10px] font-medium ${userType === 'Staff/ Guru' ? 'text-amber-100' : 'text-emerald-100'
              }`}>
              Pindai QR ini pada Kamera Aplikasi Absensi Online
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
