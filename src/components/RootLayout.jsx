import { Outlet } from "react-router";
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { TradeProvider } from "../context/TradeContext";
import { useTheme } from "../context/ThemeContext";
import { useCookieTracker } from "../hooks/useCookieTracker";

// The Floating System Monitor Component
function SystemMonitor() {
    const { userAlias, savePreference } = useCookieTracker();
    const [isEditing, setIsEditing] = useState(false);
    const [tempAlias, setTempAlias] = useState(userAlias);

    const handleSaveAlias = (e) => {
        if (e.key === 'Enter') {
            savePreference(tempAlias);
            setIsEditing(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-4 bg-[#141414]/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]">

            {/* Preference Tracker (Cookie Driven) */}
            <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#C5A059]" />
                {isEditing ? (
                    <input
                        type="text"
                        value={tempAlias}
                        onChange={(e) => setTempAlias(e.target.value)}
                        onKeyDown={handleSaveAlias}
                        onBlur={() => setIsEditing(false)}
                        autoFocus
                        className="bg-transparent border-b border-[#C5A059] text-xs text-white outline-none w-20 font-mono"
                        placeholder="Alias..."
                    />
                ) : (
                    <span
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-[#C5A059] font-mono cursor-pointer hover:text-white transition-colors"
                        title="Click to edit alias (Saved to cookies)"
                    >
            {userAlias}
          </span>
                )}
            </div>

        </div>
    );
}

export function RootLayout() {
    const { theme } = useTheme();

    // Apply theme to html element for CSS variable cascade
    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('light', 'dark');
        html.classList.add(theme === 'light' ? 'light' : 'dark');
    }, [theme]);

    return (
        <TradeProvider>
            <div className={`min-h-screen ${theme === 'light' ? 'light' : 'dark'} pb-16`}>
                <Outlet />
                <SystemMonitor />
            </div>
        </TradeProvider>
    );
}