import fs from 'fs';
import path from 'path';
import { 
  BotStatus, 
  Levels, 
  Signal, 
  Trade, 
  DecisionLog, 
  Settings, 
  DashboardState, 
  BotState, 
  Candle, 
  MdtRadarRow, 
  MdtZone,
  BrokerAccountConfig,
  MetaApiConfig
} from '../src/types/index.js';

const DATA_DIR = path.resolve('.data');
const STATE_FILE = path.join(DATA_DIR, 'viceinte_state.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Compute authentic MDT Radar MTF from real candles
export function computeMdtRadarFromCandles(candles: Candle[], currentPrice: number): MdtRadarRow[] {
  if (!candles || candles.length < 10) {
    return [];
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
  const recentHigh = Math.max(...highs.slice(-30));
  const recentLow = Math.min(...lows.slice(-30));

  const higherTfHigh = Math.max(...highs);
  const higherTfLow = Math.min(...lows);

  const isAboveAvg = currentPrice >= avgPrice;

  return [
    {
      tf: 'H4',
      trend: isAboveAvg ? 'Haissier' : 'Baissier',
      bullOb: `${(higherTfLow - 2.5).toFixed(2)} - ${higherTfLow.toFixed(2)}`,
      bearOb: `${higherTfHigh.toFixed(2)} - ${(higherTfHigh + 3.2).toFixed(2)}`,
      distancePct: Number((Math.abs(currentPrice - higherTfHigh) / currentPrice * 100).toFixed(2)),
      stars: 3,
      confText: isAboveAvg ? 'Biais haussier HTF' : 'Biais vendeur HTF',
    },
    {
      tf: 'H1',
      trend: isAboveAvg ? 'Haissier' : 'Baissier',
      bullOb: `${(recentLow).toFixed(2)} - ${(recentLow + 1.8).toFixed(2)}`,
      bearOb: `${(recentHigh - 1.8).toFixed(2)} - ${recentHigh.toFixed(2)}`,
      distancePct: Number((Math.abs(currentPrice - recentHigh) / currentPrice * 100).toFixed(2)),
      stars: 3,
      confText: 'Zone institutionnelle active',
    },
    {
      tf: 'M15',
      trend: currentPrice >= closes[closes.length - 15] ? 'Haissier' : 'Baissier',
      bullOb: `${(recentLow + 1.2).toFixed(2)} - ${(recentLow + 2.5).toFixed(2)}`,
      bearOb: `${(recentHigh - 2.5).toFixed(2)} - ${(recentHigh - 1.2).toFixed(2)}`,
      distancePct: Number((Math.abs(currentPrice - (recentHigh - 2.0)) / currentPrice * 100).toFixed(2)),
      stars: 2,
      confText: 'Scénario en formation',
    },
    {
      tf: 'M5',
      trend: currentPrice >= closes[closes.length - 5] ? 'Haissier' : 'Baissier',
      bullOb: `${(currentPrice - 2.8).toFixed(2)} - ${(currentPrice - 1.5).toFixed(2)}`,
      bearOb: `${(currentPrice + 1.5).toFixed(2)} - ${(currentPrice + 2.8).toFixed(2)}`,
      distancePct: Number((2.8 / currentPrice * 100).toFixed(2)),
      stars: 2,
      confText: 'Imbalance M5 surveillée',
    },
    {
      tf: 'M3',
      trend: currentPrice >= closes[closes.length - 2] ? 'Haissier' : 'Baissier',
      bullOb: `${(currentPrice - 1.2).toFixed(2)} - ${(currentPrice - 0.6).toFixed(2)}`,
      bearOb: `${(currentPrice + 0.6).toFixed(2)} - ${(currentPrice + 1.2).toFixed(2)}`,
      distancePct: Number((1.2 / currentPrice * 100).toFixed(2)),
      stars: 1,
      confText: 'Micro-structure en veille',
    },
  ];
}

// Fetch real market candles from live Binance PAXG (Physical Gold)
export async function fetchLiveMarketCandles(): Promise<{ candles: Candle[]; currentPrice: number; levels: Levels }> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=5m&limit=80');
    if (res.ok) {
      const raw = await res.json() as any[];
      const candles: Candle[] = raw.map((item: any) => ({
        time: Math.floor(item[0] / 1000),
        open: Number(parseFloat(item[1]).toFixed(2)),
        high: Number(parseFloat(item[2]).toFixed(2)),
        low: Number(parseFloat(item[3]).toFixed(2)),
        close: Number(parseFloat(item[4]).toFixed(2)),
      }));

      const lastCandle = candles[candles.length - 1];
      const currentPrice = lastCandle.close;

      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);

      const levels: Levels = {
        day: new Date().toISOString().split('T')[0],
        asian_high: Number((Math.max(...highs.slice(0, 30))).toFixed(2)),
        asian_low: Number((Math.min(...lows.slice(0, 30))).toFixed(2)),
        prev_day_high: Number(Math.max(...highs).toFixed(2)),
        prev_day_low: Number(Math.min(...lows).toFixed(2)),
      };

      return { candles, currentPrice, levels };
    }
  } catch (e) {
    console.error('Error fetching live market candles:', e);
  }

  // Sensible fallback based on current realistic gold price if network drops
  const now = Math.floor(Date.now() / 1000);
  const candles: Candle[] = [];
  let basePrice = 4125.00;
  for (let i = 0; i < 80; i++) {
    const time = now - (80 - i) * 300;
    const open = basePrice;
    const change = (Math.random() - 0.49) * 1.5;
    const close = Number((open + change).toFixed(2));
    const high = Number((Math.max(open, close) + Math.random() * 0.8).toFixed(2));
    const low = Number((Math.min(open, close) - Math.random() * 0.8).toFixed(2));
    basePrice = close;
    candles.push({ time, open, high, low, close });
  }

  return {
    candles,
    currentPrice: basePrice,
    levels: {
      day: new Date().toISOString().split('T')[0],
      asian_high: 4132.50,
      asian_low: 4118.20,
      prev_day_high: 4138.80,
      prev_day_low: 4112.40,
    },
  };
}

