import { createContext, useContext, useEffect, useRef, useState } from "react";

const initialTrades = [
    { id: 1, asset: "BTC/USDT", entry: 42500, exit: 45200, pnl: 2700, pnlPercent: 6.35, status: "winner", direction: "long", startDate: "2026-03-15T09:30", endDate: "2026-03-16T14:45", pips: 270, review: "Strong bullish momentum confirmed on 4H chart. Entry taken after breakout above resistance.", duration: "10h 30m" },
    { id: 2, asset: "ETH/USDT", entry: 2850, exit: 2720, pnl: -130, pnlPercent: -4.56, status: "loser", direction: "long", startDate: "2026-03-14T11:00", endDate: "2026-03-15T16:20", pips: -130, review: "Failed breakout, should have respected the bearish divergence.", duration: "5h 20m" }
];

const STORAGE_TRADES_KEY = 'trade_dashboard_trades';
const STORAGE_QUEUE_KEY = 'trade_dashboard_queue';
const STORAGE_PROFILE_KEY = 'trade_dashboard_profile';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
const WS_BASE = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:${import.meta.env.DEV ? '3001' : window.location.port}/ws`
    : '';

const defaultProfile = {
    displayName: 'Anon Trader',
    email: '',
    password: '',
    pipValue: 1.0
};

const TradeContext = createContext({
    trades: [],
    addTrade: () => {},
    editTrade: () => {},
    deleteTrade: () => {},
    getTrade: () => null,
    isOnline: true,
    syncStatus: 'idle',
    serverNotice: '',
    queuedOperations: 0
});

function safeParse(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function deduplicateTrades(trades) {
    const map = new Map();
    trades.forEach((trade) => map.set(trade.id, trade));
    return Array.from(map.values());
}

function loadFromStorage(key, fallback) {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return fallback;
    }

    const stored = safeParse(window.localStorage.getItem(key), fallback);
    // Ensure no duplicates in loaded data
    return Array.isArray(stored) ? deduplicateTrades(stored) : stored;
}

function saveToStorage(key, value) {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage failures in restricted environments.
    }
}

function sortTrades(trades) {
    return [...trades].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

function mergeTrades(existingTrades, incomingTrades) {
    const map = new Map();
    // Add existing trades
    existingTrades.forEach((trade) => map.set(trade.id, trade));
    // Add/override with incoming trades
    incomingTrades.forEach((trade) => map.set(trade.id, trade));
    return sortTrades(Array.from(map.values()));
}

function createTempId() {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTradeForApi(trade) {
    const payload = {
        asset: trade.asset,
        entry: trade.entry,
        exit: trade.exit,
        direction: trade.direction,
        status: trade.status,
        startDate: trade.startDate,
        endDate: trade.endDate,
        pips: trade.pips != null ? trade.pips : null,
        review: trade.review || ''
    };
    return payload;
}

export function getAdjustedPnl(trade, profile) {
    if (trade?.pips != null && typeof profile?.pipValue === 'number') {
        return trade.pips * profile.pipValue;
    }
    return trade?.pnl ?? 0;
}

function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    if (Number.isNaN(diffMs) || diffMs < 0) {
        return 'Pending';
    }
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

export function TradeProvider({ children }) {
    const [trades, setTrades] = useState(() => loadFromStorage(STORAGE_TRADES_KEY, initialTrades));
    const [queue, setQueue] = useState(() => loadFromStorage(STORAGE_QUEUE_KEY, []));
    const [profile, setProfile] = useState(() => loadFromStorage(STORAGE_PROFILE_KEY, defaultProfile));
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [serverNotice, setServerNotice] = useState('Ready');
    const wsRef = useRef(null);
    const isSyncingRef = useRef(false);
    const reconnectTimer = useRef(null);
    const tradesRef = useRef(trades);
    const queueRef = useRef(queue);

    useEffect(() => {
        tradesRef.current = trades;
    }, [trades]);

    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    const persistTrades = (nextTrades) => {
        if (typeof nextTrades === 'function') {
            setTrades((prev) => {
                const updated = nextTrades(prev);
                saveToStorage(STORAGE_TRADES_KEY, updated);
                return updated;
            });
        } else {
            setTrades(nextTrades);
            saveToStorage(STORAGE_TRADES_KEY, nextTrades);
        }
    };

    const persistQueue = (nextQueue) => {
        setQueue(nextQueue);
        saveToStorage(STORAGE_QUEUE_KEY, nextQueue);
    };

    const persistProfile = (nextProfile) => {
        setProfile(nextProfile);
        saveToStorage(STORAGE_PROFILE_KEY, nextProfile);
    };

    const saveProfile = (updated) => {
        persistProfile({ ...profile, ...updated });
    };

    const handleOfflineCreate = (trade) => {
        const tempId = createTempId();
        const tradeWithTempId = {
            ...trade,
            id: tempId,
            duration: trade.duration || calculateDuration(trade.startDate, trade.endDate) || 'Pending'
        };

        const currentTrades = tradesRef.current;
        const currentQueue = queueRef.current;

        persistTrades(sortTrades([tradeWithTempId, ...currentTrades]));
        persistQueue([...currentQueue, { type: 'create', trade: tradeWithTempId }]);
        setServerNotice('Queued new trade for synchronization');
    };

    const handleOfflineEdit = (updatedTrade) => {
        const currentTrades = tradesRef.current;
        const currentQueue = queueRef.current;

        if (updatedTrade.id?.toString().startsWith('local-')) {
            persistQueue(currentQueue.map((item) => {
                if (item.type === 'create' && item.trade.id === updatedTrade.id) {
                    return { ...item, trade: { ...item.trade, ...updatedTrade } };
                }
                return item;
            }));
        } else {
            persistQueue([...currentQueue, { type: 'update', trade: updatedTrade }]);
        }

        persistTrades(currentTrades.map((trade) => trade.id === updatedTrade.id ? { ...trade, ...updatedTrade } : trade));
        setServerNotice('Queued trade update for synchronization');
    };

    const handleOfflineDelete = (id) => {
        const currentTrades = tradesRef.current;
        const currentQueue = queueRef.current;

        if (id?.toString().startsWith('local-')) {
            persistQueue(currentQueue.filter((item) => !(item.type === 'create' && item.trade.id === id)));
            persistTrades(currentTrades.filter((trade) => trade.id !== id));
            setServerNotice('Removed local unsynced trade');
            return;
        }

        persistQueue([...currentQueue, { type: 'delete', id }]);
        persistTrades(currentTrades.filter((trade) => trade.id !== id));
        setServerNotice('Queued trade deletion for synchronization');
    };

    const refreshServerData = async () => {
        if (!isOnline || typeof window === 'undefined' || typeof window.fetch !== 'function') {
            return;
        }

        try {
            const response = await window.fetch(`${API_BASE}/trades?page=1&limit=100`);
            if (!response.ok) {
                throw new Error('Failed to fetch latest trades');
            }
            const body = await response.json();
            const merged = mergeTrades(tradesRef.current, body.trades);
            persistTrades(merged);
            setServerNotice('Latest trades synchronized');
        } catch {
            setServerNotice('Unable to fetch latest trades from backend');
        }
    };

    const processQueue = async () => {
        if (!isOnline || isSyncingRef.current || queue.length === 0 || typeof window === 'undefined' || typeof window.fetch !== 'function') {
            return;
        }

        isSyncingRef.current = true;
        setSyncStatus('syncing');
        setServerNotice('Uploading queued changes...');

        let currentQueue = [...queueRef.current];
        let currentTrades = [...tradesRef.current];

        try {
            while (currentQueue.length > 0) {
                const item = currentQueue[0];

                if (item.type === 'create') {
                    const payload = normalizeTradeForApi(item.trade);
                    const response = await window.fetch(`${API_BASE}/trades`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) {
                        throw new Error('Failed to sync new trade');
                    }
                    const createdTrade = await response.json();
                    currentTrades = currentTrades.map((trade) => trade.id === item.trade.id ? createdTrade : trade);
                    currentQueue = currentQueue.slice(1).map((queuedItem) => {
                        if (queuedItem.type === 'update' && queuedItem.trade.id === item.trade.id) {
                            return { ...queuedItem, trade: { ...queuedItem.trade, id: createdTrade.id } };
                        }
                        if (queuedItem.type === 'delete' && queuedItem.id === item.trade.id) {
                            return { ...queuedItem, id: createdTrade.id };
                        }
                        return queuedItem;
                    });
                } else if (item.type === 'update') {
                    const response = await window.fetch(`${API_BASE}/trades/${item.trade.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(normalizeTradeForApi(item.trade))
                    });
                    if (!response.ok) {
                        throw new Error('Failed to sync trade update');
                    }
                    const updatedTrade = await response.json();
                    currentTrades = currentTrades.map((trade) => trade.id === updatedTrade.id ? updatedTrade : trade);
                    currentQueue = currentQueue.slice(1);
                } else if (item.type === 'delete') {
                    const response = await window.fetch(`${API_BASE}/trades/${item.id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok && response.status !== 204) {
                        throw new Error('Failed to sync trade deletion');
                    }
                    currentTrades = currentTrades.filter((trade) => trade.id !== item.id);
                    currentQueue = currentQueue.slice(1);
                } else {
                    currentQueue = currentQueue.slice(1);
                }

                persistQueue(currentQueue);
                persistTrades(sortTrades(currentTrades));
            }

            setSyncStatus('idle');
            setServerNotice('All queued changes synchronized');
            await refreshServerData();
        } catch {
            setSyncStatus('failed');
            setServerNotice('Sync failed. Will retry when connection returns.');
        } finally {
            isSyncingRef.current = false;
        }
    };

    const connectWebSocket = () => {
        if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
            return;
        }

        if (wsRef.current && [WebSocket.OPEN, WebSocket.CONNECTING].includes(wsRef.current.readyState)) {
            return;
        }

        try {
            const socket = new WebSocket(WS_BASE);
            wsRef.current = socket;

            socket.onopen = () => {
                setServerNotice('Live updates connected');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'trades.batchAdded' && Array.isArray(data.trades)) {
                        persistTrades((current) => mergeTrades(current, data.trades));
                        setServerNotice(`Received ${data.trades.length} live trades`);
                    }
                } catch {
                    // ignore malformed websocket payloads
                }
            };

            socket.onclose = () => {
                wsRef.current = null;
                setServerNotice('Live updates disconnected');
                if (navigator.onLine) {
                    reconnectTimer.current = window.setTimeout(connectWebSocket, 5000);
                }
            };

            socket.onerror = () => {
                setServerNotice('WebSocket error encountered');
                if (wsRef.current) {
                    wsRef.current.close();
                }
            };
        } catch {
            setServerNotice('Failed to initialize live updates');
        }
    };

    const checkConnectivity = async () => {
        if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

        try {
            const response = await window.fetch(`${API_BASE}/trades/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            if (response.ok) {
                setIsOnline(true);
                setServerNotice('Server reachable');
            } else {
                setIsOnline(false);
                setServerNotice('Server unreachable');
            }
        } catch (error) {
            setIsOnline(false);
            setServerNotice('Network or server unreachable');
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        persistTrades(sortTrades(loadFromStorage(STORAGE_TRADES_KEY, initialTrades)));
        persistQueue(loadFromStorage(STORAGE_QUEUE_KEY, []));

        const handleOnline = () => {
            checkConnectivity();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setServerNotice('Offline mode enabled');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        checkConnectivity();

        // Periodic check every 30 seconds
        const interval = setInterval(checkConnectivity, 30000);

        if (navigator.onLine) {
            setIsOnline(true);
            processQueue();
            refreshServerData();
            connectWebSocket();
        } else {
            setIsOnline(false);
            setServerNotice('Offline mode enabled');
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
            if (reconnectTimer.current) {
                window.clearTimeout(reconnectTimer.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isOnline) {
            processQueue();
            refreshServerData();
            connectWebSocket();
        } else if (wsRef.current) {
            wsRef.current.close();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);

    const addTrade = (trade) => {
        const currentTrades = tradesRef.current;
        const tempTrade = {
            ...trade,
            id: createTempId(),
            createdAt: trade.createdAt || new Date().toISOString()
        };

        persistTrades(sortTrades([tempTrade, ...currentTrades]));

        if (!isOnline || typeof window === 'undefined' || typeof window.fetch !== 'function') {
            handleOfflineCreate(tempTrade);
            return;
        }

        window.fetch(`${API_BASE}/trades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizeTradeForApi(trade))
        })
            .then(async (response) => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Server rejected new trade');
                }
                const createdTrade = await response.json();
                persistTrades(sortTrades(tradesRef.current.map((existing) => existing.id === tempTrade.id ? createdTrade : existing)));
            })
            .catch((error) => {
                const isNetworkError = error.message === 'Failed to fetch' || error.message === 'NetworkError when attempting to fetch resource.';
                if (isNetworkError) {
                    handleOfflineCreate(tempTrade);
                } else {
                    // Roll back the temporary trade if the server rejected it.
                    persistTrades(tradesRef.current.filter((existing) => existing.id !== tempTrade.id));
                    setServerNotice('New trade rejected by server: ' + error.message);
                }
            });
    };

    const editTrade = (updatedTrade) => {
        const currentTrades = tradesRef.current;
        persistTrades(currentTrades.map((trade) => trade.id === updatedTrade.id ? { ...trade, ...updatedTrade } : trade));

        if (!isOnline || typeof window === 'undefined' || typeof window.fetch !== 'function') {
            handleOfflineEdit(updatedTrade);
            return;
        }

        window.fetch(`${API_BASE}/trades/${updatedTrade.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizeTradeForApi(updatedTrade))
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Server rejected the update');
                }
                const latestTrade = await response.json();
                persistTrades(tradesRef.current.map((trade) => trade.id === latestTrade.id ? latestTrade : trade));
            })
            .catch(() => {
                handleOfflineEdit(updatedTrade);
            });
    };

    const deleteTrade = (id) => {
        const currentTrades = tradesRef.current;
        persistTrades(currentTrades.filter((trade) => trade.id !== id));

        if (!isOnline || typeof window === 'undefined' || typeof window.fetch !== 'function') {
            handleOfflineDelete(id);
            return;
        }

        window.fetch(`${API_BASE}/trades/${id}`, {
            method: 'DELETE'
        })
            .then((response) => {
                if (!response.ok && response.status !== 204) {
                    throw new Error('Server rejected the delete');
                }
            })
            .catch(() => {
                handleOfflineDelete(id);
            });
    };

    const getTrade = (id) => {
        return trades.find((trade) => trade?.id?.toString() === id?.toString()) || null;
    };

    return (
        <TradeContext.Provider
            value={{
                trades,
                addTrade,
                editTrade,
                deleteTrade,
                getTrade,
                profile,
                saveProfile,
                isOnline,
                syncStatus,
                serverNotice,
                queuedOperations: queue.length
            }}
        >
            {children}
        </TradeContext.Provider>
    );
}

export const useTrades = () => useContext(TradeContext);
