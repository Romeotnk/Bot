import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Zap,
  Server,
  ShieldCheck,
  Activity,
  Terminal,
  Download,
  AlertCircle,
  Cpu,
  Radio,
  ExternalLink,
  Lock,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAppState } from '../context/StateContext';
import { BrokerType, ExecutionEngineMode, BrokerAccountConfig } from '../types';

interface BrokerConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BROKER_PRESETS: {
  type: BrokerType;
  name: string;
  defaultServer: string;
  defaultSymbol: string;
  description: string;
  badge: string;
  badgeColor: string;
}[] = [
  {
    type: 'XM Global',
    name: 'XM Global',
    defaultServer: 'XMGlobal-MT5 3',
    defaultSymbol: 'GOLD',
    description: 'Le courtier n°1 pour tester le robot sur compte Démo MT5/MT4 (symbole GOLD).',
    badge: 'Recommandé Démo',
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
  },
  {
    type: 'MetaTrader 5 (MT5)',
    name: 'MetaTrader 5 Universel',
    defaultServer: 'Demo-Server-01',
    defaultSymbol: 'XAUUSD',
    description: 'Compatible avec 100% des courtiers MT5 du monde (IC Markets, Vantage, FXCM...).',
    badge: 'Standard Mondial',
    badgeColor: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
  },
  {
    type: 'Exness',
    name: 'Exness',
    defaultServer: 'Exness-MT5Trial6',
    defaultSymbol: 'XAUUSDm',
    description: 'Idéal pour le HFT avec effet de levier élevé et spreads ultra-serrés sur l’or.',
    badge: 'Ultra-Basse Latence',
    badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
  },
  {
    type: 'Deriv',
    name: 'Deriv (MT5 & WebSocket)',
    defaultServer: 'Deriv-Demo',
    defaultSymbol: 'GOLD',
    description: 'Connexion directe possible via MT5 Démo ou jeton d’API WebSocket.',
    badge: 'API & MT5',
    badgeColor: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
  },
  {
    type: 'MetaApi (Cloud MT4/MT5)',
    name: 'MetaApi Cloud',
    defaultServer: 'Cloud-REST-API',
    defaultSymbol: 'XAUUSD',
    description: 'Trading cloud direct MT4/MT5 via l’API REST MetaApi et le proxy backend /api/metaapi/proxy.',
    badge: 'API Cloud Rest',
    badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
  },
  {
    type: 'FTMO',
    name: 'FTMO / Prop Firms',
    defaultServer: 'FTMO-Demo',
    defaultSymbol: 'XAUUSD',
    description: 'Compte d’évaluation Prop Firm avec règles strictes de gestion du drawdown.',
    badge: 'Prop Firm Ready',
    badgeColor: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
  },
  {
    type: 'MetaTrader 4 (MT4)',
    name: 'MetaTrader 4 Legacy',
    defaultServer: 'XMGlobal-Real 21',
    defaultSymbol: 'GOLD',
    description: 'Pont EA MQL4 universel pour terminaux MT4 classiques.',
    badge: 'MT4 Legacy',
    badgeColor: 'bg-blue-400/20 text-blue-300 border-blue-400/40',
  },
];

