/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StateProvider, useAppState } from './context/StateContext';
import { Navbar, PageId } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { SignalsPage } from './pages/SignalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AskAurumPage } from './pages/AskAurumPage';
import { WifiOff } from 'lucide-react';

function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#ff6b5b] px-3.5 py-2 text-xs font-semibold text-[#06070c] shadow-2xl">
      <WifiOff className="w-4 h-4" />
      <span>Mode hors-ligne — Cache local activé</span>
    </div>
  );
}

function MainAppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  return (
    <div className="relative min-h-screen bg-[#06070c] text-[#e9e6dc] flex flex-col font-sans selection:bg-[#e8c56a]/30 selection:text-[#f6e7b8]">
      {/* Discrete subtle golden ambient halo at top-left (Sci-fi spacecraft bridge lighting) */}
      <div 
        className="fixed top-0 left-0 w-[550px] h-[550px] pointer-events-none z-0 rounded-full blur-[130px] opacity-15"
        style={{
          background: 'radial-gradient(circle, #e8c56a 0%, #10121b 70%, transparent 100%)',
        }}
      />
      {/* Subtle glacier ambient halo at bottom-right */}
      <div 
        className="fixed bottom-0 right-0 w-[450px] h-[450px] pointer-events-none z-0 rounded-full blur-[140px] opacity-10"
        style={{
          background: 'radial-gradient(circle, #7fd6ff 0%, transparent 70%)',
        }}
      />

      {/* Main Header / Navigation */}
      <Navbar currentPage={currentPage} onSelectPage={setCurrentPage} />

      {/* Main View Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'history' && <HistoryPage />}
        {currentPage === 'signals' && <SignalsPage />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'aurum' && <AskAurumPage />}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#232637]/60 bg-[#06070c] py-6 px-4 text-center text-xs text-[#8d90a3] font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Viceinte v2.4 · Contrôle & Télémétrie XAUUSD</span>
          <span className="text-[#8d90a3]/70">
            Protégé par clé d’ingestion serveur · Ne passe aucun ordre direct
          </span>
          <span className="text-[#e8c56a]">Noyau Aurum Opérationnel</span>
        </div>
      </footer>

      <OfflineBanner />
    </div>
  );
}

export default function App() {
  return (
    <StateProvider>
      <MainAppContent />
    </StateProvider>
  );
}
