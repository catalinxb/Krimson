import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const AuthContext = createContext({
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,
    login: async () => null,
    register: async () => null,
    logout: () => {},
    hasRole: () => false,
    hasPermission: () => false,
    authHeaders: () => ({}),
    sessionWarning: null,
    sessionTimeRemaining: null,
    extendSession: () => {},
});

const STORAGE_USER_KEY = 'krimson_auth_user';
const STORAGE_LAST_ACTIVITY_KEY = 'krimson_last_activity';

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
// Warning shown 2 minutes before logout
const SESSION_WARNING_MS = 2 * 60 * 1000;
// Check interval: every 10 seconds
const SESSION_CHECK_INTERVAL_MS = 10000;

function safeParse(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

const isTokenExpired = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) return true;
        return false;
    } catch {
        return true;
    }
};

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        if (typeof window === 'undefined') return null;
        const user = safeParse(window.localStorage.getItem(STORAGE_USER_KEY), null);
        if (user?.token && isTokenExpired(user.token)) {
            window.localStorage.removeItem(STORAGE_USER_KEY);
            return null;
        }
        return user;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState(null);
    const [sessionWarning, setSessionWarning] = useState(null);
    const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null);

    const isAuthenticated = !!currentUser?.token;

    // Mark initialization complete after first render
    useEffect(() => {
        setIsInitializing(false);
    }, []);

    const lastActivityRef = useRef(Date.now());
    const warningShownRef = useRef(false);
    const intervalRef = useRef(null);

    // Update last activity timestamp - DEFINED EARLY to avoid TDZ
    const updateActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, lastActivityRef.current.toString());
        }
        // Reset warning if activity resumed
        if (warningShownRef.current) {
            warningShownRef.current = false;
            setSessionWarning(null);
        }
    }, []);

    const persistUser = useCallback((user) => {
        setCurrentUser(user);
        if (typeof window !== 'undefined') {
            if (user) {
                window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
            } else {
                window.localStorage.removeItem(STORAGE_USER_KEY);
            }
        }
    }, []);

    const authHeaders = useCallback(() => {
        const headers = {};
        if (currentUser?.token) {
            headers.Authorization = `Bearer ${currentUser.token}`;
        }
        return headers;
    }, [currentUser]);

    const hasRole = useCallback((roleName) => {
        if (!currentUser?.roles) return false;
        return currentUser.roles.some((role) => role.name === roleName);
    }, [currentUser]);

    const hasPermission = useCallback((permission) => {
        if (!currentUser?.permissions) return false;
        return currentUser.permissions.includes(permission);
    }, [currentUser]);

    const isAdmin = useCallback(() => {
        return hasRole('admin');
    }, [hasRole]);

    const apiFetch = useCallback(async (endpoint, options = {}) => {
        const API_URL = 'https://krimson-3cnv.onrender.com';
        const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
                ...options.headers,
            },
        });

        if (response.status === 401) {
            persistUser(null);
            throw new Error('Session expired. Please log in again.');
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || `Request failed with status ${response.status}`);
        }

        return data;
    }, [authHeaders, persistUser]);

    const login = useCallback(async (email, password, twoFactorCode) => {
        setIsLoading(true);
        setError(null);

        try {
            const loginData = { email, password };
            if (twoFactorCode) {
                loginData.twoFactorCode = twoFactorCode;
            }

            const API_URL = 'https://krimson-3cnv.onrender.com';
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData),
            });

            const data = await response.json();

            if (response.status === 403 && data.requires2FA) {
                // 2FA required but not provided
                return { requires2FA: true, methods: data.methods };
            }

            if (!response.ok) {
                throw new Error(data.error || `Login failed with status ${response.status}`);
            }

            // Store user, tokens, and session
            const userData = {
                ...data.user,
                token: data.accessToken,
                refreshToken: data.refreshToken,
                session: data.session
            };

            persistUser(userData);
            updateActivity();
            return userData;

        } catch (err) {
            const errorMsg = err.message || 'Login failed';
            setError(errorMsg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [persistUser, updateActivity]);

    const register = useCallback(async (email, password, username = '', displayName = '') => {
        setIsLoading(true);
        setError(null);

        try {
            const registrationData = { email, password };
            if (displayName) {
                registrationData.displayName = displayName;
            }
            if (username) {
                registrationData.username = username;
            }

            const API_URL = 'https://krimson-3cnv.onrender.com';
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Registration failed with status ${response.status}`);
            }

            // Store user, tokens, and session
            const userData = {
                ...data.user,
                token: data.accessToken,
                refreshToken: data.refreshToken,
                session: data.session
            };

            persistUser(userData);
            updateActivity();
            return userData;

        } catch (err) {
            const errorMsg = err.message || 'Registration failed';
            setError(errorMsg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [persistUser, updateActivity]);

    const logout = useCallback((reason = 'manual') => {
        persistUser(null);
        setError(null);
        setSessionWarning(null);
        setSessionTimeRemaining(null);
        warningShownRef.current = false;
        lastActivityRef.current = Date.now();

        if (typeof window !== 'undefined' && reason === 'inactivity') {
            window.localStorage.setItem('krimson_logout_reason', 'inactivity');
        }
    }, [persistUser]);

    // Extend session by resetting activity
    const extendSession = useCallback(() => {
        updateActivity();
        warningShownRef.current = false;
        setSessionWarning(null);
        setSessionTimeRemaining(null);
    }, [updateActivity]);

    // DISABLED: Token expiration check causing logout loop
    // useEffect(() => {
    //     if (!currentUser?.token) return;
    //
    //     try {
    //         const tokenParts = currentUser.token.split('.');
    //         if (tokenParts.length === 3) {
    //             const payload = JSON.parse(atob(tokenParts[1]));
    //             if (payload.exp && payload.exp * 1000 < Date.now()) {
    //                 logout('expired');
    //             }
    //         }
    //     } catch {
    //         logout('expired');
    //     }
    // }, [currentUser, logout]);

    // Session inactivity tracking
    useEffect(() => {
        if (!isAuthenticated || typeof window === 'undefined') {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Load last activity from storage
        const storedActivity = window.localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY);
        if (storedActivity) {
            lastActivityRef.current = parseInt(storedActivity, 10);
        }

        // Track user activity events
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        const handleActivity = () => {
            updateActivity();
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Session check interval - monitor inactivity
        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const inactiveTime = now - lastActivityRef.current;
            const timeUntilTimeout = SESSION_TIMEOUT_MS - inactiveTime;
            const timeUntilWarning = timeUntilTimeout - SESSION_WARNING_MS;

            setSessionTimeRemaining(Math.max(0, Math.ceil(timeUntilTimeout / 1000)));

            // Show warning when approaching timeout
            if (timeUntilWarning <= 0 && timeUntilTimeout > 0 && !warningShownRef.current) {
                warningShownRef.current = true;
                setSessionWarning({
                    message: `Your session will expire in ${Math.ceil(timeUntilTimeout / 60 / 1000)} minutes due to inactivity.`,
                    timeRemaining: timeUntilTimeout
                });
            }

            // Auto-logout when timeout reached
            if (inactiveTime >= SESSION_TIMEOUT_MS) {
                logout('inactivity');
            }
        }, SESSION_CHECK_INTERVAL_MS);

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isAuthenticated, logout, updateActivity]);

    const value = {
        currentUser,
        isAuthenticated,
        isLoading,
        isInitializing,
        error,
        sessionWarning,
        sessionTimeRemaining,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
        isAdmin,
        authHeaders,
        apiFetch,
        extendSession,
        clearError: () => setError(null),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
