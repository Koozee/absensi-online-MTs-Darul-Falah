import React from 'react';
import { QrCode, FileText, IdCard } from 'lucide-react';
import { ActiveTab } from '../../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  todayCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  todayCount
}) => {
  const navItems = [
    {
      id: 'scanner' as ActiveTab,
      label: 'Scan QR',
      shortLabel: 'Scan',
      icon: QrCode
    },
    {
      id: 'logs' as ActiveTab,
      label: 'Log Absensi',
      shortLabel: 'Log',
      icon: FileText,
      badge: todayCount
    },
    {
      id: 'generator' as ActiveTab,
      label: 'Buat QR Kartu',
      shortLabel: 'Buat QR',
      icon: IdCard
    }
  ];

  return (
    <>
      {/* Top Header Navbar */}
      <header className="h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full gap-2">
            
            {/* Logo & School Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <img src="/logo.png" alt="logo" className="h-9 w-9 sm:h-12 sm:w-12 object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="font-black text-sm sm:text-lg md:text-xl text-indigo-900 tracking-tight truncate leading-tight">
                  MTs Darul Falah
                </h1>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate -mt-0.5">
                  Sistem Absensi Digital
                </p>
              </div>
            </div>

            {/* Desktop / Tablet Top Navigation */}
            <nav className="hidden sm:flex items-center space-x-1 sm:space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all relative ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {!!item.badge && item.badge > 0 && (
                      <span className="bg-indigo-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar for touchscreens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 px-2 py-1.5 shadow-lg">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                  isActive ? 'text-indigo-600 font-black' : 'text-slate-400 font-bold hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-indigo-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
