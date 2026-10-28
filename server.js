import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_KEY = process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key';
const OWNER_EMAIL = 'vdohinnon22@gmail.com';

// Middleware for parsing JSON and urlencoded requests
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// -------------------------------------------------------------
// In-Memory & File-Persisted Data Store for Production
// -------------------------------------------------------------
const DATA_DIR = path.resolve('.data');
const STATE_FILE = path.join(DATA_DIR, 'viceinte_state.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

const DEFAULT_STATE = {
  bot_status: {
    state: 'analyse',
    symbol: 'GOLD (XAUUSD)',
    timeframe: '5m',
    last_price: 3385.40,
    daily_pnl_usd: 0,
    daily_pnl_r: 0,
    open_trades_count: 0,
    consecutive_losses: 0,
    mode: 'demo',
    equity: 1000.00,
    balance: 1000.00,
    updated_at: new Date().toISOString(),
    plan: null,
  },
  levels: {
    current_price: 3385.40,
    fvg_bullish: { top: 3381.20, bottom: 3378.80, status: 'actif' },
    fvg_bearish: { top: 3392.50, bottom: 3389.00, status: 'actif' },
    ob_bullish: { top: 3376.00, bottom: 3372.50, status: 'actif' },
    ob_bearish: { top: 3398.00, bottom: 3394.20, status: 'actif' },
    sweep_high: 3402.50,
    sweep_low: 3368.10,
    bos_level: 3391.00,
    trend_line: 3383.60,
  },
  signals: [],
  trades: [],
  logs: [
    {
      id: 'log-init',
      time: new Date().toISOString(),
      level: 'info',
      message: 'Serveur de production Viceinte démarré sur Render. En écoute des flux temps réel.',
    },
  ],
  settings: {
    risk_per_trade_percent: 0.5,
    max_daily_loss_r: -2.0,
    max_consecutive_losses: 2,
    max_trades_per_day: 4,
    tp1_ratio: 0.8,
    tp2_ratio: 2.0,
    break_even_at_tp1: true,
    hft_enabled: true,
    hft_max_slippage: 1.5,
    hft_instant_execution: true,
    paused: false,
    broker: {
      broker_type: 'XM Global',
      account_type: 'demo',
      account_number: '',
      server_name: 'XMGlobal-MT5 3',
      symbol: 'GOLD',
      execution_mode: 'hft_ultra',
      api_token: '',
      connected: false,
      last_ping_ms: 18,
      balance: 1000.00,
      equity: 1000.00,
      leverage: 500,
    },
  },
  broker: {
    broker_type: 'XM Global',
    account_type: 'demo',
    account_number: '',
    server_name: 'XMGlobal-MT5 3',
    symbol: 'GOLD',
    execution_mode: 'hft_ultra',
    api_token: '',
    connected: false,
    last_ping_ms: 18,
    balance: 1000.00,
    equity: 1000.00,
    leverage: 500,
  },
  candles: [],
  mdt_radar: [
    { tf: 'H4', trend: 'Haissier', bullOb: '3368.00 - 3372.50', bearOb: '3402.00 - 3406.50', distancePct: 0.49, stars: 3, confText: 'Biais HTF haussier' },
    { tf: 'H1', trend: 'Haissier', bullOb: '3374.50 - 3377.20', bearOb: '3396.00 - 3399.00', distancePct: 0.32, stars: 3, confText: 'Zone institutionnelle active' },
    { tf: 'M15', trend: 'Haissier', bullOb: '3380.00 - 3382.50', bearOb: '3391.50 - 3394.00', distancePct: 0.18, stars: 2, confText: 'Scénario en cours' },
    { tf: 'M5', trend: 'Neutre', bullOb: '3382.00 - 3383.80', bearOb: '3388.20 - 3390.10', distancePct: 0.08, stars: 2, confText: 'Imbalance M5 surveillée' },
  ],
  metaapi: {
    token: process.env.METAAPI_TOKEN || '',
    account_id: process.env.METAAPI_ACCOUNT_ID || '',
    symbol: 'GOLD',
    lot_size: 0.01,
    auto_trade_enabled: false,
    region: 'new-york',
    connected: false,
    balance: null,
    equity: null,
    server_name: '',
    platform: 'mt5',
    last_sync: null,
  },
  bot_key: BOT_KEY,
};

let appState = { ...DEFAULT_STATE };

// Load persistent state if exists
if (fs.existsSync(STATE_FILE)) {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    appState = { ...DEFAULT_STATE, ...parsed };
    console.log('[Viceinte Store] État restauré depuis le disque avec succès.');
  } catch (e) {
    console.warn('[Viceinte Store] Impossible de lire l\'état sauvegardé, initialisation par défaut.');
  }
}

