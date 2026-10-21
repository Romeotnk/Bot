import React, { useState } from 'react';
import { useAppState } from '../context/StateContext';
import { Signal, SignalFilter } from '../types';
import { Radio, CheckCircle2, XCircle, ShieldAlert, Newspaper, Cpu, Bot, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';

export const SignalsPage: React.FC = () => {
  const { state, ingestDemoSignal } = useAppState();
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
            <Bot className="w-3 h-3" /> Filtre Aurum IA
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
            Signaux tactiques émis
          </h1>
          <p className="text-xs text-[#8d90a3] mt-1">
            Détection algorithmique brute, signaux pris en trade et opportunités filtrées par les garde-fous.
          </p>
        </div>

        <button
          onClick={ingestDemoSignal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#171a27] text-[#e8c56a] border border-[#e8c56a]/40 hover:bg-[#e8c56a]/15 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Simuler réception d'un signal (/ingest)</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#10121b]/90 border border-[#232637] backdrop-blur-md">
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
            Pris en trade ({signals.filter((s) => s.status === 'pris').length})
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
          <span className="text-xs text-[#8d90a3]">Filtre responsable :</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#06070c] border border-[#232637] text-xs text-[#e9e6dc] focus:border-[#e8c56a] focus:outline-none"
          >
            <option value="all">Tous les filtres</option>
            <option value="aucun">Aucun (Exécuté)</option>
            <option value="risque">Risque capital</option>
            <option value="actualites">Actualités / Macro</option>
            <option value="ml">Machine Learning</option>
            <option value="ia">Intelligence Aurum</option>
          </select>
        </div>
      </div>

      {/* Signals List / Feed */}
      <div className="space-y-3.5">
        {filteredSignals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#10121b] border border-[#232637] text-sm text-[#8d90a3]">
            Aucun signal ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          filteredSignals.map((sig) => {
            const isTaken = sig.status === 'pris';
            const isBuy = sig.side === 'BUY';

            return (
              <div
                key={sig.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 hud-box ${
                  isTaken
                    ? 'border-[#7fd6ff]/40 bg-[#10121b]/90 shadow-md shadow-[#7fd6ff]/5'
                    : 'border-[#232637] bg-[#10121b]/70 opacity-90'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    {/* Side badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                        isBuy ? 'bg-[#7fd6ff]/20 text-[#7fd6ff]' : 'bg-[#ff6b5b]/20 text-[#ff6b5b]'
                      }`}
                    >
                      {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {sig.side}
                    </span>

                    <h3 className="font-heading font-semibold text-sm text-[#e9e6dc]">
                      {sig.strategy}
                    </h3>
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
