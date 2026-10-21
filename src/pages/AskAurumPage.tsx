import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../context/StateContext';
import { Sparkles, Send, Bot, User, ShieldAlert, CornerDownLeft, RefreshCw } from 'lucide-react';
import { AurumChatMessage } from '../types';

export const AskAurumPage: React.FC = () => {
  const { state } = useAppState();

  const [inputQuestion, setInputQuestion] = useState('');
  const [messages, setMessages] = useState<AurumChatMessage[]>([
    {
      id: 'welcome',
      sender: 'aurum',
      text: 'Bonjour Commandant. Je suis l’interface Aurum, dédiée à la surveillance du robot sur l’or XAUUSD. Posez-moi vos questions tactiques ou sélectionnez une directive rapide ci-dessous.',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState<{ [id: string]: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText]);

  // Typewriter effect for AI messages
  const startTypewriter = (messageId: string, fullText: string) => {
    let currentIdx = 0;
    setDisplayedText((prev) => ({ ...prev, [messageId]: '' }));

    const timer = setInterval(() => {
      currentIdx += 2; // 2 characters per tick for fluid reading
      if (currentIdx >= fullText.length) {
        setDisplayedText((prev) => ({ ...prev, [messageId]: fullText }));
        clearInterval(timer);
      } else {
        setDisplayedText((prev) => ({
          ...prev,
          [messageId]: fullText.substring(0, currentIdx),
        }));
      }
    }, 20);
  };

  const askQuestion = async (q: string) => {
    const questionText = q.trim();
    if (!questionText || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: AurumChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: questionText,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    const botMsgId = `aurum-${Date.now()}`;

    try {
      const res = await fetch('/ask-aurum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText }),
      });

      if (!res.ok) {
        throw new Error('Erreur de réponse du serveur.');
      }

      const data = await res.json();
      const replyText = data.reply || 'Analyse en cours.';

      const aurumMsg: AurumChatMessage = {
        id: botMsgId,
        sender: 'aurum',
        text: replyText,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aurumMsg]);
      startTypewriter(botMsgId, replyText);
    } catch (err: any) {
      const errorMsg: AurumChatMessage = {
        id: botMsgId,
        sender: 'aurum',
        text: 'Désolé, la liaison avec le module d’inférence Aurum est momentanément indisponible. Le trading comporte des risques, vérifiez manuellement la position.',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      startTypewriter(botMsgId, errorMsg.text);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    { label: 'Que vois-tu ?', text: 'Que vois-tu actuellement sur le marché de l’or ?' },
    { label: 'Pourquoi cette entrée ?', text: 'Pourquoi le robot a-t-il pris cette entrée ou cette position ?' },
    { label: 'Quels risques ?', text: 'Quels sont les principaux risques financiers et macroéconomiques en ce moment ?' },
    { label: 'Méthode MDT H4 → M3', text: 'Comment s’applique le filtre top-down MDT (H4 vers M3) sur la configuration actuelle ?' },
    { label: 'Couleurs des zones', text: 'Rappelle-moi la signification des couleurs Order Blocks et FVG selon la méthode MDT.' },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#e8c56a]" />
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#e9e6dc]">
              Demande à Aurum
            </h1>
          </div>
          <p className="text-xs text-[#8d90a3] mt-1">
            Intelligence conversationnelle tactique connectée en temps réel au statut, aux réglages et aux 10 derniers signaux.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8c56a]/15 text-[#e8c56a] border border-[#e8c56a]/30 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#e8c56a] animate-pulse" />
          <span>Liaison active /ask-aurum</span>
        </div>
      </div>

      {/* Quick Questions Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs text-[#8d90a3] mr-1">Questions rapides :</span>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => askQuestion(q.text)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#10121b] text-[#e8c56a] border border-[#232637] hover:border-[#e8c56a]/50 hover:bg-[#171a27] transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Chat Display Window */}
      <div className="rounded-[28px] bg-[#10121b]/90 border border-[#232637] p-5 sm:p-6 shadow-2xl backdrop-blur-md hud-box hud-corners flex flex-col h-[520px]">
        <div className="hud-corner-top-right" />
        <div className="hud-corner-bottom-left" />

        {/* Message scroll container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg) => {
            const isAurum = msg.sender === 'aurum';
            const displayText = isAurum && displayedText[msg.id] !== undefined
              ? displayedText[msg.id]
              : msg.text;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isAurum ? 'items-start' : 'items-start flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                    isAurum
                      ? 'bg-gradient-to-br from-[#f6e7b8] to-[#e8c56a] text-[#06070c]'
                      : 'bg-[#232637] text-[#e9e6dc]'
                  }`}
                >
                  {isAurum ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl border ${
                    isAurum
                      ? 'bg-[#06070c]/80 border-[#232637] text-[#e9e6dc] shadow-sm'
                      : 'bg-[#e8c56a]/15 border-[#e8c56a]/40 text-[#f6e7b8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-current/10">
                    <span className="font-heading font-semibold text-[10px] uppercase tracking-wider text-[#e8c56a]">
                      {isAurum ? 'Aurum Tactique' : 'Commandant'}
                    </span>
                    <span className="text-[10px] font-mono text-[#8d90a3]">{msg.time}</span>
                  </div>

                  <p className="text-xs text-[#e9e6dc] leading-relaxed whitespace-pre-line">
                    {displayText}
                  </p>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-[#8d90a3]">
              <div className="w-7 h-7 rounded-lg bg-[#171a27] text-[#e8c56a] flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <span className="font-mono text-[11px] animate-pulse">
                Aurum analyse le carnet d'ordres et les 10 derniers signaux...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askQuestion(inputQuestion);
          }}
          className="mt-4 pt-4 border-t border-[#232637] flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Posez votre question à Aurum (ex: Pourquoi le robot a ignoré le dernier signal ?)"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl bg-[#06070c] border border-[#232637] text-xs text-[#e9e6dc] placeholder-[#8d90a3] focus:border-[#e8c56a] focus:outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isLoading || !inputQuestion.trim()}
            className="px-4 py-3 rounded-xl bg-[#e8c56a] text-[#06070c] hover:bg-[#f6e7b8] transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Disclaimers & Safety Guidance */}
      <div className="p-4 rounded-xl bg-[#06070c]/60 border border-[#232637] flex items-start gap-3 text-xs text-[#8d90a3]">
        <ShieldAlert className="w-4 h-4 text-[#e8c56a] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#e9e6dc]">Règle de transparence financière :</strong> Aurum formule des explications concises en 4 phrases maximum adaptées aux débutants. Il ne formule aucune promesse de rendement et rappelle les risques inhérents au trading de devises et métaux précieux.
        </p>
      </div>
    </div>
  );
};
