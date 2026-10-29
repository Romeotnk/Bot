'use strict';
/**
 * Runner MDT Sniper Pro & HFT : lit les bougies MetaApi, fait tourner le moteur MDT
 * à chaque clôture de bougie, et envoie chaque signal au webhook de ton site.
 *
 * Variables d'environnement requises :
 * METAAPI_TOKEN       : Jeton API MetaApi Cloud
 * METAAPI_ACCOUNT_ID  : ID de compte MT5/MT4 MetaApi
 * WEBHOOK_URL         : URL webhook du site (ex: https://ton-app.onrender.com/api/webhook/tradingview)
 * WEBHOOK_SECRET      : aurum-prod-secret-xauusd-key
 * SYMBOL              : Symbole courtier (défaut: GOLD ou XAUUSD)
 * TIMEFRAME           : Unité de temps (1m pour HFT, 5m pour Intraday, 15m pour Sniper A+)
 * PROFILE             : 'HFT Micro-Scalper' | 'Starter' | 'Intraday Clean' | 'Sniper A+'
 */
import { MdtEngine } from './mdtEngine.js';

const {
  METAAPI_TOKEN = process.env.METAAPI_TOKEN || '',
  METAAPI_ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID || '',
  METAAPI_REGION = process.env.METAAPI_REGION || 'new-york',
  WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook/tradingview',
  WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'aurum-prod-secret-xauusd-key',
  SYMBOL = process.env.SYMBOL || 'GOLD',
  TIMEFRAME = process.env.TIMEFRAME || '1m',
  PROFILE = process.env.PROFILE || 'HFT Micro-Scalper',
} = process.env;

const TF_MS = {
  '1m': 60e3,
  '5m': 300e3,
  '15m': 900e3,
  '30m': 1800e3,
  '1h': 3600e3,
  '4h': 14400e3,
};

const ema = (values, len) => {
  if (!values || !values.length) return null;
  const k = 2 / (len + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
};

// Fetch historical candles via direct MetaApi REST API (zero extra npm dependency required)
async function getCandles(tf, limit = 100) {
  if (!METAAPI_TOKEN || !METAAPI_ACCOUNT_ID) {
    throw new Error('METAAPI_TOKEN ou METAAPI_ACCOUNT_ID manquant.');
  }
  const host = `https://mt-client-api-v1.${METAAPI_REGION}.agiliumtrade.ai`;
  const url = `${host}/users/current/accounts/${METAAPI_ACCOUNT_ID}/historical-market-data/symbols/${encodeURIComponent(SYMBOL)}/timeframes/${tf}/candles?limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      'auth-token': METAAPI_TOKEN,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  const raw = await res.json();
  const list = Array.isArray(raw) ? raw : (raw.candles || []);
  return list
    .map((x) => ({
      time: new Date(x.time),
      open: Number(x.open),
      high: Number(x.high),
      low: Number(x.low),
      close: Number(x.close),
      volume: Number(x.tickVolume ?? x.volume ?? 0),
    }))
    .sort((a, b) => a.time - b.time);
}

const closed = (tf) => (k) => k.time.getTime() + (TF_MS[tf] || 60e3) <= Date.now();

async function getHtf() {
  try {
    const [h1, h4] = await Promise.all([getCandles('1h', 250), getCandles('4h', 250)]);
    const c1 = h1.filter(closed('1h')).map((k) => k.close);
    const c4 = h4.filter(closed('4h')).map((k) => k.close);
    return {
      ema1: c1.length >= 20 ? ema(c1, Math.min(200, c1.length)) : null,
      ema2: c4.length >= 20 ? ema(c4, Math.min(200, c4.length)) : null,
    };
  } catch (err) {
    return { ema1: null, ema2: null };
  }
}

async function send(ev) {
  console.log('[MDT Runner] 🚀 Signal détecté :', ev.action, JSON.stringify({ ...ev, secret: '***' }));
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-key': WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        ...ev,
        secret: WEBHOOK_SECRET,
      }),
    });
    if (!res.ok) {
      console.error('[MDT Runner] Erreur transmission Webhook HTTP', res.status);
    } else {
      console.log('[MDT Runner] ✅ Signal transmis au serveur avec succès !');
    }
  } catch (err) {
    console.error('[MDT Runner] Échec réseau webhook :', err.message);
  }
}

async function main() {
  console.log(`[MDT Runner] Démarrage de la surveillance...`);
  console.log(`[MDT Runner] Symbole : ${SYMBOL} | Timeframe : ${TIMEFRAME} | Profil : ${PROFILE}`);

  const engine = new MdtEngine({
    secret: WEBHOOK_SECRET,
    symbol: SYMBOL,
    profile: PROFILE,
  });

  // Rejeu silencieux de l'historique
  let htf = await getHtf();
  const hist = (await getCandles(TIMEFRAME, 150)).filter(closed(TIMEFRAME));
  for (const k of hist) {
    engine.onCandle(k, htf);
  }
  engine.finishWarmup();

  let last = hist.length > 0 ? hist[hist.length - 1].time.getTime() : 0;
  console.log(`[MDT Runner] Prêt : ${hist.length} bougies ${TIMEFRAME} chargées. Surveillance active de ${SYMBOL}`);

  let busy = false;
  const pollIntervalMs = TIMEFRAME === '1m' ? 10000 : 20000;

  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const fresh = (await getCandles(TIMEFRAME, 5))
        .filter(closed(TIMEFRAME))
        .filter((k) => k.time.getTime() > last);

      if (!fresh.length) return;

      htf = await getHtf();
      for (const k of fresh) {
        last = k.time.getTime();
        console.log(`[MDT Runner] Nouvelle bougie clôturée à ${k.close} $ (${new Date(k.time).toLocaleTimeString()})`);
        const events = engine.onCandle(k, htf);
        for (const ev of events) {
          await send(ev);
        }
      }
    } catch (e) {
      console.error('[MDT Runner Erreur]', e.message);
    } finally {
      busy = false;
    }
  }, pollIntervalMs);
}

main().catch((e) => {
  console.error('[MDT Runner Arrêt critique]', e);
  process.exit(1);
});
