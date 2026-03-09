// src/pages/ReportsPage.jsx
// Complete report section — real Firestore data only, no mock data
import { useState, useMemo, useRef } from "react";
import { Card, Button, StatusBadge, Modal } from "../components/UI";
import { STATUS_CONFIG } from "../utils/mockData";

// ── Timestamp helpers ────────────────────────────────────────────────────────
// Primary source: _ms pre-converted by subscribeOrders. Fallback for safety.
const toMs = (o) => {
  if (o._ms) return o._ms;
  const t = o.createdAt;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  return 0;
};

const isOnDay = (o, year, month, date) => {
  const ms = toMs(o);
  if (!ms) return false;
  const d = new Date(ms);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === date;
};

// ── Date range start helpers ─────────────────────────────────────────────────
const startOfToday  = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
const startOfWeek   = () => Date.now() - 7  * 86400000;
const startOfMonth  = () => Date.now() - 30 * 86400000;

// ── CSV export helper ────────────────────────────────────────────────────────
function downloadCSV(data, filename, onSuccess, onError) {
  if (!data.length) { onError("No data to export"); return; }
  const keys = Object.keys(data[0]);
  const csv  = [
    keys.join(","),
    ...data.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href:     URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `${filename}.csv`,
  });
  a.click();
  onSuccess(`${filename}.csv downloaded`);
}

// ── Order number helper ───────────────────────────────────────────────────────
const fmtOrder = (o) => {
  if (o?.orderNumber) return o.orderNumber;
  const id = o?.id || "";
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return (n % 900000) + 100000;
};

// ── Shared formatters ────────────────────────────────────────────────────────
function fmtDate(o) {
  const ms = toMs(o);
  if (ms) return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return o.date || "—";
}
function fmtTime(o) {
  const ms = toMs(o);
  if (ms) return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return o.time || "—";
}

// ── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, color = "text-white", accent = "border-white/8", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border ${accent} rounded-2xl p-4 ${onClick ? "cursor-pointer hover:border-orange-500/40 transition-colors" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 uppercase font-bold tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-black font-display ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

// ── Simple inline bar ────────────────────────────────────────────────────────
function Bar({ pct, color = "bg-orange-500" }) {
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  );
}

