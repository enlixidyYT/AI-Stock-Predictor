import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// --- Stock Simulator Setup ---
interface StockHistoryItem {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  prevClosePrice: number;
  volume: number;
  history: StockHistoryItem[];
  sector: string;
}

// Initial Mock Seed Data helper
function generateMockHistory(basePrice: number, days: number = 30): StockHistoryItem[] {
  const history: StockHistoryItem[] = [];
  const now = new Date();
  
  let current = basePrice * 0.95; // Start history slightly lower
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    
    // Simulate some simple up/down walk
    const changePercent = (Math.random() - 0.48) * 0.03; // Slight upward bias
    current = current * (1 + changePercent);
    
    const open = current * (1 + (Math.random() - 0.5) * 0.01);
    const close = current;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(500000 + Math.random() * 2500000);
    
    history.push({
      date: dateStr,
      price: Number(current.toFixed(2)),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }
  return history;
}

const STOCKS_DATABASE: Stock[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    currentPrice: 194.50,
    openPrice: 193.20,
    highPrice: 195.40,
    lowPrice: 192.80,
    prevClosePrice: 193.10,
    volume: 52000000,
    sector: "Technology",
    history: generateMockHistory(194.50)
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    currentPrice: 173.80,
    openPrice: 172.50,
    highPrice: 174.50,
    lowPrice: 172.00,
    prevClosePrice: 172.10,
    volume: 28000000,
    sector: "Technology",
    history: generateMockHistory(173.80)
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    currentPrice: 418.20,
    openPrice: 416.00,
    highPrice: 419.80,
    lowPrice: 415.50,
    prevClosePrice: 415.80,
    volume: 21000000,
    sector: "Technology",
    history: generateMockHistory(418.20)
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    currentPrice: 128.45,
    openPrice: 125.10,
    highPrice: 129.50,
    lowPrice: 124.60,
    prevClosePrice: 124.80,
    volume: 145000000,
    sector: "Technology/Semiconductors",
    history: generateMockHistory(128.45)
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    currentPrice: 184.10,
    openPrice: 186.50,
    highPrice: 187.40,
    lowPrice: 181.20,
    prevClosePrice: 185.90,
    volume: 87000000,
    sector: "Automotive/Clean Tech",
    history: generateMockHistory(184.10)
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    currentPrice: 186.75,
    openPrice: 185.20,
    highPrice: 187.90,
    lowPrice: 184.60,
    prevClosePrice: 184.90,
    volume: 34000000,
    sector: "Consumer Cyclical",
    history: generateMockHistory(186.75)
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    currentPrice: 485.40,
    openPrice: 482.10,
    highPrice: 488.20,
    lowPrice: 480.50,
    prevClosePrice: 481.50,
    volume: 18000000,
    sector: "Technology/Communication",
    history: generateMockHistory(485.40)
  },
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    currentPrice: 622.15,
    openPrice: 618.00,
    highPrice: 625.50,
    lowPrice: 615.20,
    prevClosePrice: 617.50,
    volume: 4500000,
    sector: "Communication/Entertainment",
    history: generateMockHistory(622.15)
  },
  {
    symbol: "SPY",
    name: "S&P 500 ETF Trust",
    currentPrice: 518.50,
    openPrice: 516.20,
    highPrice: 519.80,
    lowPrice: 515.60,
    prevClosePrice: 515.80,
    volume: 78000000,
    sector: "Indices / US Broad Market",
    history: generateMockHistory(518.50)
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust (Nasdaq 100)",
    currentPrice: 442.10,
    openPrice: 439.80,
    highPrice: 443.50,
    lowPrice: 438.20,
    prevClosePrice: 438.90,
    volume: 46000000,
    sector: "Indices / US Tech Core",
    history: generateMockHistory(442.10)
  },
  {
    symbol: "DIA",
    name: "SPDR Dow Jones Industrial Average ETF",
    currentPrice: 391.20,
    openPrice: 389.50,
    highPrice: 391.90,
    lowPrice: 388.70,
    prevClosePrice: 389.10,
    volume: 5200000,
    sector: "Indices / US Blue Chip Leaders",
    history: generateMockHistory(391.20)
  },
  {
    symbol: "BRK.B",
    name: "Berkshire Hathaway Inc.",
    currentPrice: 405.60,
    openPrice: 403.10,
    highPrice: 406.80,
    lowPrice: 402.50,
    prevClosePrice: 402.90,
    volume: 3200000,
    sector: "Financials / Conglomerate",
    history: generateMockHistory(405.60)
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    currentPrice: 196.40,
    openPrice: 194.80,
    highPrice: 197.30,
    lowPrice: 193.90,
    prevClosePrice: 194.20,
    volume: 12000000,
    sector: "Financials / Banking Moat",
    history: generateMockHistory(196.40)
  },
  {
    symbol: "LLY",
    name: "Eli Lilly & Co.",
    currentPrice: 762.50,
    openPrice: 758.00,
    highPrice: 765.20,
    lowPrice: 753.00,
    prevClosePrice: 755.90,
    volume: 4100000,
    sector: "Healthcare / Biotech",
    history: generateMockHistory(762.50)
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil Corp.",
    currentPrice: 116.80,
    openPrice: 115.50,
    highPrice: 117.40,
    lowPrice: 114.90,
    prevClosePrice: 115.10,
    volume: 16000000,
    sector: "Energy / Oil & Gas",
    history: generateMockHistory(116.80)
  },
  {
    symbol: "WMT",
    name: "Walmart Inc.",
    currentPrice: 60.40,
    openPrice: 59.80,
    highPrice: 60.75,
    lowPrice: 59.60,
    prevClosePrice: 59.70,
    volume: 15200000,
    sector: "Consumer Staples / Retail",
    history: generateMockHistory(60.40)
  },
  {
    symbol: "DIS",
    name: "The Walt Disney Co.",
    currentPrice: 112.50,
    openPrice: 111.90,
    highPrice: 113.80,
    lowPrice: 110.80,
    prevClosePrice: 111.40,
    volume: 8500000,
    sector: "Communications / Entertainment",
    history: generateMockHistory(112.50)
  }
];

