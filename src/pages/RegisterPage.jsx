import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Loader2, Check, X } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
    const navigate = useNavigate();
    const { register, isLoading } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordRequirements = [
        { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
        { label: 'One uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
        { label: 'One lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
        { label: 'One number', test: (pwd) => /[0-9]/.test(pwd) },
    ];

    const validateForm = () => {
        if (!formData.email) {
            setError('Email is required');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }

        // Validate username if provided
        if (formData.username) {
            if (formData.username.length < 3 || formData.username.length > 30) {
                setError('Username must be 3-30 characters');
                return false;
            }
            if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
                setError('Username must be alphanumeric (letters and numbers only)');
                return false;
            }
        }

        if (!formData.password) {
            setError('Password is required');
            return false;
        }

        for (const req of passwordRequirements) {
            if (!req.test(formData.password)) {
                setError('Password does not meet all requirements');
                return false;
            }
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        // If username provided, it becomes both username and display name
        const user = await register(
            formData.email,
            formData.password,
            formData.username || undefined,
            formData.username || undefined  // username = display name
        );

        if (user) {
            navigate("/terminal");
        } else {
            setError('Registration failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white py-8 relative overflow-hidden">
            {/* Animated background effects */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#DC2626]/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#C5A059]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

            <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/50 hover:text-white transition-colors z-10">
                <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            <div className="w-full max-w-md p-10 bg-[#141414] border border-white/10 rounded-2xl relative z-10">
                <h2 className="text-3xl mb-2 text-center">Create Account</h2>
                <p className="text-white/50 text-center mb-8">Join Krimson to start tracking your trades</p>

                {error ? (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <Label htmlFor="username" className="mb-1 block">Username (Optional)</Label>
                        <Input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            disabled={isLoading}
                            className="text-white bg-white/5 border-white/10"
                            placeholder="Choose a username (3-30 chars, alphanumeric)"
                        />
                        <p className="text-xs text-white/40 mt-1">Letters and numbers only</p>
                    </div>

                    <div>
                        <Label htmlFor="email" className="mb-1 block">Email Address *</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            disabled={isLoading}
                            className="text-white bg-white/5 border-white/10"
                            placeholder="Enter your email"
                        />
                    </div>

                    <div>
                        <Label htmlFor="password" className="mb-1 block">Password *</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                disabled={isLoading}
                                className="text-white bg-white/5 border-white/10 pr-10"
                                placeholder="Create a password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Password Requirements */}
                        <div className="mt-3 space-y-2">
                            <p className="text-xs text-white/50">Password requirements:</p>
                            {passwordRequirements.map((req, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                    {req.test(formData.password) ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <X className="w-3 h-3 text-white/30" />
                                    )}
                                    <span className={req.test(formData.password) ? 'text-green-500' : 'text-white/50'}>
                                        {req.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="confirmPassword" className="mb-1 block">Confirm Password *</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                disabled={isLoading}
                                className="text-white bg-white/5 border-white/10 pr-10"
                                placeholder="Confirm your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 bg-[#DC2626] text-white rounded-lg mt-6 hover:bg-[#DC2626]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-white/50">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#DC2626] hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
