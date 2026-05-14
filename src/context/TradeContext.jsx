import { createContext, useContext, useEffect, useRef, useState } from "react";

const initialTrades = [
    { id: 1, asset: "BTC/USDT", entry: 42500, exit: 45200, pnl: 2700, pnlPercent: 6.35, status: "winner", direction: "long", startDate: "2026-03-15T09:30", endDate: "2026-03-16T14:45", pips: 270, review: "Strong bullish momentum confirmed on 4H chart. Entry taken after breakout above resistance.", duration: "10h 30m" },
    { id: 2, asset: "ETH/USDT", entry: 2850, exit: 2720, pnl: -130, pnlPercent: -4.56, status: "loser", direction: "long", startDate: "2026-03-14T11:00", endDate: "2026-03-15T16:20", pips: -130, review: "Failed breakout, should have respected the bearish divergence.", duration: "5h 20m" }
];

const STORAGE_TRADES_KEY = 'trade_dashboard_trades';
const STORAGE_QUEUE_KEY = 'trade_dashboard_queue';
const STORAGE_PROFILE_KEY = 'trade_dashboard_profile';
const GRAPHQL_ENDPOINT = import.meta.env.DEV ? 'http://localhost:3001/graphql' : '/graphql';
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

const defaultStats = {
    totalTrades: 0,
    winners: 0,
    losers: 0,
    breakeven: 0,
    winRate: 0,
    totalPnL: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    notesCount: 0
};

