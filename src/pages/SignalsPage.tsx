import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { Signal, SignalFilter } from '../types';
import { Radio, CheckCircle2, XCircle, ShieldAlert, Newspaper, Cpu, Bot, ArrowUpRight, ArrowDownRight, Terminal } from 'lucide-react';

export const SignalsPage: React.FC = () => {
  const { state, setIsPineScriptModalOpen } = useAppState();
  const signals = state?.signals || [];

  const [statusFilter, setStatusFilter] = useState<'all' | 'pris' | 'ignore'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredSignals = signals.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (filterType !== 'all' && s.filter !== filterType) return false;
    return true;
  });

  const getFilterBadge = (filter: SignalFilter) => {
    switch (filter) {
      case 'risque':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#ff6b5b]/15 text-[#ff6b5b] border border-[#ff6b5b]/30">
            <ShieldAlert className="w-3 h-3" /> Risque capital
          </span>
        );
      case 'actualites':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#e8c56a]/15 text-[#e8c56a] border border-[#e8c56a]/30">
            <Newspaper className="w-3 h-3" /> Actualités / FOMC
          </span>
        );
      case 'ml':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#7fd6ff]/15 text-[#7fd6ff] border border-[#7fd6ff]/30">
            <Cpu className="w-3 h-3" /> Machine Learning
          </span>
        );
      case 'ia':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#f6e7b8]/15 text-[#f6e7b8] border border-[#f6e7b8]/30">
            <Bot className="w-3 h-3" /> Filtre Algorithmique
          </span>
        );
      case 'aucun':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#232637] text-[#8d90a3]">
            Aucun filtre bloquant
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#e9e6dc]">
            Signaux Réceptionnés
          </h1>
          <p className="text-xs text-[#8d90a3] mt-1">
            Flux direct des ordres et alertes reçus par webhook depuis le script TradingView Pine Script v5 ou le robot Python.
          </p>
        </div>

        <button
          onClick={() => setIsPineScriptModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#e8c56a] text-[#06070c] hover:bg-[#f6e7b8] transition active:scale-95 shadow-md shadow-[#e8c56a]/20 cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Configurer l'alerte TradingView</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#10121b] border border-[#232637]">
        {/* Status tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#06070c] border border-[#232637]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#171a27] text-[#e8c56a] shadow-sm'
                : 'text-[#8d90a3] hover:text-[#e9e6dc]'
            }`}
          >
            Tous ({signals.length})
          </button>
          <button
            onClick={() => setStatusFilter('pris')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              statusFilter === 'pris'
                ? 'bg-[#7fd6ff]/15 text-[#7fd6ff] shadow-sm'
                : 'text-[#8d90a3] hover:text-[#e9e6dc]'
            }`}
          >
            Pris en ordre ({signals.filter((s) => s.status === 'pris').length})
          </button>
          <button
            onClick={() => setStatusFilter('ignore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              statusFilter === 'ignore'
                ? 'bg-[#ff6b5b]/15 text-[#ff6b5b] shadow-sm'
                : 'text-[#8d90a3] hover:text-[#e9e6dc]'
            }`}
          >
            Ignorés / Filtrés ({signals.filter((s) => s.status === 'ignore').length})
          </button>
        </div>

        {/* Filter Type selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8d90a3]">Filtre :</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#06070c] border border-[#232637] text-xs text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
          >
            <option value="all">Tous les filtres</option>
            <option value="aucun">Aucun (Exécutés)</option>
            <option value="actualites">Actualités / FOMC</option>
            <option value="risque">Plafond de risque</option>
          </select>
        </div>
      </div>

      {/* Signals List */}
      <div className="space-y-3">
        {filteredSignals.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#10121b] border border-[#232637] text-center">
            <Radio className="w-10 h-10 text-[#8d90a3]/40 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-base text-[#e9e6dc]">
              Aucun signal reçu pour le moment
            </h3>
            <p className="text-xs text-[#8d90a3] max-w-md mx-auto mt-1 leading-relaxed">
              Dès que votre indicateur <strong>MDT Sniper Ultimate Pro</strong> détecte un setup sur TradingView ou que votre robot émet un ordre, il apparaîtra ici avec ses niveaux d'entrée, de stop loss et d'objectifs.
            </p>
          </div>
        ) : (
          filteredSignals.map((sig) => {
            const isBuy = sig.side === 'BUY';
            const isTaken = sig.status === 'pris';

            return (
              <div
                key={sig.id}
                className="p-5 rounded-2xl bg-[#10121b] border border-[#232637] hover:border-[#e8c56a]/40 transition shadow-lg"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-heading font-extrabold tracking-wider ${
                        isBuy
                          ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40'
                          : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                      }`}
                    >
                      {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {isBuy ? 'ACHAT (BUY)' : 'VENTE (SELL)'}
                    </span>

                    <span className="font-heading font-bold text-sm text-[#e9e6dc]">
                      {sig.strategy}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getFilterBadge(sig.filter)}

                    {/* Status badge */}
                    {isTaken ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#7fd6ff]/15 text-[#7fd6ff] border border-[#7fd6ff]/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pris en ordre
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#ff6b5b]/15 text-[#ff6b5b] border border-[#ff6b5b]/30">
                        <XCircle className="w-3.5 h-3.5" />
                        Ignoré
                      </span>
                    )}
                  </div>
                </div>

                {/* Numbers row: Entry, SL, TP, R:R */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#06070c]/70 border border-[#232637] text-xs font-mono mb-3">
                  <div>
                    <span className="text-[#8d90a3] text-[10px] block">Niveau d’entrée</span>
                    <strong className="text-[#e9e6dc] tabular-nums">{sig.entry.toFixed(2)} $</strong>
                  </div>
                  <div>
                    <span className="text-[#8d90a3] text-[10px] block">Stop loss (SL)</span>
                    <strong className="text-[#ff6b5b] tabular-nums">{sig.stop_loss.toFixed(2)} $</strong>
                  </div>
                  <div>
                    <span className="text-[#8d90a3] text-[10px] block">Objectif (TP)</span>
                    <strong className="text-[#7fd6ff] tabular-nums">{sig.take_profit.toFixed(2)} $</strong>
                  </div>
                  <div>
                    <span className="text-[#8d90a3] text-[10px] block">Ratio Rendement/Risque</span>
                    <strong className="text-[#e8c56a] tabular-nums">{sig.rr.toFixed(1)} R</strong>
                  </div>
                </div>

                {/* Reason in French */}
                <div className="flex items-start gap-2 text-xs text-[#8d90a3] bg-[#171a27]/40 p-2.5 rounded-lg border border-[#232637]/50">
                  <span className="text-[#e8c56a] font-semibold shrink-0">Motif de décision :</span>
                  <span className="text-[#e9e6dc] leading-relaxed">{sig.reason_fr}</span>
                </div>

                {/* Footer timestamp */}
                <div className="mt-2.5 text-right text-[10px] text-[#8d90a3] font-mono">
                  Émis le {new Date(sig.time).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
