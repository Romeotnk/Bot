import React from 'react';
import { 
  LayoutDashboard, 
  History, 
  Radio, 
  Sliders, 
  Sparkles, 
  Pause, 
  Play, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useAppState } from '../context/StateContext';

export type PageId = 'dashboard' | 'history' | 'signals' | 'settings' | 'aurum';

interface NavbarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onSelectPage }) => {
  const { state, isBotUnresponsive, minutesSinceLastUpdate, togglePause } = useAppState();

  const isPaused = state?.settings?.paused ?? false;
  const isReal = state?.settings?.mode === 'reel';
  const isDemo = state?.is_demo_data ?? true;

  const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'signals', label: 'Signaux', icon: Radio },
    { id: 'settings', label: 'Réglages', icon: Sliders },
    { id: 'aurum', label: 'Demande à Aurum', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#06070c]/90 backdrop-blur-md border-b border-[#232637]">
      {/* 1. Unresponsive Alert Banner if bot has not updated in > 2 minutes */}
      {isBotUnresponsive && (
        <div className="bg-[#ff6b5b]/15 border-b border-[#ff6b5b]/40 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#ff6b5b]">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>Le robot ne répond plus (aucune donnée reçue depuis plus de {Math.max(minutesSinceLastUpdate, 2)} minutes). Vérifiez le processus Python.</span>
        </div>
      )}

      {/* 2. Permanent Mode & Demo Status Ribbon */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-1 bg-[#10121b] border-b border-[#232637]/60 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          {isReal ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-[#ff6b5b]/20 text-[#ff6b5b] border border-[#ff6b5b]/40">
              <span className="w-2 h-2 rounded-full bg-[#ff6b5b] animate-ping" />
              Mode réel actif — Ordres exécutés sur le marché
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-[#7fd6ff]/10 text-[#7fd6ff] border border-[#7fd6ff]/30">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7fd6ff]" />
              Simulation : aucun ordre réel
            </span>
          )}

          {isDemo && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded font-semibold text-[10px] uppercase tracking-wider bg-[#e8c56a]/15 text-[#e8c56a] border border-[#e8c56a]/30">
              Données de démonstration
            </span>
          )}

          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-[#8d90a3] bg-[#06070c] border border-[#232637]">
            MDT Indicator 2026 · H4→M3
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#8d90a3]">
          <span className="hidden md:inline font-mono">TradingView XAUUSD</span>
          <span className="text-[#e9e6dc]">vdohinnon22@gmail.com</span>
        </div>
      </div>

      {/* 3. Main Header Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => onSelectPage('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f6e7b8] via-[#e8c56a] to-[#9a7b2c] p-[1px] shadow-lg shadow-[#e8c56a]/20">
            <div className="w-full h-full bg-[#06070c] rounded-[11px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#e8c56a] group-hover:rotate-45 transition duration-500" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-base tracking-wider text-[#e9e6dc] group-hover:text-[#e8c56a] transition">
              VICEINTE
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[#8d90a3] uppercase -mt-1">
              Aurum XAUUSD Engine
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#171a27] text-[#e8c56a] border border-[#e8c56a]/40 shadow-sm'
                    : 'text-[#8d90a3] hover:text-[#e9e6dc] hover:bg-[#10121b]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#e8c56a]' : 'text-[#8d90a3]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2.5">
          <PWAInstallButton />

          {/* Pause / Resume Button */}
          <button
            onClick={togglePause}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition active:scale-95 cursor-pointer shadow-md ${
              isPaused
                ? 'bg-[#e8c56a] text-[#06070c] hover:bg-[#f6e7b8] shadow-[#e8c56a]/20'
                : 'bg-[#ff6b5b]/15 text-[#ff6b5b] border border-[#ff6b5b]/40 hover:bg-[#ff6b5b]/25 shadow-[#ff6b5b]/10'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Reprendre le robot</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Mettre en pause</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Navigation Tab Bar */}
      <div className="lg:hidden flex items-center justify-around px-2 py-1.5 border-t border-[#232637]/70 bg-[#06070c] overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition shrink-0 ${
                isActive
                  ? 'text-[#e8c56a] bg-[#171a27]'
                  : 'text-[#8d90a3] hover:text-[#e9e6dc]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
