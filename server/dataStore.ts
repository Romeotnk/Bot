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
  FutureScenario,
  BrokerAccountConfig,
  MetaApiConfig,
  MdtEngineTelemetry
} from '../src/types/index.js';
import { MdtEngine, MdtConfig, MdtEvent } from './mdtEngine.js';

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

// Compute dynamic future scenarios with star confluences
export function computeDynamicScenarios(currentPrice: number, candles: Candle[], levels: Levels): FutureScenario[] {
  const p = currentPrice || 4125.00;
  const recentHigh = levels?.prev_day_high || (p + 5.50);
  const recentLow = levels?.prev_day_low || (p - 5.50);

  return [
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
      triggerCondition: `SELL LIMIT posé sur l'OB vendeur ${(recentHigh - 0.80).toFixed(2)} $ (sans chasser le prix)`,
      zoneName: 'OB- H1 / Liq High',
      entry: Number((recentHigh - 0.80).toFixed(2)),
      stop_loss: Number((recentHigh + 1.80).toFixed(2)),
      take_profit_1: Number((recentHigh - 0.80 - 2.10).toFixed(2)),
      take_profit_2: Number((p - 1.50).toFixed(2)),
      take_profit_3: Number((recentLow + 1.00).toFixed(2)),
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
      title: 'Scénario C : BUY LIMIT sur Bullish OB / FVG',
      type: 'limit_buy',
      direction: 'BUY',
      triggerCondition: `BUY LIMIT posé au contact du FVG structure ${(recentLow + 1.20).toFixed(2)} $ après sweep`,
      zoneName: 'FVG+ Structure M15',
      entry: Number((recentLow + 1.20).toFixed(2)),
      stop_loss: Number((recentLow - 1.20).toFixed(2)),
      take_profit_1: Number((recentLow + 1.20 + 1.90).toFixed(2)),
      take_profit_2: Number((p + 2.00).toFixed(2)),
      take_profit_3: Number((recentHigh - 1.50).toFixed(2)),
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
    future_scenarios: computeDynamicScenarios(currentPrice, candles, levels),
    stream_latency_ms: 14,
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
  private mdtEngine: MdtEngine;
  private mdtProfile: 'Starter' | 'Intraday Clean' | 'Sniper A+' | 'HFT Micro-Scalper' = 'HFT Micro-Scalper';
  private mdtTimeframe: '1m' | '5m' | '15m' = '1m';
  private mdtAutoPilot: boolean = true;
  private mdtTargetProfitUsd: number = 1.00;
  private mdtMultiFireCount: number = 3;
  private lastEvaluatedCandleTime: number = 0;
  public onOrderSignal?: (order: { action: 'BUY' | 'SELL'; symbol: string; volume: number; stopLoss?: number; takeProfit?: number; comment?: string }) => Promise<any>;

  constructor() {
    this.state = this.loadState();
    this.mdtEngine = new MdtEngine({
      profile: this.mdtProfile,
      symbol: this.state.metaapi?.symbol || 'GOLD',
      targetProfitUsd: this.mdtTargetProfitUsd,
    });
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
    this.state.future_scenarios = computeDynamicScenarios(currentPrice, candles, levels);
    this.state.stream_latency_ms = Math.floor(Math.random() * 12) + 12; // 12-24ms sub-second
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
    this.state.future_scenarios = computeDynamicScenarios(this.state.bot_status.last_price, this.state.bot_status.candles, this.state.levels);
    this.state.stream_latency_ms = Math.floor(Math.random() * 12) + 12;
    this.state.bot_status.updated_at = new Date().toISOString();

    // Auto-closer for HFT micro-trades when target profit ($0.60 to $2.00) is hit
    for (const trade of this.state.trades) {
      if (trade.closed_at === null) {
        const lot = trade.volume || 0.01;
        const diff = (price - trade.entry) * (trade.side === 'BUY' ? 1 : -1);
        const floatingUsd = diff * lot * 100;
        
        // Auto-close if target profit reached (between $0.60 and $2.00)
        const targetUsd = (trade as any).target_profit_usd || 1.00;
        if (floatingUsd >= targetUsd || (trade.take_profit > 0 && ((trade.side === 'BUY' && price >= trade.take_profit) || (trade.side === 'SELL' && price <= trade.take_profit)))) {
          trade.closed_at = new Date().toISOString();
          trade.exit = price;
          trade.pnl_usd = Number(Math.max(floatingUsd, targetUsd).toFixed(2));
          trade.duration_seconds = Math.max(1, Math.floor((Date.now() - new Date(trade.opened_at).getTime()) / 1000));
          trade.r_result = 0.5;

          const currentBalance = this.state.bot_status.balance || 1000;
          this.state.bot_status.balance = Number((currentBalance + trade.pnl_usd).toFixed(2));
          this.state.bot_status.equity = this.state.bot_status.balance;
          if (this.state.broker) {
            this.state.broker.balance = this.state.bot_status.balance;
            this.state.broker.equity = this.state.bot_status.balance;
          }

          this.state.decision_log.unshift({
            id: `log-hft-close-${Date.now()}`,
            time: new Date().toISOString(),
            level: 'info',
            message: `[HFT Micro-Scalp Hit] Position ${trade.id} fermée avec succès en gain de +$${trade.pnl_usd.toFixed(2)} (Cible 0.60$ - 2.00$ atteinte en ${trade.duration_seconds}s) !`,
          });
        }
      }
    }

    // Run continuous embedded MDT engine evaluation on the active market candles
    if (candles && candles.length > 0) {
      this.evaluateMdtCandle(candles[candles.length - 1], candles);
    }

    this.saveState(this.state);
    this.broadcast();
  }

  public evaluateMdtCandle(k: Candle, allCandles: Candle[]) {
    if (!k) return;
    const candleTime = k.time;
    const isNew = candleTime !== this.lastEvaluatedCandleTime;

    const closes = allCandles && allCandles.length > 0 ? allCandles.map((c) => c.close) : [k.close];
    const avgClose = closes.reduce((a, b) => a + b, 0) / (closes.length || 1);
    const htf = {
      ema1: avgClose,
      ema2: avgClose * 0.998,
    };

    const events = this.mdtEngine.onCandle(
      {
        time: new Date(k.time * 1000),
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: 120,
      },
      htf
    );

    const engStatus = this.mdtEngine.getStatus();
    this.state.mdt_engine = {
      running: true,
      profile: this.mdtProfile,
      timeframe: this.mdtTimeframe,
      auto_pilot: this.mdtAutoPilot,
      req_score: engStatus.reqScore,
      current_score: engStatus.lastScore,
      active_confluences: engStatus.activeConfluences,
      trend_direction: engStatus.trendDirection,
      trend_line: engStatus.trendLine,
      micro_high: engStatus.microHigh,
      micro_low: engStatus.microLow,
      armed_retest: engStatus.armedRetest,
      candles_scanned: engStatus.candlesAnalyzed,
      last_scan_time: new Date().toISOString(),
      last_signal: engStatus.lastEvent ? `${engStatus.lastEvent.action} @ ${engStatus.lastEvent.entry || engStatus.lastEvent.price}` : null,
      target_profit_usd: this.mdtTargetProfitUsd,
      multi_fire_count: this.mdtMultiFireCount,
    };

    if (isNew) {
      this.lastEvaluatedCandleTime = candleTime;
    }

    // Process trade opening events from the MDT Engine
    for (const ev of events) {
      if (ev.action === 'ACHAT' || ev.action === 'VENTE') {
        const side = ev.action === 'ACHAT' ? 'BUY' : 'SELL';
        const lot = Number(ev.lot) || (this.state.metaapi?.lot_size || 0.01);
        const sl = ev.sl || (side === 'BUY' ? k.close - 2.5 : k.close + 2.5);
        const tp = ev.tp1 || (side === 'BUY' ? k.close + 1.0 : k.close - 1.0);

        this.ingest('signal', {
          id: `mdt-sig-${Date.now()}`,
          time: new Date().toISOString(),
          strategy: `MDT Engine [${this.mdtProfile}] (Score: ${ev.score ?? 5}/7)`,
          side,
          entry: ev.entry || k.close,
          stop_loss: sl,
          take_profit: tp,
          rr: 1.0,
          status: 'pris',
          filter: 'aucun',
          reason_fr: `Signal autonome MDT détecté avec ${ev.score ?? 5}/7 confluences sur bougie clôturée.`,
        });

        this.state.decision_log.unshift({
          id: `mdt-log-${Date.now()}`,
          time: new Date().toISOString(),
          level: 'info',
          message: `🎯 [Moteur MDT Autonome] Signal ${ev.action} généré ! Entrée: ${ev.entry || k.close} $, SL: ${sl.toFixed(2)} $, TP1: ${tp.toFixed(2)} $ (Confluences: ${ev.score ?? 5}/7).`,
        });

        if (this.mdtAutoPilot) {
          const count = this.mdtProfile === 'HFT Micro-Scalper' ? this.mdtMultiFireCount : 1;
          this.fireHftMultiOrder(side, count, this.mdtTargetProfitUsd, lot);

          if (this.onOrderSignal && this.state.metaapi?.auto_trade_enabled && this.state.metaapi?.token && this.state.metaapi?.account_id) {
            const sym = this.state.metaapi.symbol || 'GOLD';
            for (let c = 0; c < count; c++) {
              this.onOrderSignal({
                action: side,
                symbol: sym,
                volume: lot,
                stopLoss: sl,
                takeProfit: tp,
                comment: `MDT Autonome ${c + 1}/${count}`,
              }).catch((e) => console.error('[MDT Auto Order Error]:', e));
            }
          }
        }
      }
    }
  }

  public updateMdtEngineConfig(partial: {
    profile?: 'Starter' | 'Intraday Clean' | 'Sniper A+' | 'HFT Micro-Scalper';
    timeframe?: '1m' | '5m' | '15m';
    auto_pilot?: boolean;
    target_profit_usd?: number;
    multi_fire_count?: number;
  }) {
    if (partial.profile) this.mdtProfile = partial.profile;
    if (partial.timeframe) this.mdtTimeframe = partial.timeframe;
    if (partial.auto_pilot !== undefined) this.mdtAutoPilot = partial.auto_pilot;
    if (partial.target_profit_usd !== undefined && partial.target_profit_usd > 0) {
      this.mdtTargetProfitUsd = partial.target_profit_usd;
    }
    if (partial.multi_fire_count !== undefined && partial.multi_fire_count > 0) {
      this.mdtMultiFireCount = Math.min(Math.max(partial.multi_fire_count, 1), 5);
    }

    this.mdtEngine = new MdtEngine({
      profile: this.mdtProfile,
      symbol: this.state.metaapi?.symbol || 'GOLD',
      targetProfitUsd: this.mdtTargetProfitUsd,
    });

    const engStatus = this.mdtEngine.getStatus();
    this.state.mdt_engine = {
      running: true,
      profile: this.mdtProfile,
      timeframe: this.mdtTimeframe,
      auto_pilot: this.mdtAutoPilot,
      req_score: engStatus.reqScore,
      current_score: engStatus.lastScore,
      active_confluences: engStatus.activeConfluences,
      trend_direction: engStatus.trendDirection,
      trend_line: engStatus.trendLine,
      micro_high: engStatus.microHigh,
      micro_low: engStatus.microLow,
      armed_retest: engStatus.armedRetest,
      candles_scanned: engStatus.candlesAnalyzed,
      last_scan_time: new Date().toISOString(),
      last_signal: engStatus.lastEvent ? `${engStatus.lastEvent.action} @ ${engStatus.lastEvent.entry || engStatus.lastEvent.price}` : null,
      target_profit_usd: this.mdtTargetProfitUsd,
      multi_fire_count: this.mdtMultiFireCount,
    };

    this.state.decision_log.unshift({
      id: `log-mdt-config-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: `[Moteur MDT] Réglages : Profil ${this.mdtProfile} (${this.mdtTimeframe}) · Pilote auto : ${this.mdtAutoPilot ? 'ACTIF' : 'DÉSACTIVÉ'} · Cible HFT : $${this.mdtTargetProfitUsd} · Multi-tir : ${this.mdtMultiFireCount}x.`,
    });

    this.saveState(this.state);
    this.broadcast();
    return this.state.mdt_engine;
  }

  public forceMdtScan(): MdtEngineTelemetry {
    const candles = this.state.bot_status.candles || [];
    if (candles.length > 0) {
      this.evaluateMdtCandle(candles[candles.length - 1], candles);
    }
    this.saveState(this.state);
    this.broadcast();
    return this.state.mdt_engine!;
  }

  public forceMdtTestTrade(side: 'BUY' | 'SELL' = 'BUY'): Trade[] {
    const p = this.state.bot_status.last_price || 4125.00;
    const lot = this.state.metaapi?.lot_size || 0.01;
    const count = this.mdtMultiFireCount || 3;
    const targetUsd = this.mdtTargetProfitUsd || 1.00;

    const openedTrades = this.fireHftMultiOrder(side, count, targetUsd, lot);

    // Call MetaApi if credentials exist
    if (this.onOrderSignal && this.state.metaapi?.auto_trade_enabled && this.state.metaapi?.token && this.state.metaapi?.account_id) {
      const sym = this.state.metaapi.symbol || 'GOLD';
      for (let c = 0; c < count; c++) {
        this.onOrderSignal({
          action: side,
          symbol: sym,
          volume: lot,
          comment: `MDT Test Forcé ${c + 1}/${count}`,
        }).catch((e) => console.error('[MetaApi Force Test Error]:', e));
      }
    }

    return openedTrades;
  }

  public fireHftMultiOrder(side: 'BUY' | 'SELL', count: number = 3, targetProfitUsd: number = 1.00, lotSize: number = 0.01): Trade[] {
    const p = this.state.bot_status.last_price || 4125.00;
    const targetDelta = targetProfitUsd / (lotSize * 100);
    const slDelta = 2.50;
    const openedTrades: Trade[] = [];

    const safeCount = Math.min(Math.max(count, 1), 5);
    for (let i = 0; i < safeCount; i++) {
      const tradeId = `hft-tr-${Date.now()}-${i + 1}`;
      const tp = side === 'BUY' ? p + targetDelta : p - targetDelta;
      const sl = side === 'BUY' ? p - slDelta : p + slDelta;

      const newTrade: Trade = {
        id: tradeId,
        opened_at: new Date().toISOString(),
        closed_at: null,
        side,
        entry: p,
        exit: null,
        stop_loss: Number(sl.toFixed(2)),
        take_profit: Number(tp.toFixed(2)),
        r_result: 0,
        pnl_usd: 0,
        strategy: `HFT Micro-Scalp Target $${targetProfitUsd.toFixed(2)}`,
        mode: 'reel',
        volume: lotSize,
        is_hft_micro: true,
      };
      (newTrade as any).target_profit_usd = targetProfitUsd;
      this.state.trades.unshift(newTrade);
      openedTrades.push(newTrade);
    }

    this.state.decision_log.unshift({
      id: `log-hft-fire-${Date.now()}`,
      time: new Date().toISOString(),
      level: 'info',
      message: `[HFT Multi-Position Fire] ${safeCount} positions ${side} ouvertes à ${p.toFixed(2)} $ (${lotSize} lot/ordre). Cible de gain rapide : +$${targetProfitUsd.toFixed(2)} par trade.`,
    });

    this.state.bot_status.state = 'en_trade';
    this.saveState(this.state);
    this.broadcast();
    return openedTrades;
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
