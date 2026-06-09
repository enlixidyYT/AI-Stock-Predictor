import { useState, useEffect } from "react";
import { Stock, PriceAlert, StockAnalysis } from "./types";
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Clock, 
  Activity, 
  X, 
  Volume2, 
  ShieldAlert, 
  AlertCircle,
  PlayCircle,
  Settings
} from "lucide-react";
import StocksGrid from "./components/StocksGrid";
import StockChart from "./components/StockChart";
import AlertsPanel from "./components/AlertsPanel";
import SentimentHub from "./components/SentimentHub";
import SettingsModal, { AppSettings } from "./components/SettingsModal";
import { playChimeNotification, playAlarmNotification } from "./utils/audio";

// In-app alert notification schema
interface TriggeredToast {
  id: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  type: "ABOVE" | "BELOW";
}

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, StockAnalysis>>({});
  
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [latestToast, setLatestToast] = useState<TriggeredToast | null>(null);
  const [utcTime, setUtcTime] = useState(new Date());

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("quantum_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          geminiApiKey: localStorage.getItem("gemini_api_key") || parsed.geminiApiKey || "",
          refreshInterval: parsed.refreshInterval !== undefined ? parsed.refreshInterval : 4000,
          chartStyle: parsed.chartStyle || "gradient",
          audioStyle: parsed.audioStyle || "chime",
          highlightGrowth: parsed.highlightGrowth !== undefined ? parsed.highlightGrowth : true,
          volatilityScale: parsed.volatilityScale !== undefined ? parsed.volatilityScale : 1.0,
        };
      } catch (e) {}
    }
    return {
      geminiApiKey: localStorage.getItem("gemini_api_key") || "",
      refreshInterval: 4000,
      chartStyle: "gradient",
      audioStyle: "chime",
      highlightGrowth: true,
      volatilityScale: 1.0,
    };
  });

  const triggerAudioFeedback = (style: "chime" | "alarm" | "bell" | "muted" = settings.audioStyle) => {
    if (style === "muted") return;
    
    if (style === "alarm") {
      playAlarmNotification();
    } else if (style === "bell") {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch (e) {}
    } else {
      playChimeNotification();
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem("quantum_settings", JSON.stringify(newSettings));
    localStorage.setItem("gemini_api_key", newSettings.geminiApiKey);
  };

  // Core application bootstrap & clock
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    const savedAlerts = localStorage.getItem("stock_alerts2");
    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch (err) {
        console.warn("Could not parse saved custom alerts:", err);
      }
    }

    const utcTimer = setInterval(() => {
      setUtcTime(new Date());
    }, 1000);

    return () => {
      clearInterval(utcTimer);
    };
  }, []);

  // Poll stocks with user-configured frequency rate and simulator volatility modifiers
  useEffect(() => {
    fetchStocks();

    if (settings.refreshInterval <= 0) {
      return;
    }

    const stockTimer = setInterval(() => {
      fetchStocks();
    }, settings.refreshInterval);

    return () => clearInterval(stockTimer);
  }, [settings.refreshInterval, settings.volatilityScale]);

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/stocks");
      const data = await res.json();
      if (data.success) {
        let loadedStocks = data.stocks as Stock[];
        
        // Premium customization: Inject extra volatility jitter client-side if scaled
        if (settings.volatilityScale !== 1.0) {
          loadedStocks = loadedStocks.map(s => {
            // fluctuation range based on scalar value
            const maxFluct = s.currentPrice * 0.0016 * settings.volatilityScale;
            const fluctuation = (Math.random() - 0.495) * maxFluct;
            const currentPrice = Number(Math.max(1, s.currentPrice + fluctuation).toFixed(2));
            
            // adapt high and low metrics accordingly
            let high = s.highPrice;
            let low = s.lowPrice;
            if (currentPrice > high) high = currentPrice;
            if (currentPrice < low) low = currentPrice;
            
            return {
              ...s,
              currentPrice,
              highPrice: high,
              lowPrice: low,
            };
          });
        }
        
        setStocks(loadedStocks);
      }
      setIsLoadingStocks(false);
    } catch (err) {
      console.error("Error fetching live stock pricing tickers:", err);
    }
  };

  const selectedStock = stocks.find((s) => s.symbol === selectedSymbol);

  // Auto-analyze selected stock if not loaded yet
  useEffect(() => {
    if (selectedSymbol && !analyses[selectedSymbol] && !isLoadingAnalysis && stocks.length > 0) {
      handleAnalyzeStock(selectedSymbol);
    }
  }, [selectedSymbol, stocks]);

  const handleAnalyzeStock = async (symbol: string) => {
    setIsLoadingAnalysis(true);
    setAnalysisError("");
    try {
      const customKey = settings.geminiApiKey;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customKey && customKey.trim().length > 0) {
        headers["x-gemini-api-key"] = customKey.trim();
      }

      const res = await fetch(`/api/stocks/${symbol}/analysis`, {
        method: "POST",
        headers: headers
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalyses((prev) => ({
          ...prev,
          [symbol]: data.analysis
        }));
        if (data.keyWarning) {
          setAnalysisError(data.keyWarning);
        }
      } else {
        setAnalysisError(data.error || "Execution completed with custom fallback profile.");
      }
    } catch (err: any) {
      setAnalysisError("Network timeout: Serves beautiful high-fidelity backup simulation below.");
      console.error("Could not query scraped analysis backend:", err);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Check alerts in state for price movements
  useEffect(() => {
    if (stocks.length === 0 || alerts.length === 0) return;

    let updated = false;
    const nextAlerts = alerts.map((alert) => {
      if (alert.isTriggered || !alert.isActive) return alert;

      const stock = stocks.find((s) => s.symbol === alert.symbol);
      if (!stock) return alert;

      let triggered = false;
      if (alert.type === "ABOVE" && stock.currentPrice >= alert.targetPrice) {
        triggered = true;
      } else if (alert.type === "BELOW" && stock.currentPrice <= alert.targetPrice) {
        triggered = true;
      }

      if (triggered) {
        updated = true;
        
        // 1. Browser Push Notifications
        if (Notification.permission === "granted") {
          try {
            new Notification(`Price Alert Triggered: ${alert.symbol}`, {
              body: `${alert.symbol} went ${alert.type === "ABOVE" ? "above" : "below"} your alert ceiling of $${alert.targetPrice.toFixed(2)} (Live price is $${stock.currentPrice.toFixed(2)})!`,
              icon: "/favicon.ico"
            });
          } catch (notifErr) {
            console.warn("Push triggering failed inside sandbox frame:", notifErr);
          }
        }

        // 2. Synthesize High-Fidelity Alarm via Web Audio API 
        triggerAudioFeedback();

        // 3. UI Slide-in Toast Banner State
        setLatestToast({
          id: alert.id,
          symbol: alert.symbol,
          targetPrice: alert.targetPrice,
          currentPrice: stock.currentPrice,
          type: alert.type
        });

        return {
          ...alert,
          isTriggered: true,
          triggeredAt: new Date().toISOString()
        };
      }
      return alert;
    });

    if (updated) {
      setAlerts(nextAlerts);
      localStorage.setItem("stock_alerts2", JSON.stringify(nextAlerts));
    }
  }, [stocks, alerts]);

  // Alert State Handlers
  const handleAddAlert = (symbol: string, targetPrice: number, type: "ABOVE" | "BELOW") => {
    const newAlert: PriceAlert = {
      id: "alert-" + Math.random().toString(36).substring(2, 9),
      symbol,
      targetPrice,
      type,
      isActive: true,
      isTriggered: false
    };
    
    const nextList = [newAlert, ...alerts];
    setAlerts(nextList);
    localStorage.setItem("stock_alerts2", JSON.stringify(nextList));
  };

  const handleAddBulkAlerts = (bulkAlerts: { symbol: string; targetPrice: number; type: "ABOVE" | "BELOW" }[]) => {
    const newAlerts: PriceAlert[] = bulkAlerts.map((b) => ({
      id: "alert-" + Math.random().toString(36).substring(2, 9),
      symbol: b.symbol,
      targetPrice: b.targetPrice,
      type: b.type,
      isActive: true,
      isTriggered: false
    }));
    
    const nextList = [...newAlerts, ...alerts];
    setAlerts(nextList);
    localStorage.setItem("stock_alerts2", JSON.stringify(nextList));
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
    localStorage.setItem("stock_alerts2", JSON.stringify([]));
  };

  const handleDeleteAlert = (id: string) => {
    const nextList = alerts.filter((a) => a.id !== id);
    setAlerts(nextList);
    localStorage.setItem("stock_alerts2", JSON.stringify(nextList));
  };

  const handleToggleAlert = (id: string) => {
    const nextList = alerts.map((a) => {
      if (a.id === id) {
        return { ...a, isActive: !a.isActive };
      }
      return a;
    });
    setAlerts(nextList);
    localStorage.setItem("stock_alerts2", JSON.stringify(nextList));
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Traditional browser notifications are not supported in this frame.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === "granted") {
      new Notification("Stock AI Tracker", {
        body: "Real-time alerts and native push chimes are now fully active!",
      });
      playChimeNotification();
    }
  };

  // Selection change
  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  // Calc index change
  let priceChange = 0;
  let priceChangePercent = 0;
  let isPricePositive = true;

  if (selectedStock) {
    priceChange = selectedStock.currentPrice - selectedStock.prevClosePrice;
    priceChangePercent = (priceChange / selectedStock.prevClosePrice) * 100;
    isPricePositive = priceChange >= 0;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col antialiased">
      {/* Dynamic Slide-in Toast Banner for Price Alerts */}
      {latestToast && (
        <div 
          id="alert-toast-banner"
          className="fixed bottom-6 right-6 max-w-sm w-full bg-[#111218] border border-white/10 text-white rounded-2xl shadow-2xl p-4.5 z-50 flex flex-col gap-3 slide-in-bottom animate-bounce shadow-orange-500/10"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/15 text-orange-400">
                <ShieldAlert className="w-5.5 h-5.5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                  PRICE ALERT TRIGGERED
                </h4>
                <p className="text-xs text-slate-350 mt-0.5">
                  <span className="font-bold text-white font-mono">{latestToast.symbol}</span> went{" "}
                  <span className={`font-bold ${latestToast.type === "ABOVE" ? "text-emerald-400" : "text-red-400"}`}>
                    {latestToast.type === "ABOVE" ? "Above" : "Below"}
                  </span>{" "}
                  ${latestToast.targetPrice.toFixed(2)}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setLatestToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="text-[11px] text-slate-400">
              Live price: <span className="font-mono font-bold text-white">${latestToast.currentPrice.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                setLatestToast(null);
                playChimeNotification();
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-extrabold tracking-wide uppercase px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer animate-pulse"
            >
              Acknowledge Alert
            </button>
          </div>
        </div>
      )}

      {/* Top Premium Grid Nav Header */}
      <header className="bg-[#111218]/40 border-b border-white/[0.06] backdrop-blur-md shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Sub */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg italic text-white select-none shadow-lg shadow-blue-500/20">
              Q
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight uppercase text-white">Quantum<span className="text-blue-500">AI</span> Tracker</h1>
              <p className="hidden md:block text-[9px] text-gray-500 font-bold uppercase tracking-widest">News Scraping & Sentiment Analysis Interface</p>
            </div>
          </div>

          {/* Connection Indicators & UTC Clock */}
          <div className="flex items-center gap-3">
            {/* Live Connection Flag */}
            <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-450 px-2 py-0.5 text-[10px] rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span>Live Market Data</span>
            </div>

            {/* Control Desk Setting Gear Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all py-1.5 px-3 rounded-lg cursor-pointer"
              title="Open Dynamic Control Panel & API Keys"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Control Panel</span>
            </button>

            {/* Simulated Live Alert Button to Test Ring */}
            <button
              onClick={() => {
                triggerAudioFeedback();
              }}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors py-1.5 px-3 rounded-lg cursor-pointer"
              title="Test system chime sound synthesis"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden xs:inline">Test Tones</span>
            </button>

            {/* System Clock */}
            <div className="text-right pl-3 border-l border-white/10 font-mono text-xs text-gray-400">
              <div className="font-bold flex items-center gap-1 text-white">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{utcTime.toISOString().split("T")[1].slice(0, 8)}</span>
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5 leading-none">{utcTime.toISOString().split("T")[0]}</div>
            </div>
          </div>

        </div>
      </header>

      {/* Hero Banner Grid (Short overview info banner) */}
      <div className="bg-[#111218]/20 border-b border-white/[0.05] py-3 relative shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-5 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-5">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded">Live Stream Indicators</span>
            
            {stocks.map((s) => {
              const diff = s.currentPrice - s.prevClosePrice;
              const diffPercent = (diff / s.prevClosePrice) * 100;
              const pos = diff >= 0;
              return (
                <button
                  key={s.symbol}
                  onClick={() => setSelectedSymbol(s.symbol)}
                  className="flex items-center gap-1.5 text-xs hover:bg-white/5 p-1 px-2.5 rounded-lg transition-all"
                >
                  <span className="font-bold text-gray-400 font-mono">{s.symbol}:</span>
                  <span className="font-semibold text-white font-mono">${s.currentPrice.toFixed(2)}</span>
                  <span className={`font-bold font-mono text-[10px] ${pos ? "text-emerald-400" : "text-red-400"}`}>
                    {pos ? "+" : ""}{diffPercent.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-1 bg-amber-500/5 border border-amber-500/10 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>AI evaluates news outlets on ticker select</span>
          </div>
        </div>
      </div>

      {/* Main App Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-5 flex flex-col gap-5 min-h-0">
        
        {/* Tickers grid (Blink states configured here) */}
        <section className="shrink-0">
          <StocksGrid
            stocks={stocks}
            selectedSymbol={selectedSymbol}
            onSelectStock={handleSelectStock}
            isLoading={isLoadingStocks}
            highlightGrowth={settings.highlightGrowth}
          />
        </section>

        {/* Dynamic Multi-Panel Bento Work Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          
          {/* Left Column: Visual Graph and Live News Scraper Panel */}
          <div className="lg:col-span-8 flex flex-col gap-5 min-h-0">
            
            {/* Visual charting sheet */}
            {selectedStock && (
              <div id="chart-panel-bento" className="bg-[#111218]/90 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-xl shrink-0">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-white font-sans tracking-tight">{selectedStock.name}</h2>
                      <span className="text-sm font-bold font-mono text-gray-450">({selectedStock.symbol})</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedStock.sector} · Daily Trading Profile</p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-extrabold font-mono text-white leading-none">
                      ${selectedStock.currentPrice.toFixed(2)}
                    </div>
                    <div className={`text-xs font-bold font-mono mt-1 flex items-center justify-end gap-0.5 ${
                      isPricePositive ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {isPricePositive ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                      <span>{isPricePositive ? "+" : ""}{priceChange.toFixed(2)} ({isPricePositive ? "+" : ""}{priceChangePercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>

                <StockChart stock={selectedStock} chartStyle={settings.chartStyle} />
              </div>
            )}

            {/* Sentiment analysis & grounded sources hub */}
            {selectedStock && (
              <div className="flex-1 min-h-0">
                <SentimentHub
                  stock={selectedStock}
                  analysis={analyses[selectedSymbol] || null}
                  isLoading={isLoadingAnalysis}
                  onRefreshAnalysis={handleAnalyzeStock}
                  error={analysisError}
                />
              </div>
            )}
            
          </div>

          {/* Right Column: Custom Condition Alerts Area */}
          <div className="lg:col-span-4 min-h-0">
            <AlertsPanel
              stocks={stocks}
              alerts={alerts}
              onAddAlert={handleAddAlert}
              onAddBulkAlerts={handleAddBulkAlerts}
              onClearAllAlerts={handleClearAllAlerts}
              onDeleteAlert={handleDeleteAlert}
              onToggleAlert={handleToggleAlert}
              notificationPermission={notificationPermission}
              onRequestPermission={handleRequestPermission}
            />
          </div>

        </div>

      </main>

      {/* Editorial footer info layout */}
      <footer className="bg-transparent border-t border-white/5 py-3.5 shrink-0 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <p>© 2026 Stock AI Tracker. Grounded on Web search data. Invest at your own risk.</p>
          <div className="flex gap-4 font-mono text-gray-650">
            <span>Server Ingress Port: 3000</span>
            <span className="text-blue-500 font-bold">● Active Sandbox Instance</span>
          </div>
        </div>
      </footer>

      {/* Control Desk Modal Overlays */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onTestTone={triggerAudioFeedback}
      />
    </div>
  );
}
