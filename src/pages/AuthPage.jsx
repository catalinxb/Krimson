import { useState } from "react";
import { useNavigate } from "react-router";
import { Activity, Lock, Mail, ArrowRight } from "lucide-react";

export function AuthPage() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate auth and route to terminal
        navigate("/terminal");
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden">
            {/* Cool animated background effects */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#DC2626]/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#C5A059]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 w-full max-w-md px-4 sm:px-8 py-8 sm:py-8 bg-[#141414]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
                <div className="flex justify-center mb-6 sm:mb-8">
                    <div className="p-3 bg-[#DC2626]/10 rounded-xl border border-[#DC2626]/20">
                        <Activity className="w-6 sm:w-8 h-6 sm:h-8 text-[#DC2626]" />
                    </div>
                </div>

                <h1 className="text-2xl sm:text-3xl text-white text-center tracking-tight mb-1 sm:mb-2">KRIMSON</h1>
                <p className="text-white/40 text-center text-xs sm:text-sm mb-6 sm:mb-8">Advanced Trading Terminal</p>

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 sm:top-3 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
                            <input
                                type="email"
                                required
                                placeholder="Email address"
                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-4 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 sm:top-3 w-4 sm:w-5 h-4 sm:h-5 text-white/40" />
                            <input
                                type="password"
                                required
                                placeholder="Password"
                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg py-2 sm:py-2.5 pl-9 sm:pl-10 pr-4 text-sm sm:text-base focus:border-[#DC2626]/50 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full group flex items-center justify-center gap-2 bg-[#DC2626] text-white font-medium py-2.5 sm:py-3 rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all uppercase tracking-wide text-xs sm:text-sm mt-4 sm:mt-6"
                    >
                        {isLogin ? "Initialize Session" : "Create Account"}
                        <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-4 sm:mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-white/50 hover:text-white text-xs sm:text-sm transition-colors"
                    >
                        {isLogin ? "Need an access node? Register" : "Already have access? Initialize"}
                    </button>
                </div>
            </div>
        </div>
    );
}