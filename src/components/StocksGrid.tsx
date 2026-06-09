import { useEffect, useRef, useState } from "react";
import { Stock } from "../types";
import { TrendingUp, TrendingDown, Clock, Layers } from "lucide-react";

interface StocksGridProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelectStock: (symbol: string) => void;
  isLoading: boolean;
  highlightGrowth?: boolean;
}

export default function StocksGrid({
  stocks,
  selectedSymbol,
  onSelectStock,
  isLoading,
  highlightGrowth = true,
}: StocksGridProps) {
  // We want to track previous prices to display blink transitions
  const prevPricesRef = useRef<Record<string, number>>({});
  const [blinkStates, setBlinkStates] = useState<Record<string, "up" | "down" | null>>({});

  useEffect(() => {
    const nextBlinks: Record<string, "up" | "down" | null> = {};
    let hasChanges = false;

    stocks.forEach((stock) => {
      const prevPrice = prevPricesRef.current[stock.symbol];
      if (prevPrice !== undefined && prevPrice !== stock.currentPrice) {
        nextBlinks[stock.symbol] = stock.currentPrice > prevPrice ? "up" : "down";
        hasChanges = true;
      }
      prevPricesRef.current[stock.symbol] = stock.currentPrice;
    });

    if (hasChanges) {
      setBlinkStates((prev) => ({ ...prev, ...nextBlinks }));
      
      // Clean up blinking visual state after 800ms
      const timer = setTimeout(() => {
        setBlinkStates({});
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [stocks]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-0.5">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>Tracked Asset Ticker Grid</span>
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-gray-400 capitalize">
          <Clock className="w-3 h-3 text-blue-500 animate-pulse" />
          <span>Dynamic Live Ticks</span>
        </span>
      </div>

      {isLoading && stocks.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/[0.02] p-2 rounded-2xl border border-white/[0.06] backdrop-blur-md">
          {stocks.map((stock) => {
            const isSelected = stock.symbol === selectedSymbol;
            const priceChange = stock.currentPrice - stock.prevClosePrice;
            const priceChangePercent = (priceChange / stock.prevClosePrice) * 100;
            const isPricePositive = priceChange >= 0;
            const isTopGainer = highlightGrowth && isPricePositive && priceChangePercent >= 1.2;
            
            const blink = blinkStates[stock.symbol];
            let borderClass = "border-white/5";
            let bgClass = "bg-[#111218]/60 hover:bg-[#16171f]/80";
            
            if (isSelected) {
              borderClass = "border-blue-500 ring-2 ring-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]";
              bgClass = "bg-blue-600/10";
            } else if (blink === "up") {
              borderClass = "border-emerald-500 scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.15)]";
              bgClass = "bg-emerald-500/10";
            } else if (blink === "down") {
              borderClass = "border-red-500 scale-[1.02] shadow-[0_0_15px_rgba(239,68,68,0.11)]";
              bgClass = "bg-red-500/10";
            } else if (isTopGainer) {
              borderClass = "border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.12)] hover:border-emerald-500/50";
              bgClass = "bg-[#111218]/70 hover:bg-[#16171f]/90";
            } else {
              borderClass = "border-white/5 hover:border-white/15 h-28 shadow-3xs";
            }

            return (
              <button
                key={stock.symbol}
                id={`stock-card-${stock.symbol}`}
                onClick={() => onSelectStock(stock.symbol)}
                className={`relative outline-none overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 select-none cursor-pointer flex flex-col justify-between h-28 ${bgClass} ${borderClass}`}
              >
                {/* Visual pulse for ticks */}
                {blink && (
                  <span className={`absolute top-0 left-0 w-full h-1 ${
                    blink === "up" ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-pulse"
                  }`} />
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-extrabold text-white font-sans tracking-tight">{stock.symbol}</h3>
                    <p className="text-[10px] text-gray-400 font-medium truncate max-w-[110px]">{stock.name}</p>
                  </div>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/5">
                    {stock.sector.split("/")[0]}
                  </span>
                </div>

                <div className="mt-2.5">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-base font-extrabold text-white font-mono tracking-tight">
                      ${stock.currentPrice.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-bold font-mono py-0.5 px-1 rounded flex items-center gap-0.5 border ${
                      isPricePositive 
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                        : "text-red-400 bg-red-500/10 border-red-500/20"
                    }`}>
                      {isPricePositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      <span>{isPricePositive ? "+" : ""}{priceChangePercent.toFixed(2)}%</span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
