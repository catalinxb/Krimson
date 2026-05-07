import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

// Utility functions for raw cookie manipulation
const setCookie = (name, value, days) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
};

const getCookie = (name) => {
    const cookieString = document.cookie;
    const cookies = cookieString.split('; ');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName === name) return cookieValue;
    }
    return null;
};

export function useCookieTracker() {
    const location = useLocation();
    const [userAlias, setUserAlias] = useState(() => getCookie('user_alias') || 'AnonTrader');
    const [theme, setTheme] = useState(() => getCookie('app_theme') || 'dark');
    const [showCharts, setShowChartsState] = useState(() => getCookie('show_charts') === 'true');

    // 1. MONITOR ACTIVITY: Track page navigation
    useEffect(() => {
        const currentCount = parseInt(getCookie('activity_count') || '0', 10);
        const newCount = currentCount + 1;

        setCookie('activity_count', newCount, 30);
        setCookie('last_visited_path', location.pathname, 30);
    }, [location.pathname]);

    // Function to update the preference cookie
    const savePreference = (newAlias) => {
        if (!newAlias.trim()) return;
        setCookie('user_alias', newAlias, 365);
        setUserAlias(newAlias);
    };

    const saveTheme = (newTheme) => {
        setCookie('app_theme', newTheme, 365);
        setTheme(newTheme);
    };

    const saveShowCharts = (show) => {
        setCookie('show_charts', show ? 'true' : 'false', 365);
        setShowChartsState(show);
    };

    return { userAlias, savePreference, theme, saveTheme, showCharts, saveShowCharts };
}