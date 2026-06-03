import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Activity, Lock, Mail, ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export function AuthPage() {
    const navigate = useNavigate();
    const { login, register, isLoading, isAuthenticated } = useAuth();

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [requires2FA, setRequires2FA] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate("/terminal");
        }
    }, [isAuthenticated, navigate]);

    // Password strength calculator
    useEffect(() => {
        if (!password) {
            setPasswordStrength(0);
            return;
        }

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[@$!%*?&]/.test(password)) strength++;

        setPasswordStrength(strength);
    }, [password]);

    const getPasswordStrengthColor = () => {
        if (passwordStrength < 2) return "text-red-500";
        if (passwordStrength < 4) return "text-yellow-500";
        return "text-green-500";
    };

    const getPasswordStrengthText = () => {
        if (passwordStrength < 2) return "Weak";
        if (passwordStrength < 4) return "Fair";
        return "Strong";
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email || !password) {
            setError("Email and password are required");
            return;
        }

        try {
            const result = await login(email, password, twoFactorCode);

            if (result?.requires2FA) {
                setRequires2FA(true);
                setSuccess("2FA code sent to your authenticator app");
                return;
            }

            if (result && result.token) {
                setSuccess("Login successful! Redirecting...");
                setTimeout(() => navigate("/terminal"), 500);
            } else {
                setError("Login failed. Please try again.");
            }
        } catch (err) {
            setError(err.message || "Login failed");
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email || !password || !confirmPassword) {
            setError("Email, password, and confirmation are required");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (passwordStrength < 3) {
            setError("Password is too weak. Use uppercase, lowercase, numbers, and special characters");
            return;
        }

        try {
            const result = await register(email, password, "", displayName || undefined);

            if (result && result.token) {
                setSuccess("Registration successful! Redirecting...");
                setTimeout(() => navigate("/terminal"), 500);
            } else {
                setError("Registration failed. Please try again.");
            }
        } catch (err) {
            setError(err.message || "Registration failed");
        }
    };

    const handleSwapMode = () => {
        setIsLoginMode(!isLoginMode);
        setError("");
        setSuccess("");
        setTwoFactorCode("");
        setRequires2FA(false);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setDisplayName("");
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden p-4">
            {/* Cool animated background effects */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#DC2626]/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#C5A059]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 w-full max-w-md bg-[#141414]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 p-6 sm:p-8">
                {/* Header */}
                <div className="flex justify-center mb-6 sm:mb-8">
                    <div className="p-3 bg-[#DC2626]/10 rounded-xl border border-[#DC2626]/20">
                        <Activity className="w-6 sm:w-8 h-6 sm:h-8 text-[#DC2626]" />
                    </div>
                </div>

                <h1 className="text-2xl sm:text-3xl text-white text-center tracking-tight mb-1 sm:mb-2">KRIMSON</h1>
                <p className="text-white/40 text-center text-xs sm:text-sm mb-6 sm:mb-8">Advanced Trading Terminal</p>

                {/* Error Alert */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                )}

                {/* Success Alert */}
                {success && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-2 items-start">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-green-200 text-sm">{success}</p>
                    </div>
                )}

                {/* 2FA Code Input */}
                {requires2FA && (
                    <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                            <label className="text-white/70 text-xs sm:text-sm font-medium">2FA Code</label>
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 px-4 text-center text-lg font-mono focus:border-[#DC2626]/50 outline-none transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || twoFactorCode.length !== 6}
                            className="w-full group flex items-center justify-center gap-2 bg-[#DC2626] text-white font-medium py-2.5 sm:py-3 rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all uppercase tracking-wide text-xs sm:text-sm mt-4 sm:mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Verifying..." : "Verify Code"}
                            <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                )}

                {/* Login Form */}
                {!requires2FA && isLoginMode && (
                    <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                            <label className="text-white/70 text-xs sm:text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 sm:top-3 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-4 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/70 text-xs sm:text-sm font-medium">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 sm:top-3 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-10 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 sm:top-3 text-white/40 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full group flex items-center justify-center gap-2 bg-[#DC2626] text-white font-medium py-2.5 sm:py-3 rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all uppercase tracking-wide text-xs sm:text-sm mt-4 sm:mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Initializing..." : "Initialize Session"}
                            <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                )}

                {/* Register Form */}
                {!requires2FA && !isLoginMode && (
                    <form onSubmit={handleRegisterSubmit} className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                            <label className="text-white/70 text-xs sm:text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 sm:top-3 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-4 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/70 text-xs sm:text-sm font-medium">Display Name (optional)</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your trading name"
                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 px-4 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/70 text-xs sm:text-sm font-medium">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 sm:top-3 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-10 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 sm:top-3 text-white/40 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                                            i <= passwordStrength ? "bg-[#DC2626]" : "bg-white/10"
                                        }`}
                                    />
                                ))}
                            </div>
                            {password && (
                                <p className={`text-xs ${getPasswordStrengthColor()}`}>
                                    Strength: {getPasswordStrengthText()}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/70 text-xs sm:text-sm font-medium">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 sm:top-3 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-10 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-2.5 sm:top-3 text-white/40 hover:text-white"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full group flex items-center justify-center gap-2 bg-[#DC2626] text-white font-medium py-2.5 sm:py-3 rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all uppercase tracking-wide text-xs sm:text-sm mt-4 sm:mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Creating Account..." : "Create Account"}
                            <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                )}

                {/* Mode Toggle */}
                <div className="mt-4 sm:mt-6 text-center">
                    <button
                        onClick={handleSwapMode}
                        disabled={isLoading}
                        className="text-white/50 hover:text-white text-xs sm:text-sm transition-colors disabled:cursor-not-allowed"
                    >
                        {isLoginMode ? "Need an access node? Register" : "Already have access? Initialize"}
                    </button>
                </div>

                {/* Test Credentials Info */}
                {isLoginMode && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-white/40 text-xs text-center mb-2">Demo Accounts (Testing):</p>
                        <div className="space-y-1 text-xs text-white/30">
                            <p>Admin: admin@example.com / AdminPass123!</p>
                            <p>Trader: trader@example.com / TraderPass123!</p>
                            <p>Viewer: viewer@example.com / ViewerPass123!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}