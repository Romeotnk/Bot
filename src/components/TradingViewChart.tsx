import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, ExternalLink, RefreshCw, BarChart2 } from 'lucide-react';

interface TradingViewChartProps {
  symbol?: string; // default 'FOREXCOM:XAUUSD' or 'OANDA:XAUUSD'
  theme?: 'dark' | 'light';
  interval?: string; // '1' | '3' | '5' | '15' | '60' | '240' | 'D'
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = 'FOREXCOM:XAUUSD',
  theme = 'dark',
  interval = '5',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTf, setActiveTf] = useState(interval);
  const [activeSymbol, setActiveSymbol] = useState(symbol);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    // TradingView Advanced Real-Time Chart Widget Configuration
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: activeSymbol,
      interval: activeTf,
      timezone: 'Europe/Paris',
      theme: 'dark',
      style: '1', // Candlesticks
      locale: 'fr',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      backgroundColor: 'rgba(6, 7, 12, 1)',
      gridColor: 'rgba(35, 38, 55, 0.45)',
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'STD;EMA',
      ],
      overrides: {
        'mainSeriesProperties.candleStyle.upColor': '#7fd6ff',
        'mainSeriesProperties.candleStyle.downColor': '#ff6b5b',
        'mainSeriesProperties.candleStyle.borderUpColor': '#7fd6ff',
        'mainSeriesProperties.candleStyle.borderDownColor': '#ff6b5b',
        'mainSeriesProperties.candleStyle.wickUpColor': '#7fd6ff',
        'mainSeriesProperties.candleStyle.wickDownColor': '#ff6b5b',
      },
    });

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = 'calc(100% - 32px)';
    widgetContainer.style.width = '100%';

    container.appendChild(widgetContainer);
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [activeSymbol, activeTf, isFullscreen, key]);

  const timeframes = [
    { label: 'M1', value: '1' },
    { label: 'M3 (Trigger MDT)', value: '3' },
    { label: 'M5', value: '5' },
    { label: 'M15 (Setup MDT)', value: '15' },
    { label: 'H1 (Map MDT)', value: '60' },
    { label: 'H4 (Biais)', value: '240' },
    { label: 'D1', value: 'D' },
  ];

  return (
    <div
      className={`relative w-full rounded-[28px] overflow-hidden border border-[#232637] bg-[#06070c] shadow-2xl transition-all duration-300 hud-box hud-corners ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'h-[540px]'
      }`}
    >
      <div className="hud-corner-top-right" />
      <div className="hud-corner-bottom-left" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-[#232637]/80 bg-[#10121b]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e8c56a]/15 border border-[#e8c56a]/30">
            <BarChart2 className="w-3.5 h-3.5 text-[#e8c56a]" />
            <span className="text-xs font-bold text-[#e8c56a] font-mono tracking-wider">TradingView API</span>
            <span className="text-[10px] text-[#7fd6ff] font-mono font-medium px-1 rounded bg-[#7fd6ff]/15">Flux Réel</span>
          </div>

          <div className="flex items-center gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setActiveTf(tf.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition cursor-pointer ${
                  activeTf === tf.value
                    ? 'bg-[#e8c56a] text-[#06070c] font-bold'
                    : 'text-[#8d90a3] hover:text-[#e9e6dc] hover:bg-[#171a27]'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Symbol switcher */}
          <select
            value={activeSymbol}
            onChange={(e) => setActiveSymbol(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#06070c] border border-[#232637] text-xs font-mono text-[#e8c56a] focus:outline-none"
          >
            <option value="FOREXCOM:XAUUSD">FOREX.com : XAUUSD</option>
            <option value="OANDA:XAUUSD">OANDA : XAUUSD</option>
            <option value="TVC:GOLD">TVC : GOLD (Or comptant)</option>
            <option value="BINANCE:PAXGUSDT">Binance : PAXG/USDT (Or physique)</option>
          </select>

          <button
            onClick={() => setKey((k) => k + 1)}
            className="p-1.5 rounded-lg text-[#8d90a3] hover:text-[#e8c56a] hover:bg-[#171a27] transition cursor-pointer"
            title="Rafraîchir le widget TradingView"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-[#8d90a3] hover:text-[#e8c56a] hover:bg-[#171a27] transition cursor-pointer"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TradingView Widget Mount Point */}
      <div
        ref={containerRef}
        className="w-full h-[calc(100%-48px)] tradingview-widget-container"
      />
    </div>
  );
};
