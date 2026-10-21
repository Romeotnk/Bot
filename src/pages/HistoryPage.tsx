import React, { useState, useMemo } from 'react';
import { useAppState } from '../context/StateContext';
import { Trade } from '../types';
import { Download, Filter, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { state } = useAppState();
  const trades = state?.trades || [];

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedSide, setSelectedSide] = useState<string>('all');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');

  // Extract unique months and strategies
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => {
      const ym = t.opened_at.substring(0, 7); // YYYY-MM
      set.add(ym);
    });
    return Array.from(set).sort().reverse();
  }, [trades]);

  const availableStrategies = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => set.add(t.strategy));
    return Array.from(set).sort();
  }, [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (selectedMonth !== 'all' && !t.opened_at.startsWith(selectedMonth)) return false;
      if (selectedSide !== 'all' && t.side !== selectedSide) return false;
      if (selectedStrategy !== 'all' && t.strategy !== selectedStrategy) return false;
      return true;
    });
  }, [trades, selectedMonth, selectedSide, selectedStrategy]);

  // Cumulative R curve data
  const cumulativeRData = useMemo(() => {
    // Sort chronological
    const sorted = [...trades].sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime());
    let cumR = 0;
    return sorted.map((t) => {
      cumR += t.r_result;
      return {
        id: t.id,
        date: new Date(t.opened_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        r: t.r_result,
        cumR: Number(cumR.toFixed(2)),
      };
    });
  }, [trades]);

  // Month-by-month summary table
  const monthlySummaries = useMemo(() => {
    const map = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const ym = t.opened_at.substring(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(t);
    });

    const list: { month: string; count: number; winRate: number; totalR: number; totalPnl: number }[] = [];
    map.forEach((mTrades, month) => {
      const winCount = mTrades.filter((t) => t.r_result > 0).length;
      const winRate = mTrades.length > 0 ? (winCount / mTrades.length) * 100 : 0;
      const totalR = mTrades.reduce((acc, t) => acc + t.r_result, 0);
      const totalPnl = mTrades.reduce((acc, t) => acc + t.pnl_usd, 0);
      list.push({
        month,
        count: mTrades.length,
        winRate,
        totalR,
        totalPnl,
      });
    });
    return list.sort((a, b) => b.month.localeCompare(a.month));
  }, [trades]);

  // CSV Export
  const exportToCSV = () => {
    const headers = ['ID', 'Date Ouverture', 'Date Cloture', 'Sens', 'Entree', 'Sortie', 'Stop Loss', 'Take Profit', 'Resultat R', 'PnL USD', 'Strategie', 'Mode'];
    const rows = filteredTrades.map((t) => [
      t.id,
      t.opened_at,
      t.closed_at || 'En cours',
      t.side,
      t.entry,
      t.exit || 'N/A',
      t.stop_loss,
      t.take_profit,
      t.r_result,
      t.pnl_usd,
      `"${t.strategy}"`,
      t.mode,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `viceinte_trades_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalFilteredR = filteredTrades.reduce((acc, t) => acc + t.r_result, 0);
  const totalFilteredPnl = filteredTrades.reduce((acc, t) => acc + t.pnl_usd, 0);
  const winTradesCount = filteredTrades.filter((t) => t.r_result > 0).length;
  const filteredWinRate = filteredTrades.length > 0 ? (winTradesCount / filteredTrades.length) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#e9e6dc]">
            Historique des ordres
          </h1>
          <p className="text-xs text-[#8d90a3] mt-1">
            Analyse quantitative des positions exécutées sur l’or (XAUUSD).
          </p>
        </div>

        {trades.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#e8c56a] text-[#06070c] hover:bg-[#f6e7b8] transition active:scale-95 shadow-md shadow-[#e8c56a]/15 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exporter en CSV</span>
          </button>
        )}
      </div>

      {trades.length === 0 ? (
        <div className="p-12 text-center rounded-[28px] bg-[#10121b]/90 border border-[#232637] space-y-4 hud-box hud-corners">
          <div className="hud-corner-top-right" />
          <div className="hud-corner-bottom-left" />
          <div className="w-12 h-12 rounded-2xl bg-[#e8c56a]/15 text-[#e8c56a] flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-[#e9e6dc]">Aucun ordre exécuté par le robot pour le moment</h3>
          <p className="text-xs text-[#8d90a3] max-w-lg mx-auto leading-relaxed">
            Votre programme Python externe n’a pas encore transmis de trades via <code className="text-[#e8c56a] font-mono">POST /ingest</code> avec l’en-tête <code className="text-[#e8c56a] font-mono">x-bot-key</code>.
            Aucune donnée factice n’est injectée : dès qu’une position réelle sera ouverte ou débouclée, l'historique et la courbe de R se traceront automatiquement en direct.
          </p>
        </div>
      ) : (
        <>
          {/* Cumulative R Curve */}
          <div className="rounded-[28px] bg-[#10121b]/90 border border-[#232637] p-6 shadow-xl backdrop-blur-md hud-box hud-corners">
            <div className="hud-corner-top-right" />
            <div className="hud-corner-bottom-left" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#e8c56a]" />
            <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
              Courbe de résultat cumulé en R
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-[#7fd6ff] tabular-nums">
            Total : +{cumulativeRData[cumulativeRData.length - 1]?.cumR || 0} R
          </span>
        </div>

        {/* Responsive SVG Sparkline / Cumulative chart */}
        <div className="w-full h-48 relative flex items-end">
          {cumulativeRData.length > 1 ? (
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad-r" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#e8c56a" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="#e8c56a" stop-opacity="0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#232637" stroke-dasharray="4 4" />
              <line x1="0" y1="90" x2="800" y2="90" stroke="#232637" stroke-dasharray="4 4" />
              <line x1="0" y1="140" x2="800" y2="140" stroke="#232637" stroke-dasharray="4 4" />

              {/* Compute path points */}
              {(() => {
                const maxR = Math.max(...cumulativeRData.map((d) => d.cumR), 1);
                const minR = Math.min(...cumulativeRData.map((d) => d.cumR), 0);
                const range = maxR - minR || 1;

                const points = cumulativeRData.map((d, idx) => {
                  const x = (idx / (cumulativeRData.length - 1)) * 780 + 10;
                  const y = 160 - ((d.cumR - minR) / range) * 130;
                  return `${x},${y}`;
                });

                const pathD = `M ${points.join(' L ')}`;
                const areaD = `${pathD} L 790,170 L 10,170 Z`;

                return (
                  <>
                    <path d={areaD} fill="url(#grad-r)" />
                    <path d={pathD} fill="none" stroke="#e8c56a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    {cumulativeRData.map((d, idx) => {
                      const x = (idx / (cumulativeRData.length - 1)) * 780 + 10;
                      const y = 160 - ((d.cumR - minR) / range) * 130;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#06070c"
                          stroke="#7fd6ff"
                          stroke-width="2"
                        />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          ) : (
            <div className="w-full text-center text-xs text-[#8d90a3]">Données insuffisantes pour tracer la courbe.</div>
          )}
        </div>

        <div className="flex justify-between items-center text-[10px] text-[#8d90a3] font-mono mt-3 pt-2 border-t border-[#232637]/60">
          <span>Départ de la série ({cumulativeRData[0]?.date || '-'})</span>
          <span>Performance en multiples de risque (R-Multiple)</span>
          <span>Dernière exécution ({cumulativeRData[cumulativeRData.length - 1]?.date || '-'})</span>
        </div>
      </div>

      {/* Month by month summary */}
      <div className="rounded-2xl bg-[#10121b]/90 border border-[#232637] p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-[#e8c56a]" />
          <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
            Tableau synthétique mois par mois
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232637] text-[11px] font-mono text-[#8d90a3]">
                <th className="pb-2.5 font-medium">Mois</th>
                <th className="pb-2.5 font-medium text-center">Trades exécutés</th>
                <th className="pb-2.5 font-medium text-center">Taux de réussite</th>
                <th className="pb-2.5 font-medium text-right">Total R</th>
                <th className="pb-2.5 font-medium text-right">P&L estimé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232637]/50">
              {monthlySummaries.map((m) => (
                <tr key={m.month} className="hover:bg-[#171a27]/50 transition">
                  <td className="py-3 font-mono font-semibold text-[#e9e6dc]">
                    {new Date(`${m.month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="py-3 text-center font-mono tabular-nums text-[#8d90a3]">
                    {m.count}
                  </td>
                  <td className="py-3 text-center font-mono tabular-nums text-[#e8c56a] font-semibold">
                    {m.winRate.toFixed(1)}%
                  </td>
                  <td className={`py-3 text-right font-mono tabular-nums font-bold ${
                    m.totalR >= 0 ? 'text-[#7fd6ff]' : 'text-[#ff6b5b]'
                  }`}>
                    {m.totalR >= 0 ? '+' : ''}{m.totalR.toFixed(1)} R
                  </td>
                  <td className={`py-3 text-right font-mono tabular-nums font-semibold ${
                    m.totalPnl >= 0 ? 'text-[#e9e6dc]' : 'text-[#ff6b5b]'
                  }`}>
                    {m.totalPnl >= 0 ? '+' : ''}{m.totalPnl.toFixed(2)} $
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Bar & Detailed Trades Table */}
      <div className="rounded-2xl bg-[#10121b]/90 border border-[#232637] p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#e8c56a]" />
            <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
              Filtres & Registre détaillé
            </h3>
          </div>

          {/* Quick Metrics of filtered view */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[#8d90a3]">
              Trades : <strong className="text-[#e9e6dc]">{filteredTrades.length}</strong>
            </span>
            <span className="text-[#8d90a3]">
              Taux : <strong className="text-[#e8c56a]">{filteredWinRate.toFixed(0)}%</strong>
            </span>
            <span className="text-[#8d90a3]">
              Total : <strong className={totalFilteredR >= 0 ? 'text-[#7fd6ff]' : 'text-[#ff6b5b]'}>
                {totalFilteredR >= 0 ? '+' : ''}{totalFilteredR.toFixed(1)} R ({totalFilteredPnl.toFixed(0)} $)
              </strong>
            </span>
          </div>
        </div>

        {/* Filter Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Filter Month */}
          <div>
            <label className="block text-[11px] text-[#8d90a3] mb-1">Mois</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#232637] text-xs text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
            >
              <option value="all">Tous les mois</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {new Date(`${ym}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Side */}
          <div>
            <label className="block text-[11px] text-[#8d90a3] mb-1">Sens de l'ordre</label>
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#232637] text-xs text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
            >
              <option value="all">Tous les sens (Achat & Vente)</option>
              <option value="BUY">BUY (Achat)</option>
              <option value="SELL">SELL (Vente)</option>
            </select>
          </div>

          {/* Filter Strategy */}
          <div>
            <label className="block text-[11px] text-[#8d90a3] mb-1">Stratégie</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#06070c] border border-[#232637] text-xs text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
            >
              <option value="all">Toutes les stratégies</option>
              {availableStrategies.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trades Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232637] text-[11px] font-mono text-[#8d90a3]">
                <th className="pb-2.5 font-medium">Date</th>
                <th className="pb-2.5 font-medium">Sens</th>
                <th className="pb-2.5 font-medium">Stratégie</th>
                <th className="pb-2.5 font-medium text-right">Entrée</th>
                <th className="pb-2.5 font-medium text-right">Sortie</th>
                <th className="pb-2.5 font-medium text-right">SL / TP</th>
                <th className="pb-2.5 font-medium text-right">Résultat R</th>
                <th className="pb-2.5 font-medium text-right">P&L ($)</th>
                <th className="pb-2.5 font-medium text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232637]/50">
              {filteredTrades.map((t) => {
                const isBuy = t.side === 'BUY';
                const isWin = t.r_result > 0;
                const isRunning = t.closed_at === null;

                return (
                  <tr key={t.id} className="hover:bg-[#171a27]/50 transition">
                    <td className="py-3 font-mono text-[#8d90a3] whitespace-nowrap">
                      {new Date(t.opened_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        isBuy ? 'bg-[#7fd6ff]/15 text-[#7fd6ff]' : 'bg-[#ff6b5b]/15 text-[#ff6b5b]'
                      }`}>
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.side}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-[#e9e6dc] max-w-xs truncate">
                      {t.strategy}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#e9e6dc]">
                      {t.entry.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#8d90a3]">
                      {t.exit ? t.exit.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[11px] text-[#8d90a3]">
                      <span className="text-[#ff6b5b]">{t.stop_loss.toFixed(1)}</span> / <span className="text-[#7fd6ff]">{t.take_profit.toFixed(1)}</span>
                    </td>
                    <td className={`py-3 text-right font-mono tabular-nums font-bold ${
                      isWin ? 'text-[#7fd6ff]' : isRunning ? 'text-[#e8c56a]' : 'text-[#ff6b5b]'
                    }`}>
                      {t.r_result > 0 ? '+' : ''}{t.r_result.toFixed(1)} R
                    </td>
                    <td className={`py-3 text-right font-mono tabular-nums font-semibold ${
                      t.pnl_usd > 0 ? 'text-[#e9e6dc]' : isRunning ? 'text-[#e8c56a]' : 'text-[#ff6b5b]'
                    }`}>
                      {t.pnl_usd >= 0 ? '+' : ''}{t.pnl_usd.toFixed(2)} $
                    </td>
                    <td className="py-3 text-center">
                      {isRunning ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#e8c56a]/15 text-[#e8c56a] font-medium border border-[#e8c56a]/30">
                          En cours
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isWin ? 'bg-[#7fd6ff]/15 text-[#7fd6ff]' : 'bg-[#ff6b5b]/15 text-[#ff6b5b]'
                        }`}>
                          {isWin ? 'Gagné' : 'Perdu'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
  </div>
);
};
