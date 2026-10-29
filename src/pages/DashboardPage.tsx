import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { TradingChart } from '../components/TradingChart';
import { TradingViewChart } from '../components/TradingViewChart';
import { FutureScenariosCard } from '../components/FutureScenariosCard';
import { MdtAutonomousEngineCard } from '../components/MdtAutonomousEngineCard';
import { HftExecutionConsole } from '../components/HftExecutionConsole';
import { HftHitRateTracker } from '../components/HftHitRateTracker';
import { MdtRadarTable } from '../components/MdtRadarTable';
import { MdtChecklistModal } from '../components/MdtChecklistModal';
import { SafetyGauges } from '../components/SafetyGauges';
import { DecisionLogFeed } from '../components/DecisionLogFeed';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Award, 
  Activity, 
  RefreshCw, 
  ShieldCheck, 
  BarChart2, 
  Layers, 
  CheckSquare, 
  Radio,
  Terminal,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Lock,
  Sliders,
  Calculator,
  Target,
  Zap,
  Flame,
  Check,
  ChevronRight,
  Cpu
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { 
    state, 
    refreshState,
    setIsPineScriptModalOpen,
    setIsBrokerModalOpen,
    latencyMs
  } = useAppState();

  const [chartViewMode, setChartViewMode] = useState<'mdt_smc' | 'tradingview'>('mdt_smc');
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isSyncingRealPrice, setIsSyncingRealPrice] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Interactive Live Lot Size Calculator State
  const [calcCapital, setCalcCapital] = useState<number>(1000);
  const [calcRiskPct, setCalcRiskPct] = useState<number>(0.5);
  const [calcSlPips, setCalcSlPips] = useState<number>(25); // 25 pips default on gold = 2.50 pts

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-[#0d101a] border border-white/10 shadow-2xl">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h3 className="font-heading font-bold text-sm text-white">Connexion au Terminal XAUUSD</h3>
            <p className="text-xs font-mono text-zinc-400 mt-1">Initialisation des flux quantitatifs MDT...</p>
          </div>
        </div>
      </div>
    );
  }

  const { bot_status, levels, settings, trades, decision_log, mdt_radar } = state;
  const lastPrice = bot_status.last_price || 4024.13;

  // Day metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter((t) => t.opened_at.startsWith(todayStr));
  const todayTradesCount = todayTrades.length;
  const dayRTotal = todayTrades.reduce((acc, t) => acc + (t.r_result || 0), 0);

  // Active open trade from TradingView or Python
  const activeTrade = trades.find((t) => t.closed_at === null);

  // Market session detector (UTC)
  const utcHours = new Date().getUTCHours();
  let currentSession = 'Hors Session';
  let sessionBadgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  let sessionTimeText = 'Prochaine : Londres (07:00 UTC)';
  if (utcHours >= 7 && utcHours < 11) {
    currentSession = 'Killzone Londres';
    sessionBadgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20';
    sessionTimeText = '07:00 – 11:00 UTC · Volatilité haute';
  } else if (utcHours >= 12 && utcHours < 17) {
    currentSession = 'Killzone New York';
    sessionBadgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20';
    sessionTimeText = '12:30 – 17:00 UTC · Volume institutionnel';
  } else if (utcHours >= 0 && utcHours < 7) {
    currentSession = 'Session Asie';
    sessionBadgeColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40';
    sessionTimeText = '00:00 – 07:00 UTC · Range asiatique';
  }

  // Price change estimation based on first candle of day vs last price
  const firstCandlePrice = bot_status.candles[0]?.open || lastPrice;
  const priceChange = lastPrice - firstCandlePrice;
  const priceChangePct = (priceChange / firstCandlePrice) * 100;
  const isPriceUp = priceChange >= 0;

  // 24h High & Low Range Position
  const dayHigh = levels?.prev_day_high || (lastPrice + 4.5);
  const dayLow = levels?.prev_day_low || (lastPrice - 5.5);
  const rangeSpan = dayHigh - dayLow || 1;
  const rangePositionPct = Math.min(Math.max(((lastPrice - dayLow) / rangeSpan) * 100, 5), 95);

  // Live Lot Calculation
  const riskAmountUsd = (calcCapital * calcRiskPct) / 100;
  const slPoints = calcSlPips * 0.1; // 1 pip = 0.1 pt on XAUUSD
  const calculatedLot = slPoints > 0 ? riskAmountUsd / (slPoints * 100) : 0.01;
  const formattedLot = calculatedLot < 0.01 ? '0.01' : calculatedLot.toFixed(2);

  // Sync real live gold price from public global feed
  const handleSyncRealMarket = async () => {
    setIsSyncingRealPrice(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch('/api/market/sync-live');
      if (res.ok) {
        const data = await res.json();
        setSyncStatusMsg(`Cours spot actualisé : ${data.price} $`);
        await refreshState();
        setTimeout(() => setSyncStatusMsg(null), 3000);
      } else {
        setSyncStatusMsg('Flux externe momentanément indisponible.');
      }
    } catch (e) {
      setSyncStatusMsg('Erreur réseau lors de la synchronisation.');
    } finally {
      setIsSyncingRealPrice(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. MASTER WORKSTATION TICKER BANNER */}
      <div className="rounded-2xl bg-gradient-to-b from-[#101320] via-[#0c0e17] to-[#090b12] border border-white/[0.09] p-5 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Giant Spot Gold Ticker & Direction */}
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                  XAU/USD · SPOT OR PHYSIQUE (USD)
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${sessionBadgeColor}`}>
                  {currentSession}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <h1 className="font-heading font-black text-4xl sm:text-5xl text-white tracking-tight tabular-nums">
                  ${lastPrice.toFixed(2)}
                </h1>

                <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                  isPriceUp 
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}>
                  {isPriceUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}$ ({priceChangePct.toFixed(2)}%)</span>
                </div>
              </div>

              {syncStatusMsg && (
                <div className="text-[11px] font-mono text-cyan-400 mt-1 animate-pulse">
                  {syncStatusMsg}
                </div>
              )}
            </div>

            {/* Range Slider Visualization (Low vs High of Day) */}
            <div className="hidden xl:flex flex-col gap-1.5 min-w-[200px] p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>Bas 24h : ${dayLow.toFixed(1)}</span>
                <span>Haut 24h : ${dayHigh.toFixed(1)}</span>
              </div>
              <div className="relative w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full" 
                  style={{ width: `${rangePositionPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                <span>Spread: {(dayHigh - dayLow).toFixed(1)} pts</span>
                <span className="text-amber-300 font-semibold">{rangePositionPct.toFixed(0)}% du range</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Dock & Modals */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSyncRealMarket}
              disabled={isSyncingRealPrice}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-[#141824] text-zinc-300 hover:text-white border border-white/[0.08] hover:border-amber-400/40 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Actualiser les cours mondiaux de l'or"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncingRealPrice ? 'animate-spin' : ''}`} />
              <span>Sync Cours</span>
            </button>

            <button
              onClick={() => setIsChecklistOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-[#171b29] text-amber-300 border border-amber-500/30 hover:bg-amber-500/15 transition active:scale-95 shadow-sm shadow-amber-500/10 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Checklist MDT</span>
            </button>

            {/* Unified Broker & MetaApi Connect Status */}
            {(() => {
              const isAccountConnected = Boolean(state?.metaapi?.connected || state?.broker?.connected);
              const accountLabel = state?.metaapi?.connected
                ? `MetaApi MT5 ($${(state.metaapi.balance || bot_status.balance || 1000).toLocaleString('fr-FR')})`
                : state?.broker?.connected
                  ? `${state.broker.broker_type} Démo (${state.broker.last_ping_ms || 18}ms)`
                  : 'Lier Démo Courtier';

              return (
                <button
                  onClick={() => setIsBrokerModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition active:scale-95 shadow-sm cursor-pointer ${
                    isAccountConnected
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : 'bg-[#141824] text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400'
                  }`}
                  title="Gérer les comptes courtiers connectés (MetaApi MT5, XM Global, Exness, Deriv)"
                >
                  <Cpu className={`w-3.5 h-3.5 ${isAccountConnected ? 'text-emerald-400' : 'text-cyan-400'}`} />
                  <span>{isAccountConnected ? `✓ ${accountLabel}` : 'Lier Démo Courtier'}</span>
                </button>
              );
            })()}

            <button
              onClick={() => setIsPineScriptModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500 transition active:scale-95 shadow-md shadow-amber-500/25 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Script Pine & Webhook</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DOCKED WORKSTATION GRID: (8 COLS CHART & SIGNAL DOCK / 4 COLS RISK & RADAR RAIL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / CENTER (8 COLS): HIGH-PERFORMANCE CHART & ACTIVE POSITION CONSOLE */}
        <div className="lg:col-span-8 space-y-5">
          {/* Chart Card */}
          <div className="rounded-2xl bg-[#0c0e17] border border-white/[0.09] shadow-2xl overflow-hidden">
            {/* Chart Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.08] bg-[#111420]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-xs text-amber-400 tracking-wider uppercase">
                    Graphique Cours XAUUSD
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Live Spot
                  </span>
                </div>
              </div>

              {/* View Switcher: MDT Canvas vs TradingView Embed */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#080a10] border border-white/[0.08]">
                <button
                  onClick={() => setChartViewMode('mdt_smc')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                    chartViewMode === 'mdt_smc'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Canvas Lightweight Charts ultra-rapide avec repères Smart Money"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>MDT Smart Money</span>
                </button>

                <button
                  onClick={() => setChartViewMode('tradingview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                    chartViewMode === 'tradingview'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Widget TradingView officiel intégrant tous les indicateurs"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>TradingView Live</span>
                </button>
              </div>
            </div>

            {/* Chart View Content */}
            <div className="p-1">
              {chartViewMode === 'mdt_smc' ? (
                <TradingChart
                  candles={bot_status.candles}
                  levels={levels}
                  plan={bot_status.plan}
                  botState={bot_status.state}
                  lastPrice={lastPrice}
                />
              ) : (
                <TradingViewChart symbol="FOREXCOM:XAUUSD" interval="5" />
              )}
            </div>
          </div>

          {/* Trade Execution Console OR Confluence Scanner */}
          {activeTrade ? (
            /* ACTIVE POSITION CARD */
            <div className="rounded-2xl bg-gradient-to-br from-[#121828] via-[#0d1220] to-[#0a0d16] border-2 border-cyan-500/50 p-5 shadow-2xl relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full animate-ping ${activeTrade.side === 'BUY' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <div>
                    <h2 className="font-heading font-black text-lg text-white flex items-center gap-2">
                      <span>ORDRE EN COURS D'EXÉCUTION</span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-black ${
                        activeTrade.side === 'BUY' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300'
                      }`}>
                        {activeTrade.side === 'BUY' ? '▲ ACHAT (LONG)' : '▼ VENTE (SHORT)'}
                      </span>
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Reçu via TradingView Webhook · XAUUSD M15
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    SL Sécurisé au BE dès TP1
                  </span>
                </div>
              </div>

              {/* Levels Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-center">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">Prix d'Entrée</span>
                  <span className="font-heading font-bold text-base text-cyan-400 tabular-nums">
                    ${activeTrade.entry.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">Stop Loss (SL)</span>
                  <span className="font-heading font-bold text-base text-rose-400 tabular-nums">
                    ${activeTrade.stop_loss.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">TP1 (0.5R BE)</span>
                  <span className="font-heading font-bold text-base text-amber-400 tabular-nums">
                    ${activeTrade.take_profit.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">TP2 (1.5R)</span>
                  <span className="font-heading font-bold text-base text-emerald-400 tabular-nums">
                    ${(activeTrade.entry + (activeTrade.side === 'BUY' ? 1 : -1) * Math.abs(activeTrade.entry - activeTrade.stop_loss) * 1.5).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-mono text-zinc-400 block">P&L Flottant</span>
                  {(() => {
                    const diff = (lastPrice - activeTrade.entry) * (activeTrade.side === 'BUY' ? 1 : -1);
                    const pips = diff / 0.1;
                    return (
                      <span className={`font-heading font-black text-base tabular-nums ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {diff >= 0 ? '+' : ''}{pips.toFixed(0)} pips
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* MDT CONFLUENCE SCANNER WHEN NO TRADE IS ACTIVE */
            <div className="rounded-2xl bg-[#0c0e17] border border-white/[0.09] p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                    Scanner de Confluence MDT (7 Piliers A+)
                  </h3>
                </div>

                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  5/7 Confluences Validées · Biais Haussier
                </span>
              </div>

              {/* 7 Confluence criteria grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mt-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-400">1. Tendance H4/H1</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-400">2. Zone OB/FVG</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-400">3. Sweep Liquidité</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-400">4. Cassure BoS</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-400">5. Ligne MDT Flip</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-400">6. Volume Fort (HVB)</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-400">7. Ratio R:R ≥ 2.0</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 font-bold">
                  <span>Prêt pour Retest</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              {/* Action Directive */}
              <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Scénario en cours de formation :</span>
                <span className="text-amber-300 font-medium">
                  Attendre le retour en zone sur retest M3 avant d'entrer. Aucune chasse au prix.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT RAIL (4 COLS): CALCULATEUR DE LOT, RADAR MTF RAPIDE & GARDE-FOUS */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. CALCULATEUR AUTOMATIQUE DE TAILLE DE LOT MDT */}
          <div className="rounded-2xl bg-[#0c0e17] border border-white/[0.09] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                  Calculateur de Lot MDT
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">1 Pip = 0.10 $</span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {/* Capital Input */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Capital Compte ($)</span>
                  <span className="text-white font-bold">${calcCapital}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[500, 1000, 5000, 10000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setCalcCapital(val)}
                      className={`py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                        calcCapital === val
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-extrabold'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risque % */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Risque par Trade (%)</span>
                  <span className="text-amber-300 font-bold">{calcRiskPct}% (${riskAmountUsd.toFixed(2)})</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.25, 0.5, 1.0, 2.0].map((val) => (
                    <button
                      key={val}
                      onClick={() => setCalcRiskPct(val)}
                      className={`py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                        calcRiskPct === val
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-extrabold'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Stop Loss Distance */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Distance Stop Loss</span>
                  <span className="text-white font-bold">{calcSlPips} pips ({slPoints.toFixed(2)} pts)</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={calcSlPips}
                  onChange={(e) => setCalcSlPips(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Output Result Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-center">
                <span className="text-[10px] uppercase text-zinc-400 tracking-wider block">
                  Taille de Lot Recommandée
                </span>
                <span className="font-heading font-black text-3xl text-amber-300 tabular-nums my-1 block">
                  {formattedLot} LOT
                </span>
                <div className="flex justify-between text-[11px] text-zinc-300 mt-2 pt-2 border-t border-white/[0.08]">
                  <span>Risque max : <strong className="text-rose-400">${riskAmountUsd.toFixed(2)}</strong></span>
                  <span>Gain TP1 : <strong className="text-emerald-400">+${(riskAmountUsd * 0.5).toFixed(2)}</strong></span>
                  <span>Gain TP2 : <strong className="text-emerald-400">+${(riskAmountUsd * 1.5).toFixed(2)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. RECAP RADAR MTF RAPIDE (H4, H1, M15, M5) */}
          <div className="rounded-2xl bg-[#0c0e17] border border-white/[0.09] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                  Radar Multi-UT MDT
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">4/4 Aligné</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {(mdt_radar || []).slice(0, 4).map((row) => {
                const isBull = row.trend.toLowerCase().includes('haiss') || row.trend.toLowerCase().includes('haus');
                return (
                  <div 
                    key={row.tf}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white px-2 py-0.5 rounded bg-zinc-800 text-[10px]">
                        {row.tf}
                      </span>
                      <span className={`text-[11px] font-bold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isBull ? '▲ HAUSSIER' : '▼ BAISSIER'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                      <span>{row.distancePct}% du pivot</span>
                      <span className="text-amber-300 font-bold">{'★'.repeat(row.stars)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. SÉCURITÉ DU CAPITAL & PLAFOND JOURNALIER */}
          <SafetyGauges
            settings={settings}
            trades={trades}
            balance={bot_status.balance}
          />
        </div>
      </div>

      {/* MOTEUR AUTONOME MDT & HFT (PINE V5 INTÉGRÉ DIRECTEMENT DANS LE SERVEUR) */}
      <MdtAutonomousEngineCard />

      {/* CONSOLE D'EXÉCUTION HFT & MICRO-SCALPING ULTRA-BASSE LATENCE */}
      <HftExecutionConsole currentPrice={lastPrice} />

      {/* TRACKER DE PERFORMANCE & HIT RATE HFT (MICRO-GAINS 0,60 $ A 2,00 $) */}
      <HftHitRateTracker currentPrice={lastPrice} />

      {/* SCÉNARIOS FUTURS & CONFLUENCES EN ÉTOILES (FLIP MDT & ORDRES LIMIT SUR ZONES) */}
      <FutureScenariosCard
        currentPrice={lastPrice}
        scenarios={state.future_scenarios}
        capital={calcCapital}
        riskPct={calcRiskPct}
        latencyMs={latencyMs}
      />

      {/* 3. RADAR COMPLET DES ZONES & DÉTAILS MULTI-UT */}
      <MdtRadarTable currentPrice={lastPrice} radarRows={mdt_radar} />

      {/* 4. JOURNAL EN DIRECT DU WEBHOOK TRADINGVIEW */}
      <DecisionLogFeed logs={decision_log} />

      {/* 5. MODAL CHECKLIST AVANT-TRADE MDT */}
      <MdtChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
};
