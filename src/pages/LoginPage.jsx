import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading } = useAuth();
    const [formData, setFormData] = useState({ usernameOrEmail: "", password: "" });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [inactivityLogout, setInactivityLogout] = useState(false);

    // Check if user was logged out due to inactivity
    useEffect(() => {
        const logoutReason = window.localStorage.getItem('krimson_logout_reason');
        if (logoutReason === 'inactivity') {
            setInactivityLogout(true);
            window.localStorage.removeItem('krimson_logout_reason');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const user = await login(formData.usernameOrEmail, formData.password);
        if (user) {
            navigate("/terminal");
        } else {
            setError('Invalid username/email or password');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white relative overflow-hidden">
            {/* Animated background effects */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#DC2626]/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#C5A059]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/50 hover:text-white transition-colors z-10">
                <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            <div className="w-full max-w-md p-10 bg-[#141414] border border-white/10 rounded-2xl relative z-10">
                <h2 className="text-3xl mb-2 text-center">Welcome Back</h2>
                <p className="text-white/50 text-center mb-8">Sign in to access your trading dashboard</p>

                {inactivityLogout ? (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <p className="text-sm text-yellow-400">
                                You were logged out due to inactivity. Please sign in again.
                            </p>
                        </div>
                    </div>
                ) : null}

                {error ? (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <Label htmlFor="usernameOrEmail" className="mb-1 block">Username or Email</Label>
                        <Input
                            id="usernameOrEmail"
                            name="usernameOrEmail"
                            type="text"
                            autoComplete="username"
                            value={formData.usernameOrEmail}
                            onChange={(e) => setFormData({ ...formData, usernameOrEmail: e.target.value })}
                            required
                            disabled={isLoading}
                            className="text-white bg-white/5 border-white/10"
                            placeholder="Enter your username or email"
                        />
                    </div>
                    <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                disabled={isLoading}
                                className="text-white bg-white/5 border-white/10 pr-10"
                                placeholder="Enter your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 bg-[#DC2626] text-white rounded-lg mt-6 hover:bg-[#DC2626]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-white/50">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-[#DC2626] hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}