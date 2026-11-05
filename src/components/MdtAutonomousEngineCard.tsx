import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  TrendingUp,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  Target,
  Radio,
  Lock,
  Key
} from 'lucide-react';
import { useAppState } from '../context/StateContext';

export const MdtAutonomousEngineCard: React.FC = () => {
  const {
    state,
    updateMdtEngineConfig,
    forceMdtScan,
    forceMdtTestTrade,
    setIsBrokerModalOpen,
    saveMetaApiConfig,
    syncMetaApiAccount,
  } = useAppState();

  const [isScanning, setIsScanning] = useState(false);
  const [isTestingTrade, setIsTestingTrade] = useState<'BUY' | 'SELL' | null>(null);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(true);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [quickToken, setQuickToken] = useState(state?.metaapi?.token || '');
  const [quickAccountId, setQuickAccountId] = useState(state?.metaapi?.account_id || '');
  const [isSavingQuickMeta, setIsSavingQuickMeta] = useState(false);

  const mdtEngine = state?.mdt_engine;
  const isMetaConnected = Boolean(state?.metaapi?.token && state?.metaapi?.account_id);
  const isAutoTradeActive = Boolean(state?.metaapi?.auto_trade_enabled);

  useEffect(() => {
    let saved: any = {};
    try {
      const item = localStorage.getItem('metaapi_persisted_config');
      if (item) saved = JSON.parse(item);
    } catch {}
    if (!quickToken && (state?.metaapi?.token || saved.token)) {
      setQuickToken(state?.metaapi?.token || saved.token || '');
    }
    if (!quickAccountId && (state?.metaapi?.account_id || saved.account_id)) {
      setQuickAccountId(state?.metaapi?.account_id || saved.account_id || '');
    }
  }, [state?.metaapi?.token, state?.metaapi?.account_id]);

  const profile = mdtEngine?.profile || 'HFT Micro-Scalper';
  const timeframe = mdtEngine?.timeframe || '1m';
  const autoPilot = mdtEngine?.auto_pilot ?? true;
  const currentScore = mdtEngine?.current_score || 0;
  const reqScore = mdtEngine?.req_score || (profile === 'Sniper A+' ? 5 : 2);
  const activeConfluences = mdtEngine?.active_confluences || [];
  const targetProfit = mdtEngine?.target_profit_usd || 1.00;
  const multiCount = mdtEngine?.multi_fire_count || 3;

  const handleProfileChange = async (newProfile: 'HFT Micro-Scalper' | 'Intraday Clean' | 'Sniper A+') => {
    const tf = newProfile === 'HFT Micro-Scalper' ? '1m' : newProfile === 'Intraday Clean' ? '5m' : '15m';
    await updateMdtEngineConfig({
      profile: newProfile,
      timeframe: tf,
    });
  };

  const handleToggleAutoPilot = async () => {
    await updateMdtEngineConfig({
      auto_pilot: !autoPilot,
    });
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await forceMdtScan();
    } finally {
      setTimeout(() => setIsScanning(false), 500);
    }
  };

  const handleToggleAutoTrade = async () => {
    try {
      await saveMetaApiConfig({ auto_trade_enabled: !isAutoTradeActive });
      setTestFeedback(`Auto-Trade MT5 : ${!isAutoTradeActive ? 'ACTIVÉ ⚡ (Routage direct des ordres)' : 'DÉSACTIVÉ ⏸️ (Mode surveillance)'}`);
      setTimeout(() => setTestFeedback(null), 4000);
    } catch (e: any) {
      setTestFeedback(`Erreur : ${e.message}`);
    }
  };

  const handleQuickConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickToken.trim() || !quickAccountId.trim()) {
      setTestFeedback('Veuillez renseigner le Token et l’Account ID MetaApi.');
      return;
    }
    setIsSavingQuickMeta(true);
    try {
      await saveMetaApiConfig({
        token: quickToken.trim(),
        account_id: quickAccountId.trim(),
        auto_trade_enabled: true,
      });
      await syncMetaApiAccount();
      setTestFeedback('✓ Compte MetaApi connecté avec succès ! Auto-Trade MT5 ACTIVÉ.');
      setIsQuickOpen(false);
      setTimeout(() => setTestFeedback(null), 5000);
    } catch (err: any) {
      setTestFeedback(`Erreur : ${err.message}`);
    } finally {
      setIsSavingQuickMeta(false);
    }
  };

  const handleTestTrade = async (side: 'BUY' | 'SELL') => {
    setIsTestingTrade(side);
    setTestFeedback(null);
    try {
      await forceMdtTestTrade(side);
      setTestFeedback(`✓ Signal test ${side} transmis au moteur MDT & MetaApi MT5 (${state?.metaapi?.symbol || 'GOLD'}) !`);
      setTimeout(() => setTestFeedback(null), 5000);
    } catch (e: any) {
      setTestFeedback(`Erreur : ${e.message}`);
    } finally {
      setIsTestingTrade(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Background Accent glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-wide">
                Moteur Autonome MDT & HFT (Pine v5 Intégré)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIF 24/7
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Analyse continue des bougies clôturées et déclenchement automatique sur MetaApi
            </p>
          </div>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
            <span>Scanner</span>
          </button>

          <button
            onClick={handleToggleAutoPilot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              autoPilot
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            {autoPilot ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>Pilote Auto : {autoPilot ? 'OUI' : 'NON'}</span>
          </button>
        </div>
      </div>

      {/* Explication Pédagogique directe pour l'utilisateur */}
      {showExplanation && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-slate-300 relative">
          <button
            onClick={() => setShowExplanation(false)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white text-xs px-1.5 py-0.5"
          >
            ✕
          </button>
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <p className="font-semibold text-amber-300">
                Pourquoi aucune position ne s'ouvrait et comment le robot fonctionne maintenant :
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300/90 pl-1">
                <li>
                  <strong>MetaApi est une passerelle, pas un cerveau</strong> : Les identifiants MetaApi permettent de passer les ordres sur MT5, mais il fallait que le moteur de calcul (<code className="text-amber-200">MdtEngine</code>) et la boucle de surveillance (<code className="text-amber-200">mdtRunner</code>) tournent. Ils sont désormais <strong>directement intégrés dans le serveur Cloud (Google Cloud Run / Viceinte Core)</strong>, fonctionnant 24h/24 sans dépendance Render.
                </li>
                <li>
                  <strong>Vitesse des signaux</strong> : En mode <em>Sniper Pro A+ (M15)</em>, le robot attend 5 confluences strictes sur 7 en session de Londres/NY uniquement (seulement 1 à 3 trades par semaine). En mode <em>HFT Micro-Scalper (M1)</em>, le robot ouvre des positions dès qu'un micro-retest est validé et encaisse rapidement 0,60 $ à 2,00 $.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-4">
        {/* Mode 1: HFT Micro-Scalper */}
        <button
          onClick={() => handleProfileChange('HFT Micro-Scalper')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            profile === 'HFT Micro-Scalper'
              ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/5'
              : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Zap className="w-3.5 h-3.5" /> HFT Micro-Scalper
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono">
              M1 (Rapide)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Ouverture multi-positions (1x à 5x), clôture éclair dès 0,60 $ à 2,00 $ de gain.
          </p>
          <div className="mt-2 text-[10px] text-emerald-400 font-medium">
            ✓ Score requis : 2/7 · Fréquence haute
          </div>
        </button>

        {/* Mode 2: MDT Intraday Clean */}
        <button
          onClick={() => handleProfileChange('Intraday Clean')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            profile === 'Intraday Clean'
              ? 'bg-cyan-500/15 border-cyan-500/60 shadow-lg shadow-cyan-500/5'
              : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <Target className="w-3.5 h-3.5" /> MDT Intraday Clean
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-mono">
              M5 (Équilibré)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Setup intermédiaire avec confirmation de structure BOS et volume institutionnel.
          </p>
          <div className="mt-2 text-[10px] text-cyan-300 font-medium">
            ✓ Score requis : 4/7 · Sessions Londres/NY
          </div>
        </button>

        {/* Mode 3: Sniper Pro A+ */}
        <button
          onClick={() => handleProfileChange('Sniper A+')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            profile === 'Sniper A+'
              ? 'bg-purple-500/15 border-purple-500/60 shadow-lg shadow-purple-500/5'
              : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <ShieldCheck className="w-3.5 h-3.5" /> MDT Sniper Pro A+
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-300 font-mono">
              M15 (Chirurgical)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Configuration d'élite (OB + Sweep + Retest strict sur pivot swing + TP 3R).
          </p>
          <div className="mt-2 text-[10px] text-purple-300 font-medium">
            ✓ Score requis : 5/7 · 1 à 3 trades/semaine
          </div>
        </button>
      </div>

      {/* Live Telemetry & Confluence Engine */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Score Confluence Actuel</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-400 font-mono">{currentScore} / 7</span>
            <span className="text-xs text-slate-400">requis: {reqScore}</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                currentScore >= reqScore ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, (currentScore / 7) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tendance Maîtresse MDT</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-sm font-bold flex items-center gap-1 ${
                mdtEngine?.trend_direction === 1 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${mdtEngine?.trend_direction === -1 ? 'rotate-180' : ''}`} />
              {mdtEngine?.trend_direction === 1 ? 'HAUSSIER (ST Bull)' : 'BAISSIER (ST Bear)'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            Pivot : {mdtEngine?.trend_line ? `$${mdtEngine.trend_line}` : 'Calculé en direct'}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            {mdtEngine?.tp_dynamic_enabled ? 'TP Dynamique & Trailing' : 'Cible de Sortie Fixe'}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {mdtEngine?.tp_dynamic_enabled 
                ? `+$${(mdtEngine?.tp_dynamic_min || 1.0).toFixed(1)} - $${(mdtEngine?.tp_dynamic_max || 3.0).toFixed(1)}` 
                : `+$${targetProfit.toFixed(2)}`}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {mdtEngine?.tp_dynamic_enabled ? `(BE Lock +$${(mdtEngine?.breakeven_lock_usd || 0.20).toFixed(2)})` : `(${multiCount}x)`}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {mdtEngine?.tp_dynamic_enabled ? `Trailing step : $${(mdtEngine?.trailing_step_usd || 0.40).toFixed(2)}` : "Auto-closer verrouille à l'impact"}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Liaison MetaApi MT5</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isMetaConnected && isAutoTradeActive
                  ? 'bg-emerald-400 animate-ping'
                  : isMetaConnected
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-xs font-bold text-white">
              {isMetaConnected
                ? isAutoTradeActive
                  ? 'Auto-Trade MT5 ACTIF'
                  : 'Prêt (Attente Auto)'
                : 'Identifiants Manquants'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-1">
            {!isMetaConnected ? (
              <button
                type="button"
                onClick={() => setIsQuickOpen(!isQuickOpen)}
                className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-2.5 h-2.5" /> Lier MetaApi MT5
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsQuickOpen(!isQuickOpen)}
                  className="text-[10px] text-slate-400 hover:text-amber-300 font-mono flex items-center gap-1 cursor-pointer transition"
                  title="Voir / Modifier les clés MetaApi"
                >
                  <Key className="w-2.5 h-2.5 text-amber-400" />
                  <span>{state?.metaapi?.symbol || 'GOLD'} · {state?.metaapi?.lot_size || 0.01} lot</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleAutoTrade}
                  className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold border transition cursor-pointer ${
                    isAutoTradeActive
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                  }`}
                >
                  {isAutoTradeActive ? 'Pause' : '⚡ Activer Auto'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick MetaApi Direct Connect Drawer */}
      {isQuickOpen && (
        <form onSubmit={handleQuickConnect} className="mb-4 p-4 rounded-xl bg-black/60 border border-amber-500/40 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>{isMetaConnected ? 'Modifier les Identifiants MetaApi MT5 :' : 'Connexion Directe MetaApi Cloud (XM Global MT5) :'}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsQuickOpen(false)}
              className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
            >
              Fermer
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Jeton API MetaApi (Token) :</label>
              <input
                type="password"
                placeholder="Ex: eyJhbGciOiJSUzI1NiIsInR5cCI6Ik..."
                value={quickToken}
                onChange={(e) => setQuickToken(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-white placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">ID de Compte MetaApi (Account ID) :</label>
              <input
                type="text"
                placeholder="Ex: 7dffec2a-689d-4ef5-b6eb-846978efc858"
                value={quickAccountId}
                onChange={(e) => setQuickAccountId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-cyan-300 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-zinc-400">Vos identifiants seront stockés de façon permanente sur le serveur et ne s'effaceront plus.</span>
            <button
              type="submit"
              disabled={isSavingQuickMeta}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 font-bold text-xs font-mono transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {isSavingQuickMeta ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Connecter & Activer Auto-Trade MT5</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 7 Confluences Checklist */}
      <div className="mb-4 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Checklist des 7 Piliers MDT évalués en continu :
          </span>
          <span className="text-[10px] text-slate-400">
            Dernière bougie scannée : {mdtEngine?.last_scan_time ? new Date(mdtEngine.last_scan_time).toLocaleTimeString() : 'En attente'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-[11px]">
          {[
            { label: 'Tendance HTF H1/H4', active: activeConfluences.some(c => c.includes('HTF')) },
            { label: 'Order Block (OB)', active: activeConfluences.some(c => c.includes('Order Block')) },
            { label: 'Sweep Liquidité', active: activeConfluences.some(c => c.includes('Balayage')) },
            { label: 'Cassure BOS', active: activeConfluences.some(c => c.includes('Cassure')) },
            { label: 'Ligne MDT Flip', active: activeConfluences.some(c => c.includes('Flip')) },
            { label: 'Volume HVB', active: activeConfluences.some(c => c.includes('Volume')) },
            { label: 'Stop Loss ATR', active: activeConfluences.some(c => c.includes('Stop Loss')) },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
                item.active
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <CheckCircle2 className={`w-3 h-3 ${item.active ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Immediate Execution Test Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Tester la liaison d'ouverture d'ordre immédiate :</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleTestTrade('BUY')}
            disabled={isTestingTrade !== null}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            {isTestingTrade === 'BUY' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>TEST DIRECT ACHAT (BUY)</span>
          </button>

          <button
            onClick={() => handleTestTrade('SELL')}
            disabled={isTestingTrade !== null}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-900/30 disabled:opacity-50"
          >
            {isTestingTrade === 'SELL' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>TEST DIRECT VENTE (SELL)</span>
          </button>
        </div>
      </div>

      {testFeedback && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono text-center animate-fadeIn flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testFeedback}</span>
        </div>
      )}
    </div>
  );
};
