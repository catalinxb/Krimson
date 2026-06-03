import { Outlet } from "react-router";
import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { SessionWarning } from "./SessionWarning";

export function RootLayout() {
    const { theme } = useTheme();

    // Apply theme to html element for CSS variable cascade
    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('light', 'dark');
        html.classList.add(theme === 'light' ? 'light' : 'dark');
    }, [theme]);

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'light' : 'dark'} pb-16`}>
            <Outlet />
            <SessionWarning />
        </div>
    );
}