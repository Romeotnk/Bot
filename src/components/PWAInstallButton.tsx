import React, { useState } from 'react';
import { Download, HelpCircle, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#e8c56a]/15 text-[#e8c56a] border border-[#e8c56a]/40 hover:bg-[#e8c56a]/25 transition active:scale-95 cursor-pointer shadow-sm shadow-[#e8c56a]/10"
        title="Installer Viceinte sur l'écran d'accueil"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#10121b] text-[#8d90a3] border border-[#232637] hover:text-[#e9e6dc] hover:border-[#e8c56a]/40 transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#e8c56a]" />
          <span>Installer iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#10121b] border border-[#232637] p-6 shadow-2xl text-[#e9e6dc]">
              <div className="flex items-center justify-between pb-3 border-b border-[#232637]">
                <h3 className="font-heading text-sm text-[#e8c56a]">Installer sur iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-[#8d90a3] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-4 text-xs text-[#8d90a3] leading-relaxed">
                1. Touchez le bouton <strong className="text-[#e9e6dc]">Partager</strong> dans Safari (icône carrée avec une flèche vers le haut).<br /><br />
                2. Faites défiler et sélectionnez <strong className="text-[#e8c56a]">Sur l’écran d’accueil</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-[#e8c56a] text-[#06070c] font-semibold text-xs tracking-wider uppercase hover:bg-[#f6e7b8] transition"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
