// src/pages/OtherPages.jsx
import { useState, useEffect } from "react";
import { Button, Card, Modal, Input, Select, Toggle, ConfirmDialog } from "../components/UI";
import { STATUS_CONFIG } from "../utils/mockData";
import { subscribeShopSettings, saveShopSettings } from "../services/firestoreService";

// ── Print receipt (same as OrdersPage) ───────────────────────────────────────
function printOrderReceipt(order) {
  const rows = (order.items || []).map(i =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">x${i.qty || 1}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">$${(Number(i.price||0)*Number(i.qty||1)).toFixed(2)}</td>
    </tr>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><title>Receipt #${order.id}</title>
  <style>
    body{font-family:monospace;max-width:320px;margin:0 auto;padding:20px;color:#111}
    h2{text-align:center;margin:0 0 4px}.sub{text-align:center;font-size:12px;color:#555;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#f5f5f5;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    .total-row td{font-weight:bold;font-size:15px;padding:8px 8px 4px;border-top:2px solid #111}
    .info{font-size:12px;margin-top:12px;line-height:1.8}
    .footer{text-align:center;font-size:11px;color:#888;margin-top:16px;border-top:1px dashed #ccc;padding-top:10px}
    @media print{button{display:none}}
  </style></head><body>
  <h2>🍔 FoodDash</h2><div class="sub">Order Receipt</div>
  <div class="info">
    <b>Order #:</b> ${order.id}<br>
    <b>Date:</b> ${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}<br>
    <b>Customer:</b> ${order.customer || order.customerName || "—"}<br>
    <b>Phone:</b> ${order.phone || "—"}<br>
    <b>Address:</b> ${order.address || "—"}<br>
    <b>Payment:</b> ${order.payment || "Cash on delivery"}<br>
    <b>Status:</b> ${order.status?.toUpperCase() || "—"}
  </div>
  <table style="margin-top:12px">
    <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="3" style="padding:4px 8px;font-size:11px;color:#888">Subtotal: $${Number(order.subtotal||0).toFixed(2)}</td></tr>
      <tr><td colspan="3" style="padding:4px 8px;font-size:11px;color:#888">Delivery fee: $${Number(order.deliveryFee||0).toFixed(2)}</td></tr>
      ${Number(order.discount||0)>0?`<tr><td colspan="3" style="padding:4px 8px;font-size:11px;color:green">Discount: -$${Number(order.discount||0).toFixed(2)}</td></tr>`:""}
      <tr class="total-row"><td colspan="2">TOTAL</td><td style="text-align:right">$${Number(order.total||0).toFixed(2)}</td></tr>
    </tfoot>
  </table>
  ${order.riderName?`<div class="info"><b>Rider:</b> ${order.riderName}</div>`:""}
  ${order.note?`<div class="info"><b>Note:</b> ${order.note}</div>`:""}
  <div class="footer">Thank you for your order!<br>FoodDash · Phnom Penh</div>
  <br><button onclick="window.print()">🖨️ Print</button>
  </body></html>`;
  const w = window.open("", "_blank", "width=400,height=650");
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 400);
}

// ── Read-only order detail modal for History page ─────────────────────────────
function HistoryOrderModal({ order, onClose }) {
  if (!order) return null;
  const cfg = STATUS_CONFIG[order.status] || {};
  return (
    <Modal open onClose={onClose} size="lg">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">Order {order.id}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{order.time} · {order.date}</p>
          </div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Customer + Payment */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer</div>
            <div className="font-semibold text-white">{order.customer || order.customerName}</div>
            <div className="text-sm text-gray-400 mt-1">📞 {order.phone || "—"}</div>
            <div className="text-sm text-gray-400 mt-1">📍 {order.address || "—"}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Payment</div>
            <div className="font-semibold text-white">{order.payment || "Cash"}</div>
            <div className="text-2xl font-black text-orange-400 mt-2">${Number(order.total||0).toFixed(2)}</div>
            {order.riderName && (
              <div className="text-sm text-cyan-400 mt-2">🛵 {order.riderName}</div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Items Ordered</div>
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm">
              <span className="text-white">{item.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">×{item.qty}</span>
                <span className="text-orange-400 font-semibold">${(Number(item.price||0)*Number(item.qty||1)).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div className="pt-3 space-y-1 text-xs text-gray-500">
            {Number(order.subtotal||0) > 0 && <div className="flex justify-between"><span>Subtotal</span><span>${Number(order.subtotal||0).toFixed(2)}</span></div>}
            {Number(order.deliveryFee||0) > 0 && <div className="flex justify-between"><span>Delivery fee</span><span>${Number(order.deliveryFee||0).toFixed(2)}</span></div>}
            {Number(order.discount||0) > 0 && <div className="flex justify-between text-green-400"><span>Discount</span><span>-${Number(order.discount||0).toFixed(2)}</span></div>}
          </div>
          <div className="flex justify-between items-center pt-3 font-bold text-white border-t border-white/10 mt-2">
            <span>Total</span><span className="text-orange-400">${Number(order.total||0).toFixed(2)}</span>
          </div>
        </div>

        {/* Customer Note */}
        {order.note && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">📝 Customer Note</div>
            <p className="text-sm text-gray-300">{order.note}</p>
          </div>
        )}

        {/* Customer Review */}
        {order.review?.rating && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer Review</div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400">{"⭐".repeat(order.review.rating)}</span>
              <span className="text-sm font-bold text-amber-400">{order.review.rating}/5</span>
            </div>
            {order.review.comment && <p className="text-sm text-gray-300 italic mt-1">"{order.review.comment}"</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={() => printOrderReceipt(order)}>🖨️ Print Receipt</Button>
          <Button variant="ghost" className="ml-auto" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export function PromotionsPage({ promos, onAdd, onDelete, onToggle, toast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [deletePromo, setDeletePromo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: "", maxUse: "", expiry: "", minOrder: "" });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Code is required";
    if (form.type !== "free_delivery" && (!form.value || isNaN(form.value))) e.value = "Enter a valid value";
    if (!form.maxUse || isNaN(form.maxUse)) e.maxUse = "Enter max uses";
    if (!form.expiry) e.expiry = "Expiry date required";
    return e;
  };

  const handleAdd = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    await onAdd({ ...form, value: parseFloat(form.value) || 0, maxUse: parseInt(form.maxUse), minOrder: parseFloat(form.minOrder) || 0 });
    toast.success(`Promo code "${form.code}" created!`);
    setShowAdd(false);
    setForm({ code: "", type: "percent", value: "", maxUse: "", expiry: "", minOrder: "" });
    setErrors({});
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-3 gap-3 flex-1 mr-4">
          {[
            { label: "Total Promos", value: promos.length, color: "text-white" },
            { label: "Active",       value: promos.filter(p=>p.active).length, color: "text-emerald-400" },
            { label: "Total Uses",   value: promos.reduce((s,p)=>s+(p.used||0),0), color: "text-orange-400" },
          ].map((s,i) => (
            <div key={i} className="bg-gray-900 border border-white/8 rounded-2xl p-4 text-center">
              <div className={`text-xl font-black font-display ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>+ Create Promo Code</Button>
      </div>

      <div className="space-y-3">
        {promos.map((p) => {
          const pct = p.maxUse > 0 ? Math.round((p.used / p.maxUse) * 100) : 0;
          return (
            <div key={p.id} className="bg-gray-900 border border-white/8 rounded-2xl p-5 flex items-center gap-4">
              <div className="bg-orange-500/10 border border-dashed border-orange-500/50 rounded-xl px-5 py-3 font-display text-xl font-black text-orange-400 whitespace-nowrap">{p.code}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold">
                    {p.type === "percent" ? `${p.value}% Off` : p.type === "fixed" ? `$${p.value} Off` : "Free Delivery"}
                  </span>
                  {p.minOrder > 0 && <span className="text-xs text-gray-500">· Min order ${p.minOrder}</span>}
                </div>
                <div className="text-xs text-gray-500 mb-2">Used {p.used || 0}/{p.maxUse} · Expires {p.expiry}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{pct}%</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Toggle checked={p.active} onChange={async (v) => { await onToggle(p.id, v); toast.info(`"${p.code}" ${v ? "activated" : "deactivated"}`); }} />
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${p.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-gray-800 text-gray-500 border-white/10"}`}>{p.active ? "Active" : "Inactive"}</span>
                <Button variant="danger" size="sm" onClick={() => setDeletePromo(p)}>🗑️ Delete</Button>
              </div>
            </div>
          );
        })}
        {promos.length === 0 && <div className="text-center py-12 text-gray-500">No promo codes yet. Create one!</div>}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="🏷️ Create Promo Code">
        <div className="space-y-4">
          <Input label="Promo Code" value={form.code} onChange={e => { setForm({...form,code:e.target.value.toUpperCase()}); setErrors(p=>({...p,code:""})); }} placeholder="e.g. SAVE20" error={errors.code} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Discount Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={[{value:"percent",label:"Percentage Off"},{value:"fixed",label:"Fixed Amount Off"},{value:"free_delivery",label:"Free Delivery"}]} />
            {form.type !== "free_delivery" && <Input label="Value" type="number" value={form.value} onChange={e=>{setForm({...form,value:e.target.value});setErrors(p=>({...p,value:""}));}} placeholder={form.type==="percent"?"20":""} error={errors.value} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Max Uses" type="number" value={form.maxUse} onChange={e=>{setForm({...form,maxUse:e.target.value});setErrors(p=>({...p,maxUse:""}));}} placeholder="100" error={errors.maxUse} />
            <Input label="Min Order ($)" type="number" value={form.minOrder} onChange={e=>setForm({...form,minOrder:e.target.value})} placeholder="0" />
          </div>
          <Input label="Expiry Date" type="date" value={form.expiry} onChange={e=>{setForm({...form,expiry:e.target.value});setErrors(p=>({...p,expiry:""}));}} error={errors.expiry} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} loading={loading}>Create Promo</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deletePromo} onClose={() => setDeletePromo(null)} onConfirm={async () => { await onDelete(deletePromo.id); toast.success(`"${deletePromo.code}" deleted`); }} title="Delete Promo Code" message={`Delete "${deletePromo?.code}"? This cannot be undone.`} confirmLabel="Delete" variant="danger" />
    </div>
  );
}

// ─── LOGS PAGE ────────────────────────────────────────────────────────────────
// src/pages/LogsPage.jsx
export function LogsPage({ logs }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const TYPE_CONFIG = {
    menu:   { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: "🍔" },
    order:  { color: "text-blue-400",    bg: "bg-blue-500/10",    icon: "📦" },
    rider:  { color: "text-cyan-400",    bg: "bg-cyan-500/10",    icon: "🛵" },
    system: { color: "text-gray-400",    bg: "bg-gray-500/10",    icon: "⚙️" },
  };

  const filtered = logs.filter(l => {
    const matchFilter = filter === "all" || l.type === filter;
    const matchSearch = !search || l.action?.toLowerCase().includes(search.toLowerCase()) || l.detail?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const formatTime = (ts) => {
    try { return ts?.toDate ? ts.toDate().toLocaleTimeString() : new Date().toLocaleTimeString(); } catch { return "—"; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
          {["all","menu","order","rider","system"].map(t => (
            <button key={t} onClick={()=>setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter===t?"bg-gray-900 text-white shadow":"text-gray-500 hover:text-gray-300"}`}>
              {t === "all" ? "All" : `${TYPE_CONFIG[t]?.icon} ${t}`}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search logs..." className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 w-60" />
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} logs</span>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">No logs found</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((log, i) => {
              const tc = TYPE_CONFIG[log.type] || TYPE_CONFIG.system;
              return (
                <div key={log.id || i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${tc.bg}`}>{tc.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{log.action}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{log.detail}</div>
                    <div className="text-xs text-gray-600 mt-0.5">by <span className="text-gray-500">{log.adminName}</span></div>
                  </div>
                  <div className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0 mt-0.5">{formatTime(log.timestamp)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
export function HistoryPage({ orders, toast }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const PER_PAGE = 10;

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.id?.toLowerCase().includes(q) || o.customer?.toLowerCase().includes(q) || o.phone?.includes(q);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const exportHistory = () => {
    const csv = ["ID,Customer,Phone,Total,Payment,Status,Rider,Time",
      ...filtered.map(o=>`${o.id},${o.customer},${o.phone},${o.total},${o.payment},${o.status},${o.riderName||"—"},${o.time}`)
    ].join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="order-history.csv"; a.click();
    toast.success("Order history exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="🔍 Search order ID, customer, phone..." className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 flex-1 min-w-[200px]" />
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
          <option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option>
        </select>
        <Button variant="outline" onClick={exportHistory}>📤 Export CSV</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/8">{["Order ID","Customer","Items","Total","Payment","Status","Rider","Time",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {paginated.map(o=>{
                const cfg = STATUS_CONFIG[o.status]||{};
                return (
                  <tr key={o.id} onClick={()=>setSelectedOrder(o)} className="border-b border-white/5 hover:bg-white/2 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-orange-400 text-xs font-bold">{o.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-xs">{o.customer}</div>
                      <div className="text-[10px] text-gray-500">{o.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{(o.items||[]).map(i=>i.name).join(", ")}</td>
                    <td className="px-4 py-3 font-bold text-white">${o.total}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-gray-300">{o.payment}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.icon} {cfg.label}</span></td>
                    <td className="px-4 py-3 text-xs text-cyan-400">{o.riderName||<span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{o.time}</td>
                    <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={()=>printOrderReceipt(o)}>🖨️</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {paginated.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No orders found</div>}
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">Showing {Math.min((page-1)*PER_PAGE+1,filtered.length)}–{Math.min(page*PER_PAGE,filtered.length)} of {filtered.length}</span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</Button>
            {Array.from({length:Math.min(Math.ceil(filtered.length/PER_PAGE),5)},(_,i)=>i+1).map(p=>(
              <Button key={p} variant={p===page?"primary":"outline"} size="sm" onClick={()=>setPage(p)}>{p}</Button>
            ))}
            <Button variant="outline" size="sm" disabled={page*PER_PAGE>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next →</Button>
          </div>
        </div>
      </Card>

      <HistoryOrderModal order={selectedOrder} onClose={()=>setSelectedOrder(null)} />
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
export function SettingsPage({ toast }) {
  const DEFAULTS = {
    shopName: "FoodDash Kitchen", emoji: "🍔", phone: "+855 12 345 678",
    address: "St. 271, Phnom Penh", description: "Best food delivery in Phnom Penh",
    deliveryFee: "1.5", deliveryTime: "15-30", freeDeliveryAbove: "20",
    minOrder: "5", taxRate: "0", isOpen: true,
    autoAccept: false, autoAssign: true, notifSound: true, maintenanceMode: false,
    hours: { Mon:["09:00","22:00",true], Tue:["09:00","22:00",true], Wed:["09:00","22:00",true], Thu:["09:00","22:00",true], Fri:["09:00","23:00",true], Sat:["10:00","23:00",true], Sun:["10:00","21:00",false] }
  };

  const [settings, setSettings] = useState(DEFAULTS);
  const [activeTab, setActiveTab] = useState("shop");
  const [saving, setSaving] = useState(false);

  // Load real settings from Firestore on mount
  useEffect(() => {
    const unsub = subscribeShopSettings((data) => {
      if (data) {
        setSettings(prev => ({
          ...prev,
          shopName:          data.shopName      || DEFAULTS.shopName,
          emoji:             data.emoji         || DEFAULTS.emoji,
          phone:             data.phone         || DEFAULTS.phone,
          address:           data.address       || DEFAULTS.address,
          description:       data.description   || DEFAULTS.description,
          deliveryFee:       String(data.deliveryFee   ?? DEFAULTS.deliveryFee),
          deliveryTime:      data.deliveryTime   || DEFAULTS.deliveryTime,
          freeDeliveryAbove: String(data.freeDeliveryAbove ?? DEFAULTS.freeDeliveryAbove),
          minOrder:          String(data.minOrder ?? DEFAULTS.minOrder),
          taxRate:           String(data.taxRate  ?? DEFAULTS.taxRate),
          isOpen:          data.isOpen          !== undefined ? data.isOpen          : DEFAULTS.isOpen,
          autoAccept:      data.autoAccept      !== undefined ? data.autoAccept      : DEFAULTS.autoAccept,
          autoAssign:      data.autoAssign      !== undefined ? data.autoAssign      : DEFAULTS.autoAssign,
          notifSound:      data.notifSound      !== undefined ? data.notifSound      : DEFAULTS.notifSound,
          maintenanceMode: data.maintenanceMode !== undefined ? data.maintenanceMode : DEFAULTS.maintenanceMode,
          hours:             data.hours || DEFAULTS.hours,
        }));
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to Firestore — Customer app picks up changes in real-time
  const save = async () => {
    setSaving(true);
    try {
      await saveShopSettings({
        shopName:          settings.shopName,
        emoji:             settings.emoji,
        phone:             settings.phone,
        address:           settings.address,
        description:       settings.description,
        deliveryFee:       parseFloat(settings.deliveryFee)       || 1.5,
        deliveryTime:      settings.deliveryTime,
        freeDeliveryAbove: parseFloat(settings.freeDeliveryAbove) || 0,
        minOrder:          parseFloat(settings.minOrder)          || 0,
        taxRate:           parseFloat(settings.taxRate)           || 0,
        isOpen:            settings.isOpen,
        autoAccept:        settings.autoAccept,
        autoAssign:        settings.autoAssign,
        notifSound:        settings.notifSound,
        maintenanceMode:   settings.maintenanceMode,
        hours:             settings.hours,
      });
      toast.success("Settings saved! Customer app updated instantly.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 w-fit">
        {[{id:"shop",label:"🏪 Shop"},{id:"pricing",label:"💰 Pricing"},{id:"orders",label:"📦 Orders"},{id:"hours",label:"🕐 Hours"},{id:"admins",label:"👤 Admins"}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab===t.id?"bg-gray-900 text-white shadow":"text-gray-500 hover:text-gray-300"}`}>{t.label}</button>
        ))}
      </div>

      {activeTab === "shop" && (
        <Card>
          <div className="text-sm font-bold text-white mb-4 font-display uppercase tracking-wide">Shop Profile</div>
          <div className="space-y-4">
            {/* Emoji + Name row */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center text-4xl border border-white/10">{settings.emoji}</div>
                <input maxLength={2} value={settings.emoji} onChange={e=>setSettings({...settings,emoji:e.target.value})} className="w-16 text-center bg-gray-800 border border-white/10 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-orange-500" placeholder="🍔" />
                <span className="text-[10px] text-gray-500">Shop emoji</span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Shop Name</label><input className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" value={settings.shopName} onChange={e=>setSettings({...settings,shopName:e.target.value})} /></div>
                <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone</label><input className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" value={settings.phone} onChange={e=>setSettings({...settings,phone:e.target.value})} /></div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Address</label><input className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500" value={settings.address} onChange={e=>setSettings({...settings,address:e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</label><textarea rows={2} className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500 resize-none" value={settings.description} onChange={e=>setSettings({...settings,description:e.target.value})} /></div>
            {/* Shop open/closed toggle — instantly visible to customers */}
            <div className="flex items-center justify-between py-3 border-t border-white/5">
              <div>
                <div className="text-sm font-medium text-white">Shop is Open</div>
                <div className="text-xs text-gray-500 mt-0.5">Customers can browse and place orders</div>
              </div>
              <Toggle checked={settings.isOpen} onChange={v=>setSettings({...settings,isOpen:v})} />
            </div>
          </div>
        </Card>
      )}

      {activeTab === "pricing" && (
        <Card>
          <div className="text-sm font-bold text-white mb-4 font-display uppercase tracking-wide">Delivery & Pricing</div>
          <div className="space-y-3">
            {[
              { label: "Delivery Fee ($)",         key: "deliveryFee",       type: "number" },
              { label: "Free Delivery Above ($)",  key: "freeDeliveryAbove", type: "number" },
              { label: "Minimum Order ($)",        key: "minOrder",          type: "number" },
              { label: "Tax Rate (%)",             key: "taxRate",           type: "number" },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <span className="text-sm text-white">{s.label}</span>
                <input type={s.type} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500 w-24 text-right" value={settings[s.key]} onChange={e=>setSettings({...settings,[s.key]:e.target.value})} />
              </div>
            ))}
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-white">Estimated Delivery Time</span>
              <input type="text" placeholder="15-30" className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500 w-28 text-right" value={settings.deliveryTime} onChange={e=>setSettings({...settings,deliveryTime:e.target.value})} />
            </div>
          </div>
        </Card>
      )}

      {activeTab === "orders" && (
        <Card>
          <div className="text-sm font-bold text-white mb-4 font-display uppercase tracking-wide">Order Settings</div>
          <div className="space-y-2">
            {[
              { label: "Auto-Accept Orders", sub: "Automatically confirm incoming orders", key: "autoAccept" },
              { label: "Auto-Assign Riders", sub: "Assign nearest available rider automatically", key: "autoAssign" },
              { label: "Order Notification Sound", sub: "Play alert when new order arrives", key: "notifSound" },
              { label: "Maintenance Mode", sub: "Temporarily close shop and stop new orders", key: "maintenanceMode" },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm font-medium text-white">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
                </div>
                <Toggle checked={settings[s.key]} onChange={v=>setSettings({...settings,[s.key]:v})} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "hours" && (
        <Card>
          <div className="text-sm font-bold text-white mb-4 font-display uppercase tracking-wide">Opening Hours</div>
          <div className="space-y-2">
            {DAYS.map(day => {
              const [open, close, enabled] = settings.hours[day];
              return (
                <div key={day} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-white w-10">{day}</span>
                  <input type="time" value={open} disabled={!enabled} onChange={e=>setSettings({...settings,hours:{...settings.hours,[day]:[e.target.value,close,enabled]}})} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500 w-28 disabled:opacity-40" />
                  <span className="text-gray-600 text-xs">to</span>
                  <input type="time" value={close} disabled={!enabled} onChange={e=>setSettings({...settings,hours:{...settings.hours,[day]:[open,e.target.value,enabled]}})} className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500 w-28 disabled:opacity-40" />
                  <Toggle checked={enabled} onChange={v=>setSettings({...settings,hours:{...settings.hours,[day]:[open,close,v]}})} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === "admins" && (
        <Card>
          <div className="text-sm font-bold text-white mb-4 font-display uppercase tracking-wide">Admin Users</div>
          <div className="space-y-2 mb-4">
            {[{name:"John Doe",email:"john@admin.com",role:"Owner"},{name:"Sarah Lee",email:"sarah@admin.com",role:"Manager"}].map((a,i)=>(
              <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">{a.name[0]}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.email}</div>
                </div>
                <span className="text-xs bg-gray-700 text-gray-300 border border-white/10 rounded-lg px-2 py-1">{a.role}</span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={()=>toast.info("Add admin feature — connect Firebase Auth")}>+ Add Admin User</Button>
        </Card>
      )}

      <Button variant="primary" size="lg" onClick={save} loading={saving}>💾 Save All Settings</Button>
    </div>
  );
}