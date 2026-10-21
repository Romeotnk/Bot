import React, { useState } from 'react';
import { CheckSquare, Square, ShieldAlert, CheckCircle2, XCircle, X } from 'lucide-react';

interface MdtChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChecklistGroup {
  title: string;
  items: { id: string; label: string }[];
}

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: '1. MAP (Biais & Contexte H4-H1)',
    items: [
      { id: 'map_1', label: 'Biais H4-H1 clairement défini (acheteur ou vendeur)' },
      { id: 'map_2', label: 'Zone principale nommée (ex: H1 OB Vendeur 4132-4136)' },
      { id: 'map_3', label: 'Cible de liquidité claire et identifiée (PDH/PDL)' },
    ],
  },
  {
    title: '2. SETUP (Position & Scénario M15)',
    items: [
      { id: 'setup_1', label: 'Prix arrivé dans la zone HTF (pas au milieu de nulle part)' },
      { id: 'setup_2', label: 'Zone encore clean (non mitigée ou trop travaillée)' },
      { id: 'setup_3', label: 'Scénario prévu avant l’arrivée (Scénario A short ou B long)' },
    ],
  },
  {
    title: '3. TRIGGER (Timing M3/M2 & Confirmation)',
    items: [
      { id: 'trig_1', label: '2 à 3 confirmations indépendantes (pas juste 1 couleur)' },
      { id: 'trig_2', label: 'Déplacement impulsif + cassure de micro-structure (BOS)' },
      { id: 'trig_3', label: 'Entrée sur retest FVG/OB (aucun chase sur bougie éclatée)' },
    ],
  },
  {
    title: '4. RISK (Gestion & Survie du Capital)',
    items: [
      { id: 'risk_1', label: 'Stop loss logique placé au niveau qui invalide réellement l’idée' },
      { id: 'risk_2', label: 'Taille du lot calculée selon le risque fixe (0.25% à 1% max)' },
      { id: 'risk_3', label: 'Ratio R:R supérieur ou égal à 2.0 validé avant le clic' },
      { id: 'risk_4', label: 'Plafond journalier (Daily loss limit) et nombre de trades respectés' },
    ],
  },
];

export const MdtChecklistModal: React.FC<MdtChecklistModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = CHECKLIST_GROUPS.reduce((acc, g) => acc + g.items.length, 0);
  const checkedCount = checkedIds.size;
  const isAllValid = checkedCount === totalItems;

  const resetAll = () => {
    setCheckedIds(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-[28px] bg-[#10121b] border border-[#232637] p-6 sm:p-7 shadow-2xl text-[#e9e6dc] my-8 hud-box hud-corners">
        <div className="hud-corner-top-right" />
        <div className="hud-corner-bottom-left" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232637]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e8c56a]" />
              <h2 className="font-heading font-extrabold text-base sm:text-lg text-[#e9e6dc] uppercase tracking-wider">
                Checklist d’Exécution MDT Masterclass
              </h2>
            </div>
            <p className="text-xs text-[#8d90a3] mt-0.5">
              À valider scrupuleusement avant tout ordre. « No setup. No trade. Next. »
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8d90a3] hover:text-white hover:bg-[#171a27] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score indicator */}
        <div className="my-4 p-3.5 rounded-xl bg-[#06070c] border border-[#232637] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-[#8d90a3]">Validations complétées :</span>
            <div className="font-heading font-bold text-sm text-[#e8c56a]">
              {checkedCount} / {totalItems} critères
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAllValid ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#7fd6ff]/15 text-[#7fd6ff] border border-[#7fd6ff]/30">
                <CheckCircle2 className="w-4 h-4" /> Setup A+ Prêt
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ff6b5b]/15 text-[#ff6b5b] border border-[#ff6b5b]/30">
                <XCircle className="w-4 h-4" /> Critères manquants : Aucun ordre
              </span>
            )}
            <button
              onClick={resetAll}
              className="px-2.5 py-1 text-[11px] text-[#8d90a3] hover:text-[#e8c56a] transition"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {CHECKLIST_GROUPS.map((group) => (
            <div key={group.title} className="p-3.5 rounded-xl bg-[#06070c]/60 border border-[#232637]/80">
              <h3 className="font-heading text-xs font-semibold text-[#e8c56a] mb-2.5">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const isChecked = checkedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition text-xs ${
                        isChecked
                          ? 'bg-[#e8c56a]/10 text-[#f6e7b8]'
                          : 'hover:bg-[#171a27] text-[#8d90a3]'
                      }`}
                    >
                      <button type="button" className="mt-0.5 shrink-0 text-[#e8c56a]">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <span className="leading-snug">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Warning quote from PDF */}
        <div className="mt-4 p-3 rounded-xl bg-[#ff6b5b]/10 border border-[#ff6b5b]/30 text-xs text-[#e9e6dc] flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-[#ff6b5b] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#ff6b5b]">Une case importante manque ?</strong> « No trade. Si le prix part sans toi, ce n’est pas une perte. C’est juste un setup que tu n’as pas eu. Rater un trade coûte 0R, forcer un trade peut coûter -1R et ta discipline. »
          </p>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#e8c56a] text-[#06070c] font-heading font-semibold text-xs tracking-wider uppercase hover:bg-[#f6e7b8] transition cursor-pointer"
          >
            Fermer la checklist
          </button>
        </div>
      </div>
    </div>
  );
};
