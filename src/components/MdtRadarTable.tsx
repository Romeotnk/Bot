import React, { useState } from 'react';
import { MdtRadarRow } from '../types';
import { 
  TrendingDown, 
  TrendingUp, 
  Star, 
  ShieldCheck, 
  AlertCircle, 
  Info, 
  Play, 
  Layers, 
  Target, 
  Clock, 
  Smartphone,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';

interface MdtRadarTableProps {
  currentPrice: number;
  radarRows?: MdtRadarRow[];
}

const DEFAULT_RADAR_ROWS: MdtRadarRow[] = [
  {
    tf: 'H4',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4148.50 - 4142.10',
    distancePct: 0.42,
    stars: 3,
    confText: 'Rejet HTF + Biais lourd',
  },
  {
    tf: 'H1',
    trend: 'Baissier',
    bullOb: '4098.20 - 4104.50',
    bearOb: '4136.80 - 4132.40',
    distancePct: 0.18,
    stars: 3,
    confText: 'OB H1 propre + volume',
  },
  {
    tf: 'M15',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4129.50 - 4127.20',
    distancePct: 0.08,
    stars: 2,
    confText: 'Scénario A actif',
  },
  {
    tf: 'M5',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4126.80 - 4125.10',
    distancePct: 0.03,
    stars: 3,
    confText: 'FVG structure testée',
  },
  {
    tf: 'M3',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4125.80 - 4125.00',
    distancePct: 0.01,
    stars: 2,
    confText: 'Trigger short validé',
  },
];

export const MdtRadarTable: React.FC<MdtRadarTableProps> = ({
  currentPrice,
  radarRows = DEFAULT_RADAR_ROWS,
}) => {
  const [activeTab, setActiveTab] = useState<'video_signals' | 'pdf_matrix'>('video_signals');
  const [exitPlanMode, setExitPlanMode] = useState<'standard_2tp' | 'optimized_3tp'>('optimized_3tp');

  // Compute live multi-timeframe consensus based on current price
  const ut5Trend = radarRows.find((r) => r.tf === 'M5')?.trend === 'Haissier' ? 'HAUSSE' : 'BAISSE';
  const ut15Trend = radarRows.find((r) => r.tf === 'M15')?.trend === 'Haissier' ? 'HAUSSE' : 'BAISSE';
  const ut60Trend = radarRows.find((r) => r.tf === 'H1')?.trend === 'Haissier' ? 'HAUSSE' : 'BAISSE';
  const ut240Trend = radarRows.find((r) => r.tf === 'H4')?.trend === 'Haissier' ? 'HAUSSE' : 'BAISSE';

  const bearishVotes = [ut5Trend, ut15Trend, ut60Trend, ut240Trend].filter((t) => t === 'BAISSE').length;
  const isConsensusBear = bearishVotes >= 3;
  const isConsensusBull = bearishVotes <= 1;

  const consensusText = isConsensusBear ? 'BIAIS BAISSIER' : isConsensusBull ? 'BIAIS HAUSSIER' : 'NEUTRE / RANGING';
  const signalDirection = isConsensusBear ? 'VENTE' : isConsensusBull ? 'ACHAT' : 'ATTENTE';

  // Base trade numbers
  const tradeEntry = currentPrice;
  const slPips = 20.6; // ~2.06$ on Gold
  const tradeSl = isConsensusBear ? tradeEntry + slPips * 0.1 : tradeEntry - slPips * 0.1;

  // Standard Video model: TP1 @ 0.5R, TP2 @ 3R
  const stdTp1Delta = slPips * 0.1 * 0.5;
  const stdTp2Delta = slPips * 0.1 * 3.0;
  const stdTp1 = isConsensusBear ? tradeEntry - stdTp1Delta : tradeEntry + stdTp1Delta;
  const stdTp2 = isConsensusBear ? tradeEntry - stdTp2Delta : tradeEntry + stdTp2Delta;

  // Optimized 3-tier model: TP1 @ 0.5R (50%), TP2 @ 1.5R (25%), TP3 @ Runner 3R+ (25%)
  const optTp1Delta = slPips * 0.1 * 0.5; // 0.5R
  const optTp2Delta = slPips * 0.1 * 1.5; // 1.5R (User proposal!)
  const optTp3Delta = slPips * 0.1 * 3.0; // 3.0R+ runner
  const optTp1 = isConsensusBear ? tradeEntry - optTp1Delta : tradeEntry + optTp1Delta;
  const optTp2 = isConsensusBear ? tradeEntry - optTp2Delta : tradeEntry + optTp2Delta;
  const optTp3 = isConsensusBear ? tradeEntry - optTp3Delta : tradeEntry + optTp3Delta;

  return (
    <div className="w-full rounded-[24px] bg-[#10121b]/95 border border-[#232637] p-5 sm:p-6 shadow-xl backdrop-blur-md hud-box hud-corners">
      <div className="hud-corner-top-right" />
      <div className="hud-corner-bottom-left" />

      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-[#232637]/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e8c56a] animate-pulse" />
            <h3 className="font-heading text-xs uppercase tracking-wider text-[#e8c56a]">
              Moteur Stratégique MDT 2026
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171a27] text-[#7fd6ff]">
              Vidéo Auto-Signals & PDF SMC
            </span>
          </div>
          <p className="text-[11px] text-[#8d90a3] mt-0.5">
            Extraction intégrale de la méthode @MaitreDuTrading : scanner 4 UTs, trailing stop et règles de sortie 0.5R.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#06070c] border border-[#232637]">
          <button
            onClick={() => setActiveTab('video_signals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'video_signals'
                ? 'bg-[#171a27] text-[#e8c56a] shadow-sm'
                : 'text-[#8d90a3] hover:text-[#e9e6dc]'
            }`}
          >
            <Play className="w-3 h-3 text-[#e8c56a]" />
            <span>Scanner Vidéo (Auto-Signals M15)</span>
          </button>
          <button
            onClick={() => setActiveTab('pdf_matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'pdf_matrix'
                ? 'bg-[#171a27] text-[#7fd6ff] shadow-sm'
                : 'text-[#8d90a3] hover:text-[#e9e6dc]'
            }`}
          >
            <Layers className="w-3 h-3 text-[#7fd6ff]" />
            <span>Matrice Cartographie (PDF 2026)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MDT AUTO SIGNALS (REPRODUCTION EXACTE DU SCANNER DE LA VIDÉO) */}
      {activeTab === 'video_signals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Recreated HUD Scanner Box from video (frame 09) */}
            <div className="lg:col-span-6 rounded-2xl bg-[#080911] border-2 border-[#37418a] p-4 font-mono shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#232637] pb-2 mb-3">
                <span className="text-xs font-bold text-[#7fd6ff] flex items-center gap-1.5">
                  <span className="text-[#e8c56a]">◆</span> MDT - AUTO SIGNALS
                </span>
                <span className="text-[11px] font-bold text-[#e8c56a]">MAÎTRE DU TRADING</span>
              </div>

              {/* 1. SCANNER MTF */}
              <div className="mb-3">
                <div className="text-[11px] font-semibold text-[#7fd6ff] mb-1.5 flex items-center gap-1">
                  <span>◇ SCANNER MTF</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between bg-[#10121b] px-2.5 py-1 rounded border border-[#232637]/60">
                    <span className="text-[#8d90a3]">UT 5</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ut5Trend === 'HAUSSE' ? 'bg-[#7fd6ff]/20 text-[#7fd6ff]' : 'bg-[#ff6b5b]/20 text-[#ff6b5b]'
                    }`}>
                      {ut5Trend}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#10121b] px-2.5 py-1 rounded border border-[#232637]/60">
                    <span className="text-[#8d90a3]">UT 15</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ut15Trend === 'HAUSSE' ? 'bg-[#7fd6ff]/20 text-[#7fd6ff]' : 'bg-[#ff6b5b]/20 text-[#ff6b5b]'
                    }`}>
                      {ut15Trend}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#10121b] px-2.5 py-1 rounded border border-[#232637]/60">
                    <span className="text-[#8d90a3]">UT 60</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ut60Trend === 'HAUSSE' ? 'bg-[#7fd6ff]/20 text-[#7fd6ff]' : 'bg-[#ff6b5b]/20 text-[#ff6b5b]'
                    }`}>
                      {ut60Trend}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#10121b] px-2.5 py-1 rounded border border-[#232637]/60">
                    <span className="text-[#8d90a3]">UT 240</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ut240Trend === 'HAUSSE' ? 'bg-[#7fd6ff]/20 text-[#7fd6ff]' : 'bg-[#ff6b5b]/20 text-[#ff6b5b]'
                    }`}>
                      {ut240Trend}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#10121b] px-2.5 py-1 rounded border border-[#232637]/60 mt-1">
                    <span className="text-[#8d90a3]">Consensus</span>
                    <span className={`text-[11px] font-bold ${
                      isConsensusBear ? 'text-[#ff6b5b]' : isConsensusBull ? 'text-[#7fd6ff]' : 'text-[#e8c56a]'
                    }`}>
                      {consensusText}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#10121b] px-2.5 py-1 rounded border border-[#232637]/60">
                    <span className="text-[#8d90a3]">UTC</span>
                    <span className="text-[11px] font-bold text-[#e9e6dc]">{signalDirection}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#e8c56a]/10 px-2.5 py-1 rounded border border-[#e8c56a]/30">
                    <span className="text-[#e8c56a]">Statut</span>
                    <span className="text-[11px] font-bold text-[#e8c56a]">✓ PRÊT</span>
                  </div>
                </div>
              </div>

              {/* 2. TRADE EN COURS (SÉLECTION DU MODÈLE DE SORTIE) */}
              <div className="mb-3 pt-2 border-t border-[#232637]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-[#e8c56a] flex items-center gap-1">
                    <span>◆ PLAN DE TRADE (XAUUSD M15)</span>
                  </div>
                  {/* Exit Plan Mode Switcher */}
                  <div className="flex items-center gap-1 bg-[#10121b] p-0.5 rounded-lg border border-[#232637]">
                    <button
                      onClick={() => setExitPlanMode('optimized_3tp')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                        exitPlanMode === 'optimized_3tp'
                          ? 'bg-[#e8c56a] text-[#06070c] font-bold shadow-sm'
                          : 'text-[#8d90a3] hover:text-[#e9e6dc]'
                      }`}
                    >
                      3 Paliers (0.5R/1.5R/Run)
                    </button>
                    <button
                      onClick={() => setExitPlanMode('standard_2tp')}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                        exitPlanMode === 'standard_2tp'
                          ? 'bg-[#171a27] text-[#7fd6ff] font-bold'
                          : 'text-[#8d90a3] hover:text-[#e9e6dc]'
                      }`}
                    >
                      Vidéo Standard (0.5R/3R)
                    </button>
                  </div>
                </div>

                {exitPlanMode === 'optimized_3tp' ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between px-2.5 py-0.5">
                      <span className="text-[#8d90a3]">Entrée</span>
                      <span className="text-[#e9e6dc] tabular-nums font-bold">{tradeEntry.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5">
                      <span className="text-[#8d90a3]">SL Initial (1R)</span>
                      <span className="text-[#ff6b5b] tabular-nums font-bold">{tradeSl.toFixed(2)} ({slPips.toFixed(1)}p)</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5 bg-[#7fd6ff]/10 rounded border border-[#7fd6ff]/20">
                      <span className="text-[#7fd6ff]">TP1 0.5R (50% lot)</span>
                      <span className="text-[#7fd6ff] tabular-nums font-bold">{optTp1.toFixed(2)} ({(slPips * 0.5).toFixed(1)}p) · SL à BE</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5 bg-[#e8c56a]/10 rounded border border-[#e8c56a]/20">
                      <span className="text-[#e8c56a]">TP2 1.5R (25% lot)</span>
                      <span className="text-[#e8c56a] tabular-nums font-bold">{optTp2.toFixed(2)} ({(slPips * 1.5).toFixed(1)}p) · SL à +0.5R</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5 bg-[#22c55e]/10 rounded border border-[#22c55e]/20">
                      <span className="text-[#22c55e]">TP3 Runner (25% lot)</span>
                      <span className="text-[#22c55e] tabular-nums font-bold">{optTp3.toFixed(2)} ({(slPips * 3).toFixed(1)}p+) · Trailing stop</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5 bg-[#06070c] rounded text-[10px] text-[#8d90a3] border border-[#232637]">
                      <span>Sécurisation :</span>
                      <span className="text-[#7fd6ff] font-semibold">Risque zéro dès TP1 (+0.25R net garanti)</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between px-2.5 py-0.5">
                      <span className="text-[#8d90a3]">Entrée</span>
                      <span className="text-[#e9e6dc] tabular-nums font-bold">{tradeEntry.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5">
                      <span className="text-[#8d90a3]">SL</span>
                      <span className="text-[#ff6b5b] tabular-nums font-bold">{tradeSl.toFixed(2)} ({slPips.toFixed(1)}p)</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5">
                      <span className="text-[#8d90a3]">TP1 0.5R (50%)</span>
                      <span className="text-[#7fd6ff] tabular-nums font-bold">{stdTp1.toFixed(2)} ({(slPips * 0.5).toFixed(1)}p)</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5">
                      <span className="text-[#8d90a3]">TP2 3R (50%)</span>
                      <span className="text-[#22c55e] tabular-nums font-bold">{stdTp2.toFixed(2)} ({(slPips * 3).toFixed(1)}p)</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-0.5 bg-[#7fd6ff]/10 rounded border border-[#7fd6ff]/20">
                      <span className="text-[#7fd6ff]">Statut</span>
                      <span className="text-[#7fd6ff] font-bold">✓ GAGNÉ (TP1 touché)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. STATS GLOBALES (VIDÉO OFFICIELLE) */}
              <div className="pt-2 border-t border-[#232637]">
                <div className="text-[11px] font-semibold text-[#7fd6ff] mb-1 flex items-center gap-1">
                  <span>◇ STATS GLOBALES (ÉCHANTILLON VIDÉO)</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between px-2.5 py-0.5">
                    <span className="text-[#8d90a3]">Total Signaux</span>
                    <span className="text-[#22c55e] font-bold">23 (82.6% réussite)</span>
                  </div>
                  <div className="flex justify-between px-2.5 py-0.5">
                    <span className="text-[#8d90a3]">Taux d'atteinte TP2 standard (3R)</span>
                    <span className="text-[#e8c56a] font-bold">8.7% (Seulement 2 trades sur 23 !)</span>
                  </div>
                  <div className="flex justify-between px-2.5 py-0.5">
                    <span className="text-[#8d90a3]">Atteinte estimée TP2 optimisé (1.5R)</span>
                    <span className="text-[#7fd6ff] font-bold">~42% (Plus de 4x plus fréquent !)</span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-[#8d90a3]">
                  <div className="text-[#7fd6ff] font-semibold mb-1">◐ SESSIONS :</div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-[#10121b] p-1 rounded border border-[#232637]">
                      <div className="text-[#8d90a3]">LON</div>
                      <div className="text-[#22c55e] font-bold">4 (100%)</div>
                    </div>
                    <div className="bg-[#10121b] p-1 rounded border border-[#232637]">
                      <div className="text-[#8d90a3]">NY</div>
                      <div className="text-[#22c55e] font-bold">5 (100%)</div>
                    </div>
                    <div className="bg-[#10121b] p-1 rounded border border-[#232637]">
                      <div className="text-[#8d90a3]">ASIE</div>
                      <div className="text-[#ff6b5b] font-bold">7 (57%)</div>
                    </div>
                  </div>
                </div>

                <div className="text-[9px] text-[#8d90a3] text-right mt-2">
                  XAUUSD M15 · 28/09 au 07/10 · 23 signaux clos
                </div>
              </div>
            </div>

            {/* Right: Detailed Strategic Breakdown from the Video */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
              {/* Card 1: Alert Mockup as shown in Video Frame 11 */}
              <div className="p-4 rounded-2xl bg-[#06070c] border border-[#ff6b5b]/40 shadow-lg">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#ff6b5b]">
                  <Smartphone className="w-4 h-4 text-[#ff6b5b]" />
                  <span>Alerte Push Téléphone (Visible à 00:52 de la vidéo) :</span>
                </div>
                <div className="bg-[#10121b] border border-[#ff6b5b]/30 rounded-xl p-2.5 font-mono text-[11px] text-[#e9e6dc] space-y-1">
                  <div className="flex items-center justify-between text-[#ff6b5b]">
                    <span>🔻 {signalDirection} | XAUUSD | M15</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#ff6b5b]/20 text-[10px] font-bold">Score: 6/7</span>
                  </div>
                  <div className="text-[#8d90a3] text-[10px]">
                    {exitPlanMode === 'optimized_3tp' ? (
                      <>
                        Entrée : <strong className="text-[#e9e6dc]">{tradeEntry.toFixed(2)}</strong> | SL : <strong className="text-[#ff6b5b]">{tradeSl.toFixed(2)}</strong><br />
                        TP1 (0.5R) : <strong className="text-[#7fd6ff]">{optTp1.toFixed(2)}</strong> | TP2 (1.5R) : <strong className="text-[#e8c56a]">{optTp2.toFixed(2)}</strong> | TP3 (Runner) : <strong className="text-[#22c55e]">{optTp3.toFixed(2)}</strong>
                      </>
                    ) : (
                      <>
                        Entrée : <strong className="text-[#e9e6dc]">{tradeEntry.toFixed(2)}</strong> | SL : <strong className="text-[#ff6b5b]">{tradeSl.toFixed(2)}</strong> | TP1 : <strong className="text-[#7fd6ff]">{stdTp1.toFixed(2)}</strong> | TP2 : <strong className="text-[#22c55e]">{stdTp2.toFixed(2)}</strong>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: The Core Strategic Rules */}
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#171a27]/60 border border-[#232637]">
                  <h4 className="font-semibold text-[#e8c56a] flex items-center gap-1.5 mb-1">
                    <Target className="w-3.5 h-3.5" />
                    L'avantage mathématique du modèle 3 paliers (50% / 25% / 25%)
                  </h4>
                  <p className="text-[#8d90a3] text-[11px] leading-relaxed">
                    Sur l'or, les mouvements corrigent souvent après +1.2R à +1.8R. Dans le modèle vidéo standard, un trade monté à +2R sans toucher 3R finit à Break-Even (gain = seulement 0.25R). En plaçant un <strong>TP2 à 1.5R</strong> sur 25% de la position, vous sécurisez <strong>+0.375R supplémentaire</strong> et montez le stop du reliquat à +0.5R.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#171a27]/60 border border-[#232637]">
                  <h4 className="font-semibold text-[#7fd6ff] flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Trailing Stop dynamique sur le reliquat (TP3 Runner)
                  </h4>
                  <p className="text-[#8d90a3] text-[11px] leading-relaxed">
                    Les 25% restants ne cherchent pas un prix cible arbitraire : ils sont confiés à la ligne suiveuse M15 (verte/rouge). Tant que la ligne reste de la bonne couleur, on laisse courir pour capter les explosions comme les +537 pips vus dans la vidéo.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#171a27]/60 border border-[#232637]">
                  <h4 className="font-semibold text-[#ff6b5b] flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Filtre de Session : Londres (100%) vs Asie (57%)
                  </h4>
                  <p className="text-[#8d90a3] text-[11px] leading-relaxed">
                    Les chiffres de la vidéo confirment le PDF (p. 18) : ne tradez pas les cassures en Asie. Attendez que Londres ou New York prennent la main pour exécuter ce scaling out.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PDF SMC CARTOGRAPHY (ZONES H4 A M3 DU LIVRE BLANC) */}
      {activeTab === 'pdf_matrix' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232637] text-[10px] font-mono uppercase tracking-wider text-[#8d90a3]">
                  <th className="pb-2.5 font-semibold">TF</th>
                  <th className="pb-2.5 font-semibold">Tendance (EMA 200)</th>
                  <th className="pb-2.5 font-semibold text-center">Bull OB (Acheteur)</th>
                  <th className="pb-2.5 font-semibold text-center">Bear OB (Vendeur)</th>
                  <th className="pb-2.5 font-semibold text-right">Distance (%)</th>
                  <th className="pb-2.5 font-semibold text-right">Confluence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232637]/40 font-mono">
                {radarRows.map((row) => {
                  const isBull = row.trend === 'Haissier';
                  return (
                    <tr key={row.tf} className="hover:bg-[#171a27]/60 transition">
                      <td className="py-2.5 font-bold text-[#e8c56a]">
                        <span className="px-2 py-0.5 rounded bg-[#06070c] border border-[#232637]">
                          {row.tf}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isBull
                              ? 'bg-[#7fd6ff]/15 text-[#7fd6ff]'
                              : 'bg-[#ff6b5b]/15 text-[#ff6b5b]'
                          }`}
                        >
                          {isBull ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{row.trend}</span>
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-[#7fd6ff]">
                        {row.bullOb !== '---' ? (
                          <span className="px-2 py-0.5 rounded bg-[#7fd6ff]/10 border border-[#7fd6ff]/20 font-medium">
                            {row.bullOb}
                          </span>
                        ) : (
                          <span className="text-[#8d90a3]/50">---</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center text-[#ff6b5b]">
                        {row.bearOb !== '---' ? (
                          <span className="px-2 py-0.5 rounded bg-[#ff6b5b]/10 border border-[#ff6b5b]/20 font-medium">
                            {row.bearOb}
                          </span>
                        ) : (
                          <span className="text-[#8d90a3]/50">---</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-[#e9e6dc]">
                        {row.distancePct.toFixed(2)} %
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < row.stars
                                  ? 'text-[#e8c56a] fill-[#e8c56a]'
                                  : 'text-[#232637]'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] text-[#8d90a3] ml-1.5 hidden sm:inline">
                            {row.confText}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Color code legend from PDF Page 5 */}
          <div className="mt-4 pt-3 border-t border-[#232637]/60 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-[#06070c] border border-[#ff6b5b]/30 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#ff6b5b] shrink-0" />
              <span className="text-[#e9e6dc]"><strong>Rouge</strong> : OB Vendeur</span>
            </div>
            <div className="p-2 rounded-lg bg-[#06070c] border border-[#7fd6ff]/30 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#7fd6ff] shrink-0" />
              <span className="text-[#e9e6dc]"><strong>Bleu</strong> : OB Acheteur</span>
            </div>
            <div className="p-2 rounded-lg bg-[#06070c] border border-[#a855f7]/30 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#a855f7] shrink-0" />
              <span className="text-[#e9e6dc]"><strong>Violet</strong> : FVG Structure</span>
            </div>
            <div className="p-2 rounded-lg bg-[#06070c] border border-[#f97316]/30 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#f97316] shrink-0" />
              <span className="text-[#e9e6dc]"><strong>Orange</strong> : FVG Vendeur</span>
            </div>
            <div className="p-2 rounded-lg bg-[#06070c] border border-[#22c55e]/30 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#22c55e] shrink-0" />
              <span className="text-[#e9e6dc]"><strong>Vert</strong> : FVG Acheteur</span>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-[#ff6b5b]/10 border border-[#ff6b5b]/30 flex items-start gap-2 text-[11px] text-[#e9e6dc]">
            <AlertCircle className="w-3.5 h-3.5 text-[#ff6b5b] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-[#ff6b5b]">Le piège classique :</strong> « Voir du bleu et acheter direct. Non. Le bleu te dit seulement : regarde ce qui se passe ici. Le trigger vient après. »
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