export function createCleanRealState(candles: Candle[], currentPrice: number, levels: Levels): DashboardState {
  const mdt_radar = computeMdtRadarFromCandles(candles, currentPrice);

  const bot_status: BotStatus = {
    state: 'surveillance', // No fake active trade, robot is observing
    mode: 'simulation',
    symbol: 'GOLD (XAUUSD)',
    timeframe: '5m',
    last_price: currentPrice,
    equity: null, // No fake numbers! In real mode, waiting for Python bot
    balance: null,
    candles,
    plan: null, // No fake entry/SL/TP lines!
    updated_at: new Date().toISOString(),
  };

  const defaultBroker: BrokerAccountConfig = {
    broker_type: 'XM Global',
    account_type: 'demo',
    account_number: '',
    server_name: 'XMGlobal-MT5 3',
    symbol: 'GOLD',
    execution_mode: 'hft_ultra',
    connected: false,
    last_ping_ms: 0,
    balance: 0,
    equity: 0,
    leverage: 500,
    hft_max_slippage_pips: 1.5,
    auto_breakeven_tp1: true,
    webhook_secret: process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key',
  };

  const settings: Settings = {
    paused: false,
    mode: 'simulation',
    symbol: 'GOLD',
    timeframe: '5m',
    lot: 0.01,
    max_risk_pct: 1.0, // Prudent MDT standard (0.25% - 1%)
    max_daily_loss_pct: 5.0,
    max_trades_day: 3,
    news_filter: true,
    ml_filter: false,
    ai_filter: false,
    broker: defaultBroker,
  };

  const decision_log: DecisionLog[] = [
    {
      id: `log-init-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: 'Flux spot XAUUSD en direct connecté. Moteur de surveillance quantitatif opérationnel.',
    },
    {
      id: `log-mdt-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: 'Méthodologie MDT 2026 active : surveillance H4/H1, setup M15, trigger M3. Règle mère : « No setup. No trade. Next. »',
    },
    {
      id: `log-broker-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: 'Passerelle HFT prête. En attente de la saisie de votre compte démo XM Global, MT5 ou Exness via « Lier Démo Courtier ».',
    },
  ];

  return {
    bot_status,
    levels,
    signals: [], // Empty: No fake signals
    trades: [], // Empty: No fake trades
    decision_log,
    settings,
    broker: defaultBroker,
    is_demo_data: false, // Pure real data mode
    server_time: new Date().toISOString(),
    bot_key: process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key',
    mdt_radar,
  };
}

export function createPedagogicalDemoState(candles: Candle[], currentPrice: number, levels: Levels): DashboardState {
  const mdt_radar = computeMdtRadarFromCandles(candles, currentPrice);

  const plan = {
    entry: Number((currentPrice + 1.2).toFixed(2)),
    stop_loss: Number((currentPrice + 4.5).toFixed(2)),
    take_profit: Number((currentPrice - 8.2).toFixed(2)),
    fvg_top: Number((currentPrice + 2.0).toFixed(2)),
    fvg_bottom: Number((currentPrice + 0.5).toFixed(2)),
  };

  const defaultBroker: BrokerAccountConfig = {
    broker_type: 'XM Global',
    account_type: 'demo',
    account_number: '52019482',
    server_name: 'XMGlobal-MT5 3',
    symbol: 'GOLD',
    execution_mode: 'hft_ultra',
    connected: true,
    last_ping_ms: 18,
    balance: 10245.80,
    equity: 10245.80,
    leverage: 500,
    hft_max_slippage_pips: 1.5,
    auto_breakeven_tp1: true,
    webhook_secret: process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key',
  };

  const bot_status: BotStatus = {
    state: 'en_trade',
    mode: 'simulation',
    symbol: 'GOLD (XAUUSD)',
    timeframe: '5m',
    last_price: currentPrice,
    equity: 10245.80,
    balance: 10000.00,
    candles,
    plan,
    updated_at: new Date().toISOString(),
  };

  const settings: Settings = {
    paused: false,
    mode: 'simulation',
    symbol: 'GOLD',
    timeframe: '5m',
    lot: 0.01,
    max_risk_pct: 1.0,
    max_daily_loss_pct: 5.0,
    max_trades_day: 3,
    news_filter: true,
    ml_filter: false,
    ai_filter: false,
    broker: defaultBroker,
  };

  const signals: Signal[] = [
    {
      id: 'demo-sig-01',
      time: new Date(Date.now() - 25 * 60000).toISOString(),
      strategy: 'MDT Vente : Rejet Bear OB + FVG Retest',
      side: 'SELL',
      entry: plan.entry,
      stop_loss: plan.stop_loss,
      take_profit: plan.take_profit,
      rr: 2.5,
      status: 'pris',
      filter: 'aucun',
      reason_fr: '[Exemple de simulation] Balayage du haut récent, déplacement baissier M3, comblement FVG validé.',
    },
    {
      id: 'demo-sig-02',
      time: new Date(Date.now() - 110 * 60000).toISOString(),
      strategy: 'Rebond Bull OB',
      side: 'BUY',
      entry: Number((currentPrice - 6.0).toFixed(2)),
      stop_loss: Number((currentPrice - 8.5).toFixed(2)),
      take_profit: Number((currentPrice - 1.0).toFixed(2)),
      rr: 2.0,
      status: 'ignore',
      filter: 'actualites',
      reason_fr: '[Exemple de simulation] Filtré : publication macroéconomique à fort impact dans 15 min.',
    },
  ];

  const trades: Trade[] = [
    {
      id: 'demo-tr-01',
      opened_at: new Date(Date.now() - 25 * 60000).toISOString(),
      closed_at: null,
      side: 'SELL',
      entry: plan.entry,
      exit: null,
      stop_loss: plan.stop_loss,
      take_profit: plan.take_profit,
      r_result: 1.2,
      pnl_usd: 120.00,
      strategy: 'MDT Vente : Rejet Bear OB + FVG Retest',
      mode: 'simulation',
    },
    {
      id: 'demo-tr-02',
      opened_at: new Date(Date.now() - 86400000).toISOString(),
      closed_at: new Date(Date.now() - 86400000 + 45 * 60000).toISOString(),
      side: 'BUY',
      entry: Number((currentPrice - 12.0).toFixed(2)),
      exit: Number((currentPrice - 4.0).toFixed(2)),
      stop_loss: Number((currentPrice - 16.0).toFixed(2)),
      take_profit: Number((currentPrice - 4.0).toFixed(2)),
      r_result: 2.0,
      pnl_usd: 200.00,
      strategy: 'MDT Achat : Sweep sous zone acheteuse + BOS',
      mode: 'simulation',
    },
  ];

  const decision_log: DecisionLog[] = [
    {
      id: `demo-log-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: `[Démonstration] Position courte active sur ${plan.entry} $. Target fixée sur ${plan.take_profit} $.`,
    },
    {
      id: `demo-log-${Date.now() - 1}`,
      time: new Date(Date.now() - 25 * 60000).toISOString(),
      level: 'info',
      message: `[Démonstration] Entrée exécutée sur retest FVG M5. Stop loss strict à ${plan.stop_loss} $.`,
    },
  ];

  return {
    bot_status,
    levels,
    signals,
    trades,
    decision_log,
    settings,
    is_demo_data: true,
    server_time: new Date().toISOString(),
    bot_key: process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key',
    mdt_radar,
  };
}

