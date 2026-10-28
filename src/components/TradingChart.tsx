import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { Candle, Levels, TradePlan, BotState } from '../types';
import { Maximize2, Minimize2, Eye, ShieldAlert, Crosshair } from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  levels?: Levels;
  plan?: TradePlan | null;
  botState: BotState;
  lastPrice: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  levels,
  plan,
  botState,
  lastPrice,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fvgBounds, setFvgBounds] = useState<{ top: number; bottom: number; height: number } | null>(null);

  // Initialize and update chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    // Clear previous elements
    container.innerHTML = '';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: isFullscreen ? window.innerHeight - 140 : 440,
      layout: {
        background: { type: ColorType.Solid, color: '#090b12' },
        textColor: '#8d90a3',
        fontFamily: "'Manrope', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(35, 38, 55, 0.45)' },
        horzLines: { color: 'rgba(35, 38, 55, 0.45)' },
      },
      crosshair: {
        vertLine: {
          color: '#e8c56a',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#171a27',
        },
        horzLine: {
          color: '#e8c56a',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#171a27',
        },
      },
      timeScale: {
        borderColor: '#232637',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#232637',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
    });

    chartInstanceRef.current = chart;

    // Add Candlestick Series (Institutional Emerald / Crimson)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', // Emerald green
      downColor: '#f43f5e', // Crimson red
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    seriesRef.current = candleSeries;

    // Sort and set candle data
    if (candles && candles.length > 0) {
      const sorted = [...candles].sort((a, b) => a.time - b.time);
      // Remove duplicates
      const uniqueCandles: Candle[] = [];
      const seenTimes = new Set<number>();
      for (const c of sorted) {
        if (!seenTimes.has(c.time)) {
          seenTimes.add(c.time);
          uniqueCandles.push(c);
        }
      }
      candleSeries.setData(uniqueCandles as any);
      chart.timeScale().fitContent();
    }

    // Add Liquidity levels (dotted gold for Asian, dashed champagne for Prev Day)
    if (levels) {
      if (levels.asian_high) {
        candleSeries.createPriceLine({
          price: levels.asian_high,
          color: '#e8c56a',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'Haut Asie (Liq)',
        });
      }
      if (levels.asian_low) {
        candleSeries.createPriceLine({
          price: levels.asian_low,
          color: '#e8c56a',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'Bas Asie (Liq)',
        });
      }
      if (levels.prev_day_high) {
        candleSeries.createPriceLine({
          price: levels.prev_day_high,
          color: '#f6e7b8',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Haut veille (PDH)',
        });
      }
      if (levels.prev_day_low) {
        candleSeries.createPriceLine({
          price: levels.prev_day_low,
          color: '#f6e7b8',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Bas veille (PDL)',
        });
      }
    }

    // Add Active Plan lines (Entry, Stop Loss, Take Profit)
    if (plan) {
      if (plan.entry) {
        candleSeries.createPriceLine({
          price: plan.entry,
          color: '#e8c56a',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'Entrée (Plan)',
        });
      }
      if (plan.stop_loss) {
        candleSeries.createPriceLine({
          price: plan.stop_loss,
          color: '#ff6b5b',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'Stop (SL)',
        });
      }
      if (plan.take_profit) {
        candleSeries.createPriceLine({
          price: plan.take_profit,
          color: '#7fd6ff',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'Objectif (TP)',
        });
      }

      // Track FVG area coordinates
      const updateFvgCoords = () => {
        if (!seriesRef.current) return;
        const topY = seriesRef.current.priceToCoordinate(plan.fvg_top);
        const bottomY = seriesRef.current.priceToCoordinate(plan.fvg_bottom);
        if (topY !== null && bottomY !== null) {
          const minY = Math.min(topY, bottomY);
          const height = Math.abs(bottomY - topY);
          setFvgBounds({
            top: minY,
            bottom: Math.max(topY, bottomY),
            height: Math.max(height, 8),
          });
        }
      };

      chart.timeScale().subscribeVisibleTimeRangeChange(updateFvgCoords);
      updateFvgCoords();
    }

    const handleResize = () => {
      if (container && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: container.clientWidth,
          height: isFullscreen ? window.innerHeight - 140 : 440,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, levels, plan, isFullscreen]);

  return (
    <div
      className={`relative w-full rounded-[28px] overflow-hidden border border-[#232637] bg-[#090b12] shadow-2xl transition-all duration-300 hud-box hud-corners ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : ''
      }`}
    >
      {/* Sci-fi HUD corner reticles */}
      <div className="hud-corner-top-right" />
      <div className="hud-corner-bottom-left" />

      {/* Header bar of the chart */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#232637]/80 bg-[#10121b]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e8c56a]/10 border border-[#e8c56a]/30">
            <Crosshair className="w-3.5 h-3.5 text-[#e8c56a]" />
            <span className="text-xs font-bold text-[#e8c56a] font-mono tracking-wider">XAUUSD</span>
            <span className="text-[10px] text-[#8d90a3] font-mono">5m</span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <span className="text-[#8d90a3]">
              Dernier : <strong className="text-[#e9e6dc] tabular-nums font-semibold">{lastPrice.toFixed(2)} $</strong>
            </span>
            {plan && (
              <>
                <span className="text-[#e8c56a]/80">
                  Entrée : <strong className="text-[#e8c56a] tabular-nums">{plan.entry.toFixed(2)}</strong>
                </span>
                <span className="text-[#ff6b5b]/80">
                  SL : <strong className="text-[#ff6b5b] tabular-nums">{plan.stop_loss.toFixed(2)}</strong>
                </span>
                <span className="text-[#7fd6ff]/80">
                  TP : <strong className="text-[#7fd6ff] tabular-nums">{plan.take_profit.toFixed(2)}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {botState === 'surveillance' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8c56a]/10 border border-[#e8c56a]/30 text-[11px] text-[#e8c56a]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8c56a] animate-pulse" />
              <span>Balayage radar actif</span>
            </div>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-[#8d90a3] hover:text-[#e8c56a] hover:bg-[#171a27] transition"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Chart Canvas Viewport */}
      <div className="relative w-full">
        {/* Radar beam scan overlay when robot is in surveillance mode */}
        {botState === 'surveillance' && (
          <div className="absolute inset-y-0 w-32 pointer-events-none z-10 radar-sweep-bar bg-gradient-to-r from-transparent via-[#e8c56a]/15 to-transparent blur-sm" />
        )}

        {/* FVG translucent gold zone overlay */}
        {plan && fvgBounds && (
          <div
            className="absolute left-0 right-16 pointer-events-none z-0 border-y border-[#e8c56a]/40 bg-[#e8c56a]/10 backdrop-blur-[1px] transition-all duration-300"
            style={{
              top: `${fvgBounds.top}px`,
              height: `${fvgBounds.height}px`,
            }}
          >
            <div className="absolute right-3 top-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[#e8c56a]/20 text-[#e8c56a] border border-[#e8c56a]/30">
              FVG Retest ({plan.fvg_bottom.toFixed(1)} - {plan.fvg_top.toFixed(1)})
            </div>
          </div>
        )}

        {/* Lightweight Charts Mount */}
        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* Legend footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-[#232637]/60 bg-[#06070c]/90 text-[11px] text-[#8d90a3]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 border-b border-dotted border-[#e8c56a]" />
            <span>Haut/Bas Asie</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 border-b border-dashed border-[#f6e7b8]" />
            <span>Haut/Bas Veille (PDH/PDL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-[#e8c56a]/20 border border-[#e8c56a]/50" />
            <span>Zone FVG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#ff6b5b]" />
            <span>Stop Loss</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[#7fd6ff]" />
            <span>Objectif TP</span>
          </div>
        </div>

        <div className="text-[10px] text-[#8d90a3]/80 font-mono">
          Flux M5 agrégé · Unités 80 bougies
        </div>
      </div>
    </div>
  );
};
