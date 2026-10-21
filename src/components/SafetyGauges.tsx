import React from 'react';
import { Settings, Trade } from '../types';
import { ShieldCheck, AlertCircle, Percent, Hash } from 'lucide-react';

interface SafetyGaugesProps {
  settings: Settings;
  trades: Trade[];
  balance: number | null;
}

export const SafetyGauges: React.FC<SafetyGaugesProps> = ({
  settings,
  trades,
  balance,
}) => {
  // Filter today's trades
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter((t) => t.opened_at.startsWith(todayStr));
  const todayTradesCount = todayTrades.length;

  // Calculate today's loss percentage
  const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const currentDailyLossPct = todayPnl < 0 ? Math.min(Math.abs(todayPnl) / (balance || 10000) * 100, 100) : 0;

  // Percentage calculations against configured limits
  const dailyLossLimitPct = settings.max_daily_loss_pct || 10;
  const dailyLossProgress = Math.min((currentDailyLossPct / dailyLossLimitPct) * 100, 100);

  const maxTradesLimit = settings.max_trades_day || 3;
  const tradesProgress = Math.min((todayTradesCount / maxTradesLimit) * 100, 100);

  const riskPerTrade = settings.max_risk_pct || 5;
  const riskProgress = Math.min((riskPerTrade / 10) * 100, 100); // Max allowed is 10%

  return (
    <div className="w-full rounded-2xl bg-[#10121b]/90 border border-[#232637] p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#e8c56a]" />
          <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
            Garde-fous & Sécurité du capital
          </h3>
        </div>
        <span className="text-[11px] text-[#8d90a3] font-mono">
          Protection active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gauge 1: Perte du jour */}
        <div className="p-3.5 rounded-xl bg-[#06070c]/70 border border-[#232637] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8d90a3]">Perte du jour</span>
            <span className="text-xs font-mono font-semibold text-[#e9e6dc] tabular-nums">
              {currentDailyLossPct.toFixed(1)}% / {dailyLossLimitPct}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#171a27] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                dailyLossProgress > 80
                  ? 'bg-[#ff6b5b]'
                  : dailyLossProgress > 50
                  ? 'bg-[#e8c56a]'
                  : 'bg-[#7fd6ff]'
              }`}
              style={{ width: `${Math.max(dailyLossProgress, 4)}%` }}
            />
          </div>

          <div className="mt-2 text-[10px] text-[#8d90a3] flex items-center justify-between">
            <span>Plafond max : {dailyLossLimitPct}%</span>
            {dailyLossProgress > 80 && (
              <span className="text-[#ff6b5b] font-medium flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3" /> Proche du seuil
              </span>
            )}
          </div>
        </div>

        {/* Gauge 2: Trades du jour */}
        <div className="p-3.5 rounded-xl bg-[#06070c]/70 border border-[#232637] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8d90a3]">Trades du jour</span>
            <span className="text-xs font-mono font-semibold text-[#e9e6dc] tabular-nums">
              {todayTradesCount} / {maxTradesLimit}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#171a27] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                tradesProgress >= 100
                  ? 'bg-[#ff6b5b]'
                  : tradesProgress >= 66
                  ? 'bg-[#e8c56a]'
                  : 'bg-[#e8c56a]'
              }`}
              style={{ width: `${Math.max(tradesProgress, 6)}%` }}
            />
          </div>

          <div className="mt-2 text-[10px] text-[#8d90a3] flex items-center justify-between">
            <span>Anti-surtrading</span>
            <span>{maxTradesLimit - todayTradesCount} restant(s)</span>
          </div>
        </div>

        {/* Gauge 3: Risque par trade */}
        <div className="p-3.5 rounded-xl bg-[#06070c]/70 border border-[#232637] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8d90a3]">Risque par trade</span>
            <span className="text-xs font-mono font-semibold text-[#e8c56a] tabular-nums">
              {riskPerTrade.toFixed(1)}% (max 10%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#171a27] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                riskProgress > 70 ? 'bg-[#ff6b5b]' : 'bg-[#e8c56a]'
              }`}
              style={{ width: `${riskProgress}%` }}
            />
          </div>

          <div className="mt-2 text-[10px] text-[#8d90a3] flex items-center justify-between">
            <span>Taille : {settings.lot} lot(s)</span>
            <span>Règle des 10% max</span>
          </div>
        </div>
      </div>
    </div>
  );
};
