import { useState } from "react";
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "../components/ui/pagination";
import { TradeDialog } from "../components/TradeDialog";
import { useTrades, getAdjustedPnl } from "../context/TradeContext"; // Pulling in our global RAM state

export function MasterTablePage() {
    const navigate = useNavigate();
    const { showCharts, saveShowCharts } = useCookieTracker();

    // Use global RAM context instead of local state
    const { trades, addTrade, editTrade, deleteTrade, isOnline, syncStatus, serverNotice, profile } = useTrades();

    const [currentPage, setCurrentPage] = useState(1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState(null);

    const itemsPerPage = 5;
    const totalPages = Math.ceil(trades.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentTrades = trades.slice(startIndex, endIndex);

    const handleDeleteTrade = (id) => {
        if(window.confirm("Are you sure you want to delete this trade?")) {
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

    const stats = {
        total: trades.length,
        winners: trades.filter((t) => t.status === "winner").length,
        losers: trades.filter((t) => t.status === "loser").length,
        breakeven: trades.filter((t) => t.status === "breakeven").length,
        totalPnl: trades.reduce((sum, t) => sum + getAdjustedPnl(t, profile), 0),
    };

    // Chart data calculations
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
        const label = monthStr + " '" + yearStr;

        if (!monthlyDataMap[label]) {
            monthlyDataMap[label] = { month: label, pnl: 0, timestamp: date.getTime() };
        }
        monthlyDataMap[label].pnl += getAdjustedPnl(trade, profile);
    });

    const monthlyPnLData = Object.values(monthlyDataMap).sort((a, b) => a.timestamp - b.timestamp);

    return (
        <div className="min-h-screen bg-[#0A0A0A] relative text-white">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Header */}
            <div className="relative z-10 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => navigate("/")}
                                className="text-white/50 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl tracking-tight mb-1">Trading Terminal</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => saveShowCharts(!showCharts)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm tracking-wide uppercase ${
                                    showCharts
                                        ? "bg-[#00FF85]/10 border-[#00FF85]/30 text-[#00FF85] shadow-[0_0_20px_rgba(0,255,133,0.3)]"
                                        : "border-white/10 text-white/50 hover:bg-white/5"
                                }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                Charts
                            </button>
                            <button
                                onClick={() => navigate("/profile")}
                                className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-[#C5A059]/30 transition-all text-sm tracking-wide uppercase flex items-center gap-2"
                            >
                                <Settings2 className="w-4 h-4" />
                                Profile
                            </button>
                            <button
                                onClick={() => navigate("/vault")}
                                className="px-4 py-2 rounded-lg border border-[#00D1FF]/30 text-[#00D1FF] hover:bg-[#00D1FF]/10 transition-all text-sm tracking-wide uppercase"
                            >
                                Statistics & Analysis
                            </button>
                            <button
                                onClick={openAddDialog}
                                className="flex items-center gap-2 px-4 py-2 bg-[#00D1FF] text-[#0A0A0A] rounded-lg hover:shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-all text-sm tracking-wide uppercase"
                            >
                                <Plus className="w-4 h-4" />
                                New Trade
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-sm mb-2 tracking-wide uppercase">Total Trades</div>
                        <div className="text-3xl">{stats.total}</div>
                    </div>
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-sm mb-2 tracking-wide uppercase flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#00FF85]" />
                            Winners
                        </div>
                        <div className="text-3xl text-[#00FF85]">{stats.winners}</div>
                    </div>
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-sm mb-2 tracking-wide uppercase flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-[#FF3D3D]" />
                            Losers
                        </div>
                        <div className="text-3xl text-[#FF3D3D]">{stats.losers}</div>
                    </div>
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-sm mb-2 tracking-wide uppercase flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#C5A059]/20 border border-[#C5A059]" />
                            Breakeven
                        </div>
                        <div className="text-3xl text-[#C5A059]">{stats.breakeven}</div>
                    </div>
                    <div className="bg-[#141414]/60 backdrop-blur-sm border border-white/5 rounded-xl p-5">
                        <div className="text-white/50 text-sm mb-2 tracking-wide uppercase">Total P&L</div>
                        <div className={`text-3xl ${stats.totalPnl >= 0 ? "text-[#00FF85]" : "text-[#FF3D3D]"}`}>
                            ${stats.totalPnl.toFixed(2)}
                        </div>
                        {profile?.pipValue !== 1 && (
                            <div className="text-[11px] text-white/50 mt-2">Using ${profile.pipValue.toFixed(2)} per pip</div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                    {/* Table */}
                    <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">Asset</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">Direction</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">Start</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">End</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">Pips</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">P&L</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">Status</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs">Review</TableHead>
                                    <TableHead className="text-white/60 tracking-wider uppercase text-xs text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentTrades.map((trade, index) => (
                                    <Motion.tr
                                        key={trade.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="border-white/5 hover:bg-white/[0.02] transition-colors"
                                    >
                                        <TableCell className="tracking-wide font-medium">{trade.asset}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex px-2.5 py-1 rounded-full text-xs tracking-wider uppercase font-medium ${
                                                trade.direction === "long"
                                                    ? "bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/20"
                                                    : "bg-[#FF3D3D]/10 text-[#FF3D3D] border border-[#FF3D3D]/20"
                                            }`}>
                                                {trade.direction}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-white/70 text-xs">
                                            <div>{new Date(trade.startDate).toLocaleDateString()}</div>
                                            <div className="text-white/40">{new Date(trade.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </TableCell>
                                        <TableCell className="text-white/70 text-xs">
                                            <div>{new Date(trade.endDate).toLocaleDateString()}</div>
                                            <div className="text-white/40">{new Date(trade.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </TableCell>
                                        <TableCell className={`font-medium ${trade.pips && trade.pips > 0 ? "text-[#00FF85]" : trade.pips && trade.pips < 0 ? "text-[#FF3D3D]" : "text-[#C5A059]"}`}>
                                            {trade.pips !== undefined ? `${trade.pips > 0 ? "+" : ""}${trade.pips}` : "-"}
                                        </TableCell>
                                        <TableCell className={getAdjustedPnl(trade, profile) > 0 ? "text-[#00FF85]" : getAdjustedPnl(trade, profile) < 0 ? "text-[#FF3D3D]" : "text-[#C5A059]"}>
                                            <div className="font-medium">{getAdjustedPnl(trade, profile) > 0 ? "+" : ""}${getAdjustedPnl(trade, profile).toFixed(2)}</div>
                                            <div className="text-xs opacity-70">{trade.pnl > 0 ? "+" : ""}{trade.pnlPercent?.toFixed(2) || "0.00"}%</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`inline-flex px-2.5 py-1 rounded-full text-xs tracking-wider uppercase font-medium ${
                                                trade.status === "winner"
                                                    ? "bg-[#00FF85]/10 text-[#00FF85] border border-[#00FF85]/20"
                                                    : trade.status === "loser"
                                                        ? "bg-[#FF3D3D]/10 text-[#FF3D3D] border border-[#FF3D3D]/20"
                                                        : "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                                            }`}>
                                                {trade.status}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-white/50 text-xs max-w-[200px] truncate">
                                            {trade.review ? trade.review.substring(0, 50) + (trade.review.length > 50 ? "..." : "") : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/trade/${trade.id}`)}
                                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-[#00D1FF]"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditDialog(trade)}
                                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-[#C5A059]"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTrade(trade.id)}
                                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-[#FF3D3D]"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </Motion.tr>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="border-t border-white/5 p-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-white/5"}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                onClick={() => setCurrentPage(page)}
                                                isActive={currentPage === page}
                                                className={`cursor-pointer ${
                                                    currentPage === page
                                                        ? "bg-[#00D1FF] text-[#0A0A0A] hover:bg-[#00D1FF]"
                                                        : "hover:bg-white/5 text-white"
                                                }`}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
                                            className={currentPage === (totalPages || 1) ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-white/5"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>

                    {/* Charts Section - Toggleable */}
                    {showCharts && (
                        <Motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Win/Loss Ratio Chart */}
                            <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                                <div className="mb-6">
                                    <h2 className="text-xl tracking-tight mb-1">Win/Loss Distribution</h2>
                                    <p className="text-white/40 text-sm">Current win rate: {winRate}%</p>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={winLossData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {winLossData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#141414',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Average P&L Comparison */}
                            <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                                <div className="mb-6">
                                    <h2 className="text-xl tracking-tight mb-1">Average P&L Comparison</h2>
                                    <p className="text-white/40 text-sm">Profit vs Loss per trade</p>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={avgPnLComparison}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="rgba(255,255,255,0.3)"
                                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                        />
                                        <YAxis
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
                                <div className="bg-[#141414]/40 backdrop-blur-sm border border-white/5 rounded-xl p-6">
                                    <div className="mb-6">
                                        <h2 className="text-xl tracking-tight mb-1">Monthly P&L Trend</h2>
                                        <p className="text-white/40 text-sm">Performance over time</p>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={monthlyPnLData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis
                                                dataKey="month"
                                                stroke="rgba(255,255,255,0.3)"
                                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                            />
                                            <YAxis
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
                                                formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
                                            />
                                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                                {monthlyPnLData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.pnl >= 0 ? "#00FF85" : "#FF3D3D"}
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
                    <div className="px-4 py-2 rounded-lg border backdrop-blur-xl text-sm font-medium bg-[#FF3D3D]/10 border-[#FF3D3D]/30 text-[#FF3D3D]">
                        <span className="mr-2">⚠️</span>
                        {serverNotice}
                    </div>
                </div>
            )}
        </div>
    );
}