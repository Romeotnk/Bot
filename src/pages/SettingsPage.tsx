import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { Settings, TradingMode } from '../types';
import { Sliders, ShieldAlert, Check, Lock, AlertTriangle, Key, Terminal, Copy, Cpu, Server, Activity, Zap, Radio, ExternalLink } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { state, updateSettings, setIsBrokerModalOpen, saveMetaApiConfig } = useAppState();
  const currentSettings = state?.settings;
  const currentBroker = state?.broker || state?.settings?.broker;
  const currentMetaApi = state?.metaapi;

  // Local form state
  const [formData, setFormData] = useState<Settings>(
    currentSettings || {
      paused: false,
      mode: 'simulation',
      symbol: 'GOLD',
      timeframe: '5m',
      lot: 0.01,
      max_risk_pct: 5,
      max_daily_loss_pct: 10,
      max_trades_day: 3,
      news_filter: true,
      ml_filter: false,
      ai_filter: false,
    }
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Real Mode Unlock Modal State
  const [showRealModal, setShowRealModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  const handleModeToggle = () => {
    if (formData.mode === 'simulation') {
      // Need confirmation modal to switch to real
      setShowRealModal(true);
      setConfirmInput('');
    } else {
      // Switch back to simulation freely
      setFormData({ ...formData, mode: 'simulation' });
    }
  };

  const confirmActivateReal = () => {
    if (confirmInput.trim() !== 'ACTIVER') {
      setErrorMsg('Veuillez taper exactement ACTIVER en majuscules pour déverrouiller.');
      return;
    }
    setFormData({ ...formData, mode: 'reel' });
    setShowRealModal(false);
    setConfirmInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation rule: max_risk_pct cannot exceed 10%
    if (formData.max_risk_pct > 10) {
      setErrorMsg('Le risque par trade ne peut pas dépasser 10%.');
      return;
    }
    if (formData.max_risk_pct <= 0) {
      setErrorMsg('Le risque par trade doit être supérieur à 0%.');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings(formData);
      setSuccessMsg('Réglages enregistrés avec succès et synchronisés.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement des réglages.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyBotKey = () => {
    if (state?.bot_key) {
      navigator.clipboard.writeText(state.bot_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#e9e6dc]">
          Paramètres du robot
        </h1>
        <p className="text-xs text-[#8d90a3] mt-1">
          Configuration des règles de gestion des risques, des filtres et du canal de communication Python.
        </p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#ff6b5b]/15 border border-[#ff6b5b]/40 text-xs text-[#ff6b5b] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-[#7fd6ff]/15 border border-[#7fd6ff]/40 text-xs text-[#7fd6ff] flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 0: Connexion Compte Démo (XM Global, MT5, Exness, Deriv) & HFT */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#121626] to-[#0c0f1a] border border-cyan-500/30 p-6 shadow-2xl backdrop-blur-md hud-box hud-corners relative overflow-hidden">
          <div className="hud-corner-top-right" />
          <div className="hud-corner-bottom-left" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/40">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-sm text-white">
                    Connexion Compte Démo Courtier & Moteur HFT
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    currentBroker?.connected 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {currentBroker?.connected ? 'Pont Démo Connecté' : 'Non Connecté'}
                  </span>
                </div>
                <p className="text-xs text-[#8d90a3] mt-0.5">
                  Liez votre compte démo <strong>XM Global</strong>, <strong>Exness</strong>, <strong>Deriv</strong> ou <strong>MT5</strong> avec exécution haute fréquence (&lt;25ms).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBrokerModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-400 text-black hover:bg-cyan-300 transition cursor-pointer shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Server className="w-3.5 h-3.5 text-black" />
              <span>{currentBroker?.connected ? 'Gérer / Reconnecter Démo' : 'Connecter un Compte Démo'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#060810] border border-white/[0.06]">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d90a3]">Courtier Actif</div>
              <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                <span>{currentBroker?.broker_type || 'XM Global'}</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-400/20 text-amber-300">
                  {currentBroker?.account_type?.toUpperCase() || 'DÉMO'}
                </span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d90a3]">Serveur Démo & Compte</div>
              <div className="text-xs font-mono text-cyan-300 mt-0.5 truncate">
                {currentBroker?.server_name || 'XMGlobal-MT5 3'} ({currentBroker?.account_number || '52019482'})
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d90a3]">Symbole Tradé</div>
              <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">
                {currentBroker?.symbol || 'GOLD'} (XAUUSD)
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d90a3]">Latence Moteur HFT</div>
              <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>{currentBroker?.last_ping_ms || 18} ms</span>
                <span className="text-[10px] font-normal text-zinc-400">(IOC Slippage &lt; 1.5p)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 0.5: Liaison MetaApi Cloud & Prise de Position Automatique */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#0e1424] to-[#0a0d17] border border-blue-500/30 p-6 shadow-2xl backdrop-blur-md hud-box hud-corners relative overflow-hidden">
          <div className="hud-corner-top-right" />
          <div className="hud-corner-bottom-left" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-sm text-white">
                    Liaison MetaApi Cloud — Prise de Position Automatique
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    currentMetaApi?.auto_trade_enabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
                      : currentMetaApi?.token
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {currentMetaApi?.auto_trade_enabled
                      ? '⚡ AUTO-TRADE ACTIF'
                      : currentMetaApi?.token
                      ? 'CONFIGURÉ (EN PAUSE)'
                      : 'NON CONFIGURÉ'}
                  </span>
                </div>
                <p className="text-xs text-[#8d90a3] mt-0.5">
                  Prend automatiquement les positions sur votre compte <strong>MT4 / MT5</strong> dès réception d'un signal TradingView ou MDT.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBrokerModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-blue-500 hover:bg-blue-400 text-white transition cursor-pointer shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{currentMetaApi?.token ? 'Gérer / Reconnecter MetaApi' : 'Configurer la Liaison MetaApi'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#060810] border border-white/[0.06]">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d90a3]">Statut Liaison Cloud</div>
              <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${currentMetaApi?.token ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{currentMetaApi?.token ? (currentMetaApi.connected ? 'Connecté & Synchronisé' : 'Jeton Enregistré') : 'Non relié'}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d93a8]">ID de Compte MetaApi</div>
              <div className="text-xs font-mono text-cyan-300 mt-0.5 truncate" title={currentMetaApi?.account_id || 'Non renseigné'}>
                {currentMetaApi?.account_id ? `${currentMetaApi.account_id.substring(0, 14)}...` : '—'}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d93a8]">Symbole & Lot Auto</div>
              <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">
                {currentMetaApi?.symbol || 'GOLD'} · {currentMetaApi?.lot_size || 0.01} Lot
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#8d93a8]">Prise de Position Auto</div>
              <div className="text-xs font-mono font-bold mt-0.5 flex items-center justify-between">
                <span className={currentMetaApi?.auto_trade_enabled ? 'text-emerald-400' : 'text-zinc-400'}>
                  {currentMetaApi?.auto_trade_enabled ? 'Activée (Automatique)' : 'Désactivée'}
                </span>
                {currentMetaApi?.token && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentMetaApi) return;
                      await saveMetaApiConfig({ auto_trade_enabled: !currentMetaApi.auto_trade_enabled });
                    }}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition border ${
                      currentMetaApi?.auto_trade_enabled
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    }`}
                  >
                    {currentMetaApi?.auto_trade_enabled ? 'Couper' : 'Activer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Mode d'exécution (Ordres Réels vs Simulation) */}
        <div className="rounded-[28px] bg-[#10121b]/90 border border-[#232637] p-6 shadow-xl backdrop-blur-md hud-box hud-corners">
          <div className="hud-corner-top-right" />
          <div className="hud-corner-bottom-left" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#e8c56a]" />
              <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
                Mode d’exécution des ordres
              </h3>
            </div>
            {formData.mode === 'reel' ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#ff6b5b]/20 text-[#ff6b5b] border border-[#ff6b5b]/40">
                Mode réel actif
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#7fd6ff]/15 text-[#7fd6ff] border border-[#7fd6ff]/30">
                Mode simulation sécurisé
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#06070c]/70 border border-[#232637] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm text-[#e9e6dc]">Ordres réels sur le marché</span>
                {formData.mode === 'simulation' && <Lock className="w-3.5 h-3.5 text-[#8d90a3]" />}
              </div>
              <p className="text-xs text-[#8d90a3] mt-1 max-w-lg leading-relaxed">
                Par défaut verrouillé en simulation. L’activation transmet les ordres réels au courtier avec du capital réel en jeu.
              </p>
            </div>

            <button
              type="button"
              onClick={handleModeToggle}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap ${
                formData.mode === 'reel'
                  ? 'bg-[#ff6b5b] text-[#06070c] hover:bg-[#ff8577]'
                  : 'bg-[#171a27] text-[#e8c56a] border border-[#e8c56a]/40 hover:bg-[#e8c56a]/15'
              }`}
            >
              {formData.mode === 'reel' ? 'Repasser en simulation' : 'Déverrouiller le mode réel'}
            </button>
          </div>
        </div>

        {/* Section 2: Garde-fous & Risque de trading */}
        <div className="rounded-2xl bg-[#10121b]/90 border border-[#232637] p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-[#e8c56a]" />
            <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
              Garde-fous & Gestion des risques
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Risque max par trade (Validation <= 10%) */}
            <div>
              <label className="block text-xs font-medium text-[#e9e6dc] mb-1">
                Risque max par trade (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={formData.max_risk_pct}
                onChange={(e) => setFormData({ ...formData, max_risk_pct: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#232637] text-xs font-mono text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
              />
              <span className="text-[10px] text-[#8d90a3] mt-1 block">
                Plafond strict : 10% maximum
              </span>
            </div>

            {/* Perte journalière max */}
            <div>
              <label className="block text-xs font-medium text-[#e9e6dc] mb-1">
                Perte max journalière (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="30"
                value={formData.max_daily_loss_pct}
                onChange={(e) => setFormData({ ...formData, max_daily_loss_pct: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#232637] text-xs font-mono text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
              />
              <span className="text-[10px] text-[#8d90a3] mt-1 block">
                Coupe-circuit automatique du jour
              </span>
            </div>

            {/* Plafond trades par jour */}
            <div>
              <label className="block text-xs font-medium text-[#e9e6dc] mb-1">
                Trades max par jour
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.max_trades_day}
                onChange={(e) => setFormData({ ...formData, max_trades_day: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#232637] text-xs font-mono text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
              />
              <span className="text-[10px] text-[#8d90a3] mt-1 block">
                Discipline anti-surtrading
              </span>
            </div>

            {/* Taille de lot standard */}
            <div>
              <label className="block text-xs font-medium text-[#e9e6dc] mb-1">
                Taille du lot
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="5.0"
                value={formData.lot}
                onChange={(e) => setFormData({ ...formData, lot: parseFloat(e.target.value) || 0.01 })}
                className="w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#232637] text-xs font-mono text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
              />
              <span className="text-[10px] text-[#8d90a3] mt-1 block">
                0.01 = micro-lot or standard
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Filtres d'invalidation */}
        <div className="rounded-2xl bg-[#10121b]/90 border border-[#232637] p-6 shadow-xl backdrop-blur-md">
          <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a] mb-4">
            Filtres tactiques complémentaires
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* News Filter */}
            <label className="p-4 rounded-xl bg-[#06070c]/70 border border-[#232637] flex items-center justify-between cursor-pointer hover:border-[#e8c56a]/40 transition">
              <div>
                <span className="text-xs font-semibold text-[#e9e6dc] block">Filtre actualités</span>
                <span className="text-[10px] text-[#8d90a3] block mt-0.5">Bloque les trades lors du FOMC et CPI</span>
              </div>
              <input
                type="checkbox"
                checked={formData.news_filter}
                onChange={(e) => setFormData({ ...formData, news_filter: e.target.checked })}
                className="w-4 h-4 accent-[#e8c56a] rounded"
              />
            </label>

            {/* ML Filter */}
            <label className="p-4 rounded-xl bg-[#06070c]/70 border border-[#232637] flex items-center justify-between cursor-pointer hover:border-[#e8c56a]/40 transition">
              <div>
                <span className="text-xs font-semibold text-[#e9e6dc] block">Filtre Machine Learning</span>
                <span className="text-[10px] text-[#8d90a3] block mt-0.5">Scoring de probabilité statistique</span>
              </div>
              <input
                type="checkbox"
                checked={formData.ml_filter}
                onChange={(e) => setFormData({ ...formData, ml_filter: e.target.checked })}
                className="w-4 h-4 accent-[#e8c56a] rounded"
              />
            </label>

            {/* AI Filter */}
            <label className="p-4 rounded-xl bg-[#06070c]/70 border border-[#232637] flex items-center justify-between cursor-pointer hover:border-[#e8c56a]/40 transition">
              <div>
                <span className="text-xs font-semibold text-[#e9e6dc] block">Filtre Aurum IA</span>
                <span className="text-[10px] text-[#8d90a3] block mt-0.5">Validation sémantique du contexte macro</span>
              </div>
              <input
                type="checkbox"
                checked={formData.ai_filter}
                onChange={(e) => setFormData({ ...formData, ai_filter: e.target.checked })}
                className="w-4 h-4 accent-[#e8c56a] rounded"
              />
            </label>
          </div>
        </div>

        {/* Section 4: Clé secrète du robot & Ingestion API */}
        <div className="rounded-2xl bg-[#10121b]/90 border border-[#232637] p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#e8c56a]" />
              <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
                Connexion du robot Python externe (x-bot-key)
              </h3>
            </div>
            <span className="text-[11px] text-[#8d90a3] font-mono">
              Protection serveur
            </span>
          </div>

          <p className="text-xs text-[#8d90a3] mb-3 leading-relaxed">
            Votre programme Python externe doit inclure l'en-tête HTTP <code className="text-[#e8c56a] font-mono">x-bot-key</code> lors de l'appel aux endpoints <code className="text-[#7fd6ff] font-mono">POST /ingest</code> et <code className="text-[#7fd6ff] font-mono">GET /bot-settings</code>.
          </p>

          <div className="p-3.5 rounded-xl bg-[#06070c] border border-[#232637] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="w-4 h-4 text-[#8d90a3] shrink-0" />
              <code className="text-xs font-mono text-[#e9e6dc] truncate">
                {state?.bot_key || 'aurum-prod-secret-xauusd-key'}
              </code>
            </div>

            <button
              type="button"
              onClick={copyBotKey}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#171a27] text-[#e8c56a] border border-[#e8c56a]/30 hover:bg-[#e8c56a]/20 transition shrink-0 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedKey ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#e8c56a] text-[#06070c] font-heading font-semibold text-xs tracking-wider uppercase hover:bg-[#f6e7b8] transition active:scale-95 shadow-lg shadow-[#e8c56a]/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Real Mode */}
      {showRealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#10121b] border border-[#ff6b5b]/50 p-6 shadow-2xl text-[#e9e6dc]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#232637] text-[#ff6b5b]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider">
                Avertissement critique sur le capital
              </h3>
            </div>

            <p className="mt-4 text-xs text-[#e9e6dc] leading-relaxed">
              « Tu peux perdre tout ton capital. Reste en simulation tant que les résultats ne sont pas validés. »
            </p>

            <p className="mt-3 text-xs text-[#8d90a3]">
              Pour confirmer l’activation des ordres réels sur le compte de trading, écrivez <strong className="text-[#ff6b5b] font-mono">ACTIVER</strong> ci-dessous :
            </p>

            <input
              type="text"
              placeholder="Tapez ACTIVER"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="mt-3 w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#ff6b5b]/40 text-sm font-mono text-[#ff6b5b] focus:border-[#ff6b5b] focus:outline-none"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRealModal(false)}
                className="px-4 py-2 rounded-xl bg-[#171a27] text-xs font-semibold text-[#8d90a3] hover:text-white transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmActivateReal}
                className="px-4 py-2 rounded-xl bg-[#ff6b5b] text-xs font-semibold text-[#06070c] hover:bg-[#ff8577] transition cursor-pointer"
              >
                Confirmer le mode réel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