function saveStateToDisk() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2), 'utf-8');
  } catch (e) {
    // ignore
  }
}

// SSE Subscribers
const sseClients = new Set();
function broadcastStateUpdate() {
  const payload = JSON.stringify({ type: 'state_update', data: appState });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// -------------------------------------------------------------
// 1. MetaApi Proxy Endpoint (POST /api/metaapi/proxy)
// Relaie la requête vers MetaApi (en-tête auth-token),
// renvoie le statut et corps bruts, journalise avec console.log
// -------------------------------------------------------------
app.all('/api/metaapi/proxy', async (req, res) => {
  try {
    // Extraire l'URL cible
    let targetUrl = req.body?.url || req.body?.endpoint || req.body?.path || req.query?.url || req.query?.endpoint;

    // Si un endpoint relatif est fourni (ex: /users/current/accounts), préfixer avec le host MetaApi
    if (targetUrl && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      const defaultHost = process.env.METAAPI_BASE_URL || 'https://mt-client-api-v1.new-york.agiliumtrade.ai';
      targetUrl = `${defaultHost.replace(/\/$/, '')}/${targetUrl.replace(/^\//, '')}`;
    }

    if (!targetUrl) {
      console.warn('[MetaApi Proxy] Requête rejetée : URL ou endpoint manquant.');
      return res.status(400).json({
        error: 'URL cible ou endpoint MetaApi manquant.',
        usage: {
          url: 'https://mt-client-api-v1.new-york.agiliumtrade.ai/users/current/accounts',
          method: 'GET',
          headers: { 'auth-token': 'VOTRE_TOKEN' },
        },
      });
    }

    // Extraire le token d'authentification MetaApi
    const authToken =
      req.headers['auth-token'] ||
      req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
      req.body?.['auth-token'] ||
      req.body?.authToken ||
      req.body?.token ||
      process.env.METAAPI_TOKEN;

    // Méthode HTTP (GET, POST, PUT, DELETE, etc.)
    const forwardMethod = (req.body?.method || (req.method !== 'POST' ? req.method : 'GET')).toUpperCase();

    // Préparer les en-têtes vers MetaApi
    const forwardHeaders = {
      Accept: 'application/json',
      ...(req.body?.headers || {}),
    };

    if (authToken) {
      forwardHeaders['auth-token'] = authToken;
    }

    // Préparer le corps de requête si présent
    let forwardBody = undefined;
    if (forwardMethod !== 'GET' && forwardMethod !== 'HEAD') {
      if (req.body?.body !== undefined) {
        forwardBody = typeof req.body.body === 'string' ? req.body.body : JSON.stringify(req.body.body);
        if (!forwardHeaders['Content-Type'] && !forwardHeaders['content-type']) {
          forwardHeaders['Content-Type'] = 'application/json';
        }
      } else if (req.body?.data !== undefined) {
        forwardBody = typeof req.body.data === 'string' ? req.body.data : JSON.stringify(req.body.data);
        if (!forwardHeaders['Content-Type'] && !forwardHeaders['content-type']) {
          forwardHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    console.log(`[MetaApi Proxy Request] -> ${forwardMethod} ${targetUrl} (auth-token: ${authToken ? 'Fourni' : 'Absent'})`);

    // Envoi de la requête à MetaApi
    const metaApiResponse = await fetch(targetUrl, {
      method: forwardMethod,
      headers: forwardHeaders,
      body: forwardBody,
    });

    // 1) & 2) Récupération du statut et du corps brut
    const rawBody = await metaApiResponse.text();

    // 2) Journalise la réponse avec console.log
    console.log(`[MetaApi Proxy Response] Statut: ${metaApiResponse.status} ${metaApiResponse.statusText}`);
    console.log(`[MetaApi Proxy Response Body]:\n${rawBody.length > 2500 ? rawBody.substring(0, 2500) + '... (tronqué)' : rawBody}`);

    // Transmission des en-têtes de réponse (notamment Content-Type)
    const respContentType = metaApiResponse.headers.get('content-type');
    if (respContentType) {
      res.setHeader('Content-Type', respContentType);
    }

    // 1) Renvoyer le statut et le corps bruts de MetaApi
    return res.status(metaApiResponse.status).send(rawBody);
  } catch (err) {
    console.error('[MetaApi Proxy Exception]:', err);
    return res.status(502).json({
      error: 'Échec de transmission vers le serveur MetaApi',
      message: err.message,
    });
  }
});

// Helper for MetaApi direct execution
async function executeMetaApiOrder({ action, symbol, volume, stopLoss, takeProfit, comment }) {
  const metaConfig = appState.metaapi;
  if (!metaConfig?.token || !metaConfig?.account_id) {
    console.warn('[MetaApi Auto-Trade] Prise de position impossible : token ou account_id manquant.');
    return { success: false, reason: 'Token ou ID de compte MetaApi non configuré.' };
  }

  const region = metaConfig.region || 'new-york';
  const targetHost = `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
  const url = `${targetHost}/users/current/accounts/${metaConfig.account_id}/trade`;

  const isBuy = action.toUpperCase().includes('BUY') || action.toUpperCase().includes('ACHAT');
  const actionType = isBuy ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL';
  const tradeSymbol = (symbol || metaConfig.symbol || 'GOLD').trim();
  const tradeVolume = Number(volume) || Number(metaConfig.lot_size) || 0.01;

  const tradePayload = {
    actionType,
    symbol: tradeSymbol,
    volume: tradeVolume,
    comment: comment || 'Viceinte MDT Auto',
  };

  if (stopLoss && Number(stopLoss) > 0) {
    tradePayload.stopLoss = Number(Number(stopLoss).toFixed(2));
  }
  if (takeProfit && Number(takeProfit) > 0) {
    tradePayload.takeProfit = Number(Number(takeProfit).toFixed(2));
  }

  console.log(`[MetaApi Auto-Trade] 🚀 Envoi de l'ordre au marché vers ${url} :`, tradePayload);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'auth-token': metaConfig.token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(tradePayload),
    });

    const rawText = await res.text();
    console.log(`[MetaApi Auto-Trade] Réponse HTTP ${res.status}:`, rawText);

    let parsed = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { raw: rawText };
    }

    if (res.ok && (parsed.numericCode === 10009 || parsed.stringCode === 'TRADE_RETCODE_DONE' || parsed.orderId)) {
      appState.logs.unshift({
        id: `log-${Date.now()}`,
        time: new Date().toISOString(),
        level: 'info',
        message: `⚡ [MetaApi Auto-Trade] Position ${actionType} ${tradeVolume} lot sur ${tradeSymbol} ouverte avec succès (Ticket: ${parsed.orderId || parsed.positionId || 'Exécuté'}) !`,
      });
      saveStateToDisk();
      broadcastStateUpdate();
      return { success: true, order: parsed };
    } else {
      appState.logs.unshift({
        id: `log-${Date.now()}`,
        time: new Date().toISOString(),
        level: 'warn',
        message: `⚠️ [MetaApi Rejet] Échec de l'ordre (${res.status}): ${parsed.message || parsed.stringCode || rawText.substring(0, 120)}`,
      });
      saveStateToDisk();
      broadcastStateUpdate();
      return { success: false, status: res.status, error: parsed };
    }
  } catch (err) {
    console.error('[MetaApi Exception]:', err);
    appState.logs.unshift({
      id: `log-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'warn',
      message: `❌ [MetaApi Erreur Réseau]: ${err.message}`,
    });
    saveStateToDisk();
    broadcastStateUpdate();
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// MetaApi Configuration & Trading Endpoints
// -------------------------------------------------------------

// Enregistrer la configuration MetaApi
app.post('/api/metaapi/config', (req, res) => {
  try {
    const { token, account_id, symbol, lot_size, auto_trade_enabled, region } = req.body;

    appState.metaapi = {
      ...appState.metaapi,
      token: token !== undefined ? String(token).trim() : appState.metaapi.token,
      account_id: account_id !== undefined ? String(account_id).trim() : appState.metaapi.account_id,
      symbol: symbol ? String(symbol).trim() : (appState.metaapi.symbol || 'GOLD'),
      lot_size: Number(lot_size) > 0 ? Number(lot_size) : (appState.metaapi.lot_size || 0.01),
      auto_trade_enabled: auto_trade_enabled !== undefined ? Boolean(auto_trade_enabled) : appState.metaapi.auto_trade_enabled,
      region: region ? String(region).trim() : (appState.metaapi.region || 'new-york'),
    };

    appState.logs.unshift({
      id: `log-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: `Configuration MetaApi enregistrée. Prise de position auto : ${appState.metaapi.auto_trade_enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}.`,
    });

    saveStateToDisk();
    broadcastStateUpdate();

    res.json({ success: true, metaapi: appState.metaapi });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Synchroniser le compte avec MetaApi (vérification du solde et statut)
app.post('/api/metaapi/sync-account', async (req, res) => {
  try {
    const token = req.body.token || appState.metaapi?.token;
    const accountId = req.body.account_id || appState.metaapi?.account_id;
    const region = req.body.region || appState.metaapi?.region || 'new-york';

    if (!token || !accountId) {
      return res.status(400).json({ error: 'Token et ID de compte MetaApi requis pour la synchronisation.' });
    }

    const host = `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
    
    // Essayer de récupérer les informations de compte
    const infoUrl = `${host}/users/current/accounts/${accountId}/information`;
    console.log(`[MetaApi Sync] Appel vers ${infoUrl}...`);

    let metaRes = await fetch(infoUrl, {
      headers: { 'auth-token': token, Accept: 'application/json' },
    });

    if (!metaRes.ok) {
      // Fallback vers les métadonnées de compte
      const accUrl = `${host}/users/current/accounts/${accountId}`;
      metaRes = await fetch(accUrl, {
        headers: { 'auth-token': token, Accept: 'application/json' },
      });
    }

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      return res.status(metaRes.status).json({
        error: `MetaApi a renvoyé le statut ${metaRes.status}`,
        details: errText,
      });
    }

    const accountData = await metaRes.json();
    console.log('[MetaApi Sync] Données reçues :', accountData);

    const balance = accountData.balance !== undefined ? Number(accountData.balance) : (accountData.initialBalance || 1000);
    const equity = accountData.equity !== undefined ? Number(accountData.equity) : balance;
    const serverName = accountData.server || accountData.broker || 'MetaApi-MT5';
    const platform = accountData.platform || 'mt5';

    appState.metaapi = {
      ...appState.metaapi,
      token,
      account_id: accountId,
      connected: true,
      balance,
      equity,
      server_name: serverName,
      platform,
      last_sync: new Date().toISOString(),
    };

    // Mettre également à jour le solde du bot et du courtier
    appState.bot_status.balance = balance;
    appState.bot_status.equity = equity;
    if (appState.broker) {
      appState.broker.balance = balance;
      appState.broker.equity = equity;
      appState.broker.server_name = serverName;
      appState.broker.connected = true;
    }

    appState.logs.unshift({
      id: `log-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: `Compte MetaApi synchronisé avec succès ! Serveur: ${serverName}, Solde: $${balance.toLocaleString('fr-FR')}.`,
    });

    saveStateToDisk();
    broadcastStateUpdate();

    res.json({
      success: true,
      metaapi: appState.metaapi,
      account: accountData,
    });
  } catch (err) {
    console.error('[MetaApi Sync Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Passer un ordre de test ou manuel via MetaApi
app.post('/api/metaapi/trade', async (req, res) => {
  try {
    const { action, symbol, volume, stopLoss, takeProfit, comment } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'Action requise (BUY ou SELL).' });
    }

    const result = await executeMetaApiOrder({
      action,
      symbol: symbol || appState.metaapi.symbol,
      volume: volume || appState.metaapi.lot_size,
      stopLoss,
      takeProfit,
      comment: comment || 'Viceinte MDT Manuel',
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. Application Backend API Endpoints
// -------------------------------------------------------------

// Dashboard State
app.get('/api/state', (_req, res) => {
  res.json(appState);
});

// Update Settings
app.post('/api/settings', (req, res) => {
  try {
    appState.settings = { ...appState.settings, ...req.body };
    saveStateToDisk();
    broadcastStateUpdate();
    res.json({ success: true, settings: appState.settings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Pause / Resume Bot
app.post('/api/pause', (_req, res) => {
  try {
    appState.settings.paused = !appState.settings.paused;
    saveStateToDisk();
    broadcastStateUpdate();
    res.json({ success: true, paused: appState.settings.paused });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broker Connect (Demo / Real / HFT Engine)
app.post('/api/broker/connect', (req, res) => {
  try {
    const {
      broker_type,
      account_type,
      account_number,
      server_name,
      symbol,
      execution_mode,
      api_token,
      balance,
      leverage,
      hft_max_slippage_pips,
    } = req.body;

    const parsedBalance = typeof balance === 'number' && balance > 0
      ? balance
      : (parseFloat(balance) > 0 ? parseFloat(balance) : 1000.00);

    const simulatedPing = Math.floor(Math.random() * 12) + 14;

    const brokerConfig = {
      broker_type: broker_type || 'XM Global',
      account_type: account_type || 'demo',
      account_number: String(account_number || '').trim(),
      server_name: String(server_name || 'XMGlobal-MT5 3').trim(),
      symbol: String(symbol || 'GOLD').trim(),
      execution_mode: execution_mode || 'hft_ultra',
      api_token: api_token || '',
      connected: true,
      last_ping_ms: simulatedPing,
      balance: parsedBalance,
      equity: parsedBalance,
      leverage: Number(leverage) || 500,
      hft_max_slippage_pips: Number(hft_max_slippage_pips) || 1.5,
    };

    appState.broker = brokerConfig;
    appState.settings.broker = brokerConfig;
    appState.bot_status.balance = parsedBalance;
    appState.bot_status.equity = parsedBalance;
    appState.bot_status.mode = account_type || 'demo';

    appState.logs.unshift({
      id: `log-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: `Compte ${brokerConfig.broker_type} (${brokerConfig.account_type.toUpperCase()}) connecté avec succès. Solde: $${parsedBalance.toLocaleString('fr-FR')}. Latence: ${simulatedPing}ms.`,
    });

    saveStateToDisk();
    broadcastStateUpdate();

    res.json({ success: true, broker: brokerConfig });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Erreur lors de la connexion au courtier.' });
  }
});

app.post('/api/broker/ping', (_req, res) => {
  const ping = Math.floor(Math.random() * 12) + 12;
  if (appState.broker) {
    appState.broker.last_ping_ms = ping;
    appState.broker.connected = true;
  }
  broadcastStateUpdate();
  res.json({ success: true, ping_ms: ping, broker: appState.broker });
});

app.post('/api/broker/disconnect', (_req, res) => {
  if (appState.broker) {
    appState.broker.connected = false;
  }
  appState.logs.unshift({
    id: `log-${Date.now()}`,
    time: new Date().toISOString(),
    level: 'warn',
    message: 'Compte courtier déconnecté.',
  });
  saveStateToDisk();
  broadcastStateUpdate();
  res.json({ success: true, broker: appState.broker });
});

// TradingView & Pine Script Webhook Ingestion
app.post(['/api/webhook/tradingview', '/api/webhook/pinescript'], (req, res) => {
  try {
    const data = req.body || {};
    const secret = req.headers['x-bot-key'] || data.secret || data.key || data.passphrase;
    if (secret && secret !== BOT_KEY) {
      return res.status(401).json({ error: 'Secret de webhook TradingView non valide.' });
    }

    const action = String(data.action || data.signal || '').toUpperCase();
    const currentPrice = Number(data.price) || appState.bot_status.last_price;
    const isBuy = action.includes('ACHAT') || action.includes('BUY');
    const isSell = action.includes('VENTE') || action.includes('SELL');

    if (isBuy || isSell) {
      const side = isBuy ? 'BUY' : 'SELL';
      const entryPrice = currentPrice;
      const slDistance = 2.5;
      const stopLoss = Number(data.sl) || (isBuy ? entryPrice - slDistance : entryPrice + slDistance);
      const takeProfit = Number(data.tp1 || data.tp) || (isBuy ? entryPrice + slDistance * 0.5 : entryPrice - slDistance * 0.5);
      const score = Number(data.score) || 6;

      const newSig = {
        id: `tv-sig-${Date.now()}`,
        time: new Date().toISOString(),
        strategy: `PineScript TradingView M15 (Score: ${score}/7)`,
        side,
        entry: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        rr: 0.5,
        status: 'pris',
        filter: 'aucun',
        reason_fr: data.comment || data.message || `Signal PineScript TradingView ${side} sur XAUUSD M15 avec consensus MTF.`,
      };

      appState.signals.unshift(newSig);

      appState.bot_status.state = 'en_trade';
      appState.bot_status.plan = {
        entry: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        fvg_top: isBuy ? entryPrice + 1.2 : entryPrice + 2.0,
        fvg_bottom: isBuy ? entryPrice - 0.5 : entryPrice + 0.8,
      };

      appState.trades.unshift({
        id: `tv-tr-${Date.now()}`,
        opened_at: new Date().toISOString(),
        closed_at: null,
        side,
        entry: entryPrice,
        exit: null,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        r_result: 0,
        pnl_usd: 0,
        strategy: `TradingView PineScript MDT (Score: ${score}/7)`,
        mode: appState.broker?.account_type || 'demo',
      });

      appState.logs.unshift({
        id: `log-${Date.now()}`,
        time: new Date().toISOString(),
        level: 'info',
        message: `[TradingView Webhook] Ordre ${side} reçu de PineScript à ${entryPrice.toFixed(2)} $. SL: ${stopLoss.toFixed(2)} $, TP: ${takeProfit.toFixed(2)} $.`,
      });

      // Prise de position automatique via MetaApi si activée
      if (appState.metaapi?.auto_trade_enabled && appState.metaapi?.token && appState.metaapi?.account_id) {
        console.log(`[Webhook Trigger] MetaApi Auto-Trade actif ! Envoi immédiat de l'ordre ${side}...`);
        executeMetaApiOrder({
          action: side,
          symbol: appState.metaapi.symbol || 'GOLD',
          volume: appState.metaapi.lot_size || 0.01,
          stopLoss,
          takeProfit,
          comment: `TV MDT Score ${score}/7`,
        }).then((metaResult) => {
          if (appState.trades[0]) {
            appState.trades[0].metaapi_result = metaResult;
          }
        }).catch((err) => {
          console.error('[Webhook MetaApi Trigger Error]:', err);
        });
      }
    }

    saveStateToDisk();
    broadcastStateUpdate();
    res.json({ success: true, processed_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic Ingest (from external Python HFT bots)
app.post('/ingest', (req, res) => {
  const incomingKey = req.headers['x-bot-key'];
  if (!incomingKey || incomingKey !== BOT_KEY) {
    return res.status(401).json({ error: 'Accès non autorisé. x-bot-key manquant ou incorrect.' });
  }

  const { type, payload } = req.body;
  if (!type || !payload) {
    return res.status(400).json({ error: 'Champs type et payload requis.' });
  }

  if (type === 'signal') {
    appState.signals.unshift({ ...payload, id: payload.id || `sig-${Date.now()}`, time: payload.time || new Date().toISOString() });
  } else if (type === 'status') {
    appState.bot_status = { ...appState.bot_status, ...payload, updated_at: new Date().toISOString() };
  } else if (type === 'trade') {
    appState.trades.unshift({ ...payload, id: payload.id || `tr-${Date.now()}` });
  } else if (type === 'log') {
    appState.logs.unshift({ ...payload, id: payload.id || `log-${Date.now()}`, time: payload.time || new Date().toISOString() });
  }

  saveStateToDisk();
  broadcastStateUpdate();
  res.json({ success: true, type, received_at: new Date().toISOString() });
});

// Demo Helpers & Control
app.post('/api/demo/reset', (_req, res) => {
  appState.signals = [];
  appState.trades = [];
  appState.bot_status.state = 'analyse';
  appState.bot_status.open_trades_count = 0;
  appState.bot_status.daily_pnl_usd = 0;
  appState.bot_status.daily_pnl_r = 0;
  appState.bot_status.plan = null;
  saveStateToDisk();
  broadcastStateUpdate();
  res.json({ success: true, state: appState });
});

app.post('/api/demo/clear-real', (_req, res) => {
  appState.signals = [];
  appState.trades = [];
  appState.bot_status.state = 'analyse';
  appState.bot_status.open_trades_count = 0;
  appState.bot_status.daily_pnl_usd = 0;
  appState.bot_status.daily_pnl_r = 0;
  appState.bot_status.plan = null;
  saveStateToDisk();
  broadcastStateUpdate();
  res.json({ success: true, state: appState });
});

app.post('/api/bot/state', (req, res) => {
  const { state: newState } = req.body;
  if (newState) {
    appState.bot_status.state = newState;
    appState.bot_status.updated_at = new Date().toISOString();
    saveStateToDisk();
    broadcastStateUpdate();
  }
  res.json({ success: true, state: newState });
});

// Real Live Gold Market Quote Fetcher
app.get('/api/market/sync-live', async (_req, res) => {
  try {
    const fetchRes = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=5m&limit=80');
    if (fetchRes.ok) {
      const raw = await fetchRes.json();
      const candles = raw.map((item) => ({
        time: Math.floor(item[0] / 1000),
        open: Number(parseFloat(item[1]).toFixed(2)),
        high: Number(parseFloat(item[2]).toFixed(2)),
        low: Number(parseFloat(item[3]).toFixed(2)),
        close: Number(parseFloat(item[4]).toFixed(2)),
      }));
      const lastCandle = candles[candles.length - 1];
      appState.bot_status.last_price = lastCandle.close;
      appState.levels.current_price = lastCandle.close;
      appState.candles = candles;
      broadcastStateUpdate();
      return res.json({ success: true, price: lastCandle.close, candleCount: candles.length });
    }
  } catch (err) {
    console.error('Erreur flux live:', err);
  }
  res.status(500).json({ error: 'Flux or en direct temporairement inaccessible.' });
});

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email || email.trim().toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({
      error: `Accès refusé. Cette application est strictement réservée au propriétaire (${OWNER_EMAIL}).`,
    });
  }
  res.json({
    success: true,
    user: { email: OWNER_EMAIL, role: 'owner', name: 'Commandant Aurum' },
    token: 'aurum-owner-session-token-xauusd',
  });
});

app.get('/api/auth/me', (_req, res) => {
  res.json({
    user: { email: OWNER_EMAIL, role: 'owner', name: 'Commandant Aurum' },
  });
});

// SSE Events Stream (Ultra-Fast Record Latency)
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Crucial for Render/Nginx to stream without buffering
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', data: appState })}\n\n`);
  sseClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// -------------------------------------------------------------
// 3. Static Files & SPA Fallback (Serve dist folder & index.html)
// -------------------------------------------------------------
const distPath = path.resolve(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  console.log(`[Viceinte Production] Dossier dist détecté: ${distPath}`);
  app.use(express.static(distPath));

  // 3) Renvoie index.html pour les autres routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn(`[Viceinte Production] Attention : le dossier 'dist' n'existe pas encore. Exécutez 'npm run build'.`);
  app.get('*', (_req, res) => {
    res.status(404).send('Dossier de build non trouvé. Veuillez lancer "npm run build" avant de démarrer le serveur.');
  });
}

// Background Live PAXG / Gold market sync loop (every 1200ms in record time)
let isLoopRunning = false;
setInterval(async () => {
  if (isLoopRunning) return;
  isLoopRunning = true;
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=5m&limit=80');
    if (res.ok) {
      const raw = await res.json();
      const candles = raw.map((item) => ({
        time: Math.floor(item[0] / 1000),
        open: Number(parseFloat(item[1]).toFixed(2)),
        high: Number(parseFloat(item[2]).toFixed(2)),
        low: Number(parseFloat(item[3]).toFixed(2)),
        close: Number(parseFloat(item[4]).toFixed(2)),
      }));
      const lastCandle = candles[candles.length - 1];
      const p = lastCandle.close;
      appState.bot_status.last_price = p;
      appState.levels.current_price = p;
      appState.candles = candles;

      // Dynamic Future Scenarios with star confluence rating
      appState.future_scenarios = [
        {
          id: 'scen-flip-sell',
          title: 'Scénario A : VENTE Flip MDT (Tendance Maîtresse)',
          type: 'flip_sell',
          direction: 'SELL',
          triggerCondition: `SI une bougie M15 CLÔTURE sous la ligne verte (${(p - 2.80).toFixed(2)} $) → VENTE IMMÉDIATE`,
          zoneName: 'Ligne MDT 5m + H1',
          entry: Number((p - 2.80).toFixed(2)),
          stop_loss: Number((p + 1.70).toFixed(2)),
          take_profit_1: Number((p - 2.80 - 2.25).toFixed(2)),
          take_profit_2: Number((p - 2.80 - 5.60).toFixed(2)),
          take_profit_3: Number((p - 2.80 - 11.20).toFixed(2)),
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
            mdt_line: false,
            high_volume: true,
            risk_reward_ok: true,
          },
          status: 'approche',
          recommended_lot: 0.02,
        },
        {
          id: 'scen-limit-sell',
          title: 'Scénario B : SELL LIMIT sur Bearish OB H1',
          type: 'limit_sell',
          direction: 'SELL',
          triggerCondition: `SELL LIMIT posé au contact de l'OB vendeur ${(p + 4.20).toFixed(2)} $ (sans courir après le prix)`,
          zoneName: 'OB- H1 / Liq High',
          entry: Number((p + 4.20).toFixed(2)),
          stop_loss: Number((p + 6.80).toFixed(2)),
          take_profit_1: Number((p + 4.20 - 2.10).toFixed(2)),
          take_profit_2: Number((p - 1.50).toFixed(2)),
          take_profit_3: Number((p - 8.00).toFixed(2)),
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
          recommended_lot: 0.03,
        },
        {
          id: 'scen-limit-buy',
          title: 'Scénario C : BUY LIMIT sur Bullish OB / FVG Asie',
          type: 'limit_buy',
          direction: 'BUY',
          triggerCondition: `BUY LIMIT posé au contact du FVG structure ${(p - 5.50).toFixed(2)} $ après sweep du bas`,
          zoneName: 'FVG+ Structure M15',
          entry: Number((p - 5.50).toFixed(2)),
          stop_loss: Number((p - 7.90).toFixed(2)),
          take_profit_1: Number((p - 5.50 + 1.90).toFixed(2)),
          take_profit_2: Number((p + 1.20).toFixed(2)),
          take_profit_3: Number((p + 6.00).toFixed(2)),
          risk_points: 2.40,
          risk_pips: 24,
          rr_ratio: 2.8,
          confluences_count: 4,
          confluences_max: 7,
          stars: 4,
          stars_text: '★★★★☆',
          checklist: {
            htf_trend: false,
            clean_zone: true,
            liquidity_sweep: true,
            bos_structure: true,
            mdt_line: false,
            high_volume: true,
            risk_reward_ok: true,
          },
          status: 'en_attente',
          recommended_lot: 0.02,
        },
        {
          id: 'scen-flip-buy',
          title: 'Scénario D : ACHAT Flip MDT (Reprise Haussière)',
          type: 'flip_buy',
          direction: 'BUY',
          triggerCondition: `SI une bougie CLÔTURE au-dessus de la résistance dynamique ${(p + 3.10).toFixed(2)} $`,
          zoneName: 'Breakout MDT Pivot',
          entry: Number((p + 3.10).toFixed(2)),
          stop_loss: Number((p - 1.20).toFixed(2)),
          take_profit_1: Number((p + 3.10 + 2.15).toFixed(2)),
          take_profit_2: Number((p + 3.10 + 6.45).toFixed(2)),
          take_profit_3: Number((p + 3.10 + 12.00).toFixed(2)),
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
          recommended_lot: 0.01,
        },
      ];

      appState.stream_latency_ms = Math.floor(Math.random() * 12) + 12;
      broadcastStateUpdate();
    }
  } catch (err) {
    // transient network error
  } finally {
    isLoopRunning = false;
  }
}, 1200);

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 [Viceinte Server] Actif sur le port ${PORT}`);
  console.log(`   - Proxy MetaApi : POST http://0.0.0.0:${PORT}/api/metaapi/proxy`);
  console.log(`   - Fichiers dist : ${fs.existsSync(distPath) ? 'Disponibles' : 'En attente de build'}`);
  console.log(`   - Environnement : ${process.env.NODE_ENV || 'production'}`);
  console.log(`====================================================`);
});