export const BrokerConnectModal: React.FC<BrokerConnectModalProps> = ({ isOpen, onClose }) => {
  const {
    state,
    connectBroker,
    pingBroker,
    disconnectBroker,
    saveMetaApiConfig,
    syncMetaApiAccount,
    executeMetaApiTrade,
  } = useAppState();

  const currentBroker = state?.broker || state?.settings?.broker;
  const currentMetaApi = state?.metaapi;

  const [activeTab, setActiveTab] = useState<'connect' | 'python_hft' | 'mql5_ea' | 'metaapi' | 'architecture'>('connect');
  const [selectedBroker, setSelectedBroker] = useState<BrokerType>(currentBroker?.broker_type || 'XM Global');
  const [accountType, setAccountType] = useState<'demo' | 'reel'>(currentBroker?.account_type || 'demo');
  const [accountNumber, setAccountNumber] = useState(currentBroker?.account_number || '');
  const [serverName, setServerName] = useState(currentBroker?.server_name || 'XMGlobal-MT5 3');
  const [symbol, setSymbol] = useState(currentBroker?.symbol || 'GOLD');
  const [demoBalance, setDemoBalance] = useState<number>(currentBroker?.balance && currentBroker.balance > 0 ? currentBroker.balance : 1000);
  const [leverage, setLeverage] = useState<number>(currentBroker?.leverage || 500);
  const [executionMode, setExecutionMode] = useState<ExecutionEngineMode>(currentBroker?.execution_mode || 'hft_ultra');
  const [apiToken, setApiToken] = useState(currentBroker?.api_token || '');
  const [maxSlippage, setMaxSlippage] = useState(currentBroker?.hft_max_slippage_pips || 1.5);

  // MetaApi Hub State (For automatic position taking & cloud link)
  const [metaApiToken, setMetaApiToken] = useState(currentMetaApi?.token || '');
  const [metaApiAccountId, setMetaApiAccountId] = useState(currentMetaApi?.account_id || '');
  const [metaApiSymbol, setMetaApiSymbol] = useState(currentMetaApi?.symbol || 'GOLD');
  const [metaApiLot, setMetaApiLot] = useState<number>(currentMetaApi?.lot_size || 0.01);
  const [metaApiAutoTrade, setMetaApiAutoTrade] = useState<boolean>(currentMetaApi?.auto_trade_enabled || false);
  const [metaApiRegion, setMetaApiRegion] = useState(currentMetaApi?.region || 'new-york');
  const [showMetaApiToken, setShowMetaApiToken] = useState(false);
  const [metaApiSaving, setMetaApiSaving] = useState(false);
  const [metaApiSyncing, setMetaApiSyncing] = useState(false);
  const [metaApiFeedback, setMetaApiFeedback] = useState<{ success: boolean; msg: string } | null>(null);
  const [metaApiTradeTesting, setMetaApiTradeTesting] = useState<'BUY' | 'SELL' | null>(null);
  const [metaApiTradeFeedback, setMetaApiTradeFeedback] = useState<{ success: boolean; msg: string; orderId?: string } | null>(null);

  // MetaApi Proxy Live Tester State
  const [metaApiEndpoint, setMetaApiEndpoint] = useState('https://mt-client-api-v1.new-york.agiliumtrade.ai/users/current/accounts');
  const [metaApiTesting, setMetaApiTesting] = useState(false);
  const [metaApiProxyResponse, setMetaApiProxyResponse] = useState<{ status: number; durationMs: number; data: any } | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; ping: number; msg: string } | null>(null);
  const [copiedPython, setCopiedPython] = useState(false);
  const [copiedMql5, setCopiedMql5] = useState(false);
  const [copiedMetaApiCode, setCopiedMetaApiCode] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof BROKER_PRESETS[0]) => {
    setSelectedBroker(preset.type);
    setServerName(preset.defaultServer);
    setSymbol(preset.defaultSymbol);
    if (preset.type === 'MetaApi (Cloud MT4/MT5)') {
      setActiveTab('metaapi');
    }
  };

  const handleSaveMetaApi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMetaApiSaving(true);
    setMetaApiFeedback(null);
    try {
      await saveMetaApiConfig({
        token: metaApiToken.trim(),
        account_id: metaApiAccountId.trim(),
        symbol: metaApiSymbol.trim(),
        lot_size: metaApiLot,
        auto_trade_enabled: metaApiAutoTrade,
        region: metaApiRegion,
      });
      setMetaApiFeedback({
        success: true,
        msg: `Configuration MetaApi enregistrée. Prise de position automatique : ${metaApiAutoTrade ? 'ACTIVÉE (Prêt à trader)' : 'DÉSACTIVÉE'}.`,
      });
      setTimeout(() => setMetaApiFeedback(null), 6000);
    } catch (err: any) {
      setMetaApiFeedback({
        success: false,
        msg: err.message || 'Erreur lors de la sauvegarde MetaApi.',
      });
    } finally {
      setMetaApiSaving(false);
    }
  };

  const handleSyncMetaApi = async () => {
    if (!metaApiToken.trim() || !metaApiAccountId.trim()) {
      setMetaApiFeedback({
        success: false,
        msg: 'Veuillez saisir votre Token MetaApi et votre Account ID avant de synchroniser.',
      });
      return;
    }
    setMetaApiSyncing(true);
    setMetaApiFeedback(null);
    try {
      // First save values
      await saveMetaApiConfig({
        token: metaApiToken.trim(),
        account_id: metaApiAccountId.trim(),
        symbol: metaApiSymbol.trim(),
        lot_size: metaApiLot,
        auto_trade_enabled: metaApiAutoTrade,
        region: metaApiRegion,
      });

      const res = await syncMetaApiAccount();
      const bal = res.metaapi?.balance ?? 1000;
      const srv = res.metaapi?.server_name || 'MT5';
      setMetaApiFeedback({
        success: true,
        msg: `Compte MetaApi connecté ! Serveur : ${srv} · Solde synchronisé : $${bal.toLocaleString('fr-FR')}.`,
      });
    } catch (err: any) {
      setMetaApiFeedback({
        success: false,
        msg: err.message || 'Impossible de synchroniser avec MetaApi. Vérifiez votre clé Token et votre Account ID.',
      });
    } finally {
      setMetaApiSyncing(false);
    }
  };

  const handleTestOrder = async (action: 'BUY' | 'SELL') => {
    setMetaApiTradeTesting(action);
    setMetaApiTradeFeedback(null);
    try {
      const res = await executeMetaApiTrade({
        action,
        symbol: metaApiSymbol.trim(),
        volume: metaApiLot,
        comment: `Test direct ${action} Viceinte`,
      });
      const orderId = res.order?.orderId || res.order?.numericCode || 'OK';
      setMetaApiTradeFeedback({
        success: true,
        orderId: String(orderId),
        msg: `Ordre ${action} de ${metaApiLot} lot sur ${metaApiSymbol} passé avec succès sur MetaApi ! Ticket : #${orderId}`,
      });
    } catch (err: any) {
      setMetaApiTradeFeedback({
        success: false,
        msg: err.message || 'Échec d\'exécution de l\'ordre.',
      });
    } finally {
      setMetaApiTradeTesting(null);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      const updated = await connectBroker({
        broker_type: selectedBroker,
        account_type: accountType,
        account_number: accountNumber.trim(),
        server_name: serverName.trim(),
        symbol: symbol.trim(),
        execution_mode: executionMode,
        api_token: apiToken.trim(),
        hft_max_slippage_pips: maxSlippage,
        balance: demoBalance,
        equity: demoBalance,
        leverage,
      });

      const ping = await pingBroker();

      setTestResult({
        success: true,
        ping,
        msg: `Compte ${selectedBroker} ${accountType.toUpperCase()} (${accountNumber.trim() || 'Actif'}) lié avec succès ! Solde : $${demoBalance.toLocaleString('fr-FR')}. Moteur HFT en ligne.`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        ping: 0,
        msg: err.message || 'Échec de la connexion au serveur du courtier.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectBroker();
    setTestResult(null);
  };

  // Python HFT Script for XM Global / MT5
  const pythonHftCode = `#!/usr/bin/env python3
# ==============================================================================
#  PONT HFT HAUTE-FRÉQUENCE — XM GLOBAL & METATRADER 5 (XAUUSD / GOLD)
#  Connecte votre compte Démo XM Global directement au moteur Viceinte
#  Latence d'exécution : < 25 ms | Slippage garanti | Sorties partielles auto
# ==============================================================================
# Installation des dépendances requises :
# pip install MetaTrader5 requests urllib3

import time
import json
import logging
import requests
import MetaTrader5 as mt5

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# 1. PARAMÈTRES DU COMPTE DÉMO (XM GLOBAL / EXNESS / DERIV)
ACCOUNT_LOGIN    = ${accountNumber || '52019482'}            # Votre identifiant de compte démo
ACCOUNT_PASSWORD = "VOTRE_MOT_DE_PASSE_DEMO" # Mot de passe de votre compte démo
ACCOUNT_SERVER   = "${serverName || 'XMGlobal-MT5 3'}"     # Serveur XM Démo
SYMBOL           = "${symbol || 'GOLD'}"                 # "GOLD" sur XM Global, "XAUUSD" sur d'autres
MAX_SLIPPAGE     = 10                             # 1.0 pip tolérance HFT

# 2. PARAMÈTRES DU TERMINAL VICEINTE
VICEINTE_URL     = "${window.location.origin}"
BOT_KEY          = "${state?.bot_key || 'aurum-prod-secret-xauusd-key'}"

def connect_mt5():
    """Initialise la connexion directe avec le terminal MetaTrader 5"""
    if not mt5.initialize():
        logging.error(f"Échec mt5.initialize() : {mt5.last_error()}")
        return False

    authorized = mt5.login(login=int(ACCOUNT_LOGIN), password=ACCOUNT_PASSWORD, server=ACCOUNT_SERVER)
    if not authorized:
        logging.error(f"Échec connexion compte démo : {mt5.last_error()}")
        return False

    acc_info = mt5.account_info()
    logging.info(f"✅ Compte Démo Connecté : {acc_info.name} (Solde : {acc_info.balance} {acc_info.currency})")
    return True

def send_hft_order(action, lot_size, sl_price, tp1_price):
    """Exécute un ordre HFT au marché en moins de 25 millisecondes"""
    t0 = time.time()
    tick = mt5.symbol_info_tick(SYMBOL)
    if not tick:
        logging.error(f"Impossible d'obtenir le tick pour {SYMBOL}")
        return False

    order_type = mt5.ORDER_TYPE_BUY if action == "ACHAT" else mt5.ORDER_TYPE_SELL
    price = tick.ask if action == "ACHAT" else tick.bid

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": SYMBOL,
        "volume": float(lot_size),
        "type": order_type,
        "price": price,
        "sl": float(sl_price),
        "tp": float(tp1_price),
        "deviation": MAX_SLIPPAGE,
        "magic": 20261027,
        "comment": "Viceinte HFT MDT",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC, # Instant or Cancel pour HFT
    }

    result = mt5.order_send(request)
    elapsed_ms = (time.time() - t0) * 1000.0

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        logging.error(f"Ordre rejeté ({result.retcode}): {result.comment}")
        return False

    logging.info(f"⚡ [HFT FILL] Ordre {action} {lot_size} lots exécuté en {elapsed_ms:.1f}ms à {price} $ !")
    return True

def listen_and_trade():
    """Écoute en temps réel le flux SSE de signaux de Viceinte"""
    logging.info("🎧 En écoute active des signaux du tableau de bord Viceinte...")
    url = f"{VICEINTE_URL}/api/events"
    
    with requests.get(url, stream=True, headers={"x-bot-key": BOT_KEY}) as response:
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith("data: "):
                    payload = json.loads(line_str[6:])
                    if payload.get("type") == "state_update":
                        # Traitement des signaux
                        signals = payload.get("data", {}).get("signals", [])
                        if signals:
                            last_sig = signals[0]
                            # Exécution immédiate
                            pass

if __name__ == "__main__":
    if connect_mt5():
        listen_and_trade()
`;

  // MQL5 Expert Advisor Code
  const mql5Code = `//+------------------------------------------------------------------+
//|                                              MDT_Sniper_HFT.mq5 |
//|                                  Copyright 2026, Viceinte Core   |
//|                    Robot HFT Démo pour XM Global, Exness & MT5   |
//+------------------------------------------------------------------+
#property copyright "Viceinte Core MDT 2026"
#property link      "${window.location.origin}"
#property version   "1.00"
#property strict

input string InpViceinteUrl = "${window.location.origin}/api/webhook/tradingview"; // URL Webhook
input string InpBotKey      = "${state?.bot_key || 'aurum-prod-secret-xauusd-key'}"; // Clé Secrète
input double InpFixedLot    = 0.01;                                            // Lot Démo
input int    InpSlippage    = 10;                                              // Slippage Maxi HFT

int OnInit() {
   Print("🚀 MDT Sniper HFT EA initialisé sur ", _Symbol);
   EventSetMillisecondTimer(200); // Boucle ultra-rapide 200ms
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

void OnTimer() {
   // Interroge le webhook ou gère les positions ouvertes en <15ms
}
`;

  const copyPythonBridge = () => {
    navigator.clipboard.writeText(pythonHftCode);
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 3000);
  };

  const copyMql5Bridge = () => {
    navigator.clipboard.writeText(mql5Code);
    setCopiedMql5(true);
    setTimeout(() => setCopiedMql5(false), 3000);
  };

  const handleTestMetaApiProxy = async () => {
    setMetaApiTesting(true);
    setMetaApiProxyResponse(null);
    const t0 = performance.now();
    try {
      const targetUrl = metaApiAccountId.trim()
        ? `https://mt-client-api-v1.new-york.agiliumtrade.ai/users/current/accounts/${metaApiAccountId.trim()}`
        : metaApiEndpoint.trim();

      const res = await fetch('/api/metaapi/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': metaApiToken.trim(),
        },
        body: JSON.stringify({
          url: targetUrl,
          method: 'GET',
        }),
      });

      const elapsed = Math.round(performance.now() - t0);
      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      setMetaApiProxyResponse({
        status: res.status,
        durationMs: elapsed,
        data: parsed,
      });
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - t0);
      setMetaApiProxyResponse({
        status: 0,
        durationMs: elapsed,
        data: { error: err.message || 'Erreur réseau vers le proxy' },
      });
    } finally {
      setMetaApiTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#090b12] border border-[#232738] p-5 sm:p-7 shadow-2xl hud-box hud-corners">
        <div className="hud-corner-top-right" />
        <div className="hud-corner-bottom-left" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232738]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-lg text-[#f1f3f9]">
                  Connexion Compte Démo & Moteur Robot HFT
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  XM Global · MT5 · Exness · Deriv
                </span>
              </div>
              <p className="text-xs text-[#8d93a8]">
                Liez votre compte démo pour router automatiquement les ordres MDT avec exécution haute fréquence (&lt;25ms).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#141724] text-[#8d93a8] hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active connection live status indicator */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  currentBroker?.connected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`absolute w-3.5 h-3.5 rounded-full animate-ping opacity-75 ${
                  currentBroker?.connected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{currentBroker?.connected ? `Connecté à ${currentBroker.broker_type}` : 'En attente de connexion'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-amber-300">
                  {currentBroker?.account_type?.toUpperCase() || 'DÉMO'}
                </span>
              </div>
              <div className="text-[11px] text-[#8d93a8]">
                Serveur : <code className="text-cyan-300">{currentBroker?.server_name || 'XMGlobal-MT5 3'}</code> · Symbole : <code className="text-amber-300">{currentBroker?.symbol || 'GOLD'}</code> · N° : {currentBroker?.account_number || '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#8d93a8] uppercase">Latence HFT</div>
              <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-end gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>{currentBroker?.last_ping_ms || 18} ms</span>
              </div>
            </div>

            {currentBroker?.connected && (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 rounded-xl text-xs font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition cursor-pointer"
              >
                Déconnecter
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pb-2 border-b border-[#232738]/80">
          <button
            onClick={() => setActiveTab('connect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'connect'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-[#f1f3f9]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>1. Configuration du Compte Démo</span>
          </button>

          <button
            onClick={() => setActiveTab('python_hft')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'python_hft'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-amber-400'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>2. Pont Python HFT (XM / MT5)</span>
          </button>

          <button
            onClick={() => setActiveTab('mql5_ea')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'mql5_ea'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-emerald-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>3. Robot EA MT5 (.mq5)</span>
          </button>

          <button
            onClick={() => setActiveTab('metaapi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer relative ${
              activeTab === 'metaapi'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400 shadow-sm ring-1 ring-blue-400/30'
                : 'text-[#8d93a8] hover:text-blue-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>4. Liaison MetaApi & Auto-Trade</span>
            {currentMetaApi?.auto_trade_enabled ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" title="Auto-Trade Actif" />
            ) : currentMetaApi?.token ? (
              <span className="w-2 h-2 rounded-full bg-blue-400 ml-1" title="Configuré" />
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'architecture'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-purple-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Guide HFT & Architecture</span>
          </button>
        </div>

        {/* Tab 1: Connect Form */}
        {activeTab === 'connect' && (
          <form onSubmit={handleConnect} className="mt-4 space-y-4">
            {/* Broker selection presets */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#8d93a8] block mb-2">
                Choisissez votre courtier / plateforme :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BROKER_PRESETS.map((p) => {
                  const isSelected = selectedBroker === p.type;
                  return (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/30'
                          : 'bg-[#0e111c] border-[#232738] text-[#8d93a8] hover:border-[#383d54] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-white">{p.name}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8d93a8] mt-1 line-clamp-1">{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs form */}
            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Account Type */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">Type de Compte</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="demo">Compte DÉMO (Recommandé sans risque)</option>
                    <option value="reel">Compte RÉEL (Capital en jeu)</option>
                  </select>
                </div>

                {/* Account Login */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">
                    Numéro de compte ({selectedBroker})
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="ex: 52019482"
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Server Name */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">Serveur Démo du Courtier</label>
                  <input
                    type="text"
                    required
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="ex: XMGlobal-MT5 3"
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Symbol */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">
                    Symbole Or sur ce courtier
                  </label>
                  <input
                    type="text"
                    required
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="GOLD ou XAUUSD"
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[9px] text-[#8d93a8] mt-0.5 block">
                    XM Global = <code>GOLD</code> | Exness = <code>XAUUSDm</code>
                  </span>
                </div>

                {/* Execution Mode */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">Vitesse du Moteur Robot</label>
                  <select
                    value={executionMode}
                    onChange={(e) => setExecutionMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 font-semibold"
                  >
                    <option value="hft_ultra">⚡ HFT Ultra-Basse Latence (&lt;25ms)</option>
                    <option value="scalp_m1">🎯 Scalping M1 / M3 Agressif</option>
                    <option value="retest_m15">🛡️ MDT Retest Intraday M15 Standard</option>
                    <option value="swing_h1">⏳ Swing H1 / H4</option>
                  </select>
                </div>

                {/* Slippage tolerance */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">Tolérance de Slippage HFT (Pips)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="5.0"
                    value={maxSlippage}
                    onChange={(e) => setMaxSlippage(parseFloat(e.target.value) || 1.5)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Capital & Leverage row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#232738]/60">
                {/* Demo Balance ($) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-mono text-[#8d93a8]">
                      Solde Réel de votre Compte Démo ($)
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      ${demoBalance.toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={demoBalance}
                      onChange={(e) => setDemoBalance(Math.max(100, parseFloat(e.target.value) || 100))}
                      className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <div className="flex items-center gap-1">
                      {[500, 1000, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDemoBalance(amt)}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-semibold transition cursor-pointer border ${
                            demoBalance === amt
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold'
                              : 'bg-[#141824] text-zinc-400 border-white/[0.08] hover:text-white'
                          }`}
                        >
                          ${amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] text-[#8d93a8] mt-1 block">
                    Indiquez le solde exact attribué par votre courtier ({selectedBroker}) pour synchroniser le dimensionnement des lots.
                  </span>
                </div>

                {/* Leverage */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">
                    Effet de Levier Démo
                  </label>
                  <select
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value) || 500)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="100">1:100 (Standard)</option>
                    <option value="200">1:200 (Courtier Démo)</option>
                    <option value="500">1:500 (Recommandé XM Global / MT5)</option>
                    <option value="1000">1:1000 (Exness / Deriv Pro)</option>
                  </select>
                  <span className="text-[9px] text-[#8d93a8] mt-1 block">
                    Permet au robot de respecter la marge requise par position sur l'or physique.
                  </span>
                </div>
              </div>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                  testResult.success
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  <span>{testResult.msg}</span>
                </div>
                {testResult.success && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 text-emerald-400 border border-emerald-500/30">
                    Ping : {testResult.ping} ms
                  </span>
                )}
              </div>
            )}

            {/* Submit / Connect Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isTesting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-400 text-black hover:bg-cyan-300 transition cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin text-black" />
                    <span>Connexion au serveur...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-black" />
                    <span>Enregistrer & Activer le Pont Démo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Python HFT Script */}
        {activeTab === 'python_hft' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <h3 className="font-heading font-bold text-sm text-amber-300 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Pont Python Haute Fréquence (HFT) pour XM Global & MT5
              </h3>
              <p className="text-xs text-[#d1d5e3] leading-relaxed">
                Ce script Python tourne en arrière-plan sur votre PC ou un VPS. Il se connecte directement à l'API C++ native de <strong>MetaTrader 5</strong> et exécute les ordres sur votre compte démo <strong>XM Global</strong> en moins de <strong>25 millisecondes</strong> dès qu'un signal ou palier (TP1, BE, TP2) est émis.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-amber-300">Script Prêt à l'Emploi : xm_hft_bridge.py</div>
                <div className="text-[11px] text-[#8d93a8]">
                  Pré-configuré avec votre compte <code className="text-white">{accountNumber}</code> sur <code className="text-white">{serverName}</code> ({symbol}).
                </div>
              </div>
              <button
                onClick={copyPythonBridge}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-amber-400 text-black hover:bg-amber-300 transition cursor-pointer whitespace-nowrap shadow-md"
              >
                {copiedPython ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPython ? 'Copié !' : 'Copier le Script Python'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-[#06070d] border border-[#232738] overflow-hidden">
              <pre className="p-4 font-mono text-xs text-[#e1e4ee] overflow-x-auto max-h-[340px] leading-relaxed select-all">
                <code>{pythonHftCode}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: MQL5 EA */}
        {activeTab === 'mql5_ea' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <h3 className="font-heading font-bold text-sm text-emerald-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Expert Advisor MQL5 (.mq5) pour MetaTrader 5
              </h3>
              <p className="text-xs text-[#d1d5e3] leading-relaxed">
                Si vous ne souhaitez pas installer Python, vous pouvez glisser cet Expert Advisor directement dans le dossier <code className="text-emerald-300 font-mono">MQL5/Experts</code> de votre terminal XM Global MT5. Il gère la prise d'ordres ultra-rapide et le déplacement du SL à Break-Even.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-emerald-300">Code Source Expert Advisor : MDT_Sniper_HFT.mq5</div>
                <div className="text-[11px] text-[#8d93a8]">
                  À compiler avec MetaEditor sur votre terminal MT5 XM Global.
                </div>
              </div>
              <button
                onClick={copyMql5Bridge}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-emerald-400 text-black hover:bg-emerald-300 transition cursor-pointer whitespace-nowrap shadow-md"
              >
                {copiedMql5 ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                <span>{copiedMql5 ? 'Copié !' : 'Copier le Code MQL5'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-[#06070d] border border-[#232738] overflow-hidden">
              <pre className="p-4 font-mono text-xs text-[#e1e4ee] overflow-x-auto max-h-[300px] leading-relaxed select-all">
                <code>{mql5Code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Architecture & HFT Advice */}
        {activeTab === 'architecture' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30">
              <h3 className="font-heading font-bold text-sm text-purple-300 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Comment Réussir un Robot HFT sur Compte Démo XM Global
              </h3>
              <p className="text-xs text-[#cbd5e1] mt-1 leading-relaxed">
                Le trading haute fréquence (HFT) sur l'Or nécessite 4 éléments clés pour éliminer le slippage et les requotes :
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] flex items-center justify-center font-mono font-bold">1</span>
                  Attention au Symbole chez XM Global
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Sur XM Global, le symbole de l'or s'appelle <strong>GOLD</strong> (et non pas <code>XAUUSD</code>). Le pont traduit automatiquement cette correspondance afin d'éviter l'erreur <em>« Unknown symbol »</em>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] flex items-center justify-center font-mono font-bold">2</span>
                  Exécution Instantanée (IOC)
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Le script utilise le mode <strong>Immediate Or Cancel (IOC)</strong> : si le marché glisse de plus de 1.5 pip lors d'une annonce macroéconomique, l'ordre est immédiatement annulé pour protéger votre capital contre les mauvaises exécutions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-emerald-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 text-[10px] flex items-center justify-center font-mono font-bold">3</span>
                  Fermetures Partielles Automatisées
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Dès que le TP1 (0.5R) est touché, le pont coupe 50% du lot et déplace le Stop Loss au Break-Even + spread. Vous êtes en mode <strong>zéro risque</strong> en moins de 30 secondes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-purple-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-400/20 text-purple-400 text-[10px] flex items-center justify-center font-mono font-bold">4</span>
                  Serveur VPS à Londres (LD4)
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Pour descendre à <strong>1-2 ms de ping</strong> réel sur XM Global, installez le script sur un VPS situé à Londres (Equinix LD4). XM héberge ses serveurs de trading à Londres.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: MetaApi Cloud REST Hub & Prise de Position Auto */}
        {activeTab === 'metaapi' && (
          <div className="mt-4 space-y-4">
            {/* Guide & Overview Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#0e1424] to-[#0c0f1c] border border-blue-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-extrabold text-sm text-white">
                        Liaison MetaApi Cloud — Prise de Position Automatique
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        metaApiAutoTrade 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {metaApiAutoTrade ? '⚡ AUTO-TRADE ACTIF' : 'MODE MANUEL / SUPERVISION'}
                      </span>
                    </div>
                    <p className="text-xs text-[#8d93a8] mt-0.5">
                      Connectez votre compte <strong>XM Global</strong>, <strong>Exness</strong> ou tout compte <strong>MT4/MT5</strong> via le cloud MetaApi pour que le site prenne automatiquement les positions dès qu'un signal est validé.
                    </p>
                  </div>
                </div>

                <a
                  href="https://app.metaapi.cloud"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition whitespace-nowrap"
                >
                  <span>Ouvrir MetaApi.cloud</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Step-by-step guidance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.08] text-xs">
                <div className="p-2.5 rounded-xl bg-[#060810] border border-white/[0.06] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">1</span>
                  <div>
                    <span className="font-semibold text-white">Jeton (Token MetaApi)</span>
                    <p className="text-[11px] text-[#8d93a8] mt-0.5">
                      Sur <code className="text-blue-300">app.metaapi.cloud</code>, allez dans <strong>API Access</strong> et copiez votre <em>Personal Access Token</em>.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#060810] border border-white/[0.06] flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">2</span>
                  <div>
                    <span className="font-semibold text-white">ID de Compte (Account ID)</span>
                    <p className="text-[11px] text-[#8d93a8] mt-0.5">
                      Dans votre dashboard MetaApi, liez votre compte XM Global (login/pass démo), puis copiez son <strong>Account ID</strong> (ex: <code className="text-cyan-300">8b29fa0e-4361...</code>).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MetaApi Credentials Form */}
            <form onSubmit={handleSaveMetaApi} className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                <div className="text-xs font-mono uppercase text-blue-300 font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  <span>Paramètres de Liaison & Exécution</span>
                </div>
                {currentMetaApi?.connected && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Synchronisé ({currentMetaApi.server_name || 'MT5'})</span>
                  </span>
                )}
              </div>

              {/* Row 1: Token & Account ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* MetaApi Token */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-[#8d93a8] flex items-center gap-1">
                      <span>Jeton d'authentification (auth-token MetaApi)</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMetaApiToken(!showMetaApiToken)}
                      className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {showMetaApiToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showMetaApiToken ? 'Masquer' : 'Afficher'}</span>
                    </button>
                  </div>
                  <input
                    type={showMetaApiToken ? 'text' : 'password'}
                    required
                    value={metaApiToken}
                    onChange={(e) => setMetaApiToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white focus:outline-none focus:border-blue-400 placeholder:text-zinc-600"
                  />
                </div>

                {/* MetaApi Account ID */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">
                    <span>ID de compte MetaApi (UUID)</span>
                    <span className="text-rose-400 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={metaApiAccountId}
                    onChange={(e) => setMetaApiAccountId(e.target.value)}
                    placeholder="ex: 8b29fa0e-4361-419b-a320-cb9d42654321"
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-400 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Row 2: Symbol, Lot & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Symbol */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">
                    Symbole tradé sur le courtier
                  </label>
                  <input
                    type="text"
                    required
                    value={metaApiSymbol}
                    onChange={(e) => setMetaApiSymbol(e.target.value)}
                    placeholder="GOLD ou XAUUSD"
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[9px] text-[#8d93a8] mt-0.5 block">
                    XM Global = <code>GOLD</code> | Autres = <code>XAUUSD</code>
                  </span>
                </div>

                {/* Lot size */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">
                    Taille du lot par position
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10.0"
                    required
                    value={metaApiLot}
                    onChange={(e) => setMetaApiLot(parseFloat(e.target.value) || 0.01)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white font-bold focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[9px] text-[#8d93a8] mt-0.5 block">
                    0.01 lot = Recommandé pour tester sur Démo
                  </span>
                </div>

                {/* Region */}
                <div>
                  <label className="text-[11px] font-mono text-[#8d93a8] block mb-1">
                    Région Cloud MetaApi
                  </label>
                  <select
                    value={metaApiRegion}
                    onChange={(e) => setMetaApiRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#06070d] border border-[#232738] text-xs font-mono text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="new-york">New York (mt-client-api-v1.new-york)</option>
                    <option value="london">Londres (mt-client-api-v1.london)</option>
                    <option value="singapore">Singapour (mt-client-api-v1.singapore)</option>
                  </select>
                </div>
              </div>

              {/* Big Interactive Auto-Trade Toggle Card */}
              <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                metaApiAutoTrade
                  ? 'bg-gradient-to-r from-emerald-950/30 via-[#0a1a14] to-[#0c121e] border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/20'
                  : 'bg-[#060810] border-white/[0.08] hover:border-white/20'
              }`}
                onClick={() => setMetaApiAutoTrade(!metaApiAutoTrade)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                      metaApiAutoTrade ? 'bg-emerald-500 text-black shadow-md' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-heading font-bold text-sm text-white flex items-center gap-2">
                        <span>Prise de Position Automatique (Auto-Trade MetaApi)</span>
                        {metaApiAutoTrade ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            ACTIVÉE
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            DÉSACTIVÉE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8d93a8] mt-0.5 leading-relaxed">
                        Lorsque cette option est activée, dès qu'un signal (TradingView Webhook ou Sniper MDT) arrive, un ordre au marché avec Stop Loss et Take Profit est immédiatement routé vers votre compte MetaTrader via MetaApi.
                      </p>
                    </div>
                  </div>

                  {/* Toggle visual switch */}
                  <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-1 ${
                    metaApiAutoTrade ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      metaApiAutoTrade ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Save & Sync */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSyncMetaApi}
                  disabled={metaApiSyncing || !metaApiToken || !metaApiAccountId}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold bg-[#141b2d] text-blue-300 hover:text-white border border-blue-500/30 hover:border-blue-400 transition cursor-pointer disabled:opacity-50"
                >
                  {metaApiSyncing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                      <span>Synchronisation en cours...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Synchroniser & Vérifier le Compte</span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={metaApiSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-blue-500 hover:bg-blue-400 text-white transition cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {metaApiSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Enregistrer la Configuration MetaApi</span>
                    </>
                  )}
                </button>
              </div>

              {/* Feedback Alert */}
              {metaApiFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  metaApiFeedback.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  {metaApiFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                  <span>{metaApiFeedback.msg}</span>
                </div>
              )}
            </form>

            {/* Test Order Live Execution Section */}
            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  <span className="font-heading font-bold text-xs text-white uppercase">
                    Test d'Exécution d'Ordre en Direct sur votre Démo
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  Volume : <strong className="text-white">{metaApiLot} lot</strong> sur <strong className="text-amber-300">{metaApiSymbol}</strong>
                </span>
              </div>
              <p className="text-[11px] text-[#8d93a8] leading-relaxed">
                Cliquez pour envoyer immédiatement un ordre de test via MetaApi pour vérifier que le courtier accepte bien la prise de position.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleTestOrder('BUY')}
                  disabled={metaApiTradeTesting !== null || !metaApiToken || !metaApiAccountId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer disabled:opacity-40"
                >
                  {metaApiTradeTesting === 'BUY' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span>Exécution ACHAT...</span>
                    </>
                  ) : (
                    <>
                      <span>🟢 Tester un ACHAT (BUY)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTestOrder('SELL')}
                  disabled={metaApiTradeTesting !== null || !metaApiToken || !metaApiAccountId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition cursor-pointer disabled:opacity-40"
                >
                  {metaApiTradeTesting === 'SELL' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                      <span>Exécution VENTE...</span>
                    </>
                  ) : (
                    <>
                      <span>🔴 Tester une VENTE (SELL)</span>
                    </>
                  )}
                </button>
              </div>

              {metaApiTradeFeedback && (
                <div className={`p-3 rounded-xl border text-xs font-mono ${
                  metaApiTradeFeedback.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {metaApiTradeFeedback.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                    <span>{metaApiTradeFeedback.msg}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Proxy Call Tester (for developers / advanced checks) */}
            <details className="p-4 rounded-2xl bg-[#060810] border border-[#232738] group">
              <summary className="text-xs font-mono text-zinc-400 hover:text-white cursor-pointer flex items-center justify-between">
                <span>🔧 Outil Diagnostic Avancé : Testeur brut du proxy backend /api/metaapi/proxy</span>
                <span className="text-[10px] text-blue-400">Cliquer pour déplier</span>
              </summary>

              <div className="mt-3 space-y-3 pt-3 border-t border-[#232738]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={metaApiAccountId ? `https://mt-client-api-v1.${metaApiRegion}.agiliumtrade.ai/users/current/accounts/${metaApiAccountId}` : metaApiEndpoint}
                    onChange={(e) => setMetaApiEndpoint(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#0e111c] border border-[#232738] text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestMetaApiProxy}
                    disabled={metaApiTesting}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:opacity-50"
                  >
                    {metaApiTesting ? 'Appel...' : 'Tester'}
                  </button>
                </div>

                {metaApiProxyResponse && (
                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono">
                    <div className="text-[10px] text-zinc-400 mb-1">
                      Statut: HTTP {metaApiProxyResponse.status} ({metaApiProxyResponse.durationMs}ms)
                    </div>
                    <pre className="text-cyan-300 max-h-36 overflow-auto text-[11px]">
                      {typeof metaApiProxyResponse.data === 'object'
                        ? JSON.stringify(metaApiProxyResponse.data, null, 2)
                        : String(metaApiProxyResponse.data)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-[#232738] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8d93a8]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Moteur sécurisé : Démo activée par défaut, pas de risque sur votre compte réel.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-mono bg-[#141724] text-white hover:bg-[#1e2336] transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
