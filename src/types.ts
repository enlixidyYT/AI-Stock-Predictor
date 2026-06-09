export interface StockHistoryItem {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  prevClosePrice: number;
  volume: number;
  sector: string;
  history: StockHistoryItem[];
}

export interface NewsEvent {
  title: string;
  source: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  url: string;
}

export interface StockAnalysis {
  symbol: string;
  name: string;
  recommendation: "BUY" | "STRONG_BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  sentimentScore: number;
  newsConsensus: string;
  analysisSummary: string;
  recentNewsEvents: NewsEvent[];
  pros: string[];
  cons: string[];
  targetPrice: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  type: "ABOVE" | "BELOW";
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
}
