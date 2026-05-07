import { useNavigate, useParams } from "react-router";
import { ArrowLeft, TrendingUp, Calendar, DollarSign, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useTrades, getAdjustedPnl } from "../context/TradeContext"; // Added RAM Context

// Mock candlestick data for the visual chart
const candlestickData = [
    { time: "09:00", open: 42300, high: 42600, low: 42200, close: 42500 },
    { time: "10:00", open: 42500, high: 42800, low: 42400, close: 42700 },
    { time: "11:00", open: 42700, high: 43100, low: 42650, close: 43000 },
    { time: "12:00", open: 43000, high: 43200, low: 42800, close: 42900 },
    { time: "13:00", open: 42900, high: 43300, low: 42850, close: 43200 },
    { time: "14:00", open: 43200, high: 43600, low: 43100, close: 43500 },
    { time: "15:00", open: 43500, high: 44000, low: 43400, close: 43800 },
    { time: "16:00", open: 43800, high: 44200, low: 43700, close: 44100 },
    { time: "17:00", open: 44100, high: 44500, low: 44000, close: 44300 },
    { time: "18:00", open: 44300, high: 45000, low: 44200, close: 44800 },
    { time: "19:00", open: 44800, high: 45300, low: 44700, close: 45200 },
];

const tradeRationale = {
    strategy: "Breakout Trading",
    entryReason: "Price broke above the previous resistance at $42,000 with significant volume increase. RSI was showing bullish momentum at 62, not yet overbought. MACD crossover confirmed the bullish signal.",
    exitReason: "Target reached at psychological resistance of $45,000. Profit taking zone aligned with previous major resistance level. Risk-reward ratio of 3.2:1 was achieved.",
    risk: "Stop loss was set at $41,800, representing 1.5% downside risk from entry.",
    notes: "Market sentiment was positive due to favorable regulatory news. Bitcoin dominance was increasing, supporting the bullish thesis.",
};

