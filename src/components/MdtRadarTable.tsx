import React from 'react';
import { MdtRadarRow } from '../types';
import { TrendingDown, TrendingUp, Star, ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface MdtRadarTableProps {
  currentPrice: number;
  radarRows?: MdtRadarRow[];
}

const DEFAULT_RADAR_ROWS: MdtRadarRow[] = [
  {
    tf: 'H4',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4148.50 - 4142.10',
    distancePct: 0.42,
    stars: 3,
    confText: 'Rejet HTF + Biais lourd',
  },
  {
    tf: 'H1',
    trend: 'Baissier',
    bullOb: '4098.20 - 4104.50',
    bearOb: '4136.80 - 4132.40',
    distancePct: 0.18,
    stars: 3,
    confText: 'OB H1 propre + volume',
  },
  {
    tf: 'M15',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4129.50 - 4127.20',
    distancePct: 0.08,
    stars: 2,
    confText: 'Scénario A actif',
  },
  {
    tf: 'M5',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4126.80 - 4125.10',
    distancePct: 0.03,
    stars: 3,
    confText: 'FVG structure testée',
  },
  {
    tf: 'M3',
    trend: 'Baissier',
    bullOb: '---',
    bearOb: '4125.80 - 4125.00',
    distancePct: 0.01,
    stars: 2,
    confText: 'Trigger short validé',
  },
];

export const MdtRadarTable: React.FC<MdtRadarTableProps> = ({
  currentPrice,
  radarRows = DEFAULT_RADAR_ROWS,
}) => {
  return (
    <div className="w-full rounded-[24px] bg-[#10121b]/95 border border-[#232637] p-5 sm:p-6 shadow-xl backdrop-blur-md hud-box hud-corners">
      <div className="hud-corner-top-right" />
      <div className="hud-corner-bottom-left" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#232637]/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e8c56a]" />
            <h3 className="font-heading text-xs uppercase tracking-wider text-[#e8c56a]">
              Radar MTF (Multi-Timeframe) · Masterclass MDT
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171a27] text-[#7fd6ff]">
              Méthode H4 → M3
            </span>
          </div>
          <p className="text-[11px] text-[#8d90a3] mt-0.5">
            Lis-le pour gagner du temps, pas pour déléguer ton cerveau. Règle mère : Une zone = un endroit à surveiller.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[#8d90a3] font-mono block">Prix spot XAUUSD</span>
          <span className="text-sm font-mono font-bold text-[#e9e6dc] tabular-nums">
            {currentPrice.toFixed(2)} $
          </span>
        </div>
      </div>

      {/* Radar Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#232637] text-[10px] font-mono uppercase tracking-wider text-[#8d90a3]">
              <th className="pb-2.5 font-semibold">TF</th>
              <th className="pb-2.5 font-semibold">Tendance (EMA 200)</th>
              <th className="pb-2.5 font-semibold text-center">Bull OB (Acheteur)</th>
              <th className="pb-2.5 font-semibold text-center">Bear OB (Vendeur)</th>
              <th className="pb-2.5 font-semibold text-right">Distance (%)</th>
              <th className="pb-2.5 font-semibold text-right">Confluence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232637]/40 font-mono">
            {radarRows.map((row) => {
              const isBull = row.trend === 'Haissier';
              return (
                <tr key={row.tf} className="hover:bg-[#171a27]/60 transition">
                  {/* Timeframe pill */}
                  <td className="py-2.5 font-bold text-[#e8c56a]">
                    <span className="px-2 py-0.5 rounded bg-[#06070c] border border-[#232637]">
                      {row.tf}
                    </span>
                  </td>

                  {/* Trend */}
                  <td className="py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isBull
                          ? 'bg-[#7fd6ff]/15 text-[#7fd6ff]'
                          : 'bg-[#ff6b5b]/15 text-[#ff6b5b]'
                      }`}
                    >
                      {isBull ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{row.trend}</span>
                    </span>
                  </td>

                  {/* Bull OB */}
                  <td className="py-2.5 text-center text-[#7fd6ff]">
                    {row.bullOb !== '---' ? (
                      <span className="px-2 py-0.5 rounded bg-[#7fd6ff]/10 border border-[#7fd6ff]/20 font-medium">
                        {row.bullOb}
                      </span>
                    ) : (
                      <span className="text-[#8d90a3]/50">---</span>
                    )}
                  </td>

                  {/* Bear OB */}
                  <td className="py-2.5 text-center text-[#ff6b5b]">
                    {row.bearOb !== '---' ? (
                      <span className="px-2 py-0.5 rounded bg-[#ff6b5b]/10 border border-[#ff6b5b]/20 font-medium">
                        {row.bearOb}
                      </span>
                    ) : (
                      <span className="text-[#8d90a3]/50">---</span>
                    )}
                  </td>

                  {/* Distance */}
                  <td className="py-2.5 text-right tabular-nums text-[#e9e6dc]">
                    {row.distancePct.toFixed(2)} %
                  </td>

                  {/* Stars / Confluence */}
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < row.stars
                              ? 'text-[#e8c56a] fill-[#e8c56a]'
                              : 'text-[#232637]'
                          }`}
                        />
                      ))}
                      <span className="text-[10px] text-[#8d90a3] ml-1.5 hidden sm:inline">
                        {row.confText}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend based on Page 5 of MDT PDF */}
      <div className="mt-4 pt-3 border-t border-[#232637]/60 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
        <div className="p-2 rounded-lg bg-[#06070c] border border-[#ff6b5b]/30 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#ff6b5b] shrink-0" />
          <span className="text-[#e9e6dc]"><strong>Rouge</strong> : OB Vendeur</span>
        </div>
        <div className="p-2 rounded-lg bg-[#06070c] border border-[#7fd6ff]/30 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#7fd6ff] shrink-0" />
          <span className="text-[#e9e6dc]"><strong>Bleu</strong> : OB Acheteur</span>
        </div>
        <div className="p-2 rounded-lg bg-[#06070c] border border-[#a855f7]/30 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#a855f7] shrink-0" />
          <span className="text-[#e9e6dc]"><strong>Violet</strong> : FVG Structure</span>
        </div>
        <div className="p-2 rounded-lg bg-[#06070c] border border-[#f97316]/30 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#f97316] shrink-0" />
          <span className="text-[#e9e6dc]"><strong>Orange</strong> : FVG Vendeur</span>
        </div>
        <div className="p-2 rounded-lg bg-[#06070c] border border-[#22c55e]/30 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#22c55e] shrink-0" />
          <span className="text-[#e9e6dc]"><strong>Vert</strong> : FVG Acheteur</span>
        </div>
      </div>

      {/* Le piège classique quote */}
      <div className="mt-3 p-2.5 rounded-xl bg-[#ff6b5b]/10 border border-[#ff6b5b]/30 flex items-start gap-2 text-[11px] text-[#e9e6dc]">
        <AlertCircle className="w-3.5 h-3.5 text-[#ff6b5b] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#ff6b5b]">Le piège classique :</strong> « Voir du bleu et acheter direct. Non. Le bleu te dit seulement : regarde ce qui se passe ici. Le trigger vient après. »
        </p>
      </div>
    </div>
  );
};
