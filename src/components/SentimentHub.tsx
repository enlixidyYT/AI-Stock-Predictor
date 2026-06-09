import { useState } from "react";
import { Stock, StockAnalysis } from "../types";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, HelpCircle, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react";

interface SentimentHubProps {
  stock: Stock;
  analysis: StockAnalysis | null;
  isLoading: boolean;
  onRefreshAnalysis: (symbol: string) => void;
  error?: string;
}

export default function SentimentHub({
  stock,
  analysis,
  isLoading,
  onRefreshAnalysis,
  error,
}: SentimentHubProps) {
  // Map recommendations to color badges
  const getRecBadge = (rec: string) => {
    switch (rec) {
      case "STRONG_BUY":
        return "bg-emerald-500 text-white font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.35)]";
      case "BUY":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
      case "HOLD":
        return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
      case "SELL":
        return "bg-red-500/15 text-red-500 border border-red-500/25";
      case "STRONG_SELL":
        return "bg-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.35)]";
      default:
        return "bg-white/5 text-gray-300 border border-white/5";
    }
  };

  const getSentimentText = (score: number) => {
    if (score >= 0.6) return "Intensely Bullish";
    if (score >= 0.15) return "Moderately Bullish";
    if (score > -0.15) return "Neutral Consolidation";
    if (score > -0.6) return "Moderately Bearish";
    return "Intensely Bearish";
  };

  const scorePercentage = analysis ? Math.round(((analysis.sentimentScore + 1) / 2) * 100) : 50;

  return (
    <div id="sentiment-analysis-hub" className="bg-[#111218]/90 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-xl flex flex-col h-full gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-450 fill-blue-500/20" />
          <h2 className="text-lg font-bold text-white">Scraped AI Sentiment Hub</h2>
        </div>
        
        <button
          onClick={() => onRefreshAnalysis(stock.symbol)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
          <span>{isLoading ? "Scraping..." : "Analyze Web News"}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3.5 animate-pulse">
          <h4 className="font-bold mb-1">API Notice</h4>
          <p>{error}</p>
          <button
            onClick={() => onRefreshAnalysis(stock.symbol)}
            className="text-xs font-bold underline mt-2 text-red-400 block hover:text-red-350"
          >
            Try Fallback Analysis Profile
          </button>
        </div>
      )}

      {isLoading && !analysis ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <div className="text-center">
            <h3 className="text-sm font-bold text-white">Connecting to Live News Feeds...</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Scraping Reuters, Bloomberg, and BBC for sentiment signals on {stock.symbol} using Google Search.</p>
          </div>
        </div>
      ) : !analysis ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl">
          <HelpCircle className="w-9 h-9 text-gray-600 mb-2.5" />
          <h3 className="text-sm font-bold text-white">No Sentiment Scraped</h3>
          <p className="text-xs text-gray-400 max-w-xs mt-1.5 mb-4">Click Analyze Web News to query Gemini and Google Search for live media coverage indicators.</p>
          <button
            onClick={() => onRefreshAnalysis(stock.symbol)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
          >
            Run News Analysis
          </button>
        </div>
      ) : (
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Main gauge row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#171821]/80 border border-white/5 rounded-2xl p-4.5">
            {/* Recommendation badge & Score gauge */}
            <div className="md:col-span-5 flex flex-col items-center justify-center text-center gap-1.5 border-b md:border-b-0 md:border-r border-white/10 pb-3 md:pb-0 md:pr-4">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI DECISION</span>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${getRecBadge(analysis.recommendation)}`}>
                {analysis.recommendation.replace("_", " ")}
              </span>
              <span className="text-[11px] text-gray-400 font-bold font-mono mt-1">Target: ${analysis.targetPrice.toFixed(2)}</span>
            </div>

            {/* Score slide slider */}
            <div className="md:col-span-7 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-400 flex items-center gap-1">
                  Sentiment Index:
                  <span className="font-extrabold text-[#f1f5f9]">{getSentimentText(analysis.sentimentScore)}</span>
                </span>
                <span className="font-mono text-gray-300 font-bold">{analysis.sentimentScore > 0 ? "+" : ""}{analysis.sentimentScore.toFixed(2)}</span>
              </div>
              <div className="relative w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    analysis.sentimentScore > 0.15 
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                      : analysis.sentimentScore < -0.15 
                      ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                      : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                  }`}
                  style={{ width: `${scorePercentage}%` }}
                />
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/10" />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span>Bearish (-1.0)</span>
                <span>Neutral (0.0)</span>
                <span>Bullish (1.0)</span>
              </div>
            </div>
          </div>

          {/* Consensus Executive summary */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">News Consensus</h4>
            <div className="border border-white/5 rounded-xl p-4 bg-[#171821]/50">
              <p className="text-sm font-bold text-white italic leading-relaxed">"{analysis.newsConsensus}"</p>
              <p className="text-xs text-gray-300 mt-2 leading-relaxed">{analysis.analysisSummary}</p>
            </div>
          </div>

          {/* Scraped News Articles */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
              <span>Scraped Articles Mentioning {analysis.symbol}</span>
              <span className="text-[9px] font-mono text-gray-500 lowercase">grounded search verification</span>
            </h4>
            <div className="space-y-2">
              {analysis.recentNewsEvents.map((news, idx) => (
                <div key={idx} className="flex gap-3 justify-between items-start border border-white/5 rounded-xl p-3 bg-[#171821]/30 hover:bg-[#171821]/80 hover:border-white/10 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-blue-400 font-mono bg-blue-500/10 border border-blue-500/15 px-1.5 py-0.5 rounded uppercase">
                      {news.source}
                    </span>
                    <h5 className="text-xs font-bold text-white leading-snug">{news.title}</h5>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5 min-w-[80px]">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                      news.sentiment === "Bullish"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/15"
                        : news.sentiment === "Bearish"
                        ? "bg-red-500/15 text-red-400 border-red-500/15"
                        : "bg-white/5 text-gray-350 border-white/5"
                    }`}>
                      {news.sentiment}
                    </span>
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[10px] font-medium text-gray-400 hover:text-blue-400 flex items-center gap-0.5 transition-colors font-mono"
                    >
                      <span>source</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pros & Cons Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wide">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Catalysts & Strengths</span>
              </div>
              <ul className="space-y-1.5">
                {analysis.pros.map((p, i) => (
                  <li key={i} className="text-xs text-gray-300 list-disc ml-4 pl-0.5 leading-snug">{p}</li>
                ))}
              </ul>
            </div>

            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase tracking-wide">
                <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                <span>Risks & Headwinds</span>
              </div>
              <ul className="space-y-1.5">
                {analysis.cons.map((c, i) => (
                  <li key={i} className="text-xs text-gray-300 list-disc ml-4 pl-0.5 leading-snug">{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
