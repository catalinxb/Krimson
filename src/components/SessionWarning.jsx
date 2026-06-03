import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, Clock } from "lucide-react";

export function SessionWarning() {
    const { sessionWarning, sessionTimeRemaining, extendSession, logout, isAuthenticated } = useAuth();
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (!sessionWarning) {
            setCountdown(0);
            return;
        }

        // Calculate initial countdown in seconds
        const initialCountdown = Math.ceil(sessionWarning.timeRemaining / 1000);
        setCountdown(initialCountdown);

        // Update countdown every second
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionWarning]);

    // Check if user was logged out due to inactivity on mount
    useEffect(() => {
        const logoutReason = window.localStorage.getItem('krimson_logout_reason');
        if (logoutReason === 'inactivity' && !isAuthenticated) {
            window.localStorage.removeItem('krimson_logout_reason');
            // Could show a toast/notification here
        }
    }, [isAuthenticated]);

    if (!sessionWarning) {
        return null;
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#DC2626]/30 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#DC2626]/10 rounded-lg shrink-0">
                        <AlertCircle className="w-6 h-6 text-[#DC2626]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            Session Expiring Soon
                        </h3>
                        <p className="text-white/70 text-sm mb-4">
                            Your session will expire due to inactivity. Click "Stay Logged In" to continue.
                        </p>

                        <div className="flex items-center gap-2 text-[#DC2626] mb-4">
                            <Clock className="w-4 h-4" />
                            <span className="font-mono text-lg font-semibold">
                                {formatTime(countdown)}
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={extendSession}
                                className="flex-1 bg-[#DC2626] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#DC2626]/90 transition-colors"
                            >
                                Stay Logged In
                            </button>
                            <button
                                onClick={() => logout()}
                                className="flex-1 bg-white/5 text-white/70 py-2.5 px-4 rounded-lg font-medium hover:bg-white/10 transition-colors"
                            >
                                Logout Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Session status indicator component for the header
export function SessionStatus() {
    const { sessionTimeRemaining, isAuthenticated, extendSession } = useAuth();

    if (!isAuthenticated || !sessionTimeRemaining || sessionTimeRemaining > 300) {
        return null; // Only show when less than 5 minutes remaining
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isCritical = sessionTimeRemaining < 60;

    return (
        <button
            onClick={extendSession}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isCritical
                    ? 'bg-[#DC2626]/20 text-[#DC2626] hover:bg-[#DC2626]/30'
                    : 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
            }`}
            title="Click to extend session"
        >
            <Clock className="w-3 h-3" />
            <span>Session: {formatTime(sessionTimeRemaining)}</span>
        </button>
    );
}
