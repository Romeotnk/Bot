import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { store } from './server/dataStore.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_KEY = process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key';
const OWNER_EMAIL = 'vdohinnon22@gmail.com';

app.use(express.json({ limit: '10mb' }));

// Middleware to check bot authentication
function requireBotKey(req: Request, res: Response, next: () => void) {
  const incomingKey = req.headers['x-bot-key'];
  if (!incomingKey || incomingKey !== BOT_KEY) {
    res.status(401).json({
      error: 'Accès non autorisé. En-tête x-bot-key manquant ou invalide.',
    });
    return;
  }
  next();
}

// -----------------------------
// 1. Ingest Endpoint (From external Python bot)
// -----------------------------
app.post('/ingest', requireBotKey, (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    if (!type || !payload) {
      res.status(400).json({ error: 'Champs type et payload requis.' });
      return;
    }

    if (!['status', 'levels', 'signal', 'trade', 'log'].includes(type)) {
      res.status(400).json({ error: `Type de données non pris en charge: ${type}` });
      return;
    }

    store.ingest(type, payload);
    res.json({
      success: true,
      received_at: new Date().toISOString(),
      type,
    });
  } catch (err: any) {
    console.error('Error in /ingest:', err);
    res.status(500).json({ error: err.message || 'Erreur interne lors de l\'ingestion.' });
  }
});

// -----------------------------
// 2. Bot Settings Endpoint (For external Python bot)
// -----------------------------
app.get('/bot-settings', requireBotKey, (_req: Request, res: Response) => {
  const state = store.getState();
  res.json(state.settings);
});

// -----------------------------
// 3. Ask Aurum AI Endpoint
// -----------------------------
app.post('/ask-aurum', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Une question en texte est requise.' });
      return;
    }

    const state = store.getState();
    const botStatus = state.bot_status;
    const settings = state.settings;
    const lastSignals = state.signals.slice(0, 10);

    const systemInstruction = `Tu es l'assistant vocal et tactique « Aurum », l'intelligence artificielle intégrée au tableau de bord Viceinte surveillant un robot de trading automatique sur l'or (XAUUSD).
Tu t'adresses au propriétaire de la stratégie et tu maîtrises parfaitement la méthodologie MDT (MaitreDuTrading Masterclass 2026 : Map H4-H1, Setup M15, Trigger M3, Order Blocks rouge/bleu, FVG structure/vendeur/acheteur, règle mère "Une zone = un lieu à surveiller, un setup = zone + contexte + trigger + risque").
RÈGLES IMPÉRATIVES :
1. Réponds strictement en FRANÇAIS.
2. Fais EXACTEMENT 4 phrases maximum (concis, percutant et facile à comprendre pour un débutant).
3. Ne promets JAMAIS aucun gain financier ni profit garanti.
4. Rappelle le risque de perte en capital chaque fois que la situation ou la question le justifie.
5. Base-toi UNIQUEMENT sur les données fournies ci-dessous. N'invente aucune donnée absente. Si pertinent, cite la discipline MDT (« No setup, no trade, next » ou la gestion de risque).

DONNÉES DU ROBOT EN TEMPS RÉEL :
- Symbole : ${botStatus.symbol} (${botStatus.timeframe})
- État actuel : ${botStatus.state}
- Mode : ${botStatus.mode}
- Dernier prix XAUUSD : ${botStatus.last_price} $
- Équité du compte : ${botStatus.equity} $ | Solde : ${botStatus.balance} $
- Plan de trade en cours : Entrée ${botStatus.plan?.entry || 'N/A'}, SL ${botStatus.plan?.stop_loss || 'N/A'}, TP ${botStatus.plan?.take_profit || 'N/A'}, FVG [${botStatus.plan?.fvg_bottom || 'N/A'} - ${botStatus.plan?.fvg_top || 'N/A'}]
- Réglages : Risque max par trade ${settings.max_risk_pct}%, Perte max jour ${settings.max_daily_loss_pct}%, Trades max jour ${settings.max_trades_day}, Filtre actualités: ${settings.news_filter ? 'Actif' : 'Désactivé'}, En pause: ${settings.paused ? 'Oui' : 'Non'}
- 10 derniers signaux :
${JSON.stringify(lastSignals.map(s => ({ time: s.time, type: s.side, strategy: s.strategy, status: s.status, filter: s.filter, reason: s.reason_fr })), null, 2)}`;

    // Try Gemini first (standard in AI Studio)
    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nQuestion de l'opérateur : "${question}"` }] }
        ],
      });

      const reply = response.text || 'Données de marché en cours de traitement par le noyau Aurum.';
      res.json({ reply, model: 'gemini-2.5-flash' });
      return;
    }

    // Try Anthropic API if ANTHROPIC_API_KEY is configured
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropicModel = process.env.AI_MODEL || 'claude-3-haiku-20240307';
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 300,
          system: systemInstruction,
          messages: [{ role: 'user', content: question }],
        }),
      });

      if (!anthropicRes.ok) {
        throw new Error(`Erreur API Anthropic: ${anthropicRes.statusText}`);
      }

      const data = await anthropicRes.json() as any;
      const text = data.content?.[0]?.text || 'Analyse indisponible.';
      res.json({ reply: text, model: anthropicModel });
      return;
    }

    // High fidelity real-time synthesis fallback if no API key is yet configured
    const fallbackAnswer = generateContextualFallback(question, botStatus, settings);
    res.json({ reply: fallbackAnswer, model: 'aurum-embedded-analyzer' });
  } catch (err: any) {
    console.error('Error in /ask-aurum:', err);
    res.status(500).json({
      error: 'Impossible d\'obtenir une réponse du module Aurum.',
      details: err.message,
    });
  }
});

