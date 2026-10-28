export type BotState = 
  | 'surveillance' 
  | 'prise_de_liquidite' 
  | 'cassure_structure' 
  | 'fvg_repere' 
  | 'entree' 
  | 'en_trade' 
  | 'objectif_atteint' 
  | 'pause' 
  | 'erreur';

export type TradingMode = 'simulation' | 'reel';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradePlan {
  entry: number;
  stop_loss: number;
  take_profit: number;
  fvg_top: number;
  fvg_bottom: number;
}

export interface BotStatus {
  state: BotState;
  mode: TradingMode;
  symbol: string;
  timeframe: string;
  last_price: number;
  equity: number | null;
  balance: number | null;
  candles: Candle[];
  plan: TradePlan | null;
  updated_at: string;
}

export interface Levels {
  day: string;
  asian_high: number;
  asian_low: number;
  prev_day_high: number;
  prev_day_low: number;
}

export type SignalFilter = 'risque' | 'actualites' | 'ml' | 'ia' | 'aucun';

export interface Signal {
  id: string;
  time: string;
  strategy: string;
  side: 'BUY' | 'SELL';
  entry: number;
  stop_loss: number;
  take_profit: number;
  rr: number;
  status: 'pris' | 'ignore';
  filter: SignalFilter;
  reason_fr: string;
}

export interface Trade {
  id: string;
  opened_at: string;
  closed_at: string | null;
  side: 'BUY' | 'SELL';
  entry: number;
  exit: number | null;
  stop_loss: number;
  take_profit: number;
  r_result: number;
  pnl_usd: number;
  strategy: string;
  mode: TradingMode;
}

export interface DecisionLog {
  id: string;
  time: string;
  level: 'info' | 'alerte';
  message: string;
}

export type BrokerType = 
  | 'XM Global' 
  | 'Deriv' 
  | 'Exness' 
  | 'FTMO' 
  | 'MetaTrader 5 (MT5)' 
  | 'MetaTrader 4 (MT4)' 
  | 'Autre Courtier';

export type ExecutionEngineMode = 
  | 'hft_ultra' 
  | 'scalp_m1' 
  | 'retest_m15' 
  | 'swing_h1';

export interface BrokerAccountConfig {
  broker_type: BrokerType;
  account_type: 'demo' | 'reel';
  account_number: string;
  server_name: string;
  symbol: string;
  execution_mode: ExecutionEngineMode;
  api_token?: string;
  connected: boolean;
  last_ping_ms: number;
  balance: number;
  equity: number;
  leverage: number;
  hft_max_slippage_pips: number;
  auto_breakeven_tp1: boolean;
  webhook_secret: string;
}

export interface Settings {
  paused: boolean;
  mode: TradingMode;
  symbol: string;
  timeframe: string;
  lot: number;
  max_risk_pct: number;
  max_daily_loss_pct: number;
  max_trades_day: number;
  news_filter: boolean;
  ml_filter: boolean;
  ai_filter: boolean;
  broker?: BrokerAccountConfig;
}

export interface MdtRadarRow {
  tf: string;
  trend: 'Haissier' | 'Baissier';
  bullOb: string;
  bearOb: string;
  distancePct: number;
  stars: number;
  confText: string;
}

export interface MdtZone {
  id: string;
  type: 'ob_sell' | 'ob_buy' | 'fvg_structure' | 'fvg_sell' | 'fvg_buy';
  label: string;
  high: number;
  low: number;
  timeframe: string;
  mitigated: boolean;
}

export interface DashboardState {
  bot_status: BotStatus;
  levels: Levels;
  signals: Signal[];
  trades: Trade[];
  decision_log: DecisionLog[];
  settings: Settings;
  is_demo_data: boolean;
  server_time: string;
  bot_key: string;
  mdt_radar?: MdtRadarRow[];
  mdt_zones?: MdtZone[];
  broker?: BrokerAccountConfig;
}

export interface AurumChatMessage {
  id: string;
  sender: 'user' | 'aurum';
  text: string;
  time: string;
  isTyping?: boolean;
}


