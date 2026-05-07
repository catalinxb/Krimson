import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, User, Key, Mail, SlidersHorizontal, Palette } from "lucide-react";
import { useTrades } from "../context/TradeContext";
import { useTheme } from "../context/ThemeContext";

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useTrades();
  const { theme, saveTheme } = useTheme();
  const [form, setForm] = useState({
    displayName: profile?.displayName || "Anon Trader",
    email: profile?.email || "",
    password: profile?.password || "",
    pipValue: profile?.pipValue ?? 1,
  });
  const [selectedTheme, setSelectedTheme] = useState(theme || "dark");
  const [savedMessage, setSavedMessage] = useState("");

  const handleChange = (key) => (event) => {
    const value = key === "pipValue" ? parseFloat(event.target.value) : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveProfile({
      displayName: form.displayName || "Anon Trader",
      email: form.email,
      password: form.password,
      pipValue: Number.isFinite(form.pipValue) && form.pipValue > 0 ? form.pipValue : 1,
    });
    saveTheme(selectedTheme);
    setSavedMessage("Profile and theme updated successfully.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] relative text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl tracking-tight">Profile Settings</h1>
            <p className="text-white/50 text-sm">Manage name, email, password, and pip value for P&L calculations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-6 bg-[#141414]/80 border border-white/10 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 block mb-2">Display Name</label>
                <div className="flex items-center gap-3 bg-[#0B0B0B] border border-white/10 rounded-xl px-4 py-3">
                  <User className="w-4 h-4 text-[#C5A059]" />
                  <input
                    value={form.displayName}
                    onChange={handleChange("displayName")}
                    className="w-full bg-transparent outline-none text-white placeholder:text-white/30"
                    placeholder="Trader alias"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/70 block mb-2">Email</label>
                <div className="flex items-center gap-3 bg-[#0B0B0B] border border-white/10 rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-[#00D1FF]" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    className="w-full bg-transparent outline-none text-white placeholder:text-white/30"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/70 block mb-2">Password</label>
                <div className="flex items-center gap-3 bg-[#0B0B0B] border border-white/10 rounded-xl px-4 py-3">
                  <Key className="w-4 h-4 text-[#FF9D3B]" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={handleChange("password")}
                    className="w-full bg-transparent outline-none text-white placeholder:text-white/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/70 block mb-2">Pip value</label>
                <div className="flex items-center gap-3 bg-[#0B0B0B] border border-white/10 rounded-xl px-4 py-3">
                  <SlidersHorizontal className="w-4 h-4 text-[#00FF85]" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.pipValue}
                    onChange={handleChange("pipValue")}
                    className="w-full bg-transparent outline-none text-white placeholder:text-white/30"
                    placeholder="1.00"
                  />
                  <span className="text-white/50">$/pip</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/70 block mb-2">Theme</label>
                <div className="flex items-center gap-3 bg-[#0B0B0B] border border-white/10 rounded-xl px-4 py-3">
                  <Palette className="w-4 h-4 text-[#C5A059]" />
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="w-full bg-transparent outline-none text-white cursor-pointer"
                  >
                    <option value="dark" className="bg-[#141414] text-white">Dark</option>
                    <option value="light" className="bg-[#F5F5F5] text-black">Light</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-[#00D1FF] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#0A0A0A] transition hover:bg-[#1ac8ff]"
              >
                Save profile
              </button>
              {savedMessage && (
                <span className="text-sm text-[#00FF85]">{savedMessage}</span>
              )}
            </div>
          </form>

          <aside className="space-y-6 p-6 bg-[#141414]/60 border border-white/10 rounded-3xl">
            <div className="rounded-3xl bg-[#0B0B0B]/90 p-6 border border-white/5">
              <p className="text-sm uppercase tracking-[0.3em] text-white/40 mb-4">Current Profile</p>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span className="text-white">{profile?.displayName || "Anon Trader"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="text-white">{profile?.email || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pip value</span>
                  <span className="text-white">${profile?.pipValue?.toFixed(2) ?? "1.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Theme</span>
                  <span className="text-white capitalize">{theme || "Dark"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-[#0B0B0B]/90 p-6 border border-white/5">
              <h2 className="text-xl font-semibold mb-3">What changes here affect</h2>
              <p className="text-sm text-white/60 leading-relaxed">
                Your configured pip value will be used throughout the dashboard to calculate real P&L from pip-based trade results. Your theme preference determines whether the site displays in light or dark mode. It also personalizes the trader alias and profile information in your session.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