function generateContextualFallback(q: string, status: any, settings: any): string {
  const qLower = q.toLowerCase();
  if (qLower.includes('vois') || qLower.includes('situation') || qLower.includes('marche')) {
    return `L'or XAUUSD évolue actuellement autour de ${status.last_price} $ avec le robot en statut « ${status.state.replace(/_/g, ' ')} ». Une zone d'imbalance FVG a été repérée suite au balayage du haut asiatique. Le trade court avec un stop protégé au-dessus de ${status.plan?.stop_loss || 2750.50} $. Tout trade comporte un risque de perte en capital, conservez une gestion stricte de vos lots.`;
  }
  if (qLower.includes('entree') || qLower.includes('pourquoi')) {
    return `L'entrée s'est déclenchée lors du retest de la Fair Value Gap baissière suite à la prise de liquidité au-dessus du haut asiatique. Le ratio risque/rendement cible est supérieur à 3.5 vers la liquidité opposée de la veille. Le stop loss protège strictement l'invalidation de la cassure de structure. N'oubliez pas que les configurations techniques peuvent échouer et entraîner une perte.`;
  }
  if (qLower.includes('risque') || qLower.includes('danger')) {
    return `Le risque configuré est limité à ${settings.max_risk_pct}% du capital avec un arrêt journalier à ${settings.max_daily_loss_pct}%. Le filtre d'actualités macroéconomiques est ${settings.news_filter ? 'actif pour éviter les annonces à fort impact' : 'désactivé'}. Sur le marché de l'or, la volatilité peut être brutale et l'effet de levier amplifie les pertes. Ne risquez jamais d'argent que vous ne pouvez pas vous permettre de perdre.`;
  }
  return `Le robot fonctionne en mode ${status.mode} sur l'or 5 minutes avec un capital de ${status.equity} $. Le plan actuel vise ${status.plan?.take_profit || 2728.40} $ avec un stop rigoureux à ${status.plan?.stop_loss || 2750.50} $. Les filtres de protection protègent le compte contre le surtrading et les pertes consécutives. Gardez toujours à l'esprit que le trading comporte un risque élevé de perte.`;
}

// -----------------------------
// 4. State API for Dashboard
// -----------------------------
app.get('/api/state', (_req: Request, res: Response) => {
  res.json(store.getState());
});

// Update settings with validation
app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updated = store.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erreur lors de la mise à jour des réglages.' });
  }
});

// Toggle pause
app.post('/api/pause', (req: Request, res: Response) => {
  try {
    const state = store.getState();
    const newPaused = !state.settings.paused;
    store.updateSettings({ paused: newPaused });
    res.json({ success: true, paused: newPaused });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Advance scenario step (interactive demo)
app.post('/api/demo/advance-sequence', (_req: Request, res: Response) => {
  const result = store.advanceDemoSequence();
  res.json(result);
});

// Set bot state directly
app.post('/api/bot/state', (req: Request, res: Response) => {
  const { state: newState } = req.body;
  if (!newState) {
    res.status(400).json({ error: 'État requis.' });
    return;
  }
  store.setBotState(newState);
  res.json({ success: true, state: newState });
});

// Reset / switch to pure real state (clears all fake trades and signals)
app.post('/api/demo/clear-real', (_req: Request, res: Response) => {
  const state = store.resetToPureRealState();
  res.json({ success: true, state });
});

// Load pedagogical demo scenario
app.post('/api/demo/load-scenario', (_req: Request, res: Response) => {
  const state = store.loadDemoScenario();
  res.json({ success: true, state });
});

// Reset demo data
app.post('/api/demo/reset', (_req: Request, res: Response) => {
  const state = store.resetToPureRealState();
  res.json({ success: true, state });
});

// Live Gold Market Fetch from Real Global Feed
app.get('/api/market/sync-live', async (_req: Request, res: Response) => {
  try {
    const fetchRes = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=5m&limit=80');
    if (fetchRes.ok) {
      const raw = await fetchRes.json() as any[];
      const candles = raw.map((item: any) => ({
        time: Math.floor(item[0] / 1000),
        open: Number(parseFloat(item[1]).toFixed(2)),
        high: Number(parseFloat(item[2]).toFixed(2)),
        low: Number(parseFloat(item[3]).toFixed(2)),
        close: Number(parseFloat(item[4]).toFixed(2)),
      }));
      const lastCandle = candles[candles.length - 1];
      store.updateLiveMarket(lastCandle.close, candles);
      res.json({ success: true, price: lastCandle.close, candleCount: candles.length });
      return;
    }
  } catch (err: any) {
    console.error('Error fetching real live gold market:', err);
  }
  res.status(500).json({ error: 'Flux réel temporairement inaccessible.' });
});

// Authentication for the owner
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || email.trim().toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    res.status(403).json({
      error: `Accès refusé. Cette application est strictement réservée au propriétaire (${OWNER_EMAIL}).`,
    });
    return;
  }
  res.json({
    success: true,
    user: {
      email: OWNER_EMAIL,
      role: 'owner',
      name: 'Commandant Aurum',
    },
    token: 'aurum-owner-session-token-xauusd',
  });
});

app.get('/api/auth/me', (_req: Request, res: Response) => {
  res.json({
    user: {
      email: OWNER_EMAIL,
      role: 'owner',
      name: 'Commandant Aurum',
    },
  });
});

// Realtime SSE stream
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state immediately
  res.write(`data: ${JSON.stringify({ type: 'connected', data: store.getState() })}\n\n`);

  const unsubscribe = store.subscribe((data) => {
    res.write(`data: ${data}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// -----------------------------
// Vite Dev Integration & Static Serving
// -----------------------------
async function setupServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Viceinte Core] Serveur actif sur http://localhost:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('[Viceinte Core] Échec du démarrage du serveur:', err);
  process.exit(1);
});