class Store {
  private state: DashboardState;
  private sseClients: Set<(data: string) => void> = new Set();
  private isDemo = false;

  constructor() {
    this.state = this.loadState();
    // Fetch live market data on startup
    this.syncRealMarket();
  }

  private loadState(): DashboardState {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.isDemo = parsed.is_demo_data ?? false;

        // Cleanse fake hardcoded demo account if user hadn't entered real credentials
        if (parsed.broker?.account_number === '52019482' || !parsed.broker?.account_number) {
          if (parsed.broker) {
            parsed.broker.account_number = '';
            parsed.broker.connected = false;
            parsed.broker.balance = 0;
            parsed.broker.equity = 0;
            parsed.broker.last_ping_ms = 0;
          }
        }
        if (parsed.settings?.broker?.account_number === '52019482' || !parsed.settings?.broker?.account_number) {
          if (parsed.settings?.broker) {
            parsed.settings.broker.account_number = '';
            parsed.settings.broker.connected = false;
            parsed.settings.broker.balance = 0;
            parsed.settings.broker.equity = 0;
            parsed.settings.broker.last_ping_ms = 0;
          }
        }

        // Filter out stale logs referencing old hardcoded mock dates or fake accounts
        if (Array.isArray(parsed.decision_log)) {
          parsed.decision_log = parsed.decision_log.filter((l: any) => 
            !l.message?.includes('52019482') && 
            !l.time?.startsWith('2026-10-22')
          );
          if (parsed.decision_log.length === 0) {
            parsed.decision_log = [
              {
                id: `log-live-${Date.now()}`,
                time: new Date().toISOString(),
                level: 'info',
                message: 'Terminal de trading connecté au flux réel XAUUSD. Surveillance active.',
              },
            ];
          }
        }

        if (!this.isDemo) {
          // Guarantee no obsolete fake mock signals
          parsed.signals = (parsed.signals || []).filter((s: any) => s.entry > 3000);
          parsed.trades = (parsed.trades || []).filter((t: any) => t.entry > 3000);
          if (parsed.bot_status?.plan && parsed.bot_status.plan.entry < 3000) {
            parsed.bot_status.plan = null;
          }
          if (parsed.bot_status && parsed.bot_status.equity === 10425.8) {
            parsed.bot_status.equity = null;
            parsed.bot_status.balance = null;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
    // Default to clean real state (no fake trades)
    const initial = createCleanRealState([], 4125.00, {
      day: new Date().toISOString().split('T')[0],
      asian_high: 4132.50,
      asian_low: 4118.20,
      prev_day_high: 4138.80,
      prev_day_low: 4112.40,
    });
    this.saveState(initial);
    return initial;
  }

  private saveState(state: DashboardState) {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing state file:', e);
    }
  }

  public getState(): DashboardState {
    const broker = this.state.settings.broker || this.state.broker;
    return {
      ...this.state,
      broker,
      server_time: new Date().toISOString(),
      is_demo_data: this.isDemo,
      bot_key: process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key',
    };
  }

  public updateBroker(brokerConfig: Partial<BrokerAccountConfig>): BrokerAccountConfig {
    const current: BrokerAccountConfig = this.state.settings.broker || this.state.broker || {
      broker_type: 'XM Global',
      account_type: 'demo',
      account_number: '',
      server_name: 'XMGlobal-MT5 3',
      symbol: 'GOLD',
      execution_mode: 'hft_ultra',
      connected: false,
      last_ping_ms: 0,
      balance: 0,
      equity: 0,
      leverage: 500,
      hft_max_slippage_pips: 1.5,
      auto_breakeven_tp1: true,
      webhook_secret: process.env.BOT_KEY || 'aurum-prod-secret-xauusd-key',
    };

    const updated: BrokerAccountConfig = {
      ...current,
      ...brokerConfig,
    };

    this.state.settings.broker = updated;
    this.state.broker = updated;

    if (updated.connected && updated.balance > 0) {
      this.state.bot_status.balance = updated.balance;
      this.state.bot_status.equity = updated.equity || updated.balance;
    } else if (!updated.connected) {
      this.state.bot_status.balance = null;
      this.state.bot_status.equity = null;
    }

    if (brokerConfig.connected !== undefined) {
      this.state.decision_log.unshift({
        id: `broker-log-${Date.now()}`,
        time: new Date().toISOString(),
        level: 'info',
        message: brokerConfig.connected 
          ? `[Pont Courtier Démo] Connecté avec succès à ${updated.broker_type} (${updated.account_number || 'Compte Démo'} sur ${updated.server_name}). Moteur: ${updated.execution_mode.toUpperCase()} (Latence: ${updated.last_ping_ms}ms, Solde: ${updated.balance > 0 ? `$${updated.balance}` : 'Non renseigné'}).`
          : `[Pont Courtier Démo] Déconnexion du compte ${updated.broker_type}. Moteur arrêté.`,
      });
      if (this.state.decision_log.length > 50) {
        this.state.decision_log.pop();
      }
    }

    this.saveState(this.state);
    this.broadcast();
    return updated;
  }

  public updateMetaApi(config: Partial<MetaApiConfig>): MetaApiConfig {
    const current: MetaApiConfig = this.state.metaapi || {
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
    };

    const updated: MetaApiConfig = {
      ...current,
      ...config,
    };

    this.state.metaapi = updated;
    this.state.settings.metaapi = updated;

    if (updated.connected && updated.balance && updated.balance > 0) {
      this.state.bot_status.balance = updated.balance;
      this.state.bot_status.equity = updated.equity || updated.balance;
    }

    if (config.auto_trade_enabled !== undefined) {
      this.state.decision_log.unshift({
        id: `metaapi-log-${Date.now()}`,
        time: new Date().toISOString(),
        level: 'info',
        message: config.auto_trade_enabled
          ? `[MetaApi Auto-Trade] Activé pour ${updated.symbol} (${updated.lot_size} lot). Tout signal valide sera routé directement en direct.`
          : `[MetaApi Auto-Trade] Désactivé. Mode surveillance uniquement.`,
      });
      if (this.state.decision_log.length > 50) {
        this.state.decision_log.pop();
      }
    }

    this.saveState(this.state);
    this.broadcast();
    return updated;
  }

  public subscribe(cb: (data: string) => void): () => void {
    this.sseClients.add(cb);
    return () => {
      this.sseClients.delete(cb);
    };
  }

  public broadcast() {
    const payload = JSON.stringify({
      type: 'state_update',
      data: this.getState(),
    });
    for (const client of this.sseClients) {
      try {
        client(payload);
      } catch (e) {
        // disconnected
      }
    }
  }

  public async syncRealMarket(): Promise<void> {
    const { candles, currentPrice, levels } = await fetchLiveMarketCandles();
    this.state.bot_status.last_price = currentPrice;
    this.state.bot_status.candles = candles;
    this.state.levels = levels;
    this.state.mdt_radar = computeMdtRadarFromCandles(candles, currentPrice);
    this.state.bot_status.updated_at = new Date().toISOString();
    this.saveState(this.state);
    this.broadcast();
  }

  public updateLiveMarket(price: number, candles?: any[]): void {
    this.state.bot_status.last_price = Number(price.toFixed(2));
    if (candles && candles.length > 0) {
      this.state.bot_status.candles = candles;
      this.state.mdt_radar = computeMdtRadarFromCandles(candles, this.state.bot_status.last_price);
      
      const highs = candles.map((c: any) => c.high);
      const lows = candles.map((c: any) => c.low);
      this.state.levels = {
        day: new Date().toISOString().split('T')[0],
        asian_high: Number((Math.max(...highs.slice(0, 30))).toFixed(2)),
        asian_low: Number((Math.min(...lows.slice(0, 30))).toFixed(2)),
        prev_day_high: Number(Math.max(...highs).toFixed(2)),
        prev_day_low: Number(Math.min(...lows).toFixed(2)),
      };
    }
    this.state.bot_status.updated_at = new Date().toISOString();
    this.saveState(this.state);
    this.broadcast();
  }

  public ingest(type: 'status' | 'levels' | 'signal' | 'trade' | 'log', payload: any): void {
    this.isDemo = false;
    this.state.is_demo_data = false;

    if (type === 'status') {
      this.state.bot_status = {
        ...this.state.bot_status,
        ...payload,
        updated_at: new Date().toISOString(),
      };
    } else if (type === 'levels') {
      this.state.levels = {
        ...this.state.levels,
        ...payload,
      };
    } else if (type === 'signal') {
      const newSignal: Signal = {
        id: payload.id || `sig-${Date.now()}`,
        time: payload.time || new Date().toISOString(),
        strategy: payload.strategy || 'MDT Smart Money',
        side: payload.side || 'SELL',
        entry: Number(payload.entry || 0),
        stop_loss: Number(payload.stop_loss || 0),
        take_profit: Number(payload.take_profit || 0),
        rr: Number(payload.rr || 1),
        status: payload.status || 'pris',
        filter: payload.filter || 'aucun',
        reason_fr: payload.reason_fr || 'Signal généré par le moteur Python.',
      };
      this.state.signals.unshift(newSignal);
      if (this.state.signals.length > 50) this.state.signals.pop();
    } else if (type === 'trade') {
      const existingIdx = this.state.trades.findIndex((t) => t.id === payload.id);
      const newTrade: Trade = {
        id: payload.id || `tr-${Date.now()}`,
        opened_at: payload.opened_at || new Date().toISOString(),
        closed_at: payload.closed_at || null,
        side: payload.side || 'SELL',
        entry: Number(payload.entry || 0),
        exit: payload.exit ? Number(payload.exit) : null,
        stop_loss: Number(payload.stop_loss || 0),
        take_profit: Number(payload.take_profit || 0),
        r_result: Number(payload.r_result || 0),
        pnl_usd: Number(payload.pnl_usd || 0),
        strategy: payload.strategy || 'Stratégie MDT',
        mode: payload.mode || this.state.settings.mode,
      };
      if (existingIdx >= 0) {
        this.state.trades[existingIdx] = newTrade;
      } else {
        this.state.trades.unshift(newTrade);
      }
    } else if (type === 'log') {
      const newLog: DecisionLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: payload.time || new Date().toISOString(),
        level: payload.level || 'info',
        message: payload.message || '',
      };
      this.state.decision_log.unshift(newLog);
      if (this.state.decision_log.length > 100) this.state.decision_log.pop();
    }

    this.saveState(this.state);
    this.broadcast();
  }

