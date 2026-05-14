import { useNavigate, useParams } from "react-router";
import { ArrowLeft, DollarSign, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useTrades, getAdjustedPnl } from "../context/TradeContext";

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
    const { getTrade, profile } = useTrades();

    const trade = getTrade(id);
    const adjustedPnl = trade ? getAdjustedPnl(trade, profile) : 0;
    const [selectedTimeframe, setSelectedTimeframe] = useState(
        trade?.images?.length > 0 ? trade.images[0].timeframe : "1H"
    );

    if (!trade) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground space-y-4">
                <h1 className="text-2xl text-destructive">Trade details not found in RAM.</h1>
                <button onClick={() => navigate("/terminal")} className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Return to Terminal
                </button>
            </div>
        );
    }

    const hasImages = trade.images && trade.images.length > 0;
    const hasAnalysis = trade.timeframeAnalysis && trade.timeframeAnalysis.length > 0;

    return (
        <div className="min-h-screen bg-background relative text-foreground">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Header */}
            <div className="relative z-10 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                    <div className="flex items-center gap-3 sm:gap-6">
                        <button
                            onClick={() => navigate("/terminal")}
                            className="text-foreground/50 hover:text-foreground transition-colors flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl tracking-tight">Trade Dossier</h1>
                                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs tracking-wider uppercase border font-medium flex-shrink-0 ${
                                    trade.status === "winner"
                                        ? "bg-primary/10 text-primary border-primary/20"
                                        : trade.status === "loser"
                                            ? "bg-destructive/10 text-destructive border-destructive/20"
                                            : "bg-accent/10 text-accent border-accent/20"
                                }`}>
                                    {trade.status}
                                </div>
                            </div>
                            <p className="text-foreground/50 text-xs sm:text-sm">Comprehensive trade analysis & breakdown</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
                {/* Trade Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs mb-2 tracking-wider uppercase">Asset</div>
                        <div className="text-xl sm:text-2xl font-medium">{trade.asset}</div>
                    </div>
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs mb-2 tracking-wider uppercase flex items-center gap-1 sm:gap-1.5">
                            <DollarSign className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
                            <span className="hidden sm:inline">Entry → Exit</span>
                            <span className="sm:hidden">Entry/Exit</span>
                        </div>
                        <div className="text-lg sm:text-xl font-medium truncate">${trade.entry} → ${trade.exit}</div>
                    </div>
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs mb-2 tracking-wider uppercase">P&L</div>
                        <div className={`text-lg sm:text-2xl font-medium ${adjustedPnl >= 0 ? "text-primary" : "text-destructive"}`}>
                            {adjustedPnl >= 0 ? "+" : ""}${adjustedPnl.toFixed(2)} <span className="text-xs sm:text-base opacity-70">({trade.pnl >= 0 ? "+" : ""}{trade.pnlPercent?.toFixed(2) || "0.00"}%)</span>
                        </div>
                    </div>
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs mb-2 tracking-wider uppercase">Date</div>
                        <div className="text-sm sm:text-lg">{new Date(trade.startDate).toLocaleDateString()}</div>
                        <div className="text-xs text-foreground/50 mt-0.5">{new Date(trade.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>

                {/* Trade Details */}
                <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-6">
                    <h3 className="text-lg tracking-tight mb-4">Trade Details</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-foreground/50 text-sm">Direction</span>
                            <span className={`text-sm uppercase font-medium ${trade.direction === 'long' ? 'text-primary' : 'text-destructive'}`}>{trade.direction}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-foreground/50 text-sm">Pips</span>
                            <span className="text-sm text-foreground">{trade.pips || "-"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-foreground/50 text-sm">Strategy</span>
                            <span className="text-sm truncate max-w-[150px] text-right" title={tradeRationale.strategy}>{tradeRationale.strategy}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-foreground/50 text-sm">Trade ID</span>
                            <span className="text-sm text-foreground/60">#{String(trade.id).padStart(6, '0')}</span>
                        </div>
                    </div>
                </div>

                
                {/* Trade Review Section */}
                {trade.review && (
                    <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-6">
                        <div className="mb-4">
                            <h2 className="text-lg sm:text-xl tracking-tight mb-1">Trade Review</h2>
                            <p className="text-foreground/50 text-xs sm:text-sm">Personal analysis and lessons learned</p>
                        </div>
                        <div className="prose prose-invert max-w-none">
                            <p className="text-foreground/70 leading-relaxed text-sm sm:text-base">{trade.review}</p>
                        </div>
                    </div>
                )}

                {/* Trade Photos */}
                {hasImages && (
                    <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-6">
                        <div className="mb-4 sm:mb-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg sm:text-xl tracking-tight">Added Trade Photos</h2>
                                    <p className="text-foreground/50 text-xs sm:text-sm">Screenshots and chart images attached when the trade was created.</p>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-muted/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-foreground/70">
                                    {trade.images.length} item{trade.images.length === 1 ? "" : "s"}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                            {trade.images.map((img) => (
                                <div key={img.id || img.url} className="overflow-hidden rounded-2xl border border-border bg-background/70">
                                    <img
                                        src={img.url}
                                        alt={img.timeframe ? `${img.timeframe} trade photo` : "Trade photo"}
                                        className="h-40 w-full object-cover"
                                    />
                                    <div className="px-3 py-2 bg-card/70 border-t border-border text-xs text-foreground/60">
                                        {img.timeframe ? `${img.timeframe} view` : "Attached photo"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chart Images & Timeframe Analysis */}
                {(hasImages || hasAnalysis) && (
                    <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-6">
                        <div className="mb-4 sm:mb-6">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                <ImageIcon className="w-5 sm:w-6 h-5 sm:h-6 text-primary flex-shrink-0" />
                                <h2 className="text-lg sm:text-xl tracking-tight">Multi-Timeframe Analysis</h2>
                            </div>
                            <p className="text-foreground/50 text-xs sm:text-sm">Chart screenshots and analysis across different timeframes</p>
                        </div>

                        <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe} className="space-y-4 sm:space-y-6">
                            <TabsList className="bg-muted border border-border p-1 w-full justify-start overflow-x-auto">
                                {trade.images?.map((img) => (
                                    <TabsTrigger
                                        key={img.timeframe}
                                        value={img.timeframe}
                                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 sm:px-4 text-xs sm:text-sm"
                                    >
                                        {img.timeframe}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {trade.images?.map((img) => {
                                return (
                                    <TabsContent key={img.timeframe} value={img.timeframe} className="space-y-4 mt-4 sm:mt-6">
                                        {/* Chart Image */}
                                        <div className="rounded-xl overflow-hidden border border-border bg-card/40 flex justify-center max-h-[500px] sm:max-h-[600px]">
                                            <img
                                                src={img.url}
                                                alt={`${img.timeframe} chart`}
                                                className="max-h-full w-auto object-contain"
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