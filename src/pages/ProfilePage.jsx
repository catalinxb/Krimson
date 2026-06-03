import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, User, Key, Mail, SlidersHorizontal, Palette, Shield, Lock, QrCode, Copy, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useTrades } from "../context/TradeContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useTrades();
  const { theme, saveTheme } = useTheme();
  const { get2FAStatus, setup2FA, verify2FA, disable2FA, changePassword } = useAuth();
  
  // Profile form state
  const [form, setForm] = useState({
    displayName: profile?.displayName || "Anon Trader",
    email: profile?.email || "",
    password: profile?.password || "",
    pipValue: profile?.pipValue ?? 1,
  });
  const [selectedTheme, setSelectedTheme] = useState(theme || "dark");
  const [savedMessage, setSavedMessage] = useState("");
  
  // Section navigation
  const [activeSection, setActiveSection] = useState("profile"); // 'profile' | 'security'
  
  // 2FA state
  const [twoFAStatus, setTwoFAStatus] = useState({ isEnabled: false, method: null });
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isLoading2FA, setIsLoading2FA] = useState(false);
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load 2FA status on mount
  useEffect(() => {
    load2FAStatus();
  }, []);

  const load2FAStatus = async () => {
    try {
      const status = await get2FAStatus();
      setTwoFAStatus(status || { isEnabled: false, method: null });
    } catch (err) {
      console.error("Failed to load 2FA status:", err);
    }
  };

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

  // ==================== 2FA MANAGEMENT ====================
  const handleSetup2FA = async () => {
    setIsLoading2FA(true);
    try {
      const data = await setup2FA("totp");
      setTwoFASetupData(data);
      setBackupCodes(data.backupCodes || []);
      setShow2FASetup(true);
    } catch (err) {
      alert("Failed to setup 2FA: " + err.message);
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      alert("Please enter a valid 6-digit code");
      return;
    }
    try {
      await verify2FA(verifyCode);
      setTwoFAStatus({ isEnabled: true, method: "totp" });
      setShow2FASetup(false);
      setShowBackupCodes(true);
      alert("2FA enabled successfully! Save your backup codes.");
    } catch (err) {
      alert("Failed to verify 2FA: " + err.message);
    }
  };

  const handleDisable2FA = async () => {
    const password = prompt("Enter your current password to disable 2FA:");
    if (!password) return;
    try {
      await disable2FA(password);
      setTwoFAStatus({ isEnabled: false, method: null });
      alert("2FA has been disabled.");
    } catch (err) {
      alert("Failed to disable 2FA: " + err.message);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ==================== PASSWORD CHANGE ====================
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: "", type: "" });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ text: "New passwords don't match", type: "error" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ text: "Password must be at least 6 characters", type: "error" });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordMessage({ text: "Password changed successfully!", type: "success" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordMessage({ text: err.message || "Failed to change password", type: "error" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-foreground/50 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl tracking-tight">Profile Settings</h1>
            <p className="text-foreground/50 text-sm">Manage your profile, security, and authentication settings.</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveSection("profile")}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition ${
              activeSection === "profile"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/70 hover:text-foreground"
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveSection("security")}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition ${
              activeSection === "security"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/70 hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Security & Authentication
          </button>
        </div>

        {activeSection === "profile" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="space-y-6 bg-card/80 border border-border rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-foreground/70 block mb-2">Display Name</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <User className="w-4 h-4 text-accent" />
                  <input
                    value={form.displayName}
                    onChange={handleChange("displayName")}
                    className="w-full bg-transparent outline-none text-foreground placeholder:text-foreground/30"
                    placeholder="Trader alias"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground/70 block mb-2">Email</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <Mail className="w-4 h-4 text-primary" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    className="w-full bg-transparent outline-none text-foreground placeholder:text-foreground/30"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground/70 block mb-2">Password</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <Key className="w-4 h-4 text-orange-500" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={handleChange("password")}
                    className="w-full bg-transparent outline-none text-foreground placeholder:text-foreground/30"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground/70 block mb-2">Pip value</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <SlidersHorizontal className="w-4 h-4 text-success" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.pipValue}
                    onChange={handleChange("pipValue")}
                    className="w-full bg-transparent outline-none text-foreground placeholder:text-foreground/30"
                    placeholder="1.00"
                  />
                  <span className="text-foreground/50">$/pip</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground/70 block mb-2">Theme</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <Palette className="w-4 h-4 text-accent" />
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="w-full bg-transparent outline-none text-foreground cursor-pointer"
                  >
                    <option value="dark" className="bg-card text-foreground">Dark</option>
                    <option value="light" className="bg-card text-foreground">Light</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:bg-primary/80"
              >
                Save profile
              </button>
              {savedMessage && (
                <span className="text-sm text-success">{savedMessage}</span>
              )}
            </div>
          </form>

          <aside className="space-y-6 p-6 bg-card/60 border border-border rounded-3xl">
            <div className="rounded-3xl bg-muted/90 p-6 border border-border">
              <p className="text-sm uppercase tracking-[0.3em] text-foreground/40 mb-4">Current Profile</p>
              <div className="space-y-3 text-sm text-foreground/70">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span className="text-foreground">{profile?.displayName || "Anon Trader"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="text-foreground">{profile?.email || "Not set"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pip value</span>
                  <span className="text-foreground">${profile?.pipValue?.toFixed(2) ?? "1.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Theme</span>
                  <span className="text-foreground capitalize">{theme || "Dark"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-muted/90 p-6 border border-border">
              <h2 className="text-xl font-semibold mb-3">What changes here affect</h2>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Your configured pip value will be used throughout the dashboard to calculate real P&L from pip-based trade results. Your theme preference determines whether the site displays in light or dark mode.
              </p>
            </div>
          </aside>
        </div>
        ) : (
        /* SECURITY SECTION */
        <div className="space-y-6">
          {/* Two-Factor Authentication */}
          <div className="bg-card/80 border border-border rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Two-Factor Authentication (2FA)</h2>
                <p className="text-sm text-foreground/60">Add an extra layer of security to your account</p>
              </div>
              <div className="ml-auto">
                {twoFAStatus.isEnabled ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm font-medium">
                    Enabled
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-muted text-foreground/60 rounded-full text-sm font-medium">
                    Disabled
                  </span>
                )}
              </div>
            </div>

            {twoFAStatus.isEnabled ? (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                  <p className="text-sm text-foreground/70 mb-2">
                    2FA is currently <strong className="text-green-500">enabled</strong> using {twoFAStatus.method?.toUpperCase()}.
                  </p>
                  <p className="text-sm text-foreground/60">
                    You'll need to enter a verification code from your authenticator app when logging in.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBackupCodes(true)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition"
                  >
                    View Backup Codes
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-medium transition"
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>
            ) : show2FASetup ? (
              <div className="space-y-6">
                {twoFASetupData && (
                  <>
                    <div className="bg-muted/50 rounded-2xl p-6 border border-border text-center">
                      <p className="text-sm text-foreground/70 mb-4">
                        Scan this QR code with your authenticator app
                      </p>
                      <div className="bg-white p-4 rounded-xl inline-block">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFASetupData.qrCodeUrl)}`}
                          alt="2FA QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                      <p className="text-xs text-foreground/50 mt-4">
                        Secret: <code className="bg-muted px-2 py-1 rounded">{twoFASetupData.secret}</code>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.5em]"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleVerify2FA}
                          disabled={verifyCode.length !== 6}
                          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition hover:bg-primary/80 disabled:opacity-50"
                        >
                          Verify & Enable
                        </button>
                        <button
                          onClick={() => setShow2FASetup(false)}
                          className="px-6 py-3 bg-muted rounded-xl font-medium transition hover:bg-muted/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">
                  Two-factor authentication adds an extra layer of security by requiring a verification code from your phone in addition to your password.
                </p>
                <button
                  onClick={handleSetup2FA}
                  disabled={isLoading2FA}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition hover:bg-primary/80 disabled:opacity-50"
                >
                  {isLoading2FA ? "Setting up..." : "Setup 2FA"}
                </button>
              </div>
            )}
          </div>

          {/* Backup Codes */}
          {showBackupCodes && backupCodes.length > 0 && (
            <div className="bg-card/80 border border-yellow-500/30 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-semibold">Backup Recovery Codes</h3>
              </div>
              <p className="text-sm text-foreground/70 mb-4">
                Save these codes in a secure place. Each code can be used once to access your account if you lose your authenticator device.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3 font-mono text-sm">
                    <span>{code}</span>
                    <button onClick={() => copyToClipboard(code)} className="text-foreground/50 hover:text-foreground transition">
                      {copiedCode === code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); setCopiedCode("all"); setTimeout(() => setCopiedCode(null), 2000); }}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-medium transition"
                >
                  {copiedCode === "all" ? "Copied!" : "Copy All Codes"}
                </button>
                <button onClick={() => setShowBackupCodes(false)} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition">
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Change Password */}
          <div className="bg-card/80 border border-border rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Change Password</h2>
                <p className="text-sm text-foreground/60">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-sm text-foreground/70 block mb-2">Current Password</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-foreground"
                    placeholder="Enter current password"
                  />
                  <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))} className="text-foreground/50 hover:text-foreground transition">
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground/70 block mb-2">New Password</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-foreground"
                    placeholder="Enter new password"
                  />
                  <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))} className="text-foreground/50 hover:text-foreground transition">
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-foreground/70 block mb-2">Confirm New Password</label>
                <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-foreground"
                    placeholder="Confirm new password"
                  />
                  <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))} className="text-foreground/50 hover:text-foreground transition">
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordMessage.text && (
                <p className={`text-sm ${passwordMessage.type === "error" ? "text-red-500" : "text-green-500"}`}>
                  {passwordMessage.text}
                </p>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold transition hover:bg-primary/80 disabled:opacity-50"
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
