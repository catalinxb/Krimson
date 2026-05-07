import { useNavigate } from "react-router";
import { ArrowLeft, Star, TrendingUp, Award, BrainCircuit, Terminal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { useTrades, getAdjustedPnl } from "../context/TradeContext";
import { useState, useEffect } from "react";

export function PerformanceVaultPage() {
    const navigate = useNavigate();
    const { trades, profile } = useTrades();

    // --- AI STATE ---
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [fullReport, setFullReport] = useState(null);
    const [displayedReport, setDisplayedReport] = useState("");

    // --- DYNAMIC RAM CALCULATIONS ---
    const totalPnL = trades.reduce((sum, item) => sum + getAdjustedPnl(item, profile), 0);
    const winningTrades = trades.filter((t) => t.status === "winner");
    const losingTrades = trades.filter((t) => t.status === "loser");

    const winLossData = [
        { name: "Winners", value: winningTrades.length, color: "#00FF85" },
        { name: "Losers", value: losingTrades.length, color: "#FF3D3D" },
    ];

    const totalCompleted = winningTrades.length + losingTrades.length;
    const winRate = totalCompleted > 0 ? ((winningTrades.length / totalCompleted) * 100).toFixed(1) : "0.0";

    const totalProfit = winningTrades.reduce((sum, t) => sum + getAdjustedPnl(t, profile), 0);
    const totalLoss = losingTrades.reduce((sum, t) => sum + getAdjustedPnl(t, profile), 0);
    const avgProfit = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(totalLoss / losingTrades.length) : 0;

    const avgPnLComparison = [
        { name: "Average Profit", value: Math.round(avgProfit), color: "#00FF85" },
        { name: "Average Loss", value: Math.round(avgLoss), color: "#FF3D3D" },
    ];

    const monthlyDataMap = {};
    trades.forEach((trade) => {
        const date = new Date(trade.startDate);
        const monthStr = date.toLocaleString("default", { month: "short" });
        const yearStr = date.getFullYear().toString().slice(-2);
        // Safe string concatenation to avoid ESLint parsing errors
        const label = monthStr + " '" + yearStr;

        if (!monthlyDataMap[label]) {
            monthlyDataMap[label] = { month: label, pnl: 0, timestamp: date.getTime() };
        }
        monthlyDataMap[label].pnl += getAdjustedPnl(trade, profile);
    });

    const monthlyPnLData = Object.values(monthlyDataMap).sort((a, b) => a.timestamp - b.timestamp);
    const winningMonths = monthlyPnLData.filter((m) => m.pnl > 0).length;
    const avgMonthlyPnL = monthlyPnLData.length > 0 ? totalPnL / monthlyPnLData.length : 0;

    // --- THE AI BRAIN (Heuristic Logic) ---
    const generateAIReport = () => {
        setIsAnalyzing(true);
        setDisplayedReport("");
        setFullReport(null);

        setTimeout(() => {
            let report = "";

            if (trades.length < 3) {
                report = "CRITICAL ERROR: Insufficient data. Are you a trader or a spectator? Execute more trades before requesting an audit.";
            } else {
                // Safe string concatenation (no backticks)
                report += "[ANALYSIS COMPLETE] \n\nLet's be real. Your win rate is " + winRate + "%. ";
                if (parseFloat(winRate) < 40) {
                    report += "You are bleeding capital. At this rate, flipping a coin would literally yield better market returns. ";
                } else if (parseFloat(winRate) < 60) {
                    report += "Mediocre. You are surviving, not thriving. ";
                } else {
                    report += "Surprisingly decent. You might actually know what you are doing. ";
                }

                if (avgLoss > avgProfit) {
                    report += "However, your average loss ($" + avgLoss.toFixed(2) + ") is LARGER than your average profit ($" + avgProfit.toFixed(2) + "). You are cutting your winners short and letting your losers run. This is textbook amateur psychology.\n\n";
                } else {
                    report += "Your risk/reward ratio is structurally sound. You keep your losers smaller than your winners.\n\n";
                }

                // The Coach
                report += "[COACHING PROTOCOL]\n";
                const bestAsset = winningTrades.length > 0 ? winningTrades.sort((a, b) => b.pnl - a.pnl)[0].asset : "Nothing";

                report += "1. Double down on " + bestAsset + ". It is currently your most profitable asset.\n";
                if (avgLoss > avgProfit) {
                    report += "2. STOP LOSS DISCIPLINE: Stop moving your stop-losses down when a trade goes against you. Accept the loss early.\n";
                }
                report += "3. Market conditions are volatile. Reduce your position sizes by 20% this week until your win rate stabilizes above 55%.";
            }

            setFullReport(report);
            setIsAnalyzing(false);
        }, 2000);
    };

    // --- TYPEWRITER EFFECT ---
    useEffect(() => {
        if (!fullReport) return;

        let i = 0;
        const timer = setInterval(() => {
            setDisplayedReport(fullReport.slice(0, i));
            i++;
            if (i > fullReport.length) {
                clearInterval(timer);
            }
        }, 30);

        return () => clearInterval(timer);
    }, [fullReport]);

    return (
        <div className="min-h-screen bg-[#0A0A0A] relative text-white">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
            <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#C5A059]/5 rounded-full blur-[150px] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <button onClick={() => navigate("/terminal")} className="text-white/50 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <Award className="w-8 h-8 text-[#00D1FF]" />
                                    <h1 className="text-3xl tracking-tight">Statistics & Analysis</h1>
                                </div>
                                <p className="text-white/40 text-sm">Advanced analytics & behavioral AI tracking</p>
                            </div>
                        </div>

                        {/* AI BUTTON */}
                        <button
                            onClick={generateAIReport}
                            disabled={isAnalyzing}
                            className={isAnalyzing
                                ? "flex items-center gap-2 px-5 py-2.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30 rounded-lg transition-all tracking-wide uppercase text-sm font-medium opacity-50"
                                : "flex items-center gap-2 px-5 py-2.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30 rounded-lg hover:bg-[#8B5CF6]/20 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all tracking-wide uppercase text-sm font-medium"}
                        >
                            <BrainCircuit className={isAnalyzing ? "w-4 h-4 animate-pulse" : "w-4 h-4"} />
                            {isAnalyzing ? "Analyzing Ledger..." : "Initialize AI Audit"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-6">

                {/* THE AI REPORT TERMINAL */}
                {(isAnalyzing || fullReport) && (
                    <div className="bg-[#141414]/80 backdrop-blur-md border border-[#8B5CF6]/30 rounded-xl p-6 relative overflow-hidden animate-in slide-in-from-top-4 duration-500 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                            <Terminal className="w-5 h-5 text-[#8B5CF6]" />
                            <h2 className="text-[#8B5CF6] tracking-wider uppercase text-sm font-medium">KRIMSON AI</h2>
                        </div>

                        {isAnalyzing ? (
                            <div className="space-y-3">
                                <div className="h-2 w-1/3 bg-white/10 rounded animate-pulse" />
                                <div className="h-2 w-1/2 bg-white/10 rounded animate-pulse" />
                                <div className="h-2 w-1/4 bg-white/10 rounded animate-pulse" />
                                <p className="text-white/40 text-xs font-mono mt-4 animate-pulse">Running neural risk assessment models...</p>
                            </div>
                        ) : (
                            <div className="font-mono text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                                {displayedReport}
                                {displayedReport.length === fullReport.length
                                    ? <span className="inline-block w-2 h-4 bg-[#8B5CF6] ml-1 animate-pulse" />
                                    : <span className="inline-block w-2 h-4 bg-[#00D1FF] ml-1" />
                                }
                            </div>
                        )}
                    </div>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-[#141414]/80 to-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00FF85]/5 to-transparent" />
                        <div className="relative">
                            <div className="text-white/50 text-xs mb-2 tracking-wider uppercase">Total P&L</div>
                            <div className={totalPnL >= 0 ? "text-3xl font-medium text-[#00FF85]" : "text-3xl font-medium text-[#FF3D3D]"}>
                                {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#141414]/80 to-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00D1FF]/5 to-transparent" />
                        <div className="relative">
                            <div className="text-white/50 text-xs mb-2 tracking-wider uppercase">Winning Months</div>
                            <div className="text-3xl font-medium">{winningMonths} <span className="text-white/30 text-lg">/ {monthlyPnLData.length}</span></div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#141414]/80 to-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#C5A059]/5 to-transparent" />
                        <div className="relative">
                            <div className="text-white/50 text-xs mb-2 tracking-wider uppercase">Avg Monthly</div>
                            <div className="text-3xl font-medium">${avgMonthlyPnL.toFixed(2)}</div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#141414]/80 to-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/5 to-transparent" />
                        <div className="relative">
                            <div className="text-white/50 text-xs mb-2 tracking-wider uppercase flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 fill-[#C5A059] text-[#C5A059]" />
                                Win Rate
                            </div>
                            <div className="text-3xl text-[#C5A059] font-medium">{winRate}%</div>
                        </div>
                    </div>
                </div>

                {/* Monthly PnL Chart */}
                <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-1">
                            <TrendingUp className="w-6 h-6 text-[#00D1FF]" />
                            <h2 className="text-2xl tracking-tight">Monthly Performance</h2>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={monthlyPnLData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 13 }} />
                            <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 13 }} tickFormatter={(value) => "$" + value} />
                            <Tooltip contentStyle={{ backgroundColor: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                            <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>
                                {monthlyPnLData.map((entry, index) => (
                                    <Cell key={"cell-" + index} fill={entry.pnl >= 0 ? "#00FF85" : "#FF3D3D"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Win/Loss Analytics */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                        <h2 className="text-2xl tracking-tight mb-6">Win/Loss Distribution</h2>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie data={winLossData} cx="50%" cy="50%" labelLine={false} outerRadius={120} dataKey="value">
                                    {winLossData.map((entry, index) => <Cell key={"pie-" + index} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                        <h2 className="text-2xl tracking-tight mb-6">Average P&L Comparison</h2>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={avgPnLComparison} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                <XAxis type="number" stroke="rgba(255,255,255,0.3)" tickFormatter={(value) => "$" + value} />
                                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" width={150} />
                                <Tooltip contentStyle={{ backgroundColor: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {avgPnLComparison.map((entry, index) => <Cell key={"bar-" + index} fill={entry.color} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}