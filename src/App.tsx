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
import { PineScriptModal } from './components/PineScriptModal';
import { BrokerConnectModal } from './components/BrokerConnectModal';
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
  const { 
    isPineScriptModalOpen, 
    setIsPineScriptModalOpen, 
    isBrokerModalOpen, 
    setIsBrokerModalOpen, 
    state 
  } = useAppState();

  return (
    <div className="relative min-h-screen bg-[#06070c] text-[#e9e6dc] flex flex-col font-sans selection:bg-[#e8c56a]/30 selection:text-[#f6e7b8]">
      {/* Navigation principale */}
      <Navbar currentPage={currentPage} onSelectPage={setCurrentPage} />

      {/* Vue active */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'signals' && <SignalsPage />}
        {currentPage === 'history' && <HistoryPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>

      {/* Modal Pine Script TradingView & Webhook */}
      <PineScriptModal
        isOpen={isPineScriptModalOpen}
        onClose={() => setIsPineScriptModalOpen(false)}
        botKey={state?.bot_key || 'aurum-prod-secret-xauusd-key'}
      />

      {/* Modal Connexion Compte Démo (XM Global, MT5, Exness, Deriv) & HFT */}
      <BrokerConnectModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
      />

      {/* Footer épuré pour la production */}
      <footer className="relative z-10 border-t border-[#232637]/60 bg-[#06070c] py-5 px-4 text-center text-xs text-[#8d90a3] font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Viceinte · Terminal de Trading Institutionnel XAUUSD</span>
          <span className="text-[#8d90a3]/80">
            Intégration TradingView Pine Script v5 & Webhooks
          </span>
          <span className="text-[#e8c56a]">Méthodologie MDT Smart Money</span>
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
