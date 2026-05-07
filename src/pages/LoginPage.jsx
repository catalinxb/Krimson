// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export function LoginPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleSubmit = (e) => {
        e.preventDefault();
        navigate("/terminal");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
            <button onClick={() => navigate("/")} className="absolute top-8 left-8 flex items-center gap-2 text-white/50">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="w-full max-w-md p-10 bg-[#141414] border border-white/10 rounded-2xl">
                <h2 className="text-3xl mb-8 text-center">Welcome Back</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <Label>Email Address</Label>
                        <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="text-white"/>
                    </div>
                    <div>
                        <Label>Password</Label>
                        <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="text-white"/>
                    </div>
                    <button type="submit" className="w-full h-11 bg-[#00D1FF] text-black rounded-lg mt-6">Sign In</button>
                </form>
            </div>
        </div>
    );
}