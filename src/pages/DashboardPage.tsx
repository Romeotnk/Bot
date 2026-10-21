import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { AurumCore3D } from '../components/AurumCore3D';
import { TradingChart } from '../components/TradingChart';
import { TradingViewChart } from '../components/TradingViewChart';
import { MdtRadarTable } from '../components/MdtRadarTable';
import { MdtChecklistModal } from '../components/MdtChecklistModal';
import { RobotSequence } from '../components/RobotSequence';
import { SafetyGauges } from '../components/SafetyGauges';
import { DecisionLogFeed } from '../components/DecisionLogFeed';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Award, 
  Activity, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  BarChart2, 
  Layers, 
  CheckSquare, 
  Radio
} from 'lucide-react';
import { BotState } from '../types';

export const DashboardPage: React.FC = () => {
  const { state, advanceDemoSequence, setBotState, resetDemoData, refreshState } = useAppState();

  const [chartViewMode, setChartViewMode] = useState<'tradingview' | 'mdt_smc'>('tradingview');
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isSyncingRealPrice, setIsSyncingRealPrice] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#e8c56a] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#8d90a3]">Connexion aux flux quantitatifs Viceinte...</span>
        </div>
      </div>
    );
  }

  const { bot_status, levels, settings, trades, decision_log, is_demo_data } = state;
  const lastPrice = bot_status.last_price || 4125.11;

  // Calculate day metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter((t) => t.opened_at.startsWith(todayStr));
  const todayTradesCount = todayTrades.length;
  const dayRTotal = todayTrades.reduce((acc, t) => acc + (t.r_result || 0), 0);

  // One-sentence status in French
  const stateSentences: Record<string, string> = {
    surveillance: 'Le robot surveille activement les niveaux de liquidité asiatiques et attend un balayage.',
    prise_de_liquidite: 'Prise de liquidité détectée au-dessus du haut asiatique, recherche d’un rejet baissier.',
    cassure_structure: 'Cassure de structure confirmée sous les creux récents, impulsion baissière en cours.',
    fvg_repere: 'Zone d’imbalance Fair Value Gap repérée sur le 5 minutes, préparation de l’entrée.',
    entree: 'Ordre de vente limite déclenché au comblement optimal de la FVG.',
    en_trade: 'Position vendeuse active sur l’or, stop protégé au-dessus du sommet et objectif en vue.',
    objectif_atteint: 'Objectif de prise de profit Take Profit atteint avec succès sur la liquidité opposée.',
    pause: 'Le robot est actuellement en pause : aucun signal ne sera exécuté.',
    erreur: 'Anomalie détectée sur le flux de cotation : veuillez vérifier la connexion externe.',
  };

  const statusSentence = stateSentences[bot_status.state] || 'Surveillance du marché de l’or en cours.';

  // Price change estimation based on first candle of day vs last price
  const firstCandlePrice = bot_status.candles[0]?.open || lastPrice;
  const priceChange = lastPrice - firstCandlePrice;
  const priceChangePct = (priceChange / firstCandlePrice) * 100;
  const isPriceUp = priceChange >= 0;

  // Sync real live gold price from public global feed
  const handleSyncRealMarket = async () => {
    setIsSyncingRealPrice(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch('/api/market/sync-live');
      if (res.ok) {
        const data = await res.json();
        setSyncStatusMsg(`Prix réel synchronisé : ${data.price} $ (${data.candleCount} bougies)`);
        await refreshState();
        setTimeout(() => setSyncStatusMsg(null), 4000);
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
      {/* 1. Top Telemetry & Price Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Left: Big Price & Robot Sentence */}
        <div className="md:col-span-7 p-5 sm:p-6 rounded-[28px] bg-[#10121b]/90 border border-[#232637] backdrop-blur-md shadow-xl hud-box hud-corners flex flex-col justify-between">
          <div className="hud-corner-top-right" />
          <div className="hud-corner-bottom-left" />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#8d90a3]">
                  Flux en direct · XAUUSD
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7fd6ff]/15 text-[#7fd6ff] border border-[#7fd6ff]/30">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-[#7fd6ff]" />
                  Prix réel
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncRealMarket}
                  disabled={isSyncingRealPrice}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-[#e8c56a]/15 text-[#e8c56a] border border-[#e8c56a]/30 hover:bg-[#e8c56a]/25 transition cursor-pointer disabled:opacity-50"
                  title="Interroger le flux mondial pour injecter le vrai prix spot"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingRealPrice ? 'animate-spin' : ''}`} />
                  <span>Sync Prix Réel</span>
                </button>
              </div>
            </div>

            {/* Big Price Display */}
            <div className="flex items-baseline gap-3 my-1">
              <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-[#e9e6dc] tracking-tight tabular-nums">
                {lastPrice.toFixed(2)}
              </h1>
              <span className="text-lg text-[#8d90a3] font-mono">$</span>

              <div className={`flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                isPriceUp ? 'bg-[#7fd6ff]/15 text-[#7fd6ff]' : 'bg-[#ff6b5b]/15 text-[#ff6b5b]'
              }`}>
                {isPriceUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePct.toFixed(2)}%)</span>
              </div>
            </div>

            {syncStatusMsg && (
              <div className="text-[11px] font-mono text-[#7fd6ff] mt-1 animate-pulse">
                {syncStatusMsg}
              </div>
            )}

            {/* Sentence in French */}
            <div className="mt-3 p-3 rounded-xl bg-[#06070c]/70 border border-[#232637] flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#e8c56a] shrink-0 animate-pulse" />
              <p className="text-xs text-[#e9e6dc] font-medium leading-relaxed">
                {statusSentence}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Key Metrics Bar & MDT Checklist Trigger */}
        <div className="md:col-span-5 p-5 sm:p-6 rounded-[28px] bg-[#10121b]/90 border border-[#232637] backdrop-blur-md shadow-xl hud-box hud-corners flex flex-col justify-between">
          <div className="hud-corner-top-right" />
          <div className="hud-corner-bottom-left" />

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#8d90a3]">
              Métriques de compte
            </span>

            <button
              onClick={() => setIsChecklistOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-[#e8c56a] text-[#06070c] hover:bg-[#f6e7b8] transition active:scale-95 shadow-sm shadow-[#e8c56a]/20 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Checklist MDT</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mt-2">
            {/* Équité */}
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8d90a3] flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-[#e8c56a]" />
                Équité
              </span>
              <span className="font-heading font-bold text-sm sm:text-base text-[#e9e6dc] tabular-nums mt-0.5">
                {bot_status.equity.toFixed(0)} $
              </span>
              <span className="text-[9px] text-[#8d90a3] font-mono">
                Solde : {bot_status.balance.toFixed(0)} $
              </span>
            </div>

            {/* Résultat R */}
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8d90a3] flex items-center gap-1">
                <Award className="w-3 h-3 text-[#7fd6ff]" />
                Résultat jour
              </span>
              <span className={`font-heading font-bold text-sm sm:text-base tabular-nums mt-0.5 ${
                dayRTotal >= 0 ? 'text-[#7fd6ff]' : 'text-[#ff6b5b]'
              }`}>
                {dayRTotal >= 0 ? '+' : ''}{dayRTotal.toFixed(1)} R
              </span>
              <span className="text-[9px] text-[#8d90a3] font-mono">
                Multiplicateur
              </span>
            </div>

            {/* Trades jour */}
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8d90a3] flex items-center gap-1">
                <Activity className="w-3 h-3 text-[#f6e7b8]" />
                Trades
              </span>
              <span className="font-heading font-bold text-sm sm:text-base text-[#e9e6dc] tabular-nums mt-0.5">
                {todayTradesCount} / {settings.max_trades_day}
              </span>
              <span className="text-[9px] text-[#8d90a3] font-mono">
                Plafond jour
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LE NOYAU AURUM — COMPOSANT VEDETTE AU CENTRE DU TABLEAU DE BORD */}
      <section className="relative w-full rounded-[28px] bg-gradient-to-b from-[#10121b] via-[#0b0d15] to-[#06070c] border border-[#232637] p-6 sm:p-7 shadow-2xl backdrop-blur-xl hud-box hud-corners overflow-hidden">
        <div className="hud-corner-top-right" />
        <div className="hud-corner-bottom-left" />

        {/* Section Title & Header */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#232637]/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f6e7b8] to-[#e8c56a] p-[1px]">
              <div className="w-full h-full bg-[#06070c] rounded-[11px] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#e8c56a]" />
              </div>
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-base sm:text-lg text-[#e9e6dc] tracking-wider uppercase flex items-center gap-2">
                <span>Le Noyau Aurum</span>
                <span className="text-[10px] font-mono font-normal lowercase tracking-normal px-2 py-0.5 rounded-full bg-[#e8c56a]/15 text-[#e8c56a] border border-[#e8c56a]/30">
                  Three.js PBR vitré
                </span>
              </h2>
              <p className="text-[11px] text-[#8d90a3]">
                Sphère vitrée en lévitation · Réactivité chromatique et cinétique en temps réel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {is_demo_data && (
              <button
                onClick={resetDemoData}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-[#171a27] text-[#8d90a3] hover:text-[#e8c56a] hover:bg-[#232637] transition cursor-pointer"
                title="Réinitialiser les données de démonstration"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Démo</span>
              </button>
            )}
          </div>
        </div>

        {/* Central 3D Canvas Viewport */}
        <div className="relative my-2">
          <AurumCore3D
            state={bot_status.state}
            price={lastPrice}
            heightClass="h-72 sm:h-84"
            onStateSelect={(newState: BotState) => setBotState(newState)}
          />
        </div>

        {/* Status Guide Footer */}
        <div className="relative z-20 pt-3 border-t border-[#232637]/60 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#8d90a3]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e8c56a] animate-pulse" />
              <span>Surveillance (Pulsation dorée lente)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f6e7b8]" />
              <span>Trade (Rotation rapide dorée)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7fd6ff]" />
              <span>Objectif (Bleu glacier)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b5b]" />
              <span>Erreur (Rouge braise)</span>
            </div>
          </div>

          <span className="text-[#8d90a3]/80">
            Lévitation 1.4 Hz · Indice réfractif 1.54
          </span>
        </div>
      </section>

      {/* 3. Tactical Robot Sequence (6 Steps) */}
      <RobotSequence
        currentState={bot_status.state}
        onAdvance={advanceDemoSequence}
        isDemo={is_demo_data}
      />

      {/* 4. GRAPHIQUE VEDETTE : SWITCHER TRADINGVIEW DIRECT VS MDT SMART MONEY */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h2 className="font-heading text-sm uppercase tracking-wider text-[#e8c56a] flex items-center gap-2">
              <span>Graphique des cours & Analyse technique</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171a27] text-[#7fd6ff]">
                {chartViewMode === 'tradingview' ? 'TradingView Direct API' : 'Moteur MDT / SMC'}
              </span>
            </h2>
            <p className="text-xs text-[#8d90a3]">
              Basculez entre le vrai graphe officiel TradingView et le radar Smart Money avec niveaux institutionnels.
            </p>
          </div>

          {/* Toggle Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#10121b] border border-[#232637]">
            <button
              onClick={() => setChartViewMode('tradingview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                chartViewMode === 'tradingview'
                  ? 'bg-[#e8c56a] text-[#06070c] shadow-sm'
                  : 'text-[#8d90a3] hover:text-[#e9e6dc]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>TradingView Live</span>
            </button>

            <button
              onClick={() => setChartViewMode('mdt_smc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                chartViewMode === 'mdt_smc'
                  ? 'bg-[#e8c56a] text-[#06070c] shadow-sm'
                  : 'text-[#8d90a3] hover:text-[#e9e6dc]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>MDT Smart Money</span>
            </button>
          </div>
        </div>

        {/* Chart View Content */}
        {chartViewMode === 'tradingview' ? (
          <TradingViewChart symbol="FOREXCOM:XAUUSD" interval="5" />
        ) : (
          <TradingChart
            candles={bot_status.candles}
            levels={levels}
            plan={bot_status.plan}
            botState={bot_status.state}
            lastPrice={lastPrice}
          />
        )}
      </div>

      {/* 5. RADAR MTF DU PDF MDT MASTERCLASS 2026 */}
      <MdtRadarTable currentPrice={lastPrice} />

      {/* 6. Safety Gauges & Decision Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SafetyGauges
          settings={settings}
          trades={trades}
          balance={bot_status.balance}
        />
        <DecisionLogFeed logs={decision_log} />
      </div>

      {/* 7. Checklist MDT Pre-Trade Modal */}
      <MdtChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
};
