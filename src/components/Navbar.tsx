import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Radio, 
  Sliders, 
  AlertTriangle, 
  ShieldCheck, 
  Terminal,
  RefreshCw,
  TrendingUp,
  Copy,
  Check,
  CheckSquare,
  Globe,
  Cpu
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useAppState } from '../context/StateContext';

export type PageId = 'dashboard' | 'signals' | 'history' | 'settings';

interface NavbarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onSelectPage }) => {
  const { 
    state, 
    isBotUnresponsive, 
    minutesSinceLastUpdate, 
    isAutoRefresh,
    toggleAutoRefresh,
    setIsPineScriptModalOpen,
    setIsBrokerModalOpen
  } = useAppState();

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const isReal = state?.settings?.mode === 'reel';
  const lastPrice = state?.bot_status?.last_price || 4024.13;
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/tradingview` : '/api/webhook/tradingview';

  const copyWebhook = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const navItems: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Workstation Trading', icon: LayoutDashboard },
    { id: 'signals', label: 'Signaux Webhook', icon: Radio },
    { id: 'history', label: 'Historique des Ordres', icon: History },
    { id: 'settings', label: 'Paramètres & Risque', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080a11]/95 backdrop-blur-xl border-b border-white/[0.08]">
      {/* 1. Alerte d'inactivité si aucune donnée reçue */}
      {isBotUnresponsive && (
        <div className="bg-[#ff6b5b]/15 border-b border-[#ff6b5b]/40 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#ff6b5b]">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>Le flux est silencieux depuis plus de {Math.max(minutesSinceLastUpdate, 2)} minutes. Vérifiez vos alertes TradingView ou votre robot.</span>
        </div>
      )}

      {/* 2. Top Bar Ticker & Institutional Micro-Telemetry */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-1.5 bg-[#05060a] border-b border-white/[0.06] text-[11px] font-mono">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Symbol Ingot */}
          <div className="flex items-center gap-2 bg-[#121624] px-2.5 py-0.5 rounded-md border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold tracking-wider text-amber-300">XAU/USD</span>
            <span className="text-[10px] text-zinc-400">OR COMPTANT</span>
          </div>

          {/* Real Live Spot Price with glow */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-zinc-400">Spot :</span>
            <span className="font-bold text-white tabular-nums tracking-tight bg-white/[0.05] px-2 py-0.5 rounded border border-white/10">
              ${lastPrice.toFixed(2)}
            </span>
          </div>

          {/* Webhook copy pill */}
          <button
            onClick={copyWebhook}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#121624] text-zinc-300 hover:text-amber-300 border border-white/[0.08] hover:border-amber-400/40 transition cursor-pointer text-[10px]"
            title="Copier l'URL Webhook pour TradingView"
          >
            {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
            <span>{copiedWebhook ? 'Webhook copié !' : 'URL Webhook TV'}</span>
          </button>
        </div>

        {/* Right side telemetry */}
        <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
          {/* Mode Pill */}
          {isReal ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              Exécution Réelle
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Supervision Active
            </span>
          )}

          {/* Auto Refresh Toggle */}
          <button
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
              isAutoRefresh 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
            title="Activer ou désactiver l'actualisation en temps réel"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isAutoRefresh ? 'animate-spin' : ''}`} />
            <span>{isAutoRefresh ? 'Direct (3.5s)' : 'Pause'}</span>
          </button>

          <span className="hidden md:inline font-mono text-zinc-300">vdohinnon22@gmail.com</span>
        </div>
      </div>

      {/* 3. Main Nav Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Monogram */}
        <div 
          onClick={() => onSelectPage('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-200 via-amber-500 to-amber-700 p-[1px] shadow-[0_0_20px_rgba(245,158,11,0.25)] group-hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition">
            <div className="w-full h-full bg-[#080a11] rounded-[11px] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-lg tracking-wider text-white">
                VICEINTE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold tracking-wide">
                PRO TERMINAL
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 tracking-tight">
              Institutional Gold Desk · MDT Masterclass
            </span>
          </div>
        </div>

        {/* Primary Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#0e121d] border border-white/[0.08]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-[#181d2f] text-amber-300 shadow-sm shadow-black/50 border border-white/[0.08]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {state?.metaapi?.auto_trade_enabled && (
            <button
              onClick={() => setIsBrokerModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition cursor-pointer shadow-sm"
              title="Prise de position auto MetaApi active"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-Trade MetaApi : ON ({state?.metaapi?.lot_size || 0.01} lot)</span>
            </button>
          )}

          <button
            onClick={() => setIsBrokerModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-[#121624] text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 transition active:scale-95 shadow-md cursor-pointer"
            title="Connecter un compte Démo (XM Global, MT5, Exness, Deriv) et configurer MetaApi / HFT"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Courtier & MetaApi</span>
            <span className="sm:hidden">Démo</span>
            <span className={`w-2 h-2 rounded-full ${state?.metaapi?.auto_trade_enabled || state?.broker?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          <button
            onClick={() => setIsPineScriptModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-zinc-950 hover:from-amber-400 hover:to-yellow-400 transition active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
            title="Ouvrir le script Pine Script v5 et les réglages webhook TradingView"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Script Pine</span>
            <span className="sm:hidden">Script TV</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center justify-around border-t border-white/[0.08] bg-[#0c0f18] py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                isActive ? 'text-amber-400 font-bold' : 'text-zinc-400'
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
