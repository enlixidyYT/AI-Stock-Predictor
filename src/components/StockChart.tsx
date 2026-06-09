import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Stock } from "../types";

interface StockChartProps {
  stock: Stock;
  chartStyle?: "gradient" | "neon" | "dotted" | "step";
}

export default function StockChart({ stock, chartStyle = "gradient" }: StockChartProps) {
  // Format history for chart
  const data = stock.history.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Price: item.price,
  }));

  // Determine if stock is generally positive in history
  const firstPrice = stock.history[0]?.price || 0;
  const isUp = stock.currentPrice >= firstPrice;
  
  let strokeColor = isUp ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"; // Emerald-500 or Red-500
  let strokeWidth = 2;
  let strokeDasharray: string | undefined = undefined;
  let areaType: "step" | "monotone" = "monotone";
  let stopOpacity = 0.3;

  if (chartStyle === "neon") {
    strokeWidth = 3;
    stopOpacity = 0.55;
  } else if (chartStyle === "dotted") {
    strokeDasharray = "4 4";
    strokeWidth = 2;
  } else if (chartStyle === "step") {
    areaType = "step";
  }

  return (
    <div id="stock-chart-container" className="w-full h-72 pr-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={stopOpacity} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.04)" />
          <XAxis 
            dataKey="date" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "var(--font-mono)" }} 
            dy={8}
          />
          <YAxis 
            domain={["auto", "auto"]} 
            orientation="right" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0c0d12",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
              color: "#ffffff",
              fontFamily: "var(--font-sans)"
            }}
            formatter={(value) => [`$${value}`, "Price"]}
          />
          <Area 
            type={areaType} 
            dataKey="Price" 
            stroke={strokeColor} 
            strokeWidth={strokeWidth} 
            strokeDasharray={strokeDasharray}
            fillOpacity={1} 
            fill={`url(#gradient-${stock.symbol})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
