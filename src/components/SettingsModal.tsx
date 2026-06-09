import React, { useState } from "react";
import { X, Eye, EyeOff, Sliders, Cpu, Volume2, BarChart2, ShieldAlert, Sparkles, Check } from "lucide-react";

export interface AppSettings {
  geminiApiKey: string;
  refreshInterval: number;
  chartStyle: "gradient" | "neon" | "dotted" | "step";
  audioStyle: "chime" | "alarm" | "bell" | "muted";
  highlightGrowth: boolean;
  volatilityScale: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onTestTone: (style: "chime" | "alarm" | "bell" | "muted") => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings: currentSettings,
  onSave,
  onTestTone,
}: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>({ ...currentSettings });
  const [showKey, setShowKey] = useState(false);
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  if (!isOpen) return null;

  const handleFieldChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
    onTestTone(settings.audioStyle); // play confirmation chirp using the chosen style
    setIsSavedAlert(true);
    setTimeout(() => {
      setIsSavedAlert(false);
      onClose();
    }, 1200);
  };

  const handleResetDefaults = () => {
    const defaults: AppSettings = {
      geminiApiKey: "",
      refreshInterval: 4000,
      chartStyle: "gradient",
      audioStyle: "chime",
      highlightGrowth: true,
      volatilityScale: 1.0,
    };
    setSettings(defaults);
  };

  return (
    <div 
      id="quantum-settings-overlay"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    >
      <div 
        id="quantum-settings-container"
        className="bg-[#0b0c10] border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] scale-up"
      >
        {/* Head */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/5 bg-[#111218]/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold tracking-widest text-white uppercase font-mono">Control Desk & AI Scraper Key</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: AI Key */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Scraping Grounding Key</span>
            </div>
            
            <div className="bg-[#111218]/50 border border-white/5 rounded-xl p-4.5 space-y-3">
              <p className="text-xs text-gray-400 leading-relaxed">
                Add an optional personal <span className="font-bold text-white">Gemini API Key</span>. If supplied, the sentiment hub queries live Google Search grounding under your token. If empty, the app falls back to standard sandbox mock profiles.
              </p>
              
              <div className="relative flex items-center">
                <input 
                  type={showKey ? "text" : "password"}
                  value={settings.geminiApiKey}
                  onChange={(e) => handleFieldChange("geminiApiKey", e.target.value)}
                  placeholder="Enter your Gemini API Key..."
                  className="w-full bg-black/60 border border-white/10 text-white rounded-xl py-2.5 pl-3.5 pr-11 text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-start gap-1 text-[10px] text-gray-500">
                <ShieldAlert className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Key is saved entirely on your device's browser Sandbox local storage and never leaves this domain.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Poll speed */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Real-Time Ingestion Refresh Rate</span>
            </div>
            
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
              {[
                { label: "Turbo (2s)", val: 2000 },
                { label: "Standard (4s)", val: 4000 },
                { label: "Relaxed (8s)", val: 8000 },
                { label: "Manual Stop", val: 0 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleFieldChange("refreshInterval", opt.val)}
                  className={`py-2 px-1 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                    settings.refreshInterval === opt.val
                      ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/10"
                      : "bg-[#111218]/40 text-gray-400 border-white/5 hover:bg-[#111218] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1 leading-normal">
              Controls the network ping frequency fetching real-time simulator increments from standard mock API profiles.
            </p>
          </div>

          {/* Section 3: Visual Theme styling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
              <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Visualization Chart Model</span>
            </div>

            <div className="bg-[#111218]/40 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "gradient", title: "Soft Gradient", desc: "Classic area shading" },
                  { value: "neon", title: "Cyber Glow", desc: "Saturated luminous line" },
                  { value: "dotted", title: "Static Dotted", desc: "Humble precision dots" },
                  { value: "step", title: "Step Block", desc: "Rigid horizontal nodes" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleFieldChange("chartStyle", item.value as any)}
                    className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                      settings.chartStyle === item.value
                        ? "bg-white/5 text-white border-blue-500/50"
                        : "bg-transparent text-gray-400 border-white/5 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase block">{item.title}</span>
                    <span className="text-[9px] text-gray-500 font-medium leading-none mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Audio System Tone */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
              <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Chime Audio Trigger Tone</span>
            </div>

            <div className="bg-[#111218]/50 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <select
                  value={settings.audioStyle}
                  onChange={(e) => handleFieldChange("audioStyle", e.target.value as any)}
                  className="bg-black text-white text-xs border border-white/10 rounded-lg py-1.5 px-3 focus:outline-none focus:border-blue-500 block w-full max-w-[200px]"
                >
                  <option value="chime">Upward Arpeggio Chime</option>
                  <option value="alarm">Urgent Double Pulse</option>
                  <option value="bell">Retro High Bell Ping</option>
                  <option value="muted">Completely Silent</option>
                </select>
                <div className="text-[9px] text-gray-500 leading-normal">
                  Chime sound played dynamically on price threshold target alerts.
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTestTone(settings.audioStyle)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase text-[9px] tracking-wide py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Play Sound Preview</span>
              </button>
            </div>
          </div>

          {/* Section 5: Volatility & Glow Scale multipliers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Simulator Micro Volatility Scale</span>
            </div>

            <div className="bg-[#111218]/40 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-gray-400">Current Multiplier:</span>
                <span className="text-mono text-blue-400">{settings.volatilityScale.toFixed(2)}x</span>
              </div>
              
              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.25"
                value={settings.volatilityScale}
                onChange={(e) => handleFieldChange("volatilityScale", parseFloat(e.target.value))}
                className="w-full accent-blue-500 bg-black/50 rounded-lg cursor-pointer h-1.5"
              />
              
              <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                <span>0.25x (Faint)</span>
                <span>1.0x (Standard)</span>
                <span>3.0x (Crypto-Grade!)</span>
              </div>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center justify-between p-3.5 border border-white/5 bg-[#111218]/20 rounded-xl">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white uppercase tracking-wider">Dynamic Stream Border Glow</div>
              <div className="text-[9px] text-gray-500">Adds an absolute neon halo around stock cards undergoing active trading gains.</div>
            </div>
            
            <button
              type="button"
              onClick={() => handleFieldChange("highlightGrowth", !settings.highlightGrowth)}
              className={`w-11 h-6 rounded-full p-0.5 transition-all cursor-pointer ${
                settings.highlightGrowth ? "bg-blue-600 flex justify-end" : "bg-white/10 flex justify-start"
              }`}
            >
              <span className="w-5 h-5 bg-white rounded-full shadow" />
            </button>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            {isSavedAlert ? (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                <Check className="w-3.5 h-3.5" />
                <span>SETTINGS LOCKED!</span>
              </div>
            ) : (
              <button
                type="submit"
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold tracking-widest uppercase px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                Apply Changes
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
