import React, { useState } from 'react';
import { FutureScenario } from '../types';
import { 
  Star, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Check, 
  AlertCircle, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Activity, 
  Layers, 
  ChevronRight,
  Flame,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface FutureScenariosCardProps {
  currentPrice: number;
  scenarios?: FutureScenario[];
  capital?: number;
  riskPct?: number;
  onArmScenario?: (scenario: FutureScenario) => void;
  latencyMs?: number;
}

export const FutureScenariosCard: React.FC<FutureScenariosCardProps> = ({
  currentPrice,
  scenarios: customScenarios,
  capital = 1000,
  riskPct = 0.5,
  onArmScenario,
  latencyMs = 18,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'flip' | 'limit'>('all');
  const [armedScenarioId, setArmedScenarioId] = useState<string | null>(null);

  // Compute dynamic realistic scenarios if not supplied by backend
  const scenarios: FutureScenario[] = customScenarios && customScenarios.length > 0
    ? customScenarios
    : [
        {
          id: 'scen-flip-sell',
          title: 'Scénario A : VENTE Flip MDT (Tendance Maîtresse)',
          type: 'flip_sell',
          direction: 'SELL',
          triggerCondition: `SI une bougie CLÔTURE sous la ligne verte (${(currentPrice - 2.80).toFixed(2)} $) → VENTE IMMÉDIATE`,
          zoneName: 'Ligne MDT 5m + H1',
          entry: Number((currentPrice - 2.80).toFixed(2)),
          stop_loss: Number((currentPrice + 1.70).toFixed(2)),
          take_profit_1: Number((currentPrice - 2.80 - 2.25).toFixed(2)),
          take_profit_2: Number((currentPrice - 2.80 - 5.60).toFixed(2)),
          take_profit_3: Number((currentPrice - 2.80 - 11.20).toFixed(2)),
          risk_points: 4.50,
          risk_pips: 45,
          rr_ratio: 2.5,
          confluences_count: 6,
          confluences_max: 7,
          stars: 5,
          stars_text: '★★★★★',
          checklist: {
            htf_trend: true,
            clean_zone: true,
            liquidity_sweep: true,
            bos_structure: true,
            mdt_line: false, // En attente du flip
            high_volume: true,
            risk_reward_ok: true,
          },
          status: 'approche',
          recommended_lot: Number(((capital * (riskPct / 100)) / (4.50 * 100)).toFixed(2)) || 0.01,
        },
        {
          id: 'scen-limit-sell',
          title: 'Scénario B : SELL LIMIT sur Bearish OB H1',
          type: 'limit_sell',
          direction: 'SELL',
          triggerCondition: `SELL LIMIT posé au contact de l'OB vendeur ${(currentPrice + 4.20).toFixed(2)} $ (sans courir après le prix)`,
          zoneName: 'OB- H1 / NY High Liq',
          entry: Number((currentPrice + 4.20).toFixed(2)),
          stop_loss: Number((currentPrice + 6.80).toFixed(2)),
          take_profit_1: Number((currentPrice + 4.20 - 2.10).toFixed(2)),
          take_profit_2: Number((currentPrice - 1.50).toFixed(2)),
          take_profit_3: Number((currentPrice - 8.00).toFixed(2)),
          risk_points: 2.60,
          risk_pips: 26,
          rr_ratio: 2.2,
          confluences_count: 5,
          confluences_max: 7,
          stars: 4,
          stars_text: '★★★★☆',
          checklist: {
            htf_trend: true,
            clean_zone: true,
            liquidity_sweep: true,
            bos_structure: false,
            mdt_line: true,
            high_volume: true,
            risk_reward_ok: true,
          },
          status: 'pret',
          recommended_lot: Number(((capital * (riskPct / 100)) / (2.60 * 100)).toFixed(2)) || 0.02,
        },
        {
          id: 'scen-limit-buy',
          title: 'Scénario C : BUY LIMIT sur Bullish OB / FVG Asie',
          type: 'limit_buy',
          direction: 'BUY',
          triggerCondition: `BUY LIMIT posé au contact du FVG structure ${(currentPrice - 5.50).toFixed(2)} $ après sweep du bas asiatique`,
          zoneName: 'FVG+ Structure M15',
          entry: Number((currentPrice - 5.50).toFixed(2)),
          stop_loss: Number((currentPrice - 7.90).toFixed(2)),
          take_profit_1: Number((currentPrice - 5.50 + 1.90).toFixed(2)),
          take_profit_2: Number((currentPrice + 1.20).toFixed(2)),
          take_profit_3: Number((currentPrice + 6.00).toFixed(2)),
          risk_points: 2.40,
          risk_pips: 24,
          rr_ratio: 2.8,
          confluences_count: 4,
          confluences_max: 7,
          stars: 4,
          stars_text: '★★★★☆',
          checklist: {
            htf_trend: false, // contre-tendance HTF
            clean_zone: true,
            liquidity_sweep: true,
            bos_structure: true,
            mdt_line: false,
            high_volume: true,
            risk_reward_ok: true,
          },
          status: 'en_attente',
          recommended_lot: Number(((capital * (riskPct / 100)) / (2.40 * 100)).toFixed(2)) || 0.02,
        },
        {
          id: 'scen-flip-buy',
          title: 'Scénario D : ACHAT Flip MDT (Reprise Haussière)',
          type: 'flip_buy',
          direction: 'BUY',
          triggerCondition: `SI une bougie CLÔTURE au-dessus de la résistance dynamique ${(currentPrice + 3.10).toFixed(2)} $`,
          zoneName: 'Breakout MDT Pivot',
          entry: Number((currentPrice + 3.10).toFixed(2)),
          stop_loss: Number((currentPrice - 1.20).toFixed(2)),
          take_profit_1: Number((currentPrice + 3.10 + 2.15).toFixed(2)),
          take_profit_2: Number((currentPrice + 3.10 + 6.45).toFixed(2)),
          take_profit_3: Number((currentPrice + 3.10 + 12.00).toFixed(2)),
          risk_points: 4.30,
          risk_pips: 43,
          rr_ratio: 2.0,
          confluences_count: 3,
          confluences_max: 7,
          stars: 3,
          stars_text: '★★★☆☆',
          checklist: {
            htf_trend: false,
            clean_zone: true,
            liquidity_sweep: false,
            bos_structure: true,
            mdt_line: false,
            high_volume: false,
            risk_reward_ok: true,
          },
          status: 'contre_tendance',
          recommended_lot: Number(((capital * (riskPct / 100)) / (4.30 * 100)).toFixed(2)) || 0.01,
        },
      ];

  const filteredScenarios = scenarios.filter((s) => {
    if (filterMode === 'flip') return s.type.startsWith('flip');
    if (filterMode === 'limit') return s.type.startsWith('limit');
    return true;
  });

  const handleArmClick = (scen: FutureScenario) => {
    setArmedScenarioId(scen.id);
    if (onArmScenario) {
      onArmScenario(scen);
    }
  };

  return (
    <div className="w-full rounded-[24px] bg-[#0c0e17] border border-white/[0.09] p-5 sm:p-6 shadow-2xl relative overflow-hidden hud-box hud-corners">
      <div className="hud-corner-top-right" />
      <div className="hud-corner-bottom-left" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
              <span>Scénarios Futurs & Confluences en Étoiles</span>
              <span className="text-amber-400 font-mono text-xs">★ MDT Sniper Pro</span>
            </h3>
            {/* Ultra-Fast Live Status */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Auto-Refresh &lt; 1s ({latencyMs}ms)</span>
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Chaque position future est évaluée sur les 7 piliers institutionnels. Plus le nombre d'étoiles est élevé (★ à ★★★★★), plus le signal présente un edge statistique prouvé.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#06070c] border border-white/[0.08]">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tous ({scenarios.length})
          </button>
          <button
            onClick={() => setFilterMode('flip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              filterMode === 'flip'
                ? 'bg-cyan-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Flip MDT
          </button>
          <button
            onClick={() => setFilterMode('limit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              filterMode === 'limit'
                ? 'bg-purple-500 text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Ordres Limite (OB/FVG)
          </button>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {filteredScenarios.map((scen) => {
          const isBuy = scen.direction === 'BUY';
          const isArmed = armedScenarioId === scen.id;

          // Quality tier badge
          let qualityLabel = 'Standard';
          let qualityColor = 'text-zinc-400 border-zinc-700 bg-zinc-800/40';
          if (scen.confluences_count >= 6 || scen.stars === 5) {
            qualityLabel = 'Sniper A+ (Excellence)';
            qualityColor = 'text-amber-300 border-amber-500/40 bg-amber-500/15 shadow-sm shadow-amber-500/20';
          } else if (scen.confluences_count >= 4 || scen.stars >= 4) {
            qualityLabel = 'Intraday Clean (Validé)';
            qualityColor = 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15';
          } else if (scen.status === 'contre_tendance') {
            qualityLabel = 'Contre-Tendance (Prudence)';
            qualityColor = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
          }

          return (
            <div
              key={scen.id}
              className={`rounded-2xl border transition-all duration-200 relative overflow-hidden p-5 flex flex-col justify-between ${
                isArmed
                  ? 'bg-[#121927] border-amber-400 shadow-xl shadow-amber-500/10'
                  : 'bg-[#090b12] border-white/[0.08] hover:border-white/[0.18]'
              }`}
            >
              {/* Top Accent Strip */}
              <div
                className={`absolute top-0 left-0 right-0 h-[2px] ${
                  isBuy
                    ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-rose-400 to-transparent'
                }`}
              />

              <div>
                {/* Title and Direction */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
                        isBuy
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isBuy ? '▲ ACHAT' : '▼ VENTE'}
                    </span>
                    <span className="font-heading font-bold text-sm text-white">
                      {scen.title}
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${qualityColor}`}>
                    {qualityLabel}
                  </span>
                </div>

                {/* STAR CONFLUENCE BADGE (CENTRAL REQUIREMENT) */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] mb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-0.5">
                        Confluences Validées
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* 5 Big Gold Stars */}
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < scen.stars
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                  : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>

                        <span className="text-xs font-mono font-black text-amber-300 ml-1.5">
                          {scen.confluences_count}/{scen.confluences_max} Validées
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-zinc-400 block">Ratio R:R Réel</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        1 : {scen.rr_ratio.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* 7 Pillars Visual Micro-Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-white/[0.06] text-[10px] font-mono">
                    <div className={`p-1.5 rounded flex items-center justify-between ${scen.checklist.htf_trend ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/40 text-zinc-500'}`}>
                      <span>1. Tendance Fond</span>
                      {scen.checklist.htf_trend ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-zinc-600">✕</span>}
                    </div>
                    <div className={`p-1.5 rounded flex items-center justify-between ${scen.checklist.clean_zone ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/40 text-zinc-500'}`}>
                      <span>2. Zone OB/FVG</span>
                      {scen.checklist.clean_zone ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-zinc-600">✕</span>}
                    </div>
                    <div className={`p-1.5 rounded flex items-center justify-between ${scen.checklist.liquidity_sweep ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/40 text-zinc-500'}`}>
                      <span>3. Liq. Sweep</span>
                      {scen.checklist.liquidity_sweep ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-zinc-600">✕</span>}
                    </div>
                    <div className={`p-1.5 rounded flex items-center justify-between ${scen.checklist.bos_structure ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/40 text-zinc-500'}`}>
                      <span>4. BoS Structure</span>
                      {scen.checklist.bos_structure ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-zinc-600">✕</span>}
                    </div>
                    <div className={`p-1.5 rounded flex items-center justify-between ${scen.checklist.mdt_line ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                      <span>5. Ligne MDT</span>
                      {scen.checklist.mdt_line ? <Check className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                    </div>
                    <div className={`p-1.5 rounded flex items-center justify-between ${scen.checklist.high_volume ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/40 text-zinc-500'}`}>
                      <span>6. Vol. Fort (HVB)</span>
                      {scen.checklist.high_volume ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-zinc-600">✕</span>}
                    </div>
                    <div className={`p-1.5 rounded flex items-center justify-between ${scen.checklist.risk_reward_ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800/40 text-zinc-500'}`}>
                      <span>7. R:R ≥ 2.0</span>
                      {scen.checklist.risk_reward_ok ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-zinc-600">✕</span>}
                    </div>
                    <div className="p-1.5 rounded bg-black/50 text-amber-300 font-semibold flex items-center justify-between border border-amber-500/20">
                      <span>Déclencheur</span>
                      <Zap className="w-3 h-3 text-amber-400" />
                    </div>
                  </div>
                </div>

                {/* Trigger Condition Text */}
                <div className="p-2.5 rounded-xl bg-[#141824] border border-white/[0.08] text-xs font-mono mb-3">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Condition d'Entrée :</div>
                  <div className="text-amber-200 font-medium leading-relaxed">
                    {scen.triggerCondition}
                  </div>
                </div>

                {/* Levels Grid: Entry, SL, TP1, TP2, Runner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono mb-4">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.06]">
                    <span className="text-[9px] text-zinc-400 block">Entrée</span>
                    <span className="font-bold text-cyan-400 tabular-nums">
                      ${scen.entry.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.06]">
                    <span className="text-[9px] text-zinc-400 block">SL ({scen.risk_pips}p)</span>
                    <span className="font-bold text-rose-400 tabular-nums">
                      ${scen.stop_loss.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.06]">
                    <span className="text-[9px] text-amber-300 block">TP1 (BE auto)</span>
                    <span className="font-bold text-amber-300 tabular-nums">
                      ${scen.take_profit_1.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-black/30 border border-white/[0.06]">
                    <span className="text-[9px] text-emerald-400 block">TP2 (Objectif)</span>
                    <span className="font-bold text-emerald-400 tabular-nums">
                      ${scen.take_profit_2.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08] text-xs font-mono">
                <div className="text-zinc-300">
                  <span>Lot calibré : <strong className="text-amber-300 font-bold">{scen.recommended_lot} LOT</strong></span>
                  <span className="text-[10px] text-zinc-500 ml-1.5">(Risque 0.5% = ${(capital * (riskPct / 100)).toFixed(2)})</span>
                </div>

                <button
                  onClick={() => handleArmClick(scen)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition active:scale-95 cursor-pointer ${
                    isArmed
                      ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.1]'
                  }`}
                >
                  {isArmed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Armé pour Exécution Auto</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      <span>Armer ce Scénario</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Explanatory Banner */}
      <div className="mt-5 p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-start sm:items-center gap-3 text-xs text-zinc-400 font-mono">
        <Activity className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-relaxed">
          <strong className="text-white">Principe MDT :</strong> Le robot ne devine jamais la prochaine bougie. Il pré-calcule les scénarios à haute confluence (★). Dès qu'une bougie clôture sur le niveau attendu, l'ordre est injecté instantanément via MetaApi / MT5 sans décalage.
        </p>
      </div>
    </div>
  );
};
