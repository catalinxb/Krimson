import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Edit2, Trash2, Eye, ArrowLeft, TrendingUp, TrendingDown, BarChart3, Settings2 } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { useCookieTracker } from "../hooks/useCookieTracker";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { TradeDialog } from "../components/TradeDialog";
import { useTrades, getAdjustedPnl } from "../context/TradeContext"; // Pulling in our global RAM state

export function MasterTablePage() {
    const navigate = useNavigate();
    const { showCharts, saveShowCharts } = useCookieTracker();

    const { trades, stats, pagination, isLoadingPage, hasMore, loadNextPage, loadTradePage, addTrade, editTrade, deleteTrade, startGenerator, stopGenerator, generatorRunning, isOnline, profile, serverNotice } = useTrades();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState(null);
    const loadMoreRef = useRef(null);

    const currentTrades = trades;
    const isEmpty = trades.length === 0 && !isLoadingPage;

    const winningTrades = trades.filter((t) => t.status === "winner");
    const losingTrades = trades.filter((t) => t.status === "loser");
    const breakevenTrades = trades.filter((t) => t.status === "breakeven").length;
    const totalTradesCount = trades.length;
    const totalPnlFromTrades = trades.reduce((sum, trade) => sum + getAdjustedPnl(trade, profile), 0);

    const safeStats = {
        totalTrades: typeof stats?.totalTrades === 'number' ? stats.totalTrades : totalTradesCount,
        winners: typeof stats?.winners === 'number' ? stats.winners : winningTrades.length,
        losers: typeof stats?.losers === 'number' ? stats.losers : losingTrades.length,
        breakeven: typeof stats?.breakeven === 'number' ? stats.breakeven : breakevenTrades,
        totalPnL: typeof stats?.totalPnL === 'number' ? stats.totalPnL : totalPnlFromTrades,
    };

    useEffect(() => {
        const observerNode = loadMoreRef.current;
        if (!observerNode || !hasMore || typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new window.IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        loadNextPage();
                    }
                });
            },
            { rootMargin: "200px" }
        );

        observer.observe(observerNode);
        return () => observer.disconnect();
    }, [hasMore, loadNextPage]);

    const handleDeleteTrade = (id) => {
        if (window.confirm("Are you sure you want to delete this trade?")) {
            deleteTrade(id);
        }
    };

    const openEditDialog = (trade) => {
        setEditingTrade(trade);
        setIsDialogOpen(true);
    };

    const openAddDialog = () => {
        setEditingTrade(null);
        setIsDialogOpen(true);
    };

    // Chart data calculations
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
        const label = monthStr + " '" + yearStr;

        if (!monthlyDataMap[label]) {
            monthlyDataMap[label] = { month: label, pnl: 0, timestamp: date.getTime() };
        }
        monthlyDataMap[label].pnl += getAdjustedPnl(trade, profile);
    });

    const monthlyPnLData = Object.values(monthlyDataMap).sort((a, b) => a.timestamp - b.timestamp);

    const chartTooltipStyle = {
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        color: 'var(--foreground)',
    };

    return (
        <div className="min-h-screen bg-background relative text-foreground">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Header */}
            <div className="relative z-10 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                        <div className="flex items-center gap-3 sm:gap-6">
                            <button
                                onClick={() => navigate("/")}
                                className="text-foreground/50 hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl sm:text-3xl tracking-tight mb-1">Trading Terminal</h1>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => saveShowCharts(!showCharts)}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-all text-xs sm:text-sm tracking-wide uppercase ${
                                    showCharts
                                        ? "bg-success/10 border-success/30 text-success shadow-[0_0_20px_rgba(0,255,133,0.3)]"
                                        : "border-border text-foreground/50 hover:bg-foreground/5"
                                }`}
                            >
                                <BarChart3 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                <span className="hidden sm:inline">Charts</span>
                            </button>
                            <button
                                onClick={generatorRunning ? stopGenerator : startGenerator}
                                className={`px-3 sm:px-4 py-2 rounded-lg border transition-all text-xs sm:text-sm tracking-wide uppercase ${generatorRunning ? 'border-destructive text-destructive hover:bg-destructive/10' : 'border-foreground/30 text-foreground/70 hover:bg-foreground/5'}`}
                            >
                                {generatorRunning ? 'Stop Simulation' : 'Simulate Trades'}
                            </button>
                            <button
                                onClick={() => navigate("/profile")}
                                className="px-3 sm:px-4 py-2 rounded-lg border border-border text-foreground/70 hover:text-foreground hover:border-accent/30 transition-all text-xs sm:text-sm tracking-wide uppercase flex items-center gap-2"
                            >
                                <Settings2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                <span className="hidden sm:inline">Profile</span>
                            </button>
                            <button
                                onClick={() => navigate("/vault")}
                                className="px-3 sm:px-4 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all text-xs sm:text-sm tracking-wide uppercase hidden sm:inline-block"
                            >
                                Statistics & Analysis
                            </button>
                            <button
                                onClick={openAddDialog}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all text-xs sm:text-sm tracking-wide uppercase"
                            >
                                <Plus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                <span className="hidden sm:inline">New Trade</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs sm:text-sm mb-2 tracking-wide uppercase">Total Trades</div>
                        <div className="text-2xl sm:text-3xl">{safeStats.totalTrades}</div>
                    </div>
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs sm:text-sm mb-2 tracking-wide uppercase flex items-center gap-1 sm:gap-2">
                            <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-500" />
                            <span className="hidden sm:inline">Winners</span>
                            <span className="sm:hidden">W</span>
                        </div>
                        <div className="text-2xl sm:text-3xl text-emerald-600">{safeStats.winners}</div>
                    </div>
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs sm:text-sm mb-2 tracking-wide uppercase flex items-center gap-1 sm:gap-2">
                            <TrendingDown className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-destructive" />
                            <span className="hidden sm:inline">Losers</span>
                            <span className="sm:hidden">L</span>
                        </div>
                        <div className="text-2xl sm:text-3xl text-destructive">{safeStats.losers}</div>
                    </div>
                    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-3 sm:p-5">
                        <div className="text-foreground/50 text-xs sm:text-sm mb-2 tracking-wide uppercase flex items-center gap-1 sm:gap-2">
                            <div className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-accent/20 border border-accent" />
                            <span className="hidden sm:inline">Breakeven</span>
                            <span className="sm:hidden">B</span>
                        </div>
                        <div className="text-2xl sm:text-3xl text-accent">{safeStats.breakeven}</div>
                    </div>
                    <div className={`bg-card/60 backdrop-blur-sm border rounded-xl p-3 sm:p-5 ${safeStats.totalPnL >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                        <div className="text-foreground/50 text-xs sm:text-sm mb-2 tracking-wide uppercase">P&L</div>
                        <div className={`text-2xl sm:text-3xl ${safeStats.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ${Number.isFinite(safeStats.totalPnL) ? safeStats.totalPnL.toFixed(2) : '0.00'}
                        </div>
                        {typeof profile?.pipValue === 'number' && profile.pipValue !== 1 && (
                            <div className="text-[9px] sm:text-[11px] text-foreground/50 mt-2">Using ${profile.pipValue.toFixed(2)}/pip</div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6 sm:space-y-8 px-3 sm:px-6">
                    {/* Table */}
                    {isEmpty && (
                        <div className="rounded-xl border border-border bg-card/60 p-6 text-center text-foreground/70">
                            <div className="text-lg font-semibold mb-2">No trades available</div>
                            <div className="text-sm">Start by creating a trade or wait for the first page to load.</div>
                        </div>
                    )}
                    <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl overflow-hidden overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs">Asset</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs">Direction</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs hidden sm:table-cell">Start</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs hidden md:table-cell">End</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs">Pips</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs">P&L</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs hidden sm:table-cell">Status</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs hidden lg:table-cell">Review</TableHead>
                                    <TableHead className="text-foreground/60 tracking-wider uppercase text-xs text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentTrades.map((trade, index) => (
                                    <Motion.tr
                                        key={trade.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="border-border hover:bg-foreground/[0.02] transition-colors"
                                    >
                                        <TableCell className="tracking-wide font-medium">{trade.asset}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex px-2 sm:px-2.5 py-1 rounded-full text-xs tracking-wider uppercase font-medium ${
                                                trade.direction === "long"
                                                    ? "bg-primary/10 text-primary border border-primary/20"
                                                    : "bg-destructive/10 text-destructive border border-destructive/20"
                                            }`}>
                                                {trade.direction}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-foreground/70 text-xs hidden sm:table-cell">
                                            <div>{new Date(trade.startDate).toLocaleDateString()}</div>
                                            <div className="text-foreground/40">{new Date(trade.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </TableCell>
                                        <TableCell className="text-foreground/70 text-xs hidden md:table-cell">
                                            <div>{new Date(trade.endDate).toLocaleDateString()}</div>
                                            <div className="text-foreground/40">{new Date(trade.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </TableCell>
                                        <TableCell className="font-medium text-xs sm:text-sm text-foreground">
                                            {trade.pips !== undefined ? `${trade.pips > 0 ? "+" : ""}${trade.pips}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm text-foreground">
                                            <div className="font-medium">{getAdjustedPnl(trade, profile) > 0 ? "+" : ""}${getAdjustedPnl(trade, profile).toFixed(2)}</div>
                                            <div className="text-xs opacity-70">{trade.pnl > 0 ? "+" : ""}{trade.pnlPercent?.toFixed(2) || "0.00"}%</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <div className={`inline-flex px-2 py-1 rounded-full text-xs tracking-wider uppercase font-medium ${
                                                trade.status === "winner"
                                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                    : trade.status === "loser"
                                                        ? "bg-red-100 text-red-700 border border-red-200"
                                                        : "bg-accent/10 text-accent border border-accent/20"
                                            }`}>
                                                {trade.status}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-foreground/50 text-xs max-w-[200px] truncate hidden lg:table-cell">
                                            {trade.review ? trade.review.substring(0, 50) + (trade.review.length > 50 ? "..." : "") : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                <button
                                                    onClick={() => navigate(`/trade/${trade.id}`)}
                                                    className="p-1.5 sm:p-2 hover:bg-foreground/5 rounded-lg transition-colors text-foreground/50 hover:text-primary"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditDialog(trade)}
                                                    className="p-1.5 sm:p-2 hover:bg-foreground/5 rounded-lg transition-colors text-foreground/50 hover:text-accent"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTrade(trade.id)}
                                                    className="p-1.5 sm:p-2 hover:bg-foreground/5 rounded-lg transition-colors text-foreground/50 hover:text-destructive"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </Motion.tr>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="border-t border-border p-4">
                            <div className="flex flex-col gap-3 items-center justify-center text-center sm:flex-row sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => loadTradePage(Math.max(1, pagination.page - 1), pagination.limit)}
                                        className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5 transition"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => loadTradePage(pagination.page + 1, pagination.limit)}
                                        className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5 transition"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div>
                                    {isLoadingPage ? (
                                        <div className="text-sm text-foreground/70">Loading more trades...</div>
                                    ) : hasMore ? (
                                        <button
                                            type="button"
                                            onClick={loadNextPage}
                                            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-foreground/5 transition"
                                        >
                                            Load more trades
                                        </button>
                                    ) : (
                                        <div className="text-sm text-foreground/50">You’ve reached the end of the trade list.</div>
                                    )}
                                </div>
                            </div>
                            <div ref={loadMoreRef} className="h-2" aria-hidden="true" />
                        </div>
                    </div>

                    {/* Charts Section - Toggleable */}
                    {showCharts && (
                        <Motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4 sm:space-y-6"
                        >
                            {/* Win/Loss Ratio Chart */}
                            <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-6">
                                <div className="mb-4 sm:mb-6">
                                    <h2 className="text-lg sm:text-xl tracking-tight mb-1">Win/Loss Distribution</h2>
                                    <p className="text-foreground/50 text-xs sm:text-sm">Current win rate: {winRate}%</p>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={winLossData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {winLossData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={chartTooltipStyle}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Average P&L Comparison */}
                            <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-6">
                                <div className="mb-4 sm:mb-6">
                                    <h2 className="text-lg sm:text-xl tracking-tight mb-1">Average P&L Comparison</h2>
                                    <p className="text-foreground/50 text-xs sm:text-sm">Profit vs Loss per trade</p>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={avgPnLComparison}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="var(--foreground)"
                                            tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                                        />
                                        <YAxis
                                            stroke="var(--foreground)"
                                            tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                                        />
                                        <Tooltip
                                            contentStyle={chartTooltipStyle}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {avgPnLComparison.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Monthly P&L Trend */}
                            {monthlyPnLData.length > 0 && (
                                <div className="bg-card/40 backdrop-blur-sm border border-border rounded-xl p-6">
                                    <div className="mb-6">
                                        <h2 className="text-xl tracking-tight mb-1">Monthly P&L Trend</h2>
                                        <p className="text-foreground/50 text-sm">Performance over time</p>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={monthlyPnLData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis
                                                dataKey="month"
                                                stroke="var(--foreground)"
                                                tick={{ fill: 'var(--foreground)', fontSize: 12 }}
                                            />
                                            <YAxis
                                                stroke="var(--foreground)"
                                                tick={{ fill: 'var(--foreground)', fontSize: 12 }}
                                            />
                                            <Tooltip
                                                contentStyle={chartTooltipStyle}
                                                formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
                                            />
                                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                                {monthlyPnLData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.pnl >= 0 ? 'var(--success)' : 'var(--destructive)'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Motion.div>
                    )}
                </div>
            </div>

            {/* Trade Dialog */}
            <TradeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                trade={editingTrade}
                onSave={(trade) => {
                    if (editingTrade) {
                        editTrade(trade);
                    } else {
                        addTrade(trade);
                    }
                    setIsDialogOpen(false);
                }}
            />

            {/* Status Indicator - Bottom Left */}
            {!isOnline && (
                <div className="fixed bottom-6 left-6 z-50">
                    <div className="px-4 py-2 rounded-lg border backdrop-blur-xl text-sm font-medium bg-destructive/10 border-destructive/30 text-destructive">
                        <span className="mr-2">⚠️</span>
                        {serverNotice}
                    </div>
                </div>
            )}
        </div>
    );
}