async function graphqlFetch(query, variables = {}) {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
        throw new Error('Fetch is unavailable');
    }

    const response = await window.fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
    });

    const payload = await response.json();
    if (!response.ok || payload.errors) {
        const errorMessage = payload.errors?.[0]?.message || 'GraphQL request failed';
        throw new Error(errorMessage);
    }

    return payload.data;
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
    const [stats, setStats] = useState(defaultStats);
    const [pagination, setPagination] = useState({ page: 0, limit: 8, total: 0, pages: 0 });
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [generatorRunning, setGeneratorRunning] = useState(false);
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [serverNotice, setServerNotice] = useState('Ready');
    const wsRef = useRef(null);
    const isSyncingRef = useRef(false);
    const reconnectTimer = useRef(null);
    const tradesRef = useRef(trades);
    const queueRef = useRef(queue);
    const loadedPagesRef = useRef(new Set());
    const prefetchCacheRef = useRef({});

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

    const loadStats = async () => {
        try {
            const query = `query Stats { stats { totalTrades winners losers breakeven winRate totalPnL avgWin avgLoss profitFactor notesCount } }`;
            const data = await graphqlFetch(query);
            if (data?.stats) {
                setStats(data.stats);
            }
        } catch {
            // Keep local stats if backend is unavailable.
        }
    };

    const startGenerator = async () => {
        try {
            const response = await window.fetch('/api/trades/generator/start', { method: 'POST' });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to start generator');
            }
            setGeneratorRunning(true);
            setServerNotice('Trade generator started');
            return true;
        } catch (error) {
            setServerNotice('Could not start generator: ' + error.message);
            return false;
        }
    };

    const stopGenerator = async () => {
        try {
            const response = await window.fetch('/api/trades/generator/stop', { method: 'POST' });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to stop generator');
            }
            setGeneratorRunning(false);
            setServerNotice('Trade generator stopped');
            return true;
        } catch (error) {
            setServerNotice('Could not stop generator: ' + error.message);
            return false;
        }
    };

    const loadTradePage = async (page = 1, limit = pagination.limit) => {
        if (loadedPagesRef.current.has(page) || isLoadingPage || (pagination.pages && page > pagination.pages)) {
            return null;
        }

        setIsLoadingPage(true);
        try {
            const query = `query TradesPage($page: Int!, $limit: Int!) {\n                trades(page: $page, limit: $limit) {\n                    trades {\n                        id\n                        asset\n                        entry\n                        exit\n                        pnl\n                        pnlPercent\n                        status\n                        direction\n                        startDate\n                        endDate\n                        pips\n                        review\n                        duration\n                        noteCount\n                    }\n                    pagination {\n                        page\n                        limit\n                        total\n                        pages\n                    }\n                }\n                stats {\n                    totalTrades\n                    winners\n                    losers\n                    breakeven\n                    winRate\n                    totalPnL\n                    avgWin\n                    avgLoss\n                    profitFactor\n                    notesCount\n                }\n            }`;

            const data = await graphqlFetch(query, { page, limit });
            const pageData = data?.trades;
            if (!pageData) {
                return null;
            }

            if (page === 1) {
                setTrades(pageData.trades);
            } else {
                setTrades((previousTrades) => mergeTrades(previousTrades, pageData.trades));
            }

            setPagination(pageData.pagination);
            setHasMore(pageData.pagination.page < pageData.pagination.pages);
            loadedPagesRef.current.add(pageData.pagination.page);
            setStats(data.stats || defaultStats);

            const nextPage = pageData.pagination.page + 1;
            if (nextPage <= pageData.pagination.pages) {
                prefetchTradePage(nextPage, pageData.pagination.limit);
            }

            return pageData;
        } catch {
            return null;
        } finally {
            setIsLoadingPage(false);
        }
    };

    const prefetchTradePage = async (page, limit = pagination.limit) => {
        if (page < 1 || loadedPagesRef.current.has(page) || prefetchCacheRef.current[page]) {
            return;
        }

        try {
            const query = `query TradesPage($page: Int!, $limit: Int!) {\n                trades(page: $page, limit: $limit) {\n                    trades {\n                        id\n                        asset\n                        entry\n                        exit\n                        pnl\n                        pnlPercent\n                        status\n                        direction\n                        startDate\n                        endDate\n                        pips\n                        review\n                        duration\n                        noteCount\n                    }\n                    pagination {\n                        page\n                        limit\n                        total\n                        pages\n                    }\n                }\n            }`;
            const data = await graphqlFetch(query, { page, limit });
            if (data?.trades) {
                prefetchCacheRef.current[page] = data.trades;
            }
        } catch {
            // ignore prefetch failures
        }
    };

    const loadNextPage = async () => {
        const nextPage = pagination.page + 1;
        if (!hasMore || nextPage <= 0) {
            return;
        }

        if (prefetchCacheRef.current[nextPage]) {
            const pageData = prefetchCacheRef.current[nextPage];
            delete prefetchCacheRef.current[nextPage];
            setTrades((previousTrades) => mergeTrades(previousTrades, pageData.trades));
            setPagination(pageData.pagination);
            setHasMore(pageData.pagination.page < pageData.pagination.pages);
            loadedPagesRef.current.add(pageData.pagination.page);
            prefetchTradePage(pageData.pagination.page + 1, pageData.pagination.limit);
            return;
        }

        await loadTradePage(nextPage, pagination.limit);
    };

    const fetchTradeById = async (id) => {
        const query = `query TradeById($id: ID!) {\n            trade(id: $id) {\n                id\n                asset\n                entry\n                exit\n                pnl\n                pnlPercent\n                status\n                direction\n                startDate\n                endDate\n                pips\n                review\n                duration\n                noteCount\n                notes {\n                    id\n                    tradeId\n                    content\n                    createdAt\n                    updatedAt\n                }\n            }\n        }`;

        try {
            const data = await graphqlFetch(query, { id });
            if (data?.trade) {
                persistTrades((current) => mergeTrades(current, [data.trade]));
                return data.trade;
            }
        } catch {
            // ignore fetch errors here
        }
        return null;
    };

    const createNote = async (tradeId, content) => {
        try {
            const query = `mutation CreateNote($tradeId: ID!, $content: String!) {\n                createNote(tradeId: $tradeId, content: $content) {\n                    id\n                    tradeId\n                    content\n                    createdAt\n                    updatedAt\n                }\n            }`;
            await graphqlFetch(query, { tradeId, content });
            await fetchTradeById(tradeId);
        } catch (error) {
            setServerNotice('Could not save note: ' + error.message);
        }
    };

    const updateNote = async (id, content, tradeId) => {
        try {
            const query = `mutation UpdateNote($id: ID!, $content: String!) {\n                updateNote(id: $id, content: $content) {\n                    id\n                    tradeId\n                    content\n                    createdAt\n                    updatedAt\n                }\n            }`;
            await graphqlFetch(query, { id, content });
            if (tradeId) {
                await fetchTradeById(tradeId);
            }
        } catch (error) {
            setServerNotice('Could not update note: ' + error.message);
        }
    };

    const deleteNote = async (id, tradeId) => {
        try {
            const query = `mutation DeleteNote($id: ID!) {\n                deleteNote(id: $id)\n            }`;
            await graphqlFetch(query, { id });
            if (tradeId) {
                await fetchTradeById(tradeId);
            }
        } catch (error) {
            setServerNotice('Could not delete note: ' + error.message);
        }
    };

    const loadInitialTradePages = async () => {
        await loadTradePage(1, pagination.limit);
    };

    const handleOfflineCreate = (trade) => {
        const tempId = trade.id || createTempId();
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
        if (!isOnline) {
            return;
        }

        try {
            await loadTradePage(1, pagination.limit);
            await loadStats();
            setServerNotice('Latest trades synchronized');
        } catch {
            setServerNotice('Unable to fetch latest trades from backend');
        }
    };

    const processQueue = async () => {
        if (!isOnline || isSyncingRef.current || queue.length === 0) {
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
                    const query = `mutation CreateTrade($input: TradeInput!) { createTrade(input: $input) { id asset entry exit pnl pnlPercent status direction startDate endDate pips review duration noteCount } }`;
                    const data = await graphqlFetch(query, { input: normalizeTradeForApi(item.trade) });
                    const createdTrade = data.createTrade;
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
                    const query = `mutation UpdateTrade($id: ID!, $input: TradeInput!) { updateTrade(id: $id, input: $input) { id asset entry exit pnl pnlPercent status direction startDate endDate pips review duration noteCount } }`;
                    const data = await graphqlFetch(query, { id: item.trade.id, input: normalizeTradeForApi(item.trade) });
                    const updatedTrade = data.updateTrade;
                    currentTrades = currentTrades.map((trade) => trade.id === updatedTrade.id ? updatedTrade : trade);
                    currentQueue = currentQueue.slice(1);
                } else if (item.type === 'delete') {
                    const query = `mutation DeleteTrade($id: ID!) { deleteTrade(id: $id) }`;
                    await graphqlFetch(query, { id: item.id });
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
        if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || import.meta.env.MODE === 'test') {
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
            const query = `query Health { health { status timestamp } }`;
            await graphqlFetch(query);
            setIsOnline(true);
            setServerNotice('Server reachable');
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

        if (import.meta.env.MODE === 'test') {
            // Skip remote connectivity checks and WebSocket setup during tests.
            return;
        }

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
        loadInitialTradePages();
        loadStats();

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

    const addTrade = async (trade) => {
        const currentTrades = tradesRef.current;
        const tempTrade = {
            ...trade,
            id: createTempId(),
            createdAt: trade.createdAt || new Date().toISOString()
        };

        persistTrades(sortTrades([tempTrade, ...currentTrades]));

        if (!isOnline) {
            handleOfflineCreate(tempTrade);
            return;
        }

        try {
            const query = `mutation CreateTrade($input: TradeInput!) { createTrade(input: $input) { id asset entry exit pnl pnlPercent status direction startDate endDate pips review duration noteCount } }`;
            const data = await graphqlFetch(query, { input: normalizeTradeForApi(trade) });
            const createdTrade = data.createTrade;
            persistTrades(sortTrades(tradesRef.current.map((existing) => existing.id === tempTrade.id ? createdTrade : existing)));
        } catch (error) {
            handleOfflineCreate(tempTrade);
            setServerNotice('New trade queued due to network or GraphQL failure');
        }
    };

    const editTrade = async (updatedTrade) => {
        const currentTrades = tradesRef.current;
        persistTrades(currentTrades.map((trade) => trade.id === updatedTrade.id ? { ...trade, ...updatedTrade } : trade));

        if (!isOnline) {
            handleOfflineEdit(updatedTrade);
            return;
        }

        try {
            const query = `mutation UpdateTrade($id: ID!, $input: TradeInput!) { updateTrade(id: $id, input: $input) { id asset entry exit pnl pnlPercent status direction startDate endDate pips review duration noteCount } }`;
            const data = await graphqlFetch(query, { id: updatedTrade.id, input: normalizeTradeForApi(updatedTrade) });
            const latestTrade = data.updateTrade;
            persistTrades(tradesRef.current.map((trade) => trade.id === latestTrade.id ? latestTrade : trade));
        } catch {
            handleOfflineEdit(updatedTrade);
        }
    };

    const deleteTrade = async (id) => {
        const currentTrades = tradesRef.current;
        persistTrades(currentTrades.filter((trade) => trade.id !== id));

        if (!isOnline) {
            handleOfflineDelete(id);
            return;
        }

        try {
            const query = `mutation DeleteTrade($id: ID!) { deleteTrade(id: $id) }`;
            await graphqlFetch(query, { id });
        } catch {
            handleOfflineDelete(id);
        }
    };

    const getTrade = (id) => {
        return trades.find((trade) => trade?.id?.toString() === id?.toString()) || null;
    };

    return (
        <TradeContext.Provider
            value={{
                trades,
                stats,
                pagination,
                isLoadingPage,
                hasMore,
                loadTradePage,
                loadNextPage,
                prefetchTradePage,
                fetchTradeById,
                addTrade,
                editTrade,
                deleteTrade,
                createNote,
                updateNote,
                deleteNote,
                startGenerator,
                stopGenerator,
                generatorRunning,
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
