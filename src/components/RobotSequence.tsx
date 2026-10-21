import React from 'react';
import { BotState } from '../types';
import { Eye, Waves, Zap, Box, ArrowRightCircle, Target, PauseCircle, AlertTriangle, Play } from 'lucide-react';

interface RobotSequenceProps {
  currentState: BotState;
  onAdvance?: () => void;
  isDemo?: boolean;
}

interface StepInfo {
  key: BotState;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepInfo[] = [
  {
    key: 'surveillance',
    label: 'Surveille',
    sub: 'Range Asie & Niveaux',
    icon: Eye,
  },
  {
    key: 'prise_de_liquidite',
    label: 'Prise de liquidité',
    sub: 'Balayage haut/bas',
    icon: Waves,
  },
  {
    key: 'cassure_structure',
    label: 'Cassure de structure',
    sub: 'BOS / Confirmation',
    icon: Zap,
  },
  {
    key: 'fvg_repere',
    label: 'FVG repéré',
    sub: 'Imbalance M5',
    icon: Box,
  },
  {
    key: 'entree',
    label: 'Entrée',
    sub: 'Ordre limite validé',
    icon: ArrowRightCircle,
  },
  {
    key: 'objectif_atteint',
    label: 'Objectif atteint',
    sub: 'Take Profit touché',
    icon: Target,
  },
];

export const RobotSequence: React.FC<RobotSequenceProps> = ({
  currentState,
  onAdvance,
  isDemo = false,
}) => {
  // Determine if currentState is one of the 6 steps or a special state (pause / erreur / en_trade)
  const isEnTrade = currentState === 'en_trade';
  const isPause = currentState === 'pause';
  const isErreur = currentState === 'erreur';

  // Map 'en_trade' visually to between 'entree' and 'objectif_atteint'
  const activeIndex = STEPS.findIndex((s) => s.key === currentState);

  return (
    <div className="w-full rounded-2xl bg-[#10121b]/90 border border-[#232637] p-4 sm:p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#e8c56a]" />
          <h3 className="font-heading text-xs tracking-wider uppercase text-[#e8c56a]">
            Séquence tactique du robot
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {isPause && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#8d90a3]/10 text-[#8d90a3] border border-[#8d90a3]/20">
              <PauseCircle className="w-3.5 h-3.5" />
              Robot en pause
            </span>
          )}

          {isErreur && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#ff6b5b]/15 text-[#ff6b5b] border border-[#ff6b5b]/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              Anomalie système
            </span>
          )}

          {isDemo && onAdvance && (
            <button
              onClick={onAdvance}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#e8c56a]/15 text-[#e8c56a] border border-[#e8c56a]/40 hover:bg-[#e8c56a]/25 transition cursor-pointer active:scale-95"
              title="Avancer manuellement le scénario de démonstration"
            >
              <Play className="w-3 h-3" />
              <span>Étape suivante</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of the 6 steps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent =
            step.key === currentState || (step.key === 'entree' && isEnTrade);
          const isPassed =
            activeIndex !== -1 && idx < activeIndex;

          let cardStyle = 'border-[#232637] bg-[#06070c]/60 text-[#8d90a3]';
          let iconColor = 'text-[#8d90a3]';
          let badgeColor = 'bg-[#171a27] text-[#8d90a3]';

          if (isCurrent) {
            if (step.key === 'objectif_atteint') {
              cardStyle = 'border-[#7fd6ff] bg-[#7fd6ff]/10 text-[#7fd6ff] shadow-md shadow-[#7fd6ff]/15 ring-1 ring-[#7fd6ff]/40';
              iconColor = 'text-[#7fd6ff]';
              badgeColor = 'bg-[#7fd6ff] text-[#06070c] font-bold';
            } else {
              cardStyle = 'border-[#e8c56a] bg-[#e8c56a]/10 text-[#e8c56a] shadow-md shadow-[#e8c56a]/15 ring-1 ring-[#e8c56a]/40';
              iconColor = 'text-[#e8c56a]';
              badgeColor = 'bg-[#e8c56a] text-[#06070c] font-bold';
            }
          } else if (isPassed) {
            cardStyle = 'border-[#232637] bg-[#10121b] text-[#e9e6dc] opacity-75';
            iconColor = 'text-[#e8c56a]/70';
            badgeColor = 'bg-[#e8c56a]/20 text-[#e8c56a]';
          }

          return (
            <div
              key={step.key}
              className={`relative flex flex-col p-3 rounded-xl border transition-all duration-300 ${cardStyle}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono ${badgeColor}`}>
                  0{idx + 1}
                </span>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>

              <div className="font-heading text-xs font-semibold leading-snug">
                {step.label}
              </div>
              <div className="text-[10px] text-[#8d90a3] mt-0.5 truncate">
                {step.sub}
              </div>

              {isCurrent && (
                <div className="mt-2.5 pt-1.5 border-t border-current/20 flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  <span>{isEnTrade ? 'En trade actif' : 'En cours'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