// ── TAB BUTTON ───────────────────────────────────────────────────────────────
function Tab({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
        active ? "bg-orange-500 text-white shadow-sm" : "bg-gray-800 text-gray-400 hover:text-white border border-white/10"
      }`}
    >
      {label}
    </button>
  );
}

// ── PER-TAB DATE RANGE SELECTOR ───────────────────────────────────────────────
const RANGE_OPTS = [
  { key: "today", label: "Daily"    },
  { key: "week",  label: "Weekly"   },
  { key: "month", label: "Monthly"  },
  { key: "all",   label: "All Time" },
];
function RangeTabs({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 bg-gray-900 border border-white/8 rounded-xl px-3 py-2">
      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mr-1">Period:</span>
      {RANGE_OPTS.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            value === o.key ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 1 — Order Detail
// ════════════════════════════════════════════════════════════════════════════
function OrderDetailModal({ order: o, onClose }) {
  const cfg = STATUS_CONFIG[o.status] || {};
  return (
    <Modal open title={`Order #${(o.id || "").slice(-8).toUpperCase()}`} onClose={onClose} size="md">
      {/* Status + date */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/8">
        <StatusBadge status={o.status} config={STATUS_CONFIG} />
        <div className="text-right">
          <div className="text-xs text-white font-semibold">{fmtDate(o)}</div>
          <div className="text-[10px] text-gray-500">{fmtTime(o)}</div>
        </div>
      </div>

      {/* Customer + Rider */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1.5">Customer</div>
          <div className="text-sm font-semibold text-white">{o.customer || o.customerName || "—"}</div>
          {o.customerPhone && <div className="text-xs text-gray-400 mt-0.5">{o.customerPhone}</div>}
          {(o.address || o.deliveryAddress) && (
            <div className="text-xs text-gray-500 mt-1">📍 {o.address || o.deliveryAddress}</div>
          )}
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1.5">Rider</div>
          <div className="text-sm font-semibold text-white">{o.riderName || "—"}</div>
          {o.riderAccepted && <div className="text-xs text-emerald-400 mt-0.5">✅ Accepted</div>}
          {o.distance && <div className="text-xs text-gray-500 mt-1">📍 {o.distance}</div>}
        </div>
      </div>

      {/* Items list */}
      <div className="bg-gray-800 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-2.5 border-b border-white/8">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Items Ordered</span>
        </div>
        {(o.items || []).map((item, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-400 font-bold w-5">×{item.qty || 1}</span>
              <span className="text-sm text-white">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">${Number(item.price || 0).toFixed(2)} ea</span>
              <span className="text-sm font-bold text-white ml-3">
                ${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing breakdown */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Subtotal</span><span className="font-semibold text-white">${Number(o.subtotal || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Delivery fee</span><span className="font-semibold text-white">${Number(o.deliveryFee || 0).toFixed(2)}</span>
        </div>
        {Number(o.discount || 0) > 0 && (
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Discount {o.promo ? `(${o.promo})` : ""}</span>
            <span className="font-semibold">−${Number(o.discount).toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-white/10 pt-2 flex justify-between">
          <span className="font-bold text-white">Total</span>
          <span className="font-black text-orange-400 text-lg">${Number(o.total || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Payment + note */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Payment</div>
          <div className="text-sm text-white">💳 {o.payment || "Cash on delivery"}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Order Note</div>
          <div className="text-sm text-white">{o.note || <span className="text-gray-600">None</span>}</div>
        </div>
      </div>

      {/* Customer review */}
      {o.review?.rating && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-4">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Customer Review</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400">{"⭐".repeat(o.review.rating)}</span>
            <span className="text-xs text-amber-400 font-bold">{o.review.rating}/5</span>
          </div>
          {o.review.comment && <p className="text-sm text-gray-300 italic">"{o.review.comment}"</p>}
        </div>
      )}

      {/* Cancellation reason */}
      {o.status === "cancelled" && o.cancelReason && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 mb-4">
          <div className="text-[10px] text-red-400 uppercase font-bold mb-1">Cancellation Reason</div>
          <div className="text-sm text-gray-300">{o.cancelReason}</div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-white/8">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 2 — Item Drilldown (orders containing this item)
// ════════════════════════════════════════════════════════════════════════════
function ItemDrilldownModal({ itemName, orders, onClose }) {
  const related = useMemo(() =>
    orders
      .filter(o => o.status === "delivered" && (o.items || []).some(i => i.name === itemName))
      .sort((a, b) => toMs(b) - toMs(a)),
    [orders, itemName]
  );
  const totalQty = related.reduce((s, o) => {
    const it = (o.items || []).find(i => i.name === itemName);
    return s + Number(it?.qty || 1);
  }, 0);
  const totalRev = related.reduce((s, o) => {
    const it = (o.items || []).find(i => i.name === itemName);
    return s + Number(it?.price || 0) * Number(it?.qty || 1);
  }, 0);

  return (
    <Modal open title={`Item: ${itemName}`} onClose={onClose} size="md">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-white">{related.length}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Orders</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-orange-400">{totalQty}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Total Sold</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-emerald-400">${totalRev.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Revenue</div>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {related.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No delivered orders for this item</div>
        ) : related.map(o => {
          const it = (o.items || []).find(i => i.name === itemName);
          return (
            <div key={o.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
              <div>
                <div className="text-xs font-mono text-gray-400">#{fmtOrder(o)}</div>
                <div className="text-sm font-semibold text-white">{o.customer || o.customerName || "—"}</div>
                <div className="text-[10px] text-gray-500">{fmtDate(o)} · {fmtTime(o)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-orange-400 font-bold">×{it?.qty || 1}</div>
                <div className="text-sm font-black text-white">${(Number(it?.price || 0) * Number(it?.qty || 1)).toFixed(2)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-white/8 mt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 3 — Rider Delivery History
// ════════════════════════════════════════════════════════════════════════════
function RiderHistoryModal({ rider, orders, onClose }) {
  const deliveries = useMemo(() =>
    orders
      .filter(o => o.status === "delivered" && o.riderId === rider.id)
      .sort((a, b) => toMs(b) - toMs(a)),
    [orders, rider.id]
  );
  const totalEarnings = deliveries.reduce((s, o) => s + Number(o.deliveryFee || 0), 0);
  const rated = deliveries.filter(o => o.review?.rating);
  const avgRating = rated.length
    ? (rated.reduce((s, o) => s + o.review.rating, 0) / rated.length).toFixed(1)
    : null;

  return (
    <Modal open title={`Rider: ${rider.name}`} onClose={onClose} size="md">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-white">{deliveries.length}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Deliveries</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-emerald-400">${totalEarnings.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Total Earned</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-amber-400">{avgRating ? `${avgRating} ⭐` : "—"}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Avg Rating</div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {deliveries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No deliveries yet</div>
        ) : deliveries.map(o => (
          <div key={o.id} className="bg-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-gray-400">#{fmtOrder(o)}</div>
                <div className="text-sm font-semibold text-white">{o.customer || o.customerName || "—"}</div>
                <div className="text-[10px] text-gray-500">{fmtDate(o)} · {fmtTime(o)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-emerald-400">+${Number(o.deliveryFee || 0).toFixed(2)}</div>
                <div className="text-[10px] text-gray-500">${Number(o.total || 0).toFixed(2)} order</div>
              </div>
            </div>
            {o.review?.rating && (
              <div className="mt-2 pt-2 border-t border-white/8 flex items-center gap-2">
                <span className="text-amber-400 text-xs">{"⭐".repeat(o.review.rating)}</span>
                {o.review.comment && (
                  <span className="text-xs text-gray-400 italic truncate">"{o.review.comment}"</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-white/8 mt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL 4 — Customer Order History
// ════════════════════════════════════════════════════════════════════════════
function CustomerHistoryModal({ customer, orders, onClose, onViewOrder }) {
  const history = useMemo(() =>
    orders
      .filter(o => (o.customerId || o.customer) === customer.id)
      .sort((a, b) => toMs(b) - toMs(a)),
    [orders, customer.id]
  );
  const totalSpend    = history.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total || 0), 0);
  const deliveredCount = history.filter(o => o.status === "delivered").length;

  return (
    <Modal open title={`Customer: ${customer.name}`} onClose={onClose} size="md">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-white">{history.length}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Total Orders</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-emerald-400">{deliveredCount}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Delivered</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-orange-400">${totalSpend.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Total Spend</div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No orders yet</div>
        ) : history.map(o => {
          const cfg = STATUS_CONFIG[o.status] || {};
          return (
            <button
              key={o.id}
              onClick={() => { onClose(); onViewOrder(o); }}
              className="w-full text-left bg-gray-800 rounded-xl px-4 py-3 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-gray-400">#{fmtOrder(o)}</div>
                  <div className="text-sm text-gray-300 mt-0.5">
                    {(o.items || []).map(i => `${i.qty || 1}× ${i.name}`).join(", ").slice(0, 50) || "—"}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{fmtDate(o)} · {fmtTime(o)}</div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-black text-orange-400">${Number(o.total || 0).toFixed(2)}</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${cfg.color || "text-gray-400"}`}>
                    {cfg.icon} {cfg.label || o.status}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-white/8 mt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN REPORT PAGE
// ════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "overview",      label: "📊 Overview"      },
  { id: "transactions",  label: "📋 Transactions"  },
  { id: "items",         label: "🍔 Items"          },
  { id: "delivery",      label: "🛵 Delivery"       },
  { id: "customers",     label: "👥 Customers"      },
];

const TX_PER_PAGE = 20;

export default function ReportsPage({ orders = [], riders = [], toast, isMobile = false }) {
  const [tab,       setTab]     = useState("overview");
  const [txSearch,  setTxSearch]  = useState("");
  const [txStatus,  setTxStatus]  = useState("all");
  const [txDate,    setTxDate]    = useState("");   // "YYYY-MM-DD" or ""
  const [txPage,    setTxPage]    = useState(1);
  const [mobileDate, setMobileDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tappedBar,  setTappedBar]  = useState(null);
  const [hoveredBar,      setHoveredBar]      = useState(null);
  const [hoveredMonth,    setHoveredMonth]    = useState(null);
  const [hoveredDay30,    setHoveredDay30]    = useState(null);

  // Timers to debounce hover-clear so mouse can move from bar → dropdown without it closing
  const t7   = useRef(null);
  const t30  = useRef(null);
  const tMo  = useRef(null);

  // Per-tab date range: today | week | month | all
  const [tabRanges, setTabRanges] = useState({ overview: "today", transactions: "today", items: "today", delivery: "today", customers: "today" });
  const setRange = (t, v) => setTabRanges(p => ({ ...p, [t]: p[t] === v && v !== "all" ? "all" : v }));

  const rangeStartMs = useMemo(() => ({
    today: startOfToday(),
    week:  startOfWeek(),
    month: startOfMonth(),
    all:   0,
  }), []);
  const inRange = (o, range) => range === "all" || toMs(o) >= rangeStartMs[range];

  const todayStr     = () => new Date().toISOString().slice(0, 10);
  const yesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

  // ── Detail modals state ──────────────────────────────────────────────────
  const [selectedOrder,    setSelectedOrder]    = useState(null);
  const [selectedItem,     setSelectedItem]     = useState(null);
  const [selectedRider,    setSelectedRider]    = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const exp = (data, name) =>
    downloadCSV(data, name, msg => toast.success(msg), msg => toast.error(msg));

  // ── Core slices ─────────────────────────────────────────────────────────────
  const allDelivered = useMemo(() => orders.filter(o => o.status === "delivered"), [orders]);

  // ── Summary revenue metrics (always all-time delivered) ─────────────────────
  const dailyRev   = useMemo(() => allDelivered.filter(o => toMs(o) >= startOfToday()).reduce((s, o) => s + Number(o.total || 0), 0),   [allDelivered]);
  const weeklyRev  = useMemo(() => allDelivered.filter(o => toMs(o) >= startOfWeek()).reduce((s, o) => s + Number(o.total || 0), 0),   [allDelivered]);
  const monthlyRev = useMemo(() => allDelivered.filter(o => toMs(o) >= startOfMonth()).reduce((s, o) => s + Number(o.total || 0), 0),  [allDelivered]);
  const totalEarnings = useMemo(() => allDelivered.reduce((s, o) => s + Number(o.total || 0), 0), [allDelivered]);

  const cancelCount   = orders.filter(o => o.status === "cancelled").length;
  const cancelRate    = orders.length > 0 ? (cancelCount / orders.length) * 100 : 0;
  const avgOrderValue = allDelivered.length > 0 ? totalEarnings / allDelivered.length : 0;

  // ── Daily revenue last 7 days ────────────────────────────────────────────────
  const daily7 = useMemo(() => {
    const now = new Date();
    // Orders with no timestamp (_ms=0) → bucket into today so they're always visible
    const noTsOrders = orders.filter(o => !o._ms && o.status !== "cancelled");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const yr = d.getFullYear(), mo = d.getMonth(), dt = d.getDate();
      const start = new Date(yr, mo, dt).getTime();
      const isToday = i === 6;
      const dayAllOrders = [
        ...orders.filter(o => o._ms && isOnDay(o, yr, mo, dt)),
        ...(isToday ? noTsOrders : []),
      ];
      const dayDelivered = dayAllOrders.filter(o => o.status === "delivered");
      const rev = dayDelivered.reduce((s, o) => s + Number(o.total || 0), 0);
      const customers = dayAllOrders.map(o => ({
        name:   o.customer || o.customerName || "Customer",
        total:  Number(o.total || 0),
        status: o.status,
      }));
      return {
        day:      d.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        revenue:  Math.round(rev * 100) / 100,
        count:    dayAllOrders.length,
        customers,
        orders:   dayAllOrders,
        start, end: start + 86400000,
      };
    });
  }, [allDelivered, orders]);

  const maxCount = Math.max(...daily7.map(d => d.count), 1);
  const maxDay   = Math.max(...daily7.map(d => d.revenue), 1);

  // ── Daily revenue last 30 days ────────────────────────────────────────────────
  const daily30 = useMemo(() => {
    const now = new Date();
    const noTsOrders = orders.filter(o => !o._ms && o.status !== "cancelled");
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const yr = d.getFullYear(), mo = d.getMonth(), dt = d.getDate();
      const isToday = i === 29;
      const dayAllOrders = [
        ...orders.filter(o => o._ms && isOnDay(o, yr, mo, dt)),
        ...(isToday ? noTsOrders : []),
      ];
      const dayDelivered = dayAllOrders.filter(o => o.status === "delivered");
      const rev = dayDelivered.reduce((s, o) => s + Number(o.total || 0), 0);
      return {
        label:    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        revenue:  Math.round(rev * 100) / 100,
        count:    dayAllOrders.length,
        orders:   dayAllOrders,
        isToday,
      };
    });
  }, [orders]);
  const maxCount30 = Math.max(...daily30.map(d => d.count), 1);
  const maxDay30   = Math.max(...daily30.map(d => d.revenue), 1);

  // ── Monthly revenue last 12 months ────────────────────────────────────────────
  const monthly12 = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const monthOrders = orders.filter(o => { const ms = toMs(o); return ms >= start && ms < end; });
      const delivered   = monthOrders.filter(o => o.status === "delivered");
      const revenue     = delivered.reduce((s, o) => s + Number(o.total || 0), 0);
      return {
        label:     d.toLocaleDateString("en-US", { month: "short" }),
        fullLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        revenue:   Math.round(revenue * 100) / 100,
        count:     monthOrders.length,
        delivered: delivered.length,
        orders:    monthOrders,
        isCurrent: i === 11,
      };
    });
  }, [orders]);
  const maxMonthCount = Math.max(...monthly12.map(m => m.count), 1);
  const maxMonthRev   = Math.max(...monthly12.map(m => m.revenue), 1);

  // ── Top items — count from all orders (not just delivered) ───────────────────
  const topItems = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 };
        map[item.name].qty     += Number(item.qty || 1);
        map[item.name].revenue += Number(item.price || 0) * Number(item.qty || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [orders]);

  const maxQty = Math.max(...topItems.map(i => i.qty), 1);

  // ── Rider stats ──────────────────────────────────────────────────────────────
  const riderStats = useMemo(() => {
    const map = {};
    allDelivered.forEach(o => {
      if (!o.riderId) return;
      if (!map[o.riderId]) map[o.riderId] = { id: o.riderId, name: o.riderName || "Unknown", deliveries: 0, earnings: 0, ratings: [] };
      map[o.riderId].deliveries += 1;
      map[o.riderId].earnings   += Number(o.deliveryFee || 0);
      if (o.review?.rating) map[o.riderId].ratings.push(o.review.rating);
    });
    return Object.values(map)
      .map(r => ({
        ...r,
        avgRating: r.ratings.length ? (r.ratings.reduce((s, v) => s + v, 0) / r.ratings.length).toFixed(1) : "—",
      }))
      .sort((a, b) => b.deliveries - a.deliveries);
  }, [allDelivered]);

  // ── Customer stats ───────────────────────────────────────────────────────────
  const customerStats = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const id = o.customerId || o.customer;
      if (!id) return;
      if (!map[id]) map[id] = { id, name: o.customer || o.customerName || "—", orders: 0, spend: 0 };
      map[id].orders += 1;
      if (o.status === "delivered") map[id].spend += Number(o.total || 0);
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend);
  }, [orders]);

  // ── Transactions (full order list) ───────────────────────────────────────────
  const txFiltered = useMemo(() => {
    const q = txSearch.toLowerCase();
    return orders.filter(o => {
      const matchStatus = txStatus === "all" || o.status === txStatus;
      const matchSearch = !q ||
        (o.id || "").toLowerCase().includes(q) ||
        (o.customer || o.customerName || "").toLowerCase().includes(q) ||
        (o.riderName || "").toLowerCase().includes(q);
      let matchDate = true;
      if (txDate) {
        const ms = toMs(o);
        if (!ms) {
          matchDate = false;
        } else {
          const od = new Date(ms);
          const orderDateStr = `${od.getFullYear()}-${String(od.getMonth()+1).padStart(2,"0")}-${String(od.getDate()).padStart(2,"0")}`;
          matchDate = orderDateStr === txDate;
        }
      }
      return matchStatus && matchSearch && matchDate;
    });
  }, [orders, txSearch, txStatus, txDate]);

  const txPaginated  = txFiltered.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE);
  const txTotalPages = Math.ceil(txFiltered.length / TX_PER_PAGE);

  // ── Per-tab filtered slices ──────────────────────────────────────────────────
  const ovOrders    = useMemo(() => orders.filter(o => inRange(o, tabRanges.overview)),    [orders, tabRanges.overview, rangeStartMs]);
  const ovDelivered = useMemo(() => ovOrders.filter(o => o.status === "delivered"),         [ovOrders]);
  const ovRev       = ovDelivered.reduce((s, o) => s + Number(o.total || 0), 0);
  const ovAvgVal    = ovDelivered.length ? ovRev / ovDelivered.length : 0;
  const ovCancel    = ovOrders.filter(o => o.status === "cancelled").length;
  const ovCancelRate = ovOrders.length ? (ovCancel / ovOrders.length) * 100 : 0;

  const itemOrders  = useMemo(() => orders.filter(o => o.status !== "cancelled" && inRange(o, tabRanges.items)),  [orders, tabRanges.items, rangeStartMs]);
  const tabItems    = useMemo(() => {
    const map = {};
    itemOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 };
        map[item.name].qty     += Number(item.qty || 1);
        map[item.name].revenue += Number(item.price || 0) * Number(item.qty || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [itemOrders]);
  const tabMaxQty = Math.max(...tabItems.map(i => i.qty), 1);

  const delivOrders  = useMemo(() => orders.filter(o => o.status === "delivered" && inRange(o, tabRanges.delivery)), [orders, tabRanges.delivery, rangeStartMs]);
  const tabRiderStats = useMemo(() => {
    const map = {};
    delivOrders.forEach(o => {
      if (!o.riderId) return;
      if (!map[o.riderId]) map[o.riderId] = { id: o.riderId, name: o.riderName || "Unknown", deliveries: 0, earnings: 0, ratings: [] };
      map[o.riderId].deliveries += 1;
      map[o.riderId].earnings   += Number(o.deliveryFee || 0);
      if (o.review?.rating) map[o.riderId].ratings.push(o.review.rating);
    });
    return Object.values(map)
      .map(r => ({ ...r, avgRating: r.ratings.length ? (r.ratings.reduce((s, v) => s + v, 0) / r.ratings.length).toFixed(1) : "—" }))
      .sort((a, b) => b.deliveries - a.deliveries);
  }, [delivOrders]);

  const custOrders    = useMemo(() => orders.filter(o => inRange(o, tabRanges.customers)), [orders, tabRanges.customers, rangeStartMs]);
  const tabCustomerStats = useMemo(() => {
    const map = {};
    custOrders.forEach(o => {
      const id = o.customerId || o.customer;
      if (!id) return;
      if (!map[id]) map[id] = { id, name: o.customer || o.customerName || "—", orders: 0, spend: 0 };
      map[id].orders += 1;
      if (o.status === "delivered") map[id].spend += Number(o.total || 0);
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend);
  }, [custOrders]);

  // Jump to Transactions tab with a status filter pre-set
  const jumpToTransactions = (status) => {
    setTxStatus(status);
    setTxPage(1);
    setTxSearch("");
    setTab("transactions");
  };

  // Jump to Overview tab with a date range pre-set
  const jumpToOverview = (range) => {
    setRange("overview", range);
    setTab("overview");
  };

  // ── MOBILE-ONLY SIMPLIFIED VIEW ─────────────────────────────────────────
  if (isMobile) {
    const todayISO     = new Date().toISOString().slice(0, 10);
    const yesterdayISO = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    const [y, m, d]    = (mobileDate || todayISO).split("-").map(Number);
    const dayStart     = new Date(y, m - 1, d).getTime();
    const dayEnd       = dayStart + 86400000;
    const dayDelivered = allDelivered.filter(o => { const ms = toMs(o); return ms >= dayStart && ms < dayEnd; });
    const dayRevenue   = dayDelivered.reduce((s, o) => s + Number(o.total || 0), 0);
    const dayOrders    = orders.filter(o => { const ms = toMs(o); return ms >= dayStart && ms < dayEnd; });
    const isToday      = mobileDate === todayISO || !mobileDate;
    const isYesterday  = mobileDate === yesterdayISO;
    const label        = isToday ? "Today" : isYesterday ? "Yesterday" : mobileDate;

    return (
      <div className="space-y-4">
        {/* Day filter */}
        <div className="bg-gray-900 border border-white/8 rounded-2xl px-4 py-3 space-y-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">📅 Filter by Day</span>
          <div className="flex items-center gap-2 flex-wrap">
            {[{ l: "Today", v: todayISO }, { l: "Yesterday", v: yesterdayISO }].map(btn => (
              <button key={btn.l} onClick={() => setMobileDate(btn.v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  mobileDate === btn.v ? "bg-orange-500 text-white shadow-md" : "bg-gray-800 text-gray-400 border border-white/10"
                }`}>
                {btn.l}
              </button>
            ))}
            <input
              type="date"
              value={mobileDate}
              onChange={e => setMobileDate(e.target.value)}
              className="flex-1 min-w-0 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Revenue card */}
        <div className="bg-gray-900 border border-orange-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💰</span>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Revenue — {label}</span>
          </div>
          <div className="text-4xl font-black text-orange-400 font-display">${dayRevenue.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-2">{dayDelivered.length} delivered · {dayOrders.length} total orders</div>
        </div>

        {/* 7-day bar chart */}
        <div className="bg-gray-900 border border-white/8 rounded-2xl p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Last 7 Days</div>
          <div className="flex items-end gap-2 h-28">
            {daily7.map((d, i) => {
              const isToday  = i === 6;
              const isTapped = tappedBar === i;
              const barH     = d.revenue > 0 ? Math.max(16, (d.revenue / maxDay) * 96) : 4;
              return (
                <button key={i} onClick={() => setTappedBar(isTapped ? null : i)}
                  className="flex-1 flex flex-col items-end gap-1">
                  <div className="w-full rounded-t-xl transition-all duration-300"
                    style={{
                      height: `${barH}px`,
                      background: isTapped || isToday
                        ? "linear-gradient(to top,#ea580c,#fb923c)"
                        : d.revenue > 0 ? "linear-gradient(to top,#9a3412,#c2410c)" : "#1f2937",
                    }} />
                </button>
              );
            })}
          </div>
          {/* X-axis labels */}
          <div className="flex items-center gap-2 mt-2">
            {daily7.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <div className={`text-[10px] font-semibold ${i === 6 ? "text-orange-400" : tappedBar === i ? "text-white" : "text-gray-500"}`}>{d.day}</div>
                {d.revenue > 0 && <div className="text-[9px] text-gray-600">${d.revenue.toFixed(0)}</div>}
              </div>
            ))}
          </div>
          {/* Tapped bar order list */}
          {tappedBar !== null && (
            daily7[tappedBar].count > 0 ? (
              <div className="mt-3 border border-orange-500/30 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-orange-500/10 border-b border-orange-500/20">
                  <div className="text-xs font-bold text-orange-400">
                    {daily7[tappedBar].fullDate} · {daily7[tappedBar].count} order{daily7[tappedBar].count > 1 ? "s" : ""} · ${daily7[tappedBar].revenue.toFixed(2)}
                  </div>
                </div>
                <div className="divide-y divide-white/5 max-h-52 overflow-y-auto">
                  {daily7[tappedBar].orders.map((o, oi) => {
                    const cfg = STATUS_CONFIG[o.status] || {};
                    return (
                      <div key={oi} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="text-base shrink-0">{cfg.icon || "📦"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{o.customer || o.customerName || "Customer"}</div>
                          <div className="text-xs text-gray-500 truncate">{(o.items || []).map(it => `${it.qty||1}× ${it.name}`).join(", ")}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-orange-400">${Number(o.total||0).toFixed(2)}</div>
                          <div className={`text-[10px] font-semibold ${cfg.color || "text-gray-400"}`}>{cfg.label || o.status}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-center text-xs text-gray-600 py-2">No orders on {daily7[tappedBar].fullDate}</div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Detail modals ──────────────────────────────────────────────────── */}
      {selectedOrder    && <OrderDetailModal    order={selectedOrder}    onClose={() => setSelectedOrder(null)} />}
      {selectedItem     && <ItemDrilldownModal  itemName={selectedItem}  orders={orders} onClose={() => setSelectedItem(null)} />}
      {selectedRider    && <RiderHistoryModal   rider={selectedRider}    orders={orders} onClose={() => setSelectedRider(null)} />}
      {selectedCustomer && (
        <CustomerHistoryModal
          customer={selectedCustomer}
          orders={orders}
          onClose={() => setSelectedCustomer(null)}
          onViewOrder={(o) => { setSelectedCustomer(null); setSelectedOrder(o); }}
        />
      )}

      {/* ── TOP SUMMARY STRIP — always visible ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard icon="☀️" label="Daily Revenue"   value={`$${dailyRev.toFixed(2)}`}      sub="Tap to view in Overview"      color="text-emerald-400" accent="border-emerald-500/20"
          onClick={() => jumpToOverview("today")} />
        <MetricCard icon="📅" label="Weekly Revenue"  value={`$${weeklyRev.toFixed(2)}`}     sub="Tap to view in Overview"      color="text-sky-400"     accent="border-sky-500/20"
          onClick={() => jumpToOverview("week")} />
        <MetricCard icon="📦" label="Total Orders"    value={orders.length}                   sub={`${allDelivered.length} delivered · tap for Overview`} color="text-white"
          onClick={() => jumpToOverview("all")} />
        <MetricCard icon="💰" label="Total Earnings"  value={`$${totalEarnings.toFixed(2)}`} sub="Tap to view in Overview"      color="text-orange-400"  accent="border-orange-500/20"
          onClick={() => jumpToOverview("all")} />
      </div>

      {/* ── DATE FILTER — always visible ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap bg-gray-900 border border-white/8 rounded-2xl px-4 py-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mr-1">📅 Filter by Date</span>
        {[
          { label: "All",       value: "" },
          { label: "Today",     value: todayStr() },
          { label: "Yesterday", value: yesterdayStr() },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={() => { setTxDate(btn.value); setTxPage(1); setTab("transactions"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              txDate === btn.value
                ? "bg-orange-500 text-white shadow-md"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-white/10"
            }`}
          >
            {btn.label}
          </button>
        ))}
        <input
          type="date"
          value={txDate}
          onChange={e => { setTxDate(e.target.value); setTxPage(1); setTab("transactions"); }}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500 [color-scheme:dark]"
        />
        {txDate && (
          <button
            onClick={() => { setTxDate(""); setTxPage(1); }}
            className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
          >
            ✕ Clear
          </button>
        )}
        {txDate && <span className="text-xs text-orange-400 font-medium ml-auto">Showing: {txDate}</span>}
      </div>

      {/* ── TABS + PRINT BUTTON ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map(t => <Tab key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={setTab} />)}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { window.print(); toast.success("Print dialog opened"); }}>
            🖨️ Print
          </Button>
          <Button variant="outline" size="sm" onClick={() =>
            exp(orders.map(o => ({
              "Order ID":     o.id,
              "Date":         fmtDate(o),
              "Time":         fmtTime(o),
              "Customer":     o.customer || o.customerName || "—",
              "Items":        (o.items || []).map(i => `${i.qty}x ${i.name}`).join("; "),
              "Subtotal":     Number(o.subtotal || 0).toFixed(2),
              "Delivery Fee": Number(o.deliveryFee || 0).toFixed(2),
              "Discount":     Number(o.discount || 0).toFixed(2),
              "Total":        Number(o.total || 0).toFixed(2),
              "Status":       o.status,
              "Payment":      o.payment || "Cash on delivery",
              "Rider":        o.riderName || "—",
              "Promo":        o.promo || "—",
            })), "full-transactions")}>
            📤 Export All
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-4">
          <RangeTabs value={tabRanges.overview} onChange={v => setRange("overview", v)} />
          <div className="grid grid-cols-4 gap-3">
            <MetricCard icon="💰" label="Revenue"           value={`$${ovRev.toFixed(2)}`}         sub={`${ovDelivered.length} delivered orders`} color="text-orange-400" accent="border-orange-500/20" />
            <MetricCard icon="📦" label="Total Orders"      value={ovOrders.length}                 sub={`${ovCancel} cancelled`} color="text-white" />
            <MetricCard icon="📊" label="Avg Order Value"   value={`$${ovAvgVal.toFixed(2)}`}       sub="Per delivered order" />
            <MetricCard icon="❌" label="Cancellation Rate" value={`${ovCancelRate.toFixed(1)}%`}   sub={`${ovCancel} cancelled`} color={ovCancelRate > 15 ? "text-red-400" : "text-white"}
              onClick={() => jumpToTransactions("cancelled")} />
          </div>

          {/* Revenue bar chart — daily / weekly / monthly / all-time */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white font-display text-sm uppercase tracking-wide">
                {tabRanges.overview === "today" ? "Revenue — Today"
                  : tabRanges.overview === "week"  ? "Weekly Revenue — Last 7 Days"
                  : tabRanges.overview === "month" ? "Monthly Revenue — Last 30 Days"
                  : "Revenue — All Time (12 Months)"}
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                if (tabRanges.overview === "month")
                  exp(daily30.map(d => ({ Date: d.label, Orders: d.count, "Revenue ($)": d.revenue.toFixed(2) })), "revenue-30days");
                else if (tabRanges.overview === "all")
                  exp(monthly12.map(m => ({ Month: m.fullLabel, Orders: m.count, Delivered: m.delivered, "Revenue ($)": m.revenue.toFixed(2) })), "revenue-alltime-12months");
                else
                  exp(daily7.map(d => ({ Day: d.day, Orders: d.count, "Revenue ($)": d.revenue.toFixed(2) })), "revenue-7days");
              }}>
                📄 Export
              </Button>
            </div>

            {tabRanges.overview === "month" ? (
              /* ── 30-day daily chart ──────────────────────────────────────── */
              <div onMouseLeave={() => { t30.current = setTimeout(() => setHoveredDay30(null), 150); }}>

                {/* Monthly Revenue — Last 30 Days highlight */}
                <div className="bg-gradient-to-r from-violet-500/10 to-orange-500/10 border border-violet-500/20 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wide">Monthly Revenue — Last 30 Days</div>
                    <div className="text-3xl font-black text-white mt-0.5">${ovRev.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{ovDelivered.length} delivered orders · {ovOrders.length} total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Avg/Order</div>
                    <div className="text-xl font-black text-orange-400">${ovAvgVal.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Cancel rate: <span className={ovCancelRate > 15 ? "text-red-400" : "text-gray-400"}>{ovCancelRate.toFixed(1)}%</span></div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">Daily Breakdown — Last 30 Days</div>
                <div className="flex items-stretch gap-0.5 h-40">
                  {daily30.map((d, i) => {
                    const isHov = hoveredDay30 === i;
                    const barH  = d.count > 0 ? Math.max(14, (d.count / maxCount30) * 120) : 4;
                    return (
                      <button
                        key={i}
                        onMouseEnter={() => { clearTimeout(t30.current); setHoveredDay30(i); }}
                        className="flex-1 flex flex-col justify-end items-center group"
                        style={{ minWidth: 0 }}
                      >
                        <div
                          className="w-full rounded-t-lg transition-all duration-200"
                          style={{
                            height: `${barH}px`,
                            background: d.isToday
                              ? isHov ? "linear-gradient(to top,#c2410c,#ea580c)" : "linear-gradient(to top,#ea580c,#f97316)"
                              : isHov ? "linear-gradient(to top,#6d28d9,#8b5cf6)" : d.count > 0 ? "linear-gradient(to top,#7c3aed,#a78bfa)" : "#1f2937",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* X-axis */}
                <div className="flex items-center gap-0.5 mt-1">
                  {daily30.map((d, i) => (
                    <div key={i} className="flex-1 text-center overflow-hidden" style={{ minWidth: 0 }}>
                      {(i % 5 === 0 || d.isToday) && (
                        <div className={`text-[8px] font-semibold truncate ${d.isToday ? "text-orange-400" : "text-gray-600"}`}>
                          {d.isToday ? "Today" : d.label}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Hover → drop-down order list */}
                {hoveredDay30 !== null ? (
                  daily30[hoveredDay30].count > 0 ? (
                    <div
                      className="mt-2 border border-violet-500/30 rounded-xl overflow-hidden"
                      onMouseEnter={() => clearTimeout(t30.current)}
                    >
                      <div className="px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
                        <div className="text-sm font-bold text-violet-400">
                          {daily30[hoveredDay30].fullDate}
                          {daily30[hoveredDay30].isToday && <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-md">Today</span>}
                          <span className="ml-2 text-xs font-normal text-gray-400">· {daily30[hoveredDay30].count} order{daily30[hoveredDay30].count > 1 ? "s" : ""}</span>
                          {daily30[hoveredDay30].revenue > 0 && <span className="ml-1 text-xs font-normal text-gray-400">· <span className="text-orange-300">${daily30[hoveredDay30].revenue.toFixed(2)}</span></span>}
                        </div>
                      </div>
                      <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                        {daily30[hoveredDay30].orders.map((o, oi) => {
                          const cfg = STATUS_CONFIG[o.status] || {};
                          return (
                            <button
                              key={oi}
                              onClick={() => setSelectedOrder(o)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
                            >
                              <span className="text-lg shrink-0">{cfg.icon || "📦"}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white truncate">{o.customer || o.customerName || "Customer"}</div>
                                <div className="text-xs text-gray-500 truncate">{(o.items || []).map(it => `${it.qty||1}× ${it.name}`).join(", ")}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-orange-400">${Number(o.total||0).toFixed(2)}</div>
                                <div className={`text-[10px] font-semibold ${cfg.color || "text-gray-400"}`}>{cfg.label || o.status}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-center text-xs text-gray-600 py-2">No orders on {daily30[hoveredDay30].fullDate}</div>
                  )
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-gray-600 py-2 mt-2">
                    <span>🟣 Past days &nbsp; 🟧 Today</span>
                    <span>Hover a bar to see orders</span>
                  </div>
                )}

                {/* 30-day summary footer */}
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/8">
                  <div className="text-center">
                    <div className="text-base font-black text-white">{daily30.reduce((s, d) => s + d.count, 0)}</div>
                    <div className="text-[10px] text-gray-500">Total Orders (30d)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-black text-orange-400">${daily30.reduce((s, d) => s + d.revenue, 0).toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500">Total Revenue (30d)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-black text-emerald-400">
                      ${(() => { const activeDays = daily30.filter(d => d.count > 0).length; return activeDays > 0 ? (daily30.reduce((s, d) => s + d.revenue, 0) / activeDays).toFixed(2) : "0.00"; })()}
                    </div>
                    <div className="text-[10px] text-gray-500">Avg Revenue/Day</div>
                  </div>
                </div>
              </div>

            ) : tabRanges.overview === "all" ? (
              /* ── All Time: 12-month chart ────────────────────────────────── */
              <div onMouseLeave={() => { tMo.current = setTimeout(() => setHoveredMonth(null), 150); }}>

                {/* All-Time highlight */}
                <div className="bg-gradient-to-r from-orange-500/10 to-emerald-500/10 border border-orange-500/20 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wide">All-Time Revenue</div>
                    <div className="text-3xl font-black text-white mt-0.5">${totalEarnings.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{allDelivered.length} delivered orders · {orders.length} total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Avg/Order</div>
                    <div className="text-xl font-black text-orange-400">${avgOrderValue.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Cancel rate: <span className={cancelRate > 15 ? "text-red-400" : "text-gray-400"}>{cancelRate.toFixed(1)}%</span></div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">Revenue Trend — Last 12 Months</div>
                <div className="flex items-stretch gap-1.5 h-40">
                  {monthly12.map((m, i) => {
                    const isHov = hoveredMonth === i;
                    const barH  = m.count > 0 ? Math.max(20, (m.revenue / maxMonthRev) * 120) : 6;
                    return (
                      <button
                        key={i}
                        onMouseEnter={() => { clearTimeout(tMo.current); setHoveredMonth(i); }}
                        className="flex-1 flex flex-col justify-end items-center gap-1 group"
                      >
                        <div className={`text-[10px] font-black transition-colors ${m.count > 0 ? (isHov ? "text-white" : "text-orange-400") : "text-gray-700"}`}>
                          {m.count > 0 ? m.count : ""}
                        </div>
                        <div
                          className="w-full rounded-t-xl transition-all duration-300"
                          style={{
                            height: `${barH}px`,
                            background: m.isCurrent
                              ? isHov ? "linear-gradient(to top,#c2410c,#ea580c)" : "linear-gradient(to top,#ea580c,#f97316)"
                              : isHov ? "linear-gradient(to top,#1d4ed8,#3b82f6)" : m.count > 0 ? "linear-gradient(to top,#2563eb,#60a5fa)" : "#1f2937",
                          }}
                        />
                        <div className={`text-[10px] font-semibold mt-0.5 ${isHov ? "text-white" : m.isCurrent ? "text-orange-400" : "text-gray-500"}`}>
                          {m.label}
                        </div>
                        {m.revenue > 0 && (
                          <div className="text-[9px] text-gray-600">${m.revenue >= 1000 ? `${(m.revenue / 1000).toFixed(1)}k` : m.revenue.toFixed(0)}</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Hover → drop-down order list */}
                {hoveredMonth !== null ? (
                  monthly12[hoveredMonth].count > 0 ? (
                    <div
                      className="mt-2 border border-blue-500/30 rounded-xl overflow-hidden"
                      onMouseEnter={() => clearTimeout(tMo.current)}
                    >
                      <div className="px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20">
                        <div className="text-sm font-bold text-blue-400">
                          {monthly12[hoveredMonth].fullLabel}
                          {monthly12[hoveredMonth].isCurrent && <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-md">Current</span>}
                          <span className="ml-2 text-xs font-normal text-gray-400">· {monthly12[hoveredMonth].count} orders · <span className="text-orange-300">${monthly12[hoveredMonth].revenue.toFixed(2)}</span></span>
                        </div>
                      </div>
                      <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                        {monthly12[hoveredMonth].orders.sort((a, b) => toMs(b) - toMs(a)).map((o, oi) => {
                          const cfg = STATUS_CONFIG[o.status] || {};
                          return (
                            <button
                              key={oi}
                              onClick={() => setSelectedOrder(o)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
                            >
                              <span className="text-lg shrink-0">{cfg.icon || "📦"}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white truncate">{o.customer || o.customerName || "Customer"}</div>
                                <div className="text-xs text-gray-500 truncate">{(o.items || []).map(it => `${it.qty||1}× ${it.name}`).join(", ")}</div>
                                <div className="text-[10px] text-gray-600">{fmtDate(o)} · {fmtTime(o)}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-orange-400">${Number(o.total||0).toFixed(2)}</div>
                                <div className={`text-[10px] font-semibold ${cfg.color || "text-gray-400"}`}>{cfg.label || o.status}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-center text-xs text-gray-600 py-2">No orders in {monthly12[hoveredMonth].fullLabel}</div>
                  )
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-gray-600 py-2 mt-2">
                    <span>🟦 Past months &nbsp; 🟧 Current month</span>
                    <span>Hover a bar to see orders</span>
                  </div>
                )}

                {/* All-time summary footer */}
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/8">
                  <div className="text-center">
                    <div className="text-base font-black text-white">{monthly12.reduce((s, m) => s + m.count, 0)}</div>
                    <div className="text-[10px] text-gray-500">Total Orders (12mo)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-black text-orange-400">${monthly12.reduce((s, m) => s + m.revenue, 0).toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500">Total Revenue (12mo)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-black text-emerald-400">
                      ${monthly12.some(m => m.count > 0) ? (monthly12.reduce((s, m) => s + m.revenue, 0) / monthly12.filter(m => m.count > 0).length).toFixed(2) : "0.00"}
                    </div>
                    <div className="text-[10px] text-gray-500">Avg Revenue/Month</div>
                  </div>
                </div>
              </div>

            ) : (
              /* ── Daily / Weekly chart (last 7 days) ─────────────────────── */
              <div onMouseLeave={() => { t7.current = setTimeout(() => setHoveredBar(null), 150); }}>

                {/* Summary highlight box — adapts to Daily vs Weekly period */}
                <div className={`bg-gradient-to-r ${tabRanges.overview === "week" ? "from-sky-500/10 to-orange-500/10 border-sky-500/20" : "from-emerald-500/10 to-orange-500/10 border-emerald-500/20"} border rounded-2xl px-4 py-3 mb-4 flex items-center justify-between`}>
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${tabRanges.overview === "week" ? "text-sky-400" : "text-emerald-400"}`}>
                      {tabRanges.overview === "week" ? "Weekly Revenue — Last 7 Days" : "Daily Revenue — Today"}
                    </div>
                    <div className="text-3xl font-black text-white mt-0.5">${ovRev.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{ovDelivered.length} delivered orders · {ovOrders.length} total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Avg/Order</div>
                    <div className="text-xl font-black text-orange-400">${ovAvgVal.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Cancel rate: <span className={ovCancelRate > 15 ? "text-red-400" : "text-gray-400"}>{ovCancelRate.toFixed(1)}%</span></div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">
                  {tabRanges.overview === "week" ? "Daily Breakdown — Last 7 Days" : "Today vs Past 6 Days"}
                </div>

                {/* Bars — full-height columns so any hover in column triggers */}
                <div className="flex items-stretch gap-2 h-40">
                  {daily7.map((d, i) => {
                    const isHov = hoveredBar === i;
                    const barH  = d.count > 0 ? Math.max(28, (d.count / maxCount) * 120) : 6;
                    return (
                      <button
                        key={i}
                        onMouseEnter={() => { clearTimeout(t7.current); setHoveredBar(i); }}
                        className="flex-1 flex flex-col justify-end items-center gap-1 group"
                      >
                        <div className={`text-sm font-black transition-colors ${d.count > 0 ? (isHov ? "text-white" : "text-orange-400") : "text-gray-700"}`}>
                          {d.count > 0 ? d.count : ""}
                        </div>
                        <div
                          className="w-full rounded-t-xl transition-all duration-300"
                          style={{
                            height: `${barH}px`,
                            background: isHov ? "linear-gradient(to top,#ea580c,#fb923c)"
                                      : d.count > 0 ? "linear-gradient(to top,#f97316,#fb923c)"
                                      : "#1f2937",
                          }}
                        />
                        <div className={`text-[11px] font-semibold mt-0.5 ${isHov ? "text-white" : "text-gray-400"}`}>
                          {d.day}
                        </div>
                        {d.revenue > 0 && (
                          <div className="text-[9px] text-gray-500">${d.revenue.toFixed(0)}</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Hover → drop-down order list */}
                {hoveredBar !== null ? (
                  daily7[hoveredBar].count > 0 ? (
                    <div
                      className="mt-2 border border-orange-500/30 rounded-xl overflow-hidden"
                      onMouseEnter={() => clearTimeout(t7.current)}
                    >
                      <div className="px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20">
                        <div className="text-sm font-bold text-orange-400">
                          {daily7[hoveredBar].fullDate}
                          <span className="ml-2 text-xs font-normal text-gray-400">· {daily7[hoveredBar].count} order{daily7[hoveredBar].count > 1 ? "s" : ""}</span>
                          {daily7[hoveredBar].revenue > 0 && <span className="ml-1 text-xs font-normal text-gray-400">· <span className="text-orange-300">${daily7[hoveredBar].revenue.toFixed(2)}</span></span>}
                        </div>
                      </div>
                      <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                        {daily7[hoveredBar].orders.map((o, oi) => {
                          const cfg = STATUS_CONFIG[o.status] || {};
                          return (
                            <button
                              key={oi}
                              onClick={() => setSelectedOrder(o)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
                            >
                              <span className="text-lg shrink-0">{cfg.icon || "📦"}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white truncate">{o.customer || o.customerName || "Customer"}</div>
                                <div className="text-xs text-gray-500 truncate">{(o.items || []).map(it => `${it.qty||1}× ${it.name}`).join(", ")}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-orange-400">${Number(o.total||0).toFixed(2)}</div>
                                <div className={`text-[10px] font-semibold ${cfg.color || "text-gray-400"}`}>{cfg.label || o.status}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-center text-xs text-gray-600 py-2">No orders on {daily7[hoveredBar].fullDate}</div>
                  )
                ) : (
                  <p className="text-[10px] text-gray-600 text-center py-2 mt-2">Hover a bar to see orders</p>
                )}
              </div>
            )}
          </Card>

          {/* Status breakdown — each card jumps to filtered Transactions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white font-display text-sm uppercase tracking-wide">Order Status Breakdown</div>
              <span className="text-xs text-gray-500">{orders.length} total · click to drill down</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = orders.filter(o => o.status === key).length;
                const pct   = orders.length ? (count / orders.length) * 100 : 0;
                return (
                  <button
                    key={key}
                    onClick={() => jumpToTransactions(key)}
                    className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 text-left hover:opacity-80 transition-opacity cursor-pointer`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{cfg.icon}</span>
                      <span className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className={`text-3xl font-black font-display ${cfg.color}`}>{count}</div>
                    <div className="text-xs text-gray-500 mt-1">{pct.toFixed(1)}% of all orders</div>
                    <div className="text-[10px] text-gray-600 mt-1">Click to view →</div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TRANSACTIONS TAB                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              value={txSearch}
              onChange={e => { setTxSearch(e.target.value); setTxPage(1); }}
              placeholder="Search order ID, customer, rider…"
              className="flex-1 min-w-48 bg-gray-800 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
            />
            <select
              value={txStatus}
              onChange={e => { setTxStatus(e.target.value); setTxPage(1); }}
              className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">{txFiltered.length} transactions</span>
            <Button variant="outline" size="sm" onClick={() =>
              exp(txFiltered.map(o => ({
                "Order #":     fmtOrder(o),
                "Date":        fmtDate(o),
                "Time":        fmtTime(o),
                "Customer":    o.customer || o.customerName || "—",
                "Phone":       o.customerPhone || "—",
                "Address":     o.address || o.deliveryAddress || "—",
                "Items":       (o.items || []).map(i => `${i.qty || 1}x ${i.name}`).join("; "),
                "Subtotal ($)":Number(o.subtotal || 0).toFixed(2),
                "Delivery ($)":Number(o.deliveryFee || 0).toFixed(2),
                "Discount ($)":Number(o.discount || 0).toFixed(2),
                "Total ($)":   Number(o.total || 0).toFixed(2),
                "Status":      o.status,
                "Payment":     o.payment || "Cash on delivery",
                "Rider":       o.riderName || "—",
                "Promo":       o.promo || "—",
                "Note":        o.note || "—",
              })), "transactions-filtered")}>
              📄 Export
            </Button>
          </div>

          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {["Order ID", "Date / Time", "Customer", "Items", "Subtotal", "Fee", "Discount", "Total", "Status", "Payment", "Rider", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txPaginated.map(o => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="border-b border-white/5 last:border-0 hover:bg-orange-500/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-orange-400 group-hover:text-orange-300">#{fmtOrder(o)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-white">{fmtDate(o)}</div>
                        <div className="text-[10px] text-gray-500">{fmtTime(o)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-white truncate max-w-[120px]">{o.customer || o.customerName || "—"}</div>
                        {o.customerPhone && <div className="text-[10px] text-gray-500">{o.customerPhone}</div>}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="text-xs text-gray-300 line-clamp-2">
                          {(o.items || []).map(i => `${i.qty || 1}× ${i.name}`).join(", ") || "—"}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{(o.items || []).length} item{(o.items || []).length !== 1 ? "s" : ""}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-semibold text-xs whitespace-nowrap">${Number(o.subtotal || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">${Number(o.deliveryFee || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-400 text-xs whitespace-nowrap">
                        {Number(o.discount || 0) > 0 ? `-$${Number(o.discount).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-black text-orange-400 whitespace-nowrap">${Number(o.total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} config={STATUS_CONFIG} /></td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-gray-800 border border-white/10 text-gray-300 px-2 py-1 rounded-lg whitespace-nowrap">
                          💳 {o.payment || "Cash"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{o.riderName || "—"}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(o)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {txFiltered.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm">No transactions found</div>
              )}
            </div>

            {txTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Showing {(txPage - 1) * TX_PER_PAGE + 1}–{Math.min(txPage * TX_PER_PAGE, txFiltered.length)} of {txFiltered.length}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 disabled:opacity-40 hover:bg-gray-700 transition-colors">← Prev</button>
                  {Array.from({ length: Math.min(5, txTotalPages) }, (_, i) => {
                    const pg = txTotalPages <= 5 ? i + 1 : Math.max(1, Math.min(txTotalPages - 4, txPage - 2)) + i;
                    return (
                      <button key={pg} onClick={() => setTxPage(pg)}
                        className={`w-8 h-7 text-xs rounded-lg transition-colors ${pg === txPage ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{pg}</button>
                    );
                  })}
                  <button onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))} disabled={txPage === txTotalPages}
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 disabled:opacity-40 hover:bg-gray-700 transition-colors">Next →</button>
                </div>
              </div>
            )}
          </Card>

          {/* Totals footer */}
          <Card>
            <div className="font-bold text-white font-display text-xs uppercase tracking-wide mb-3">Period Totals — Filtered View</div>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div><div className="text-lg font-black text-white">{txFiltered.length}</div><div className="text-[10px] text-gray-500 mt-0.5">Orders</div></div>
              <div><div className="text-lg font-black text-emerald-400">{txFiltered.filter(o => o.status === "delivered").length}</div><div className="text-[10px] text-gray-500 mt-0.5">Delivered</div></div>
              <div><div className="text-lg font-black text-orange-400">${txFiltered.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total || 0), 0).toFixed(2)}</div><div className="text-[10px] text-gray-500 mt-0.5">Revenue (Delivered)</div></div>
              <div><div className="text-lg font-black text-sky-400">${txFiltered.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.deliveryFee || 0), 0).toFixed(2)}</div><div className="text-[10px] text-gray-500 mt-0.5">Delivery Fees</div></div>
              <div><div className="text-lg font-black text-red-400">{txFiltered.filter(o => o.status === "cancelled").length}</div><div className="text-[10px] text-gray-500 mt-0.5">Cancelled</div></div>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ITEMS TAB                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "items" && (
        <div className="space-y-4">
          <RangeTabs value={tabRanges.items} onChange={v => setRange("items", v)} />
          <div className="grid grid-cols-3 gap-3">
            <MetricCard icon="🍽️" label="Unique Items Sold"  value={tabItems.length} />
            <MetricCard icon="📦" label="Total Items Sold"   value={tabItems.reduce((s, i) => s + i.qty, 0)} />
            <MetricCard icon="💵" label="Items Revenue"      value={`$${tabItems.reduce((s, i) => s + i.revenue, 0).toFixed(2)}`} color="text-orange-400" />
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white font-display text-sm uppercase tracking-wide">Top Selling Items — click for order history</div>
              <Button variant="outline" size="sm"
                onClick={() => exp(tabItems.map(i => ({ Item: i.name, "Qty Sold": i.qty, "Revenue ($)": i.revenue.toFixed(2) })), "top-items")}>
                📄 Export
              </Button>
            </div>
            {tabItems.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">No orders yet</div>
            ) : (
              <div className="space-y-2">
                {tabItems.map((item, i) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedItem(item.name)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-orange-500/5 transition-colors group text-left"
                  >
                    <span className="text-xs text-gray-600 font-black w-6 text-right flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-white group-hover:text-orange-300 transition-colors truncate">{item.name}</span>
                        <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-3">
                          <span className="text-gray-400 font-semibold">{item.qty} sold</span>
                          <span className="text-orange-400 font-bold">${item.revenue.toFixed(2)}</span>
                          <span className="text-[10px] text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                        </div>
                      </div>
                      <Bar pct={(item.qty / tabMaxQty) * 100} color={i === 0 ? "bg-orange-500" : i === 1 ? "bg-orange-400" : "bg-orange-300"} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DELIVERY TAB                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "delivery" && (
        <div className="space-y-4">
          <RangeTabs value={tabRanges.delivery} onChange={v => setRange("delivery", v)} />
          <div className="grid grid-cols-3 gap-3">
            <MetricCard icon="📦" label="Total Deliveries"    value={delivOrders.length} />
            <MetricCard icon="🛵" label="Active Riders"       value={riders.filter(r => r.status === "online").length} color="text-emerald-400" />
            <MetricCard icon="⭐" label="Avg Customer Rating"
              value={(() => {
                const rated = delivOrders.filter(o => o.review?.rating);
                return rated.length ? `${(rated.reduce((s, o) => s + o.review.rating, 0) / rated.length).toFixed(1)} ⭐` : "—";
              })()}
              color="text-amber-400"
            />
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white font-display text-sm uppercase tracking-wide">Rider Performance — click for delivery history</div>
              <Button variant="outline" size="sm"
                onClick={() => exp(tabRiderStats.map(r => ({ Rider: r.name, Deliveries: r.deliveries, "Avg Rating": r.avgRating, "Earnings ($)": r.earnings.toFixed(2) })), "rider-performance")}>
                📄 Export
              </Button>
            </div>
            {tabRiderStats.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">No delivery data yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {["#", "Rider", "Deliveries", "Avg Rating", "Earnings", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase font-bold tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabRiderStats.map((r, i) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRider(r)}
                      className="border-b border-white/5 last:border-0 hover:bg-orange-500/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-3 py-3 font-black text-gray-500 text-xs">#{i + 1}</td>
                      <td className="px-3 py-3 font-semibold text-white group-hover:text-orange-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-sm">🛵</span>
                          {r.name}
                        </div>
                      </td>
                      <td className="px-3 py-3"><span className="text-white font-bold">{r.deliveries}</span><span className="text-xs text-gray-500 ml-1">trips</span></td>
                      <td className="px-3 py-3 text-amber-400 font-semibold">
                        {r.avgRating !== "—" ? `⭐ ${r.avgRating}` : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-3 py-3 font-black text-emerald-400">${r.earnings.toFixed(2)}</td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRider(r)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <div className="font-bold text-white font-display text-sm uppercase tracking-wide mb-4">
              Customer Reviews ({allDelivered.filter(o => o.review?.rating).length})
            </div>
            {allDelivered.filter(o => o.review?.rating).length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-6">No reviews yet</div>
            ) : (
              <div className="space-y-3">
                {allDelivered
                  .filter(o => o.review?.rating)
                  .sort((a, b) => new Date(b.review.createdAt || 0) - new Date(a.review.createdAt || 0))
                  .slice(0, 10)
                  .map((o, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedOrder(o)}
                      className="w-full text-left bg-gray-800 rounded-xl p-3.5 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-white">{o.customer || o.customerName || "—"}</span>
                        <span className="text-amber-400">{"⭐".repeat(o.review.rating)}</span>
                      </div>
                      <div className="text-xs text-gray-500">Rider: {o.riderName || "—"}</div>
                      {o.review.comment && <p className="text-sm text-gray-300 italic mt-1.5">"{o.review.comment}"</p>}
                      {o.review.createdAt && <div className="text-[10px] text-gray-600 mt-1">{new Date(o.review.createdAt).toLocaleDateString()}</div>}
                    </button>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CUSTOMERS TAB                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "customers" && (
        <div className="space-y-4">
          <RangeTabs value={tabRanges.customers} onChange={v => setRange("customers", v)} />
          <div className="grid grid-cols-3 gap-3">
            <MetricCard icon="👥" label="Unique Customers"    value={tabCustomerStats.length} />
            <MetricCard icon="📦" label="Total Orders"        value={custOrders.length} />
            <MetricCard icon="📈" label="Avg Orders/Customer" value={tabCustomerStats.length > 0 ? (custOrders.length / tabCustomerStats.length).toFixed(1) : "0"} />
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white font-display text-sm uppercase tracking-wide">Top Customers — click for order history</div>
              <Button variant="outline" size="sm"
                onClick={() => exp(tabCustomerStats.map(c => ({ Customer: c.name, "Total Orders": c.orders, "Total Spend ($)": c.spend.toFixed(2) })), "top-customers")}>
                📄 Export
              </Button>
            </div>
            {tabCustomerStats.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">No customer data yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {["#", "Customer", "Total Orders", "Total Spend", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-500 uppercase font-bold tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabCustomerStats.slice(0, 20).map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="border-b border-white/5 last:border-0 hover:bg-orange-500/5 cursor-pointer transition-colors group"
                    >
                      <td className="px-3 py-3 font-black text-gray-500 text-xs">#{i + 1}</td>
                      <td className="px-3 py-3 font-semibold text-white group-hover:text-orange-300 transition-colors">{c.name}</td>
                      <td className="px-3 py-3 text-white">{c.orders}</td>
                      <td className="px-3 py-3 font-black text-orange-400">${c.spend.toFixed(2)}</td>
                      <td className="px-3 py-3 text-[10px] text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">View orders →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