export function DetailedViewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getTrade, profile } = useTrades(); // Pull from RAM

    const trade = getTrade(id);
    const adjustedPnl = trade ? getAdjustedPnl(trade, profile) : 0;
    const [selectedTimeframe, setSelectedTimeframe] = useState(
        trade?.images?.length > 0 ? trade.images[0].timeframe : "1H"
    );

    if (!trade) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white space-y-4">
                <h1 className="text-2xl text-[#FF3D3D]">Trade details not found in RAM.</h1>
                <button onClick={() => navigate("/terminal")} className="text-[#00D1FF] hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Return to Terminal
                </button>
            </div>
        );
    }

    const hasImages = trade.images && trade.images.length > 0;
    const hasAnalysis = trade.timeframeAnalysis && trade.timeframeAnalysis.length > 0;

    return (
        <div className="min-h-screen bg-[#0A0A0A] relative text-white">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Header */}
            <div className="relative z-10 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate("/terminal")}
                            className="text-white/50 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl tracking-tight">Trade Dossier</h1>
                                <div className={`px-3 py-1 rounded-full text-xs tracking-wider uppercase border font-medium ${
                                    trade.status === "winner"
                                        ? "bg-[#00FF85]/10 text-[#00FF85] border-[#00FF85]/20"
                                        : trade.status === "loser"
                                            ? "bg-[#FF3D3D]/10 text-[#FF3D3D] border-[#FF3D3D]/20"
                                            : "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20"
                                }`}>
                                    {trade.status}
                                </div>
                            </div>
                            <p className="text-white/40 text-sm">Comprehensive trade analysis & breakdown</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Trade Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-xs mb-2 tracking-wider uppercase">Asset</div>
                        <div className="text-2xl font-medium">{trade.asset}</div>
                    </div>
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-xs mb-2 tracking-wider uppercase flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            Entry → Exit
                        </div>
                        <div className="text-xl font-medium">${trade.entry} → ${trade.exit}</div>
                    </div>
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-xs mb-2 tracking-wider uppercase flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            P&L
                        </div>
                        <div className={`text-2xl font-medium ${adjustedPnl >= 0 ? "text-[#00FF85]" : "text-[#FF3D3D]"}`}>
                            {adjustedPnl >= 0 ? "+" : ""}${adjustedPnl.toFixed(2)} <span className="text-base opacity-70">({trade.pnl >= 0 ? "+" : ""}{trade.pnlPercent?.toFixed(2) || "0.00"}%)</span>
                        </div>
                    </div>
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-xs mb-2 tracking-wider uppercase flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Start Date
                        </div>
                        <div className="text-lg">{new Date(trade.startDate).toLocaleDateString()}</div>
                        <div className="text-sm text-white/50 mt-0.5">{new Date(trade.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Chart - Takes 2 columns */}
                    <div className="col-span-2 bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                        <div className="mb-6">
                            <h2 className="text-xl tracking-tight mb-1">Price Action</h2>
                            <p className="text-white/40 text-sm">Candlestick chart showing trade execution window</p>
                        </div>

                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={candlestickData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="time"
                                    stroke="rgba(255,255,255,0.3)"
                                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                />
                                <YAxis
                                    domain={[41500, 45500]}
                                    stroke="rgba(255,255,255,0.3)"
                                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#141414',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                />
                                {/* Candlestick bodies */}
                                <Bar dataKey={(data) => [data.open, data.close]} fill="#00D1FF">
                                    {candlestickData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.close >= entry.open ? "#00FF85" : "#FF3D3D"}
                                        />
                                    ))}
                                </Bar>
                                {/* High-Low wicks */}
                                <Line
                                    type="monotone"
                                    dataKey="high"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth={1}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="low"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth={1}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>

                        {/* Entry/Exit markers */}
                        <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#C5A059]" />
                                <span className="text-sm text-white/60">Entry: ${trade.entry}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#00D1FF]" />
                                <span className="text-sm text-white/60">Exit: ${trade.exit}</span>
                            </div>
                        </div>
                    </div>

                    {/* Trade Details - Takes 1 column */}
                    <div className="space-y-4">
                        <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                            <h3 className="text-lg mb-4 tracking-tight">Trade Details</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-white/50 text-sm">Direction</span>
                                    <span className={`text-sm uppercase font-medium ${trade.direction === 'long' ? 'text-[#00D1FF]' : 'text-[#FF3D3D]'}`}>{trade.direction}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-white/50 text-sm">Pips</span>
                                    <span className="text-sm">{trade.pips || "-"}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-white/50 text-sm">Strategy</span>
                                    <span className="text-sm truncate max-w-[120px]" title={tradeRationale.strategy}>{tradeRationale.strategy}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-white/50 text-sm">Trade ID</span>
                                    <span className="text-sm text-white/40">#{String(trade.id).padStart(6, '0')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trade Review Section */}
                {trade.review && (
                    <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                        <div className="mb-4">
                            <h2 className="text-xl tracking-tight mb-1">Trade Review</h2>
                            <p className="text-white/40 text-sm">Personal analysis and lessons learned</p>
                        </div>
                        <div className="prose prose-invert max-w-none">
                            <p className="text-white/70 leading-relaxed">{trade.review}</p>
                        </div>
                    </div>
                )}

                {/* Chart Images & Timeframe Analysis */}
                {(hasImages || hasAnalysis) && (
                    <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-1">
                                <ImageIcon className="w-6 h-6 text-[#00D1FF]" />
                                <h2 className="text-xl tracking-tight">Multi-Timeframe Analysis</h2>
                            </div>
                            <p className="text-white/40 text-sm">Chart screenshots and analysis across different timeframes</p>
                        </div>

                        <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe} className="space-y-6">
                            <TabsList className="bg-white/5 border border-white/10 p-1">
                                {trade.images?.map((img) => (
                                    <TabsTrigger
                                        key={img.timeframe}
                                        value={img.timeframe}
                                        className="data-[state=active]:bg-[#00D1FF] data-[state=active]:text-[#0A0A0A] px-4"
                                    >
                                        {img.timeframe}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {trade.images?.map((img) => {
                                return (
                                    <TabsContent key={img.timeframe} value={img.timeframe} className="space-y-4 mt-6">
                                        {/* Chart Image */}
                                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 flex justify-center">
                                            <img
                                                src={img.url}
                                                alt={`${img.timeframe} chart`}
                                                className="max-h-[600px] w-auto object-contain"
                                            />
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    </div>
                )}
            </div>
        </div>
    );
}