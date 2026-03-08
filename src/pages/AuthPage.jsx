// src/pages/AuthPage.jsx
// Login · Register · Forgot Password — real Firebase Auth

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/UI";

const ROLES = [
  { value: "owner",   label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff",   label: "Staff" },
];

// ── Shared background decoration ──────────────────────────────────────────────
function Background() {
  return (
    <>
      <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />
    </>
  );
}

// ── Logo block ─────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-3xl shadow-2xl shadow-orange-500/30 mb-4">
        🍔
      </div>
      <h1 className="text-3xl font-black text-white font-display tracking-tight">FoodDash</h1>
      <p className="text-gray-500 text-xs mt-1 tracking-widest uppercase">Admin Panel</p>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
      <span className="text-red-400 text-base mt-0.5">⚠️</span>
      <span className="text-red-400 text-sm">{message}</span>
    </div>
  );
}

// ── Password field with show/hide toggle ─────────────────────────────────────
function PasswordInput({ label, placeholder, value, onChange, error, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder || "••••••••"}
          value={value}
          autoComplete={autoComplete || "current-password"}
          onChange={onChange}
          className={`w-full bg-gray-800 border ${
            error ? "border-red-500" : "border-white/10"
          } rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN FORM
// ═══════════════════════════════════════════════════════════════════════════════
function LoginForm({ onSwitchRegister, onSwitchForgot }) {
  const { login, error, setError } = useAuth();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const field = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: "" }));
    setError("");
  };

  const validate = () => {
    const e = {};
    if (!form.email)                        e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password)                     e.password = "Password is required";
    else if (form.password.length < 6)      e.password = "At least 6 characters";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await login(form.email, form.password);
    setLoading(false);
  };

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Welcome back 👋</h2>
      <p className="text-gray-500 text-sm mb-6">Sign in to manage your store</p>

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          autoComplete="email"
          error={errors.email}
          onChange={field("email")}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Password</label>
            <button
              type="button"
              onClick={onSwitchForgot}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            placeholder="••••••••"
            value={form.password}
            autoComplete="current-password"
            error={errors.password}
            onChange={field("password")}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
          {loading ? "Signing in…" : "Sign In →"}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-white/8 text-center">
        <span className="text-sm text-gray-500">New admin? </span>
        <button
          type="button"
          onClick={onSwitchRegister}
          className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
        >
          Create an account →
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER FORM
// ═══════════════════════════════════════════════════════════════════════════════
function RegisterForm({ onSwitchLogin }) {
  const { register, error, setError } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    role: "manager", phone: "", shopName: "",
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const field = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: "" }));
    setError("");
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                         e.name            = "Full name is required";
    if (!form.email)                               e.email           = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))    e.email           = "Enter a valid email";
    if (!form.password)                            e.password        = "Password is required";
    else if (form.password.length < 6)             e.password        = "At least 6 characters";
    if (form.password !== form.confirmPassword)    e.confirmPassword = "Passwords do not match";
    if (!form.shopName.trim())                     e.shopName        = "Shop / restaurant name is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const ok = await register(form.email, form.password, {
      name:     form.name,
      role:     form.role,
      phone:    form.phone,
      shopName: form.shopName,
    });
    setLoading(false);
    if (ok) setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-4">
        <div className="text-5xl">🎉</div>
        <div className="text-white font-bold text-lg">Account created!</div>
        <div className="text-gray-400 text-sm">You are now logged in to the admin panel.</div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">Create admin account</h2>
      <p className="text-gray-500 text-sm mb-6">Set up your restaurant admin access</p>

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          value={form.name}
          autoComplete="name"
          error={errors.name}
          onChange={field("name")}
        />

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          autoComplete="email"
          error={errors.email}
          onChange={field("email")}
        />

        {/* Password */}
        <PasswordInput
          label="Password"
          placeholder="Min 6 characters"
          value={form.password}
          autoComplete="new-password"
          error={errors.password}
          onChange={field("password")}
        />

        {/* Confirm password */}
        <PasswordInput
          label="Confirm Password"
          placeholder="Repeat password"
          value={form.confirmPassword}
          autoComplete="new-password"
          error={errors.confirmPassword}
          onChange={field("confirmPassword")}
        />

        {/* Role */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</label>
          <select
            value={form.role}
            onChange={field("role")}
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Shop name */}
        <Input
          label="Restaurant / Shop Name"
          type="text"
          placeholder="FoodDash Kitchen"
          value={form.shopName}
          error={errors.shopName}
          onChange={field("shopName")}
        />

        {/* Phone (optional) */}
        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="+1 234 567 8900"
          value={form.phone}
          autoComplete="tel"
          onChange={field("phone")}
        />

        <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
          {loading ? "Creating account…" : "Create Account →"}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-white/8 text-center">
        <span className="text-sm text-gray-500">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchLogin}
          className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
        >
          Sign in →
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD FORM
// ═══════════════════════════════════════════════════════════════════════════════
function ForgotForm({ onBack }) {
  const { resetPassword, error, setError } = useAuth();
  const [email, setEmail]     = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) { setEmailErr("Email is required"); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch { /* error set by context */ }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-3">
        <div className="text-5xl">📧</div>
        <div className="text-white font-bold">Reset email sent!</div>
        <div className="text-gray-400 text-sm">Check your inbox for the password reset link.</div>
        <Button variant="outline" className="mt-3" onClick={onBack}>Back to Login</Button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        ← Back to login
      </button>
      <h2 className="text-xl font-bold text-white mb-1">Reset Password</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send a reset link</p>

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          error={emailErr}
          onChange={(e) => { setEmail(e.target.value); setEmailErr(""); setError(""); }}
        />
        <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
          {loading ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <Background />

      <div className="relative w-full max-w-md">
        <Logo />

        <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {mode === "login"    && <LoginForm    onSwitchRegister={() => setMode("register")} onSwitchForgot={() => setMode("forgot")} />}
          {mode === "register" && <RegisterForm onSwitchLogin={() => setMode("login")} />}
          {mode === "forgot"   && <ForgotForm   onBack={() => setMode("login")} />}
        </div>

        <p className="text-center text-xs text-gray-600 mt-5">
          FoodDash Admin © {new Date().getFullYear()} · React + Tailwind CSS + Firebase
        </p>
      </div>
    </div>
  );
}
