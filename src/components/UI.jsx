// src/components/UI.jsx
// ─── Reusable UI building blocks used across all pages ───────────────────────

import { useState, useEffect } from "react";

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
export function StatusBadge({ status, config }) {
  const cfg = config[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
export function Button({ children, onClick, variant = "primary", size = "md", disabled = false, loading = false, className = "", type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary:  "bg-orange-500 hover:bg-orange-400 text-white focus:ring-orange-500 shadow-lg shadow-orange-500/20",
    secondary:"bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500",
    success:  "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 focus:ring-emerald-500",
    danger:   "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 focus:ring-red-500",
    warning:  "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 focus:ring-amber-500",
    outline:  "bg-transparent hover:bg-white/5 text-gray-300 border border-white/10 hover:border-white/20 focus:ring-gray-500",
    ghost:    "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white focus:ring-gray-500",
    cyan:     "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 focus:ring-cyan-500",
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? <span className="animate-spin">⏳</span> : children}
    </button>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
// Mobile  : slides up from bottom (full-width bottom sheet)
// Desktop : centered dialog with max-width
export function Modal({ open, onClose, title, children, size = "md" }) {
  const widths = { sm: "lg:max-w-sm", md: "lg:max-w-lg", lg: "lg:max-w-2xl", xl: "lg:max-w-3xl" };
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`
          relative w-full ${widths[size]}
          bg-gray-900 border border-white/10 shadow-2xl
          max-h-[92vh] lg:max-h-[90vh] overflow-y-auto
          rounded-t-3xl lg:rounded-2xl
          animate-slideUp
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 lg:p-6 border-b border-white/10">
          <h2 className="text-base lg:text-lg font-bold text-white font-display">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xl">×</button>
        </div>
        <div className="p-5 lg:p-6">{children}</div>
      </div>
    </div>
  );
}

// ── INPUT ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
      <input
        className={`w-full bg-gray-800 border ${error ? "border-red-500" : "border-white/10"} rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ── SELECT ────────────────────────────────────────────────────────────────────
export function Select({ label, options = [], className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
      <select
        className={`w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition-all cursor-pointer ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── TEXTAREA ──────────────────────────────────────────────────────────────────
export function Textarea({ label, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>}
      <textarea
        className={`w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition-all resize-none ${className}`}
        {...props}
      />
    </div>
  );
}

// ── TOGGLE ────────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || sublabel) && (
        <div>
          {label && <div className="text-sm font-medium text-white">{label}</div>}
          {sublabel && <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex-shrink-0 ${checked ? "bg-emerald-500" : "bg-gray-700"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = "", padding = true }) {
  return (
    <div className={`bg-gray-900 border border-white/8 rounded-2xl ${padding ? "p-6" : ""} ${className}`}>
      {children}
    </div>
  );
}

// ── KPI CARD ──────────────────────────────────────────────────────────────────
export function KpiCard({ icon, label, value, change, changeUp, accent = "orange" }) {
  const accents = {
    orange: "from-orange-500/20 to-transparent border-orange-500/20",
    blue:   "from-blue-500/20 to-transparent border-blue-500/20",
    green:  "from-emerald-500/20 to-transparent border-emerald-500/20",
    purple: "from-violet-500/20 to-transparent border-violet-500/20",
  };
  return (
    <div className={`relative bg-gradient-to-br ${accents[accent]} border rounded-2xl p-5 overflow-hidden`}>
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-2xl font-bold text-white font-display">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {change && <div className={`text-xs mt-2 font-medium ${changeUp ? "text-emerald-400" : "text-red-400"}`}>{change}</div>}
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${active === t.id ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", variant = "danger" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-400 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "📭", title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-lg font-semibold text-gray-300">{title}</div>
      {message && <div className="text-sm text-gray-500 mt-1">{message}</div>}
    </div>
  );
}

// ── LOADING SPINNER ───────────────────────────────────────────────────────────
export function Spinner({ size = "md" }) {
  const sizes = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className={`${sizes[size]} border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin`} />
  );
}

// ── LIVE INDICATOR ────────────────────────────────────────────────────────────
export function LiveIndicator({ label = "Live" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      {label}
    </span>
  );
}

// ── SEARCH INPUT ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition-all"
      />
    </div>
  );
}

// ── PAGINATION ────────────────────────────────────────────────────────────────
export function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/8">
      <span className="text-xs text-gray-500">Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>← Prev</Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
          <Button key={p} variant={p === page ? "primary" : "outline"} size="sm" onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next →</Button>
      </div>
    </div>
  );
}

// ── TOAST NOTIFICATION ────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  return { toasts, toast: { success: (m) => add(m, "success"), error: (m) => add(m, "error"), info: (m) => add(m, "info") } };
}

export function ToastContainer({ toasts }) {
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const colors = { success: "border-emerald-500/30 bg-emerald-500/10", error: "border-red-500/30 bg-red-500/10", info: "border-blue-500/30 bg-blue-500/10" };
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-white font-medium shadow-xl backdrop-blur-sm animate-slideUp ${colors[t.type]}`}>
          <span>{icons[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── BAR CHART ─────────────────────────────────────────────────────────────────
export function BarChart({ data, valueKey, labelKey, color = "bg-orange-500", height = 120 }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[10px] text-gray-500">{d[valueKey]}</div>
          <div
            className={`w-full ${color} rounded-t-md opacity-80 hover:opacity-100 transition-all cursor-pointer`}
            style={{ height: `${(d[valueKey] / max) * (height - 28)}px` }}
            title={`${d[labelKey]}: ${d[valueKey]}`}
          />
          <div className="text-[10px] text-gray-500">{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}