// Tick prices to simulate a real-time market
function tickStocks() {
  STOCKS_DATABASE.forEach(stock => {
    // Random fluctuation between -0.4% and +0.45% (slight upward bias)
    const changePercent = (Math.random() - 0.47) * 0.008;
    const oldPrice = stock.currentPrice;
    const nextPrice = Number((oldPrice * (1 + changePercent)).toFixed(2));
    
    stock.currentPrice = nextPrice;
    
    if (nextPrice > stock.highPrice) {
      stock.highPrice = nextPrice;
    }
    if (nextPrice < stock.lowPrice) {
      stock.lowPrice = nextPrice;
    }
    stock.volume += Math.floor(Math.random() * 1500);

    // Update the last history item to match current price
    if (stock.history.length > 0) {
      const lastIndex = stock.history.length - 1;
      stock.history[lastIndex].price = nextPrice;
      stock.history[lastIndex].close = nextPrice;
      if (nextPrice > stock.history[lastIndex].high) {
        stock.history[lastIndex].high = nextPrice;
      }
      if (nextPrice < stock.history[lastIndex].low) {
        stock.history[lastIndex].low = nextPrice;
      }
    }
  });
}

// Tick every 4 seconds
setInterval(tickStocks, 4000);

// --- Gemini Client Helper / Mock Backup Data Generators ---
function getMockAnalysis(symbol: string, stock: any) {
  const mockAnalysisMap: Record<string, any> = {
    AAPL: {
      symbol: "AAPL",
      name: "Apple Inc.",
      recommendation: "BUY",
      sentimentScore: 0.65,
      newsConsensus: "Strong Demand for AI-Enabled Hardware, Steady Services Expansion",
      analysisSummary: "Reuters reports resilient iPhone shipment values with a sharp uptake of AI-integrated processors. BBC notes that regulatory pressures in Europe present safe-harbor litigation headwinds, but Bloomberg forecasts double-digit revenue expansion in subscription services which offsets hardware cycles.",
      recentNewsEvents: [
        { title: "Apple explores smart home devices with premium AI screen controllers", source: "Bloomberg", sentiment: "Bullish", url: "https://www.bloomberg.com" },
        { title: "EU antitrust watchdogs intensify scrutiny on iOS ecosystem policies", source: "BBC", sentiment: "Bearish", url: "https://www.bbc.com/news" },
        { title: "Supplier reports robust guidance on upcoming mixed-reality silicon orders", source: "Reuters", sentiment: "Bullish", url: "https://www.reuters.com" }
      ],
      pros: ["Immense high-margin Services scaling", "Global consumer brand loyalty cushions recessions", "Superior cash reserves for R&D buybacks"],
      cons: ["Intense EU and US regulatory spotlight", "Hardware replacement cycles are stretching longer"],
      targetPrice: 220.00
    },
    GOOGL: {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      recommendation: "STRONG_BUY",
      sentimentScore: 0.82,
      newsConsensus: "AI Cloud Market Acceleration and Dominant search monetisation",
      analysisSummary: "Reuters notes Alphabet's latest tensor units are securing hyper-scaler client commitments. Bloomberg reports corporate clients are transitioning to enterprise Gemini API stacks, with high ad metrics proving resilient. BBC covers US judicial hearings, but analysts highlight margins as a solid buffer.",
      recentNewsEvents: [
        { title: "Google Cloud reports explosive multi-billion run-rate in AI enterprise partnerships", source: "Bloomberg", sentiment: "Bullish", url: "https://www.bloomberg.com" },
        { title: "Regulatory focus on search engine defaults sparks debate in federal circuit", source: "BBC", sentiment: "Neutral", url: "https://www.bbc.com/news" },
        { title: "Google maps integrations rolled out to global logistics networks", source: "Reuters", sentiment: "Bullish", url: "https://www.reuters.com" }
      ],
      pros: ["Exceptional cost efficiencies in cloud infrastructures", "Ad revenues continue expanding at solid rates", "Leading scientific research position in transformer architectures"],
      cons: ["Antitrust actions could force search contract changes", "Ramped capital expenditures in graphics processors may compress initial free cash flow"],
      targetPrice: 195.00
    },
    NVDA: {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      recommendation: "STRONG_BUY",
      sentimentScore: 0.90,
      newsConsensus: "Unmatched GPU Moat as AI Hyper-scalers Triple CapEx",
      analysisSummary: "Bloomberg reports major technology platforms have locked in Blackwell product allocations for the next four quarters. Reuters highlights that custom-silicon competitors are struggling to match NVIDIA's software CUDA developer lock-in. BBC covers localized export controls, but overall demand dramatically outpaces supply constraints.",
      recentNewsEvents: [
        { title: "Nvidia announces new architecture with massive efficiency multipliers", source: "Reuters", sentiment: "Bullish", url: "https://www.reuters.com" },
        { title: "Hyper-scalers assert data-center spending to increase substantially", source: "Bloomberg", sentiment: "Bullish", url: "https://www.bloomberg.com" },
        { title: "Custom chip design startups raise billions but face CUDA lock-in hurdles", source: "Reuters", sentiment: "Neutral", url: "https://www.reuters.com" }
      ],
      pros: ["Extremely wide competitive moat via CUDA software ecosystem", "Incredible gross margins above 75%", "Virtually lockstep secular alignment with AI buildout"],
      cons: ["High concentration of revenue among top 4 hyper-scaler clients", "Export limitations on compute chips to secondary regions"],
      targetPrice: 155.00
    }
  };

  return mockAnalysisMap[symbol] || {
    symbol: symbol,
    name: stock.name,
    recommendation: "HOLD",
    sentimentScore: 0.15,
    newsConsensus: "Consolidation Phase Amid Light Volatilities",
    analysisSummary: `Reuters and Bloomberg reports highlight moderate volume consolidation. Analysts from major networks share balanced outlooks, noting steady fundamental metrics with localized supply chain adaptations. Historical patterns indicate historical support levels remain untested.`,
    recentNewsEvents: [
      { title: `${stock.name} launches updated products targeting commercial business verticals`, source: "Reuters", sentiment: "Neutral", url: "https://www.reuters.com" },
      { title: "Quarterly institutional holdings reveal steady index fund inflows", source: "Bloomberg", sentiment: "Bullish", url: "https://www.bloomberg.com" }
    ],
    pros: ["Solid quarterly fundamental revenue base", "Low beta index correlations mitigate systemic crashes"],
    cons: ["Growth velocities are settling into mature averages", "Sector competition remains active"],
    targetPrice: Number((stock.currentPrice * 1.08).toFixed(2))
  };
}