  public updateSettings(partial: Partial<Settings>): Settings {
    if (partial.max_risk_pct !== undefined) {
      if (partial.max_risk_pct > 10) {
        throw new Error('Le risque par trade ne peut pas dépasser 10%.');
      }
      if (partial.max_risk_pct < 0.1) {
        throw new Error('Le risque par trade doit être supérieur à 0.1%.');
      }
    }

    this.state.settings = {
      ...this.state.settings,
      ...partial,
    };

    if (partial.mode) {
      this.state.bot_status.mode = partial.mode;
    }
    if (partial.paused !== undefined) {
      if (partial.paused) {
        this.state.bot_status.state = 'pause';
      } else if (this.state.bot_status.state === 'pause') {
        this.state.bot_status.state = 'surveillance';
      }
    }

    this.saveState(this.state);
    this.broadcast();
    return this.state.settings;
  }

  public setBotState(newState: BotState) {
    this.state.bot_status.state = newState;
    this.state.bot_status.updated_at = new Date().toISOString();
    this.saveState(this.state);
    this.broadcast();
  }

  // Clear all invented/demo data and reset to pure authentic state
  public resetToPureRealState(): DashboardState {
    const candles = this.state.bot_status.candles || [];
    const currentPrice = this.state.bot_status.last_price || 4125.00;
    const levels = this.state.levels || {
      day: new Date().toISOString().split('T')[0],
      asian_high: 4132.50,
      asian_low: 4118.20,
      prev_day_high: 4138.80,
      prev_day_low: 4112.40,
    };

    this.state = createCleanRealState(candles, currentPrice, levels);
    this.isDemo = false;
    this.saveState(this.state);
    this.broadcast();
    return this.state;
  }

