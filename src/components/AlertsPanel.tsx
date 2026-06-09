import { useState, useEffect, FormEvent } from "react";
import { Stock, PriceAlert } from "../types";
import { Bell, BellOff, Plus, Trash2, CheckCircle2, ChevronRight, Volume2 } from "lucide-react";
import { playChimeNotification } from "../utils/audio";

interface AlertsPanelProps {
  stocks: Stock[];
  alerts: PriceAlert[];
  onAddAlert: (symbol: string, targetPrice: number, type: "ABOVE" | "BELOW") => void;
  onAddBulkAlerts: (bulkAlerts: { symbol: string; targetPrice: number; type: "ABOVE" | "BELOW" }[]) => void;
  onClearAllAlerts: () => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  notificationPermission: string;
  onRequestPermission: () => void;
}

export default function AlertsPanel({
  stocks,
  alerts,
  onAddAlert,
  onAddBulkAlerts,
  onClearAllAlerts,
  onDeleteAlert,
  onToggleAlert,
  notificationPermission,
  onRequestPermission,
}: AlertsPanelProps) {
  const [selectedSymbol, setSelectedSymbol] = useState("ALL_COMPANIES");
  const [targetPrice, setTargetPrice] = useState("5.00");
  const [alertType, setAlertType] = useState<"ABOVE" | "BELOW">("ABOVE");
  const [errorMess, setErrorMess] = useState("");

  // Keep symbol updated optionally if we aren't using ALL_COMPANIES by default
  useEffect(() => {
    if (stocks.length > 0 && !selectedSymbol) {
      setSelectedSymbol("ALL_COMPANIES");
    }
  }, [stocks]);

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMess("");

    const valNum = parseFloat(targetPrice);
    if (isNaN(valNum) || valNum <= 0) {
      setErrorMess(selectedSymbol === "ALL_COMPANIES"
        ? "Please enter a valid percentage offset greater than 0%."
        : "Please enter a valid target price greater than 0."
      );
      return;
    }

    if (selectedSymbol === "ALL_COMPANIES") {
      const bulkAlertsData = stocks.map(stock => {
        const target = alertType === "ABOVE"
          ? Number((stock.currentPrice * (1 + valNum / 100)).toFixed(2))
          : Number((stock.currentPrice * (1 - valNum / 100)).toFixed(2));
        return {
          symbol: stock.symbol,
          targetPrice: target,
          type: alertType,
        };
      });
      onAddBulkAlerts(bulkAlertsData);
      setTargetPrice("5.00");
    } else {
      onAddAlert(selectedSymbol, valNum, alertType);
      setTargetPrice("");
    }
    // Play a gentle confirm chime
    playChimeNotification();
  };

  return (
    <div id="alerts-panel-card" className="bg-[#111218]/90 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-xl flex flex-col h-full gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500 animate-pulse" />
          <h2 className="text-lg font-bold text-white">Alert Center</h2>
        </div>
        
        {/* Permission Badge */}
        <button
          onClick={onRequestPermission}
          type="button"
          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
            notificationPermission === "granted"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
              : notificationPermission === "denied"
              ? "bg-red-500/10 border-red-500/20 text-red-400 cursor-default"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/25 hover:border-blue-500/45 cursor-pointer"
          }`}
        >
          {notificationPermission === "granted" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real Alerts Active</span>
            </>
          ) : notificationPermission === "denied" ? (
            <>
              <BellOff className="w-3.5 h-3.5 text-red-400" />
              <span>No System Alerts</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
              <span>Enable Push Alerts</span>
            </>
          )}
        </button>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Asset Target</label>
            <select
              value={selectedSymbol}
              onChange={(e) => {
                setSelectedSymbol(e.target.value);
                if (e.target.value === "ALL_COMPANIES") {
                  setTargetPrice("5.00");
                } else {
                  const st = stocks.find(s => s.symbol === e.target.value);
                  if (st) {
                    setTargetPrice(st.currentPrice.toFixed(2));
                  }
                }
              }}
              className="w-full text-sm border border-white/5 rounded-lg p-2.5 bg-[#171821] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <optgroup label="Bulk Automation" className="bg-[#111218] text-blue-400 font-bold font-mono">
                <option value="ALL_COMPANIES" className="bg-[#111218] text-blue-400 font-bold">
                  ⚡ ALL COMPANIES (Bulk)
                </option>
              </optgroup>
              <optgroup label="Individual Assets" className="bg-[#111218] text-gray-400">
                {stocks.map((stock) => (
                  <option key={stock.symbol} value={stock.symbol} className="bg-[#111218] text-white">
                    {stock.symbol} — {stock.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Condition</label>
            <div className="flex gap-1.5 p-1 bg-[#171821] border border-white/5 rounded-lg">
              <button
                type="button"
                onClick={() => setAlertType("ABOVE")}
                className={`flex-1 text-center py-1 rounded text-xs font-bold uppercase tracking-wider transition-all swap-button ${
                  alertType === "ABOVE"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-gray-400 hover:text-white bg-transparent"
                }`}
              >
                Goes Above
              </button>
              <button
                type="button"
                onClick={() => setAlertType("BELOW")}
                className={`flex-1 text-center py-1 rounded text-xs font-bold uppercase tracking-wider transition-all swap-button ${
                  alertType === "BELOW"
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-gray-400 hover:text-white bg-transparent"
                }`}
              >
                Goes Below
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex justify-between">
            {selectedSymbol === "ALL_COMPANIES" ? (
              <>
                <span>Relative Percentage Offset (%)</span>
                <span className="text-blue-400 font-mono text-[9px] uppercase tracking-wide">All prices relative scale</span>
              </>
            ) : (
              <>
                <span>Target Price ($)</span>
                {selectedStock && (
                  <span className="text-gray-400 font-mono">Current: ${selectedStock.currentPrice.toFixed(2)}</span>
                )}
              </>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
              {selectedSymbol === "ALL_COMPANIES" ? "%" : "$"}
            </span>
            <input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder={selectedSymbol === "ALL_COMPANIES" ? "e.g. 5.00" : "e.g. 195.00"}
              className="w-full pl-7 pr-4 py-2.5 text-sm border border-white/5 bg-[#171821] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {errorMess && <p className="text-xs font-semibold text-red-400 mt-1">{errorMess}</p>}

        <button
          type="submit"
          className="w-full bg-white text-black hover:bg-gray-100 rounded-xl py-2.5 text-xs font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4 text-black stroke-[3px]" />
          <span>{selectedSymbol === "ALL_COMPANIES" ? "Create Alerts for All Companies" : "Add Price Alert"}</span>
        </button>
      </form>

      {/* Alerts Checklist */}
      <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Active Watchlist Alerts</label>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <button
              onClick={() => {
                if (stocks.length === 0) return;
                const bulk = stocks.map(s => ({
                  symbol: s.symbol,
                  targetPrice: Number((s.currentPrice * 1.05).toFixed(2)),
                  type: "ABOVE" as const
                }));
                onAddBulkAlerts(bulk);
                playChimeNotification();
              }}
              type="button"
              className="text-[9px] font-bold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 px-2 py-0.5 rounded transition-all cursor-pointer"
              title="Bulk auto-add ABOVE alerts at +5% for all stocks"
            >
              +5% ABOVE
            </button>
            <button
              onClick={() => {
                if (stocks.length === 0) return;
                const bulk = stocks.map(s => ({
                  symbol: s.symbol,
                  targetPrice: Number((s.currentPrice * 0.95).toFixed(2)),
                  type: "BELOW" as const
                }));
                onAddBulkAlerts(bulk);
                playChimeNotification();
              }}
              type="button"
              className="text-[9px] font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 px-2 py-0.5 rounded transition-all cursor-pointer"
              title="Bulk auto-add BELOW alerts at -5% for all stocks"
            >
              -5% BELOW
            </button>
            {alerts.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all active watch alerts?")) {
                    onClearAllAlerts();
                  }
                }}
                type="button"
                className="text-[9px] font-bold text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 px-2 py-0.5 rounded transition-all cursor-pointer"
                title="Reset/Delete all configured targets"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-white/5 rounded-xl">
            <BellOff className="w-7 h-7 text-gray-650 mx-auto mb-2" />
            <p className="text-xs text-gray-450">No price alerts defined. Try adding one above.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const stock = stocks.find(s => s.symbol === alert.symbol);
            const currentPrice = stock?.currentPrice || 0;
            
            return (
              <div
                key={alert.id}
                className={`relative overflow-hidden group border rounded-xl p-3.5 flex items-center justify-between transition-all ${
                  alert.isTriggered
                    ? "bg-white/5 border-white/5 opacity-60"
                    : "bg-[#171821]/50 border-white/5 hover:border-white/10 hover:bg-[#171821]/80"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white text-sm">{alert.symbol}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        alert.type === "ABOVE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {alert.type === "ABOVE" ? "Above" : "Below"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 font-mono">
                    <span>Target:</span>
                    <span className="font-semibold text-white">${alert.targetPrice.toFixed(2)}</span>
                    <span className="text-white/10">|</span>
                    <span>Live:</span>
                    <span className="text-gray-300">${currentPrice.toFixed(2)}</span>
                  </div>
                  {alert.isTriggered && alert.triggeredAt && (
                    <div className="text-[10px] text-blue-400 font-medium flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Triggered at {new Date(alert.triggeredAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {!alert.isTriggered && (
                    <button
                      onClick={() => onToggleAlert(alert.id)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        alert.isActive
                          ? "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20"
                          : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                      }`}
                      title={alert.isActive ? "Pause Alert" : "Activate Alert"}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteAlert(alert.id)}
                    className="p-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