function getAI(customApiKey?: string): GoogleGenAI {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured or is using the placeholder. Please enter a valid API key in the Settings section.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });
}

// --- API Routes ---

// 1. Get all stocks
app.get("/api/stocks", (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    stocks: STOCKS_DATABASE
  });
});

// 2. Get single stock detail
app.get("/api/stocks/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const stock = STOCKS_DATABASE.find(s => s.symbol === symbol);
  
  if (!stock) {
    res.status(404).json({ success: false, error: "Stock ticker not found." });
    return;
  }
  
  res.json({ success: true, stock });
});

// 3. AI Sentiment Analysis scraping news sources using Google Search Grounding
app.post("/api/stocks/:symbol/analysis", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const stock = STOCKS_DATABASE.find(s => s.symbol === symbol);
  
  if (!stock) {
    res.status(404).json({ success: false, error: "Stock ticker not found" });
    return;
  }

  const customKey = req.headers["x-gemini-api-key"] as string | undefined;
  const hasCustomKey = !!(customKey && customKey.trim().length > 0);
  const hasEnvKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");

  // Bypass entirely if no API keys are available, instantly delivering simulated premium analysis profiles
  if (!hasCustomKey && !hasEnvKey) {
    const symbolBackup = getMockAnalysis(symbol, stock);
    res.json({
      success: true,
      analysis: symbolBackup,
      backupSourceUsed: "AI Simulated Preview",
      keyWarning: "GEMINI_API_KEY environment variable is not set with a real key, providing premium simulation profile. Please add a valid API key in your Settings panel to enable real scraped Google Search grounding.",
      webReferences: [
        { title: `${symbol} Investment Summary (Reuters)`, uri: "https://www.reuters.com" },
        { title: `${stock.name} Corporate Developments (Bloomberg)`, uri: "https://www.bloomberg.com" },
        { title: `BBC Business Coverage - ${symbol}`, uri: "https://www.bbc.com/news" }
      ],
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const ai = getAI(customKey);
    const prompt = `Perform a comprehensive financial sentiment analysis of news and historical data regarding ${stock.name} (${symbol}). 
Search recent news sources like Reuters, Bloomberg, CNBC, BBC, and other major financial channels for articles and sentiment trends in June 2026.
Based on the news and historical data patterns, analyze whether it is best to BUY, SELL, or HOLD.

Return your response STRICTLY as a JSON object, formatted as follows without any backticks, markdown markers, or leading/trailing text:
{
  "symbol": "${symbol}",
  "name": "${stock.name}",
  "recommendation": "BUY" | "STRONG_BUY" | "HOLD" | "SELL" | "STRONG_SELL",
  "sentimentScore": <a float between -1.0 (extremely bearish) and 1.0 (extremely bullish)>,
  "newsConsensus": "<A short direct summary phrase of what news tells us>",
  "analysisSummary": "<Detailed, 3-4 sentence analytical review of BBC, Reuters, and Bloomberg coverage and price patterns>",
  "recentNewsEvents": [
    { "title": "<Simulated or found article title>", "source": "<Reuters / Bloomberg / BBC>", "sentiment": "Bearish" | "Bullish" | "Neutral", "url": "<news url or approximate source pointer>" }
  ],
  "pros": ["Reason 1 why it might go up / solid driver", "Reason 2"],
  "cons": ["Risk factor 1 / headwind", "Risk factor 2"],
  "targetPrice": <Expected price in next 12 months based on sentiment consensus>
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const textOutput = response.text || "";
    
    // Attempt clean JSON extraction, removing potential markdown ticks
    let cleanText = textOutput.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    let analysisData;
    try {
      analysisData = JSON.parse(cleanText);
    } catch (parseErr) {
      console.warn("Retrieved text was not perfect JSON, returning structured fallback string analysis", textOutput);
      throw new Error("Could not parse AI response as valid JSON structure. Received text: " + textOutput);
    }

    // Capture grounding URLs if present
    const sources: any[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && Array.isArray(groundingChunks)) {
      groundingChunks.forEach(chunk => {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || "External Source Information",
            uri: chunk.web.uri
          });
        }
      });
    }

    res.json({
      success: true,
      analysis: analysisData,
      webReferences: sources,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("Gemini analysis error:", err);
    
    // If they supplied an API key and it failed directly from Gemini, propagate a clear validation message
    const errorMessage = err.message || "";
    if (customKey && customKey.trim().length > 0 && (
      errorMessage.includes("API key") || 
      errorMessage.includes("key is invalid") || 
      errorMessage.includes("INVALID_ARGUMENT") || 
      errorMessage.includes("API_KEY_INVALID") ||
      errorMessage.includes("403") ||
      errorMessage.includes("key not found")
    )) {
      res.status(400).json({
        success: false,
        error: `Dynamic API Key Error: Your custom Gemini API Key appears invalid or unauthorized (${errorMessage.substring(0, 80)}). Please verify it in Settings.`
      });
      return;
    }
    
    const symbolBackup = getMockAnalysis(symbol, stock);

    res.json({
      success: true,
      analysis: symbolBackup,
      backupSourceUsed: "Static Fallback",
      webReferences: [
        { title: `${symbol} Investment Summary (Reuters)`, uri: "https://www.reuters.com" },
        { title: `${stock.name} Corporate Developments (Bloomberg)`, uri: "https://www.bloomberg.com" },
        { title: `BBC Business Coverage - ${symbol}`, uri: "https://www.bbc.com/news" }
      ],
      timestamp: new Date().toISOString()
    });
  }
});

// Serve frontend assets
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Stock Market Tracker API running on http://localhost:${PORT}`);
});
