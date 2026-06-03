import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ShieldCheck, AlertTriangle, ListChecks } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { useTrades } from "../context/TradeContext";

export function AdminLogsPage() {
    const navigate = useNavigate();
    const { currentUser, loadAuditOverview, serverNotice } = useTrades();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState({ logs: [], observations: [] });
    const [error, setError] = useState(null);

    // DISABLED - allow all users to see logs
    const isAdmin = true; // currentUser?.roles?.some((role) => role.name === 'admin');

    useEffect(() => {
        const loadOverview = async () => {
            if (!isAdmin) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const data = await loadAuditOverview(200);
                setOverview(data);
            } catch (err) {
                setError(err?.message || 'Unable to load audit overview');
            } finally {
                setLoading(false);
            }
        };

        loadOverview();
    }, [isAdmin, loadAuditOverview]);

    if (!currentUser) {
        return (
            <div className="min-h-screen p-6 bg-background text-foreground">
                <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card/80 p-8 backdrop-blur-xl">
                    <h1 className="text-3xl font-semibold mb-3">Admin Audit Logs</h1>
                    <p className="text-sm text-foreground/70">You must be logged in as an administrator to view audit logs.</p>
                    <button
                        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        onClick={() => navigate('/login')}
                    >
                        Go to login
                    </button>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen p-6 bg-background text-foreground">
                <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card/80 p-8 backdrop-blur-xl">
                    <h1 className="text-3xl font-semibold mb-3">Access denied</h1>
                    <p className="text-sm text-foreground/70">You do not have permission to view audit logs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <button
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Admin Audit Overview</h1>
                            <p className="mt-2 text-sm text-foreground/60">
                                Review recent audit activity and suspicious user observations.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-border bg-card/70 p-4">
                                <div className="text-sm text-foreground/50">Audit logs</div>
                                <div className="mt-2 text-2xl font-semibold">{overview.logs.length}</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-card/70 p-4">
                                <div className="text-sm text-foreground/50">Suspicious users</div>
                                <div className="mt-2 text-2xl font-semibold">{overview.observations.length}</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-card/70 p-4">
                                <div className="text-sm text-foreground/50">Status</div>
                                <div className="mt-2 text-2xl font-semibold">{loading ? 'Loading' : 'Live'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
                {error && (
                    <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                            <div>
                                <h2 className="text-lg font-semibold">Suspicious Users</h2>
                                <p className="text-sm text-foreground/60">Potential observation targets from user activity.</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-sm text-foreground/60">Loading observation data...</div>
                        ) : overview.observations.length === 0 ? (
                            <div className="rounded-2xl border border-border bg-background/80 p-4 text-sm text-foreground/70">
                                No suspicious users detected in recent audit activity.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {overview.observations.map((item) => (
                                    <div key={`${item.userId}-${item.lastActivity}`} className="rounded-2xl border border-border bg-background/80 p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-sm text-foreground/60">User</div>
                                                <div className="text-base font-medium">{item.email || item.userId}</div>
                                                <div className="text-xs text-foreground/50">Last activity: {new Date(item.lastActivity).toLocaleString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-foreground/50">Risk</div>
                                                <div className="text-lg font-semibold text-destructive">{item.reasons.length}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-sm text-foreground/70 space-y-1">
                                            {item.reasons.map((reason) => (
                                                <div key={reason} className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                                                    <span>{reason}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            <ListChecks className="h-5 w-5 text-sky-400" />
                            <div>
                                <h2 className="text-lg font-semibold">Latest Audit Logs</h2>
                                <p className="text-sm text-foreground/60">Recent actions captured in the audit trail.</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-border bg-background/90">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden lg:table-cell">Resource</TableHead>
                                        <TableHead className="text-right">Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-sm text-foreground/50 py-6">
                                                Loading audit table...
                                            </TableCell>
                                        </TableRow>
                                    ) : overview.logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-sm text-foreground/50 py-6">
                                                No audit logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        overview.logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>{log.user?.email || 'Unknown'}</TableCell>
                                                <TableCell>{log.action}</TableCell>
                                                <TableCell>{log.status}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{log.resource}</TableCell>
                                                <TableCell className="text-right">{new Date(log.createdAt).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </section>
                </div>

                <div className="mt-8 text-xs text-foreground/50">{serverNotice}</div>
            </div>
        </div>
    );
}
