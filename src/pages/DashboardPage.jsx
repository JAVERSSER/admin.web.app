// src/pages/DashboardPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { KpiCard, Card, StatusBadge, Modal, Button } from "../components/UI";
import { STATUS_CONFIG, RIDER_STATUS_CONFIG } from "../utils/mockData";

// Use _ms pre-computed by subscribeOrders; fall back for safety
const getMs = (o) => o._ms || o.placedAt || 0;

const isOnDay = (o, yr, mo, dt) => {
  const ms = getMs(o);
  if (!ms) return false;
  const d = new Date(ms);
  return d.getFullYear() === yr && d.getMonth() === mo && d.getDate() === dt;
};

export default function DashboardPage({ orders, riders, setPage, onStatusChange, onAssignRider, onCancelOrder, toast }) {
  const [hoveredBar,    setHoveredBar]    = useState(null);
  const [hoveredDay30,  setHoveredDay30]  = useState(null);
  const [quickViewOrder, setQuickViewOrder] = useState(null);
  const t7  = useRef(null);
  const t30 = useRef(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [riderSelect,    setRiderSelect]    = useState("");
  const [showCancel,     setShowCancel]     = useState(false);
  const [cancelReason,   setCancelReason]   = useState("");

  // Reset action state whenever a new order is opened in the modal
  useEffect(() => {
    setActionLoading(false);
    setRiderSelect("");
    setShowCancel(false);
    setCancelReason("");
  }, [quickViewOrder?.id]);

  const delivered   = orders.filter((o) => o.status === "delivered");
  const active      = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const pending     = orders.filter((o) => o.status === "pending");
  const onlineCount = riders.filter((r) => r.status !== "offline").length;

  // Today's revenue
  const todayRev = useMemo(() => {
    const now = new Date();
    const yr = now.getFullYear(), mo = now.getMonth(), dt = now.getDate();
    return delivered
      .filter(o => isOnDay(o, yr, mo, dt))
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
      .toFixed(2);
  }, [delivered]);

  // Last 7 days — daily orders + revenue
  const daily7 = useMemo(() => {
    const now = new Date();
    const noTsOrders = orders.filter(o => !getMs(o) && o.status !== "cancelled");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const yr = d.getFullYear(), mo = d.getMonth(), dt = d.getDate();
      const dayAllOrders = [
        ...orders.filter(o => getMs(o) && isOnDay(o, yr, mo, dt)),
        ...(i === 6 ? noTsOrders : []),
      ];
      const rev = dayAllOrders.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total || 0), 0);
      return {
        day:      d.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        revenue:  Math.round(rev * 100) / 100,
        count:    dayAllOrders.length,
        orders:   dayAllOrders,
      };
    });
  }, [orders]);

  // Last 30 days — daily orders + revenue
  const daily30 = useMemo(() => {
    const now = new Date();
    const noTsOrders = orders.filter(o => !getMs(o) && o.status !== "cancelled");
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      const yr = d.getFullYear(), mo = d.getMonth(), dt = d.getDate();
      const isToday = i === 29;
      const dayAllOrders = [
        ...orders.filter(o => getMs(o) && isOnDay(o, yr, mo, dt)),
        ...(isToday ? noTsOrders : []),
      ];
      const rev = dayAllOrders.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total || 0), 0);
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

  const maxCount   = Math.max(...daily7.map(d => d.count), 1);
  const maxCount30 = Math.max(...daily30.map(d => d.count), 1);
  const week7Rev   = daily7.reduce((s, d) => s + d.revenue, 0);
  const month30Rev = daily30.reduce((s, d) => s + d.revenue, 0);

  // Top selling items this week
  const topItems = useMemo(() => {
    const map = {};
    orders.filter(o => o.status !== "cancelled").forEach(o => {
      (o.items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { name: item.name, emoji: item.emoji || "🍽️", qty: 0, revenue: 0 };
        map[item.name].qty     += (item.qty || 1);
        map[item.name].revenue += (item.price || 0) * (item.qty || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 4);
  }, [orders]);

  // Status breakdown
  const statusBreakdown = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key, cfg, count: orders.filter((o) => o.status === key).length,
  }));

  return (
    <div className="space-y-5">
      {/* KPIs — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiCard icon="💰" label="Today's Revenue"  value={`$${todayRev}`}          change="↑ 12% vs yesterday" changeUp accent="orange" />
        <KpiCard icon="📦" label="Active Orders"    value={active.length}            change={`${pending.length} awaiting action`} changeUp accent="blue" />
        <KpiCard icon="🛵" label="Riders Online"    value={`${onlineCount}/${riders.length}`} change={`${riders.filter(r=>r.status==="delivering").length} delivering`} changeUp accent="green" />
        <KpiCard icon="📋" label="Total Orders"     value={orders.length}            change={`${delivered.length} delivered`} changeUp accent="purple" />
      </div>

      {/* Charts — stacked on mobile, side-by-side on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Weekly Revenue */}
        <Card>
          <div onMouseLeave={() => { t7.current = setTimeout(() => setHoveredBar(null), 150); }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide">Weekly Revenue</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Last 7 days — hover a bar</p>
              </div>
              <span className="text-xl font-black text-orange-400">${week7Rev.toFixed(2)}</span>
            </div>
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
                    <div className={`text-[11px] font-semibold mt-0.5 ${isHov ? "text-white" : "text-gray-400"}`}>{d.day}</div>
                    {d.revenue > 0 && <div className="text-[9px] text-gray-500">${d.revenue.toFixed(0)}</div>}
                  </button>
                );
              })}
            </div>
            {hoveredBar !== null ? (
              daily7[hoveredBar].count > 0 ? (
                <div className="mt-2 border border-orange-500/30 rounded-xl overflow-hidden" onMouseEnter={() => clearTimeout(t7.current)}>
                  <div className="px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20">
                    <div className="text-sm font-bold text-orange-400">
                      {daily7[hoveredBar].fullDate}
                      <span className="ml-2 text-xs font-normal text-gray-400">· {daily7[hoveredBar].count} order{daily7[hoveredBar].count > 1 ? "s" : ""}</span>
                      {daily7[hoveredBar].revenue > 0 && <span className="ml-1 text-xs font-normal text-gray-400">· <span className="text-orange-300">${daily7[hoveredBar].revenue.toFixed(2)}</span></span>}
                    </div>
                  </div>
                  <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                    {daily7[hoveredBar].orders.map((o, oi) => {
                      const cfg = STATUS_CONFIG[o.status] || {};
                      return (
                        <button key={oi} onClick={() => setQuickViewOrder(o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors">
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
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <div onMouseLeave={() => { t30.current = setTimeout(() => setHoveredDay30(null), 150); }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide">Monthly Revenue</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Last 30 days — hover a bar</p>
              </div>
              <span className="text-xl font-black text-violet-400">${month30Rev.toFixed(2)}</span>
            </div>
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
            {hoveredDay30 !== null ? (
              daily30[hoveredDay30].count > 0 ? (
                <div className="mt-2 border border-violet-500/30 rounded-xl overflow-hidden" onMouseEnter={() => clearTimeout(t30.current)}>
                  <div className="px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/20">
                    <div className="text-sm font-bold text-violet-400">
                      {daily30[hoveredDay30].fullDate}
                      {daily30[hoveredDay30].isToday && <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-md">Today</span>}
                      <span className="ml-2 text-xs font-normal text-gray-400">· {daily30[hoveredDay30].count} order{daily30[hoveredDay30].count > 1 ? "s" : ""}</span>
                      {daily30[hoveredDay30].revenue > 0 && <span className="ml-1 text-xs font-normal text-gray-400">· <span className="text-orange-300">${daily30[hoveredDay30].revenue.toFixed(2)}</span></span>}
                    </div>
                  </div>
                  <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                    {daily30[hoveredDay30].orders.map((o, oi) => {
                      const cfg = STATUS_CONFIG[o.status] || {};
                      return (
                        <button key={oi} onClick={() => setQuickViewOrder(o)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors">
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
          </div>
        </Card>
      </div>

      {/* Status + Live Orders — side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown — colored tiles */}
        <Card>
          <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide mb-4">Order Status</h3>
          <div className="grid grid-cols-2 gap-2">
            {statusBreakdown.map(({ key, cfg, count }) => {
              const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
              return (
                <div key={key} className={`${cfg.bg} border ${cfg.border} rounded-xl p-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                    <span className={`text-lg font-black ${cfg.color}`}>{count}</span>
                  </div>
                  <div className="h-1 bg-black/20 rounded-full overflow-hidden mt-2">
                    <div className={`h-full ${cfg.dot} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1.5">{pct}% of all</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Live Orders */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide">Live Orders</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">{active.length} active right now</p>
            </div>
            <button onClick={() => setPage("orders")} className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-semibold">View all →</button>
          </div>
          {active.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No active orders right now</div>
          ) : (
            <div className="space-y-2">
              {active.slice(0, 6).map((o) => (
                <div
                  key={o.id}
                  onClick={() => setQuickViewOrder(o)}
                  className="flex items-center gap-3 p-3 bg-gray-800/60 border border-white/5 rounded-xl hover:border-orange-500/30 hover:bg-gray-800 cursor-pointer transition-all"
                >
                  <StatusBadge status={o.status} config={STATUS_CONFIG} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{o.customer || o.customerName}</div>
                    <div className="text-[10px] text-gray-500 truncate">{(o.items || []).slice(0, 2).map(it => it.name).join(", ")}</div>
                  </div>
                  <div className="text-sm font-bold text-orange-400 shrink-0">${Number(o.total || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Riders + Top Items — side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rider Status */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide">Rider Status</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">{onlineCount} of {riders.length} online</p>
            </div>
            <button onClick={() => setPage("riders")} className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-semibold">Manage →</button>
          </div>
          {riders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No riders registered</div>
          ) : (
            <div className="space-y-2">
              {riders.map((r) => {
                const sc = RIDER_STATUS_CONFIG[r.status] || RIDER_STATUS_CONFIG.offline;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-800/60 border border-white/5 rounded-xl">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 ${r.status !== "offline" ? "bg-gray-700 ring-2 ring-offset-1 ring-offset-gray-900 ring-green-500/50" : "bg-gray-800"}`}>
                      🛵
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{r.name}</div>
                      <div className="text-[10px] text-gray-500">{r.deliveries || 0} deliveries · ⭐ {r.rating || "—"}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${sc.color}`}>
                      <span className={`w-2 h-2 rounded-full ${sc.dot} ${r.status !== "offline" ? "animate-pulse" : ""}`} />
                      {sc.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top Selling Items */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white font-display text-sm uppercase tracking-wide">Top Selling Items</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">All time, by quantity</p>
            </div>
          </div>
          {topItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No delivered orders yet</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {topItems.map((item, i) => (
                <div key={i} className="bg-gray-800/60 border border-white/5 rounded-xl p-3 text-center relative">
                  <div className="absolute top-2 left-2.5 text-[10px] font-black text-gray-600">#{i + 1}</div>
                  <div className="text-3xl mb-1.5">{item.emoji}</div>
                  <div className="text-xs font-semibold text-white leading-tight">{item.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{item.qty} sold</div>
                  <div className="text-sm font-black text-orange-400 mt-1">${item.revenue.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {/* Quick-view order detail modal */}
      {quickViewOrder && (() => {
        // Always use the live version from orders array so status updates in real-time
        const o   = orders.find(ord => ord.id === quickViewOrder.id) || quickViewOrder;
        const cfg = STATUS_CONFIG[o.status] || {};
        const closeModal = () => { setQuickViewOrder(null); setShowCancel(false); setCancelReason(""); };
        const isActive   = !["delivered", "cancelled"].includes(o.status);
        return (
          <Modal open title={`Order ${o.id}`} onClose={closeModal} size="md">
            {/* Status */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                {cfg.icon} {cfg.label}
              </span>
              {o.riderName && (
                <span className="text-xs text-cyan-400 font-medium">🛵 {o.riderName}</span>
              )}
            </div>

            {/* Customer + payment */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Customer</div>
                <div className="text-sm font-semibold text-white">{o.customer || o.customerName || "—"}</div>
                {o.phone   && <div className="text-xs text-gray-400 mt-1">📞 {o.phone}</div>}
                {o.address && <div className="text-xs text-gray-400 mt-1">📍 {o.address}</div>}
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Payment</div>
                <div className="text-sm font-semibold text-white">{o.payment || "—"}</div>
                <div className="text-xl font-black text-orange-400 mt-1">${Number(o.total || 0).toFixed(2)}</div>
                {o.time && <div className="text-[10px] text-gray-500 mt-1">{o.time}</div>}
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-800 rounded-xl p-3 mb-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Items Ordered</div>
              {(o.items || []).map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0 text-sm">
                  <span className="text-white">{item.emoji ? `${item.emoji} ` : ""}{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">×{item.qty || 1}</span>
                    <span className="text-orange-400 font-semibold">${((item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 font-bold text-white text-sm">
                <span>Total</span>
                <span className="text-orange-400">${Number(o.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* ── Action buttons (active orders only) ── */}
            {isActive && (
              <div className="border-t border-white/10 pt-4 space-y-3">
                {/* Confirm — pending only */}
                {o.status === "pending" && (
                  <Button variant="success" className="w-full" loading={actionLoading} onClick={async () => {
                    setActionLoading(true);
                    await onStatusChange(o.id, "confirmed");
                    setActionLoading(false);
                    toast?.success("Order confirmed");
                  }}>✅ Confirm Order</Button>
                )}

                {/* Start Preparing — confirmed only */}
                {o.status === "confirmed" && (
                  <Button variant="warning" className="w-full" loading={actionLoading} onClick={async () => {
                    setActionLoading(true);
                    await onStatusChange(o.id, "preparing");
                    setActionLoading(false);
                    toast?.success("Order is now preparing");
                  }}>👨‍🍳 Start Preparing</Button>
                )}

                {/* Assign Rider — preparing only */}
                {o.status === "preparing" && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Assign Rider</div>
                    <div className="flex gap-2">
                      <select
                        value={riderSelect}
                        onChange={e => setRiderSelect(e.target.value)}
                        className="flex-1 bg-gray-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                      >
                        <option value="">Select rider…</option>
                        {riders
                          .filter(r => !r.suspended)
                          .sort((a, b) => (a.status === "online" ? -1 : b.status === "online" ? 1 : 0))
                          .map(r => (
                            <option key={r.id} value={r.id} disabled={r.status !== "online"}>
                              {r.status === "online" ? "🟢" : r.status === "delivering" ? "🟡" : "⚫"} {r.name} ⭐{r.rating}{r.status !== "online" ? ` (${r.status})` : ""}
                            </option>
                          ))}
                      </select>
                      <Button variant="primary" loading={actionLoading} disabled={!riderSelect} onClick={async () => {
                        const rider = riders.find(r => r.id === riderSelect);
                        setActionLoading(true);
                        await onAssignRider(o.id, rider.id, rider.name);
                        setActionLoading(false);
                        toast?.success(`${rider.name} assigned`);
                      }}>Assign</Button>
                    </div>
                  </div>
                )}

                {/* Rider handling banner */}
                {["rider_assigned", "delivering"].includes(o.status) && (
                  <div className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2.5">
                    🛵 Rider is handling this delivery
                  </div>
                )}

                {/* Cancel section */}
                {!showCancel ? (
                  <button onClick={() => setShowCancel(true)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                    Cancel order…
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation…"
                      rows={2}
                      className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <Button variant="danger" loading={actionLoading} disabled={!cancelReason.trim()} onClick={async () => {
                        setActionLoading(true);
                        await onCancelOrder(o.id, cancelReason);
                        setActionLoading(false);
                        closeModal();
                        toast?.success("Order cancelled");
                      }}>Confirm Cancel</Button>
                      <Button variant="ghost" onClick={() => { setShowCancel(false); setCancelReason(""); }}>Back</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Review */}
            {o.status === "delivered" && o.review && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mt-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Customer Review</div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">{"⭐".repeat(o.review.rating)}</span>
                  <span className="text-xs font-bold text-amber-400">{o.review.rating}/5</span>
                </div>
                {o.review.comment && <p className="text-xs text-gray-300 italic mt-1">"{o.review.comment}"</p>}
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}