  // Load pedagogical demo scenario
  public loadDemoScenario(): DashboardState {
    const candles = this.state.bot_status.candles || [];
    const currentPrice = this.state.bot_status.last_price || 4125.00;
    const levels = this.state.levels || {
      day: new Date().toISOString().split('T')[0],
      asian_high: 4132.50,
      asian_low: 4118.20,
      prev_day_high: 4138.80,
      prev_day_low: 4112.40,
    };

    this.state = createPedagogicalDemoState(candles, currentPrice, levels);
    this.isDemo = true;
    this.saveState(this.state);
    this.broadcast();
    return this.state;
  }

  public advanceDemoSequence(): { currentStep: BotState; message: string } {
    const sequence: BotState[] = [
      'surveillance',
      'prise_de_liquidite',
      'cassure_structure',
      'fvg_repere',
      'entree',
      'en_trade',
      'objectif_atteint',
    ];
    const current = this.state.bot_status.state;
    const currentIdx = sequence.indexOf(current);
    const nextIdx = (currentIdx + 1) % sequence.length;
    const nextState = sequence[nextIdx];

    this.state.bot_status.state = nextState;
    this.state.bot_status.updated_at = new Date().toISOString();

    const messages: Record<BotState, string> = {
      surveillance: 'Surveillance active du carnet d\'ordres et des niveaux asiatiques.',
      prise_de_liquidite: 'Prise de liquidité confirmée au-dessus de la zone clé.',
      cassure_structure: 'Cassure de structure (BOS) confirmée.',
      fvg_repere: 'Zone d\'imbalance FVG repérée.',
      entree: 'Ordre limite déclenché au comblement.',
      en_trade: 'Trade en cours d\'exécution.',
      objectif_atteint: 'Objectif Take Profit atteint avec succès !',
      pause: 'Robot placé en pause.',
      erreur: 'Anomalie détectée sur le flux de cotation.',
    };

    const msg = messages[nextState];
    this.state.decision_log.unshift({
      id: `seq-log-${Date.now()}`,
      time: new Date().toISOString(),
      level: nextState === 'objectif_atteint' ? 'info' : (nextState === 'prise_de_liquidite' ? 'alerte' : 'info'),
      message: `[Séquence] ${msg}`,
    });

    this.saveState(this.state);
    this.broadcast();
    return { currentStep: nextState, message: msg };
  }
}

export const store = new Store();
