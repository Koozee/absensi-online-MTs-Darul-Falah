import React from 'react';
import { Navbar } from './Navbar';
import { ActiveTab } from '../../types';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  todayCount: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  todayCount
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-600 selection:text-white flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        todayCount={todayCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:py-8 space-y-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-md mt-auto pt-8 pb-20 sm:pb-8 text-slate-600 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Brand & Description */}
          <div className="flex items-center space-x-3 text-center md:text-left">
            <img src="/logo.png" alt="Logo MTs Darul Falah" className="h-9 w-9 object-contain" />
            <div>
              <p className="font-extrabold text-slate-900 text-sm tracking-tight">MTs Darul Falah Pakisaji</p>
              <p className="text-[11px] text-slate-500 font-medium">Sistem Absensi Digital QR Code & Real-time Sync</p>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} MTs Darul Falah Pakisaji. Hak Cipta Dilindungi.</p>
            <p className="font-medium text-slate-500 mt-0.5">Developed by <span className="text-indigo-600 font-bold">KoFa Studio</span></p>
          </div>

        </div>
      </footer>
    </div>
  );
};
