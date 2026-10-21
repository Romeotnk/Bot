import React from 'react';
import { DecisionLog } from '../types';
import { Terminal, AlertTriangle, Info, Clock } from 'lucide-react';

interface DecisionLogFeedProps {
  logs: DecisionLog[];
}

export const DecisionLogFeed: React.FC<DecisionLogFeedProps> = ({ logs }) => {
  return (
    <div className="w-full rounded-2xl bg-[#10121b]/90 border border-[#232637] p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#e8c56a]" />
          <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
            Journal des décisions du robot
          </h3>
        </div>
        <span className="text-[11px] text-[#8d90a3] font-mono">
          {logs.length} entrées
        </span>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8d90a3] bg-[#06070c]/50 rounded-xl border border-[#232637]">
            Aucune décision consignée pour le moment.
          </div>
        ) : (
          logs.map((log) => {
            const isAlert = log.level === 'alerte';
            const logDate = new Date(log.time);
            const timeStr = logDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log.id}
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs transition ${
                  isAlert
                    ? 'bg-[#ff6b5b]/10 border-[#ff6b5b]/30 text-[#e9e6dc]'
                    : 'bg-[#06070c]/60 border-[#232637] text-[#e9e6dc]'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isAlert ? (
                    <AlertTriangle className="w-4 h-4 text-[#ff6b5b]" />
                  ) : (
                    <Info className="w-4 h-4 text-[#7fd6ff]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                        isAlert
                          ? 'bg-[#ff6b5b]/20 text-[#ff6b5b]'
                          : 'bg-[#7fd6ff]/15 text-[#7fd6ff]'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-[11px] text-[#8d90a3] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 inline" />
                      {timeStr}
                    </span>
                  </div>
                  <p className="text-xs text-[#e9e6dc] leading-relaxed">
                    {log.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
