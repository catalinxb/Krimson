import { useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 bg-[#0A0A0A]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />

            <div className="relative z-10 text-center max-w-5xl mx-auto space-y-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-[#00D1FF] animate-pulse" />
                    <span className="text-white/70 text-sm tracking-widest uppercase">Trading Journal</span>
                </div>

                <div className="space-y-6">
                    <h1 className="text-[clamp(4rem,15vw,12rem)] leading-[0.9] tracking-tighter font-bold">
            <span className="bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">
              KRIMSON
            </span>
                    </h1>
                    <p className="text-[clamp(1.25rem,3vw,2rem)] text-white/60 tracking-wide max-w-2xl mx-auto">
                        Invisible in the noise. Clear in the books.
                    </p>
                    <p className="text-white/40 max-w-xl mx-auto">
                        An advanced terminal for executing, tracking, and analyzing your trades with absolute precision.
                    </p>
                </div>

                <div className="pt-8">
                    <button
                        onClick={() => navigate("/terminal")}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-[#00D1FF] text-[#0A0A0A] rounded-lg overflow-hidden transition-all duration-300 hover:scale-105"
                    >
                        <span className="relative z-10 tracking-wider uppercase">Enter Terminal</span>
                        <ArrowRight className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </div>
        </div>
    );
}