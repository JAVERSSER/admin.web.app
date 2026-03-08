// src/pages/OrdersPage.jsx
import { useState, useEffect, useRef } from "react";
import { Button, Card, StatusBadge, Modal, LiveIndicator, SearchInput } from "../components/UI";
import { STATUS_CONFIG } from "../utils/mockData";
import { subscribeRiderDoc } from "../services/firestoreService";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ── Shared map helpers ────────────────────────────────────────────────────────
const ADMIN_MAP_CENTER = [11.5564, 104.9282];

async function fetchOSRMRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const data = await fetch(url).then((r) => r.json());
    return data.routes?.[0] || null;
  } catch { return null; }
}

function makeMapIcon(emoji, bg) {
  return L.divIcon({
    html: `<div style="background:${bg};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:13px;">${emoji}</div>`,
    className: "", iconSize: [30, 30], iconAnchor: [15, 15],
  });
}

function makeAdminRiderIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:40px;height:46px;display:flex;flex-direction:column;align-items:center;">
      <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(145deg,#ff6b35,#e65c00);border:3px solid white;box-shadow:0 4px 14px rgba(230,92,0,0.55);display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
          <path d="M19 7c0-1.1-.9-2-2-2h-3l2 4h-4L10 7H7L5 11H3v2h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-2h-1l-3-4zM8 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm8 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        </svg>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #e65c00;margin-top:-1px;"></div>
    </div>`,
    className: "", iconSize: [40, 46], iconAnchor: [20, 46], popupAnchor: [0, -46],
  });
}

// ── Live delivery map shown inside the admin order modal ──────────────────────
function AdminLiveMap({ order }) {
  const mapElRef      = useRef(null);
  const leafletRef    = useRef(null);
  const markersRef    = useRef({});
  const routeLayerRef = useRef(null);
  const shopPosRef    = useRef(ADMIN_MAP_CENTER);
  const custPosRef    = useRef([11.5630, 104.9240]);
  const orderRef      = useRef(order);

  const [riderPos, setRiderPos] = useState(null);
  const [eta,      setEta]      = useState(null);

  useEffect(() => { orderRef.current = order; }, [order]);

  // Init Leaflet map once
  useEffect(() => {
    if (!mapElRef.current || leafletRef.current) return;
    leafletRef.current = L.map(mapElRef.current, { zoomControl: false, attributionControl: false })
      .setView(ADMIN_MAP_CENTER, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
      .addTo(leafletRef.current);
    return () => { leafletRef.current?.remove(); leafletRef.current = null; };
  }, []);

  // Geocode addresses, place shop + customer markers, draw initial route
  useEffect(() => {
    const geocode = async (addr) => {
      try {
        const d = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`
        ).then((r) => r.json());
        if (d[0]) return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
      } catch {}
      return null;
    };
    const run = async () => {
      const shopAddr = order.shopAddress || "Phnom Penh, Cambodia";
      const custAddr = order.address || order.deliveryAddress || "Phnom Penh, Cambodia";
      const [sp, cp] = await Promise.all([geocode(shopAddr), geocode(custAddr)]);
      const map = leafletRef.current;
      if (!map) return;
      if (sp) shopPosRef.current = sp;
      if (cp) custPosRef.current = cp;
      const s = shopPosRef.current, c = custPosRef.current;
      if (markersRef.current.shop) markersRef.current.shop.setLatLng(s);
      else markersRef.current.shop = L.marker(s, { icon: makeMapIcon("🏪", "#f97316") }).addTo(map);
      if (markersRef.current.cust) markersRef.current.cust.setLatLng(c);
      else markersRef.current.cust = L.marker(c, { icon: makeMapIcon("📍", "#4285F4") }).addTo(map);
      const route = await fetchOSRMRoute(s, c);
      if (route) {
        if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
        routeLayerRef.current = L.geoJSON(route.geometry, { style: { color: "#f97316", weight: 3, opacity: 0.7 } }).addTo(map);
        const mins = Math.round(route.duration / 60);
        setEta(mins < 1 ? "< 1 min" : `${mins} min`);
      }
      map.fitBounds([s, c], { padding: [30, 30] });
    };
    run();
  }, []); // eslint-disable-line

  // Subscribe to rider live GPS via Firestore rider doc
  useEffect(() => {
    if (!order.riderId) return;
    return subscribeRiderDoc(order.riderId, (rider) => {
      if (rider?.lat && rider?.lng) setRiderPos([rider.lat, rider.lng]);
    });
  }, [order.riderId]); // eslint-disable-line

  // Update rider marker + draw route from rider to next destination
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !riderPos) return;
    if (markersRef.current.rider) {
      markersRef.current.rider.setLatLng(riderPos);
    } else {
      markersRef.current.rider = L.marker(riderPos, { icon: makeAdminRiderIcon() }).addTo(map);
      map.setView(riderPos, 14);
    }
    const o = orderRef.current;
    const goingToShop = o.status === "rider_assigned" && o.deliveryStep !== "pickup";
    const dest = goingToShop ? shopPosRef.current : custPosRef.current;
    fetchOSRMRoute(riderPos, dest).then((route) => {
      if (!route || !leafletRef.current) return;
      if (routeLayerRef.current) { leafletRef.current.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      const color = goingToShop ? "#34A853" : "#4285F4";
      routeLayerRef.current = L.geoJSON(route.geometry, { style: { color, weight: 3, opacity: 0.85 } }).addTo(leafletRef.current);
      const mins = Math.round(route.duration / 60);
      setEta(mins < 1 ? "< 1 min" : `${mins} min`);
    });
  }, [riderPos]); // eslint-disable-line

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden mb-5">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/10">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">🗺️ Live Delivery Map</span>
        {riderPos && (
          <span className="ml-2 flex items-center gap-1 text-xs text-green-400 font-semibold">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Live
          </span>
        )}
        {eta && <span className="ml-auto text-xs text-cyan-400 font-semibold">ETA: {eta}</span>}
      </div>
      <div ref={mapElRef} style={{ height: "220px", width: "100%" }} />
      <div className="px-3 py-1.5 flex gap-4 text-[11px] text-gray-500 bg-gray-800/80">
        <span><span className="text-orange-500">●</span> Restaurant</span>
        <span><span className="text-orange-400">●</span> Rider</span>
        <span><span className="text-blue-400">●</span> Customer</span>
      </div>
    </div>
  );
}

// Returns orderNumber if set, otherwise derives a consistent 6-digit number from the Firestore ID
const fmtOrder = (o) => {
  if (o?.orderNumber) return o.orderNumber;
  const id = o?.id || "";
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return (n % 900000) + 100000;
};

// ── Print receipt in a clean new window ──────────────────────────────────────
function printOrderReceipt(order) {
  const items = (order.items || []);
  const rows  = items.map(i =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">x${i.qty || 1}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">$${(Number(i.price||0)*Number(i.qty||1)).toFixed(2)}</td>
    </tr>`
  ).join("");

  const displayNum = fmtOrder(order);
  const html = `<!DOCTYPE html><html><head><title>Receipt #${displayNum}</title>
  <style>
    body{font-family:monospace;max-width:320px;margin:0 auto;padding:20px;color:#111}
    h2{text-align:center;margin:0 0 4px}
    .sub{text-align:center;font-size:12px;color:#555;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#f5f5f5;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    .total-row td{font-weight:bold;font-size:15px;padding:8px 8px 4px;border-top:2px solid #111}
    .info{font-size:12px;margin-top:12px;line-height:1.8}
    .footer{text-align:center;font-size:11px;color:#888;margin-top:16px;border-top:1px dashed #ccc;padding-top:10px}
    @media print{button{display:none}}
  </style></head><body>
  <h2>🍔 FoodDash</h2>
  <div class="sub">Order Receipt</div>
  <div class="info">
    <b>Order #:</b> ${displayNum}<br>
    <b>Date:</b> ${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}<br>
    <b>Customer:</b> ${order.customer || order.customerName || "—"}<br>
    <b>Phone:</b> ${order.phone || order.customerPhone || "—"}<br>
    <b>Address:</b> ${order.address || order.deliveryAddress || "—"}<br>
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
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ── Today filter helper ───────────────────────────────────────────────────────
const isToday = (o) => {
  const ms = o.createdAt?.toMillis?.() ?? (o.createdAt?.seconds ? o.createdAt.seconds * 1000 : 0);
  if (!ms) return false;
  const d = new Date(ms), t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

// ── Rider delivery sub-steps ──────────────────────────────────────────────────
const RIDER_STEPS = [
  { key: "accepted",   label: "Accepted",   icon: "👋" },
  { key: "pickup",     label: "At Shop",    icon: "🏪" },
  { key: "delivering", label: "Delivering", icon: "🚀" },
  { key: "delivered",  label: "Delivered",  icon: "🎉" },
];

function getRiderStep(status, deliveryStep) {
  if (status === "delivered")      return 4;
  if (status === "delivering")     return 3;
  if (status === "rider_assigned") return deliveryStep === "pickup" ? 2 : 1;
  return 0;
}

function OrderDetailModal({ order, riders, onClose, onStatusChange, onAssignRider, onCancel, toast }) {
  const [selectedRider, setSelectedRider] = useState(
    riders.find(r => r.status === "online" && !r.suspended)?.id ||
    riders.find(r => !r.suspended)?.id || ""
  );
  const [cancelling, setCancelling]           = useState(false);
  const [cancelReason, setCancelReason]       = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmDelivery, setConfirmDelivery] = useState(null); // "delivering" | "delivered"
  const [loading, setLoading]                 = useState(false);
  const [reassigning, setReassigning]         = useState(false);

  const flowOrder = ["pending", "confirmed", "preparing", "rider_assigned", "delivering", "delivered"];
  const currentIdx = flowOrder.indexOf(order.status);

  const handleStatusChange = async (status) => {
    setLoading(true);
    await onStatusChange(order.id, status);
    toast.success(`Order updated to ${STATUS_CONFIG[status]?.label}`);
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedRider) return;
    const rider = riders.find(r => r.id === selectedRider);
    setLoading(true);
    await onAssignRider(order.id, rider.id, rider.name);
    toast.success(`Rider ${rider.name} assigned`);
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setLoading(true);
    await onCancel(order.id, cancelReason);
    toast.success("Order cancelled");
    onClose();
    setLoading(false);
  };

  const showRiderProgress = ["rider_assigned", "delivering", "delivered"].includes(order.status) && order.riderName;
  const riderStep = getRiderStep(order.status, order.deliveryStep);

  return (
    <Modal open title={`Order #${fmtOrder(order)}`} onClose={onClose} size="lg">
      {/* Main 6-step status timeline */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {flowOrder.map((s, i) => {
          const sCfg = STATUS_CONFIG[s];
          const done = i <= currentIdx && order.status !== "cancelled";
          return (
            <div key={s} className="flex items-center gap-1 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all ${done ? `${sCfg.dot} border-transparent text-white` : "bg-gray-800 border-white/10 text-gray-600"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-[9px] font-medium ${done ? sCfg.color : "text-gray-600"} whitespace-nowrap`}>{sCfg.label}</span>
              </div>
              {i < flowOrder.length - 1 && <div className={`w-6 h-0.5 rounded-full mb-4 flex-shrink-0 ${done && i < currentIdx ? "bg-orange-500" : "bg-gray-700"}`} />}
            </div>
          );
        })}
      </div>

      {/* Rider delivery sub-steps — visible once rider is assigned */}
      {showRiderProgress && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 mb-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">
            🛵 {order.riderName} — Delivery Progress
          </div>
          <div className="flex items-center gap-1">
            {RIDER_STEPS.map((s, i) => {
              const done    = (i + 1) < riderStep || order.status === "delivered";
              const current = (i + 1) === riderStep && order.status !== "delivered";
              return (
                <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all ${
                      done    ? "bg-cyan-500 border-transparent text-white" :
                      current ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 ring-2 ring-cyan-500/20" :
                                "bg-gray-800 border-white/10 text-gray-600"
                    }`}>
                      {done ? "✓" : s.icon}
                    </div>
                    <span className={`text-[9px] font-medium whitespace-nowrap ${
                      current ? "text-cyan-400 font-bold" : done ? "text-gray-400" : "text-gray-600"
                    }`}>{s.label}</span>
                    {current && <span className="text-[8px] text-cyan-500 font-bold">NOW</span>}
                  </div>
                  {i < RIDER_STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 rounded-full mb-5 flex-shrink-0 ${done ? "bg-cyan-500" : "bg-gray-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live map — shown once a rider is assigned */}
      {showRiderProgress && <AdminLiveMap order={order} />}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer</div>
          <div className="font-semibold text-white">{order.customer}</div>
          <div className="text-sm text-gray-400 mt-1">📞 {order.phone}</div>
          <div className="text-sm text-gray-400 mt-1">📍 {order.address}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Payment</div>
          <div className="font-semibold text-white">{order.payment}</div>
          <div className="text-2xl font-black text-orange-400 mt-2">${order.total}</div>
          <div className="text-xs text-gray-500 mt-1">{order.time}</div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-gray-800 rounded-xl p-4 mb-5">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Items Ordered</div>
        {(order.items || []).map((item, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm">
            <span className="text-white">{item.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">x{item.qty}</span>
              <span className="text-orange-400 font-semibold">${(item.price * item.qty).toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center pt-3 font-bold text-white">
          <span>Total</span>
          <span className="text-orange-400">${order.total}</span>
        </div>
      </div>

      {/* Customer Note */}
      {order.note && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">📝 Customer Note</div>
          <p className="text-sm text-gray-300">{order.note}</p>
        </div>
      )}

      {/* Customer Review — shown for delivered orders */}
      {order.status === "delivered" && order.review && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer Review</div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-amber-400 text-lg">{"⭐".repeat(order.review.rating)}</span>
            <span className="text-sm font-bold text-amber-400">{order.review.rating} / 5</span>
          </div>
          {order.review.comment && (
            <p className="text-sm text-gray-300 italic">"{order.review.comment}"</p>
          )}
          {order.review.createdAt && (
            <div className="text-[10px] text-gray-600 mt-1">
              {new Date(order.review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
        </div>
      )}
      {order.status === "delivered" && !order.review && (
        <div className="bg-gray-800/50 border border-white/5 rounded-xl px-4 py-3 mb-5 text-xs text-gray-500">
          No customer review yet for this order.
        </div>
      )}

      {/* Rider assignment */}
      {order.status !== "delivered" && order.status !== "cancelled" && (
        <div className="mb-5">
          {order.riderName && !reassigning ? (
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛵</span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assigned Rider</div>
                  <div className="font-semibold text-cyan-400">{order.riderName}</div>
                  {!order.riderAccepted && (
                    <div className="text-xs text-amber-400 mt-0.5">⏳ Waiting for rider to accept…</div>
                  )}
                </div>
                {/* Allow re-assignment at any time before delivery */}
                <Button variant="outline" size="sm" onClick={() => setReassigning(true)}>
                  🔄 Reassign
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                {reassigning ? "Reassign Rider" : "Assign a Rider"}
              </div>
              <div className="flex flex-col gap-2">
                <select
                  value={selectedRider}
                  onChange={(e) => setSelectedRider(e.target.value)}
                  className="w-full bg-gray-700 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                >
                  <option value="">Select rider...</option>
                  {riders
                    .filter(r => !r.suspended)
                    .sort((a, b) => {
                      const order = { online: 0, delivering: 1, offline: 2 };
                      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
                    })
                    .map(r => {
                      const dot = r.status === "online" ? "🟢" : r.status === "delivering" ? "🟡" : "⚫";
                      const label = r.status === "online" ? "" : ` (${r.status || "offline"})`;
                      return (
                        <option key={r.id} value={r.id}>
                          {dot} {r.name} — ⭐ {r.rating || "N/A"}{label}
                        </option>
                      );
                    })}
                </select>
                <div className="flex gap-2">
                  <Button variant="cyan" className="flex-1" onClick={handleAssign} disabled={!selectedRider} loading={loading}>
                    {reassigning ? "Reassign" : "Assign"}
                  </Button>
                  {reassigning && (
                    <Button variant="ghost" size="sm" onClick={() => setReassigning(false)}>Cancel</Button>
                  )}
                </div>
              </div>
              {riders.filter(r => !r.suspended).length === 0 ? (
                <div className="text-xs text-amber-400 mt-2">⚠️ No riders registered yet</div>
              ) : riders.filter(r => r.status === "online" && !r.suspended).length === 0 ? (
                <div className="text-xs text-amber-400 mt-2">⚠️ No riders online — you can still assign an offline rider and they'll be notified when they open the app</div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Cancel section */}
      {order.status !== "delivered" && order.status !== "cancelled" && (
        <div>
          {cancelling && !confirmingCancel && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
              <div className="text-sm font-medium text-red-400 mb-3">Reason for cancellation</div>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason..."
                rows={2}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 resize-none mb-3"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCancelling(false)}>Back</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmingCancel(true)} disabled={!cancelReason.trim()}>Confirm Cancel</Button>
              </div>
            </div>
          )}
          {cancelling && confirmingCancel && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold text-red-400 mb-1">⚠️ Are you sure?</div>
              <div className="text-xs text-gray-400 mb-4">This will cancel the order and notify the customer with your reason.</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmingCancel(false)}>No, Go Back</Button>
                <Button variant="danger" size="sm" onClick={handleCancel} loading={loading}>Yes, Cancel Order</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-white/8">
        {order.status === "pending" && (
          <>
            <Button variant="success" onClick={() => handleStatusChange("confirmed")} loading={loading}>✅ Confirm Order</Button>
            <Button variant="danger" onClick={() => setCancelling(true)}>❌ Cancel</Button>
          </>
        )}
        {order.status === "confirmed" && (
          <>
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("pending")} loading={loading}>← Back to Pending</Button>
            <Button variant="primary" onClick={() => handleStatusChange("preparing")} loading={loading}>👨‍🍳 Start Preparing</Button>
            <Button variant="danger" onClick={() => setCancelling(true)}>❌ Cancel</Button>
          </>
        )}
        {order.status === "preparing" && (
          <>
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("confirmed")} loading={loading}>← Back to Confirmed</Button>
            <Button variant="danger" onClick={() => setCancelling(true)}>❌ Cancel</Button>
          </>
        )}
        {order.status === "rider_assigned" && !confirmDelivery && (
          <>
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("preparing")} loading={loading}>← Back to Preparing</Button>
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-3 py-2 flex-1">
              🛵 Waiting for rider to accept
            </div>
            <Button variant="primary" size="sm" onClick={() => setConfirmDelivery("delivering")} loading={loading}>🚀 Out for Delivery →</Button>
            <Button variant="danger" onClick={() => setCancelling(true)}>❌ Cancel</Button>
          </>
        )}
        {order.status === "delivering" && !confirmDelivery && (
          <>
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-3 py-2 flex-1">
              🛵 Rider is on the way
            </div>
            <Button variant="success" size="sm" onClick={() => setConfirmDelivery("delivered")}>✓ Mark Delivered</Button>
          </>
        )}
        {confirmDelivery && (
          <div className="flex-1 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            <span className="text-xs text-amber-400 flex-1">
              {confirmDelivery === "delivering"
                ? "Confirm order is out for delivery?"
                : "Confirm order was delivered to customer?"}
            </span>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelivery(null)}>Cancel</Button>
            <Button
              variant={confirmDelivery === "delivered" ? "success" : "primary"}
              size="sm"
              loading={loading}
              onClick={async () => {
                const next = confirmDelivery;
                setConfirmDelivery(null);
                await handleStatusChange(next);
              }}
            >
              {confirmDelivery === "delivering" ? "Confirm →" : "✓ Delivered"}
            </Button>
          </div>
        )}
        <Button variant="outline" className="ml-auto" onClick={() => printOrderReceipt(order)}>🖨️ Print Receipt</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ── MOBILE ORDERS VIEW ────────────────────────────────────────────────────────
// Clean card-based list focused on quick order management for phone use.
function MobileOrdersView({ orders, riders, onStatusChange, onAssignRider, onCancelOrder, toast, initialSelectedOrderId, onClearInitialSelected }) {
  const [tab, setTab]                 = useState("pending");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    if (!initialSelectedOrderId) return;
    setSelectedOrderId(initialSelectedOrderId);
    // Switch to the tab that contains this order
    const order = orders.find(o => o.id === initialSelectedOrderId);
    if (order) {
      if (order.status === "pending") setTab("pending");
      else if (["confirmed","preparing","rider_assigned","delivering"].includes(order.status)) setTab("active");
      else if (order.status === "delivered") setTab("delivered");
      else if (order.status === "cancelled") setTab("cancelled");
    }
    onClearInitialSelected?.();
  }, [initialSelectedOrderId]); // eslint-disable-line

  const TABS = [
    { key: "pending",   label: "New",       emoji: "⏳", filter: (o) => o.status === "pending" },
    { key: "active",    label: "Active",    emoji: "🔄", filter: (o) => ["confirmed","preparing","rider_assigned","delivering"].includes(o.status) },
    { key: "delivered", label: "Done",      emoji: "✅", filter: (o) => o.status === "delivered" && isToday(o) },
    { key: "cancelled", label: "Cancelled", emoji: "❌", filter: (o) => o.status === "cancelled" },
  ];

  const currentTab  = TABS.find((t) => t.key === tab);
  const filtered    = orders.filter(currentTab.filter);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  return (
    <div className="space-y-3">

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          const count = t.key === "pending" ? pendingCount : 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                isActive ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-gray-800 text-gray-400"
              }`}
            >
              {t.emoji} {t.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/25 text-white" : "bg-orange-500 text-white"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">{currentTab.emoji}</div>
          <div className="text-gray-500 text-sm font-medium">No {currentTab.label.toLowerCase()} orders</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const sCfg = STATUS_CONFIG[order.status] || {};
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className="bg-gray-900 border border-white/8 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
              >
                {/* Card header — status colour strip */}
                <div className={`flex items-center justify-between px-4 py-2 ${sCfg.bg} border-b ${sCfg.border}`}>
                  <span className={`text-xs font-bold ${sCfg.color}`}>{sCfg.icon} {sCfg.label}</span>
                  <span className="text-[10px] text-gray-500 font-mono">#{fmtOrder(order)}</span>
                </div>

                {/* Card body */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm">{order.customer || order.customerName}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {(order.items || []).map((i) => `${i.name} ×${i.qty}`).join(", ")}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">📍 {order.address}</div>
                      {order.riderName && (
                        <div className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                          🛵 {order.riderName}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-orange-400 text-lg leading-tight">${order.total}</div>
                      <div className="text-[10px] text-gray-500">{order.time}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{order.payment}</div>
                    </div>
                  </div>

                  {/* Quick action buttons — stop propagation so they don't open modal */}
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold active:scale-95 transition-all"
                        >✅ Confirm</button>
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="w-11 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold active:scale-95 transition-all"
                        >❌</button>
                      </>
                    )}
                    {order.status === "confirmed" && (
                      <button
                        onClick={async () => { await onStatusChange(order.id, "preparing"); toast.success("Kitchen started"); }}
                        className="flex-1 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 text-sm font-bold active:scale-95 transition-all"
                      >👨‍🍳 Start Preparing</button>
                    )}
                    {order.status === "preparing" && (
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="flex-1 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-bold active:scale-95 transition-all"
                      >🛵 Assign Rider →</button>
                    )}
                    {["rider_assigned", "delivering"].includes(order.status) && (
                      <div className="flex-1 py-2 text-center text-xs text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 rounded-xl font-medium">
                        🛵 Rider is handling this
                      </div>
                    )}
                    {["delivered", "cancelled"].includes(order.status) && (
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="flex-1 py-2 rounded-xl bg-gray-800 border border-white/10 text-gray-400 text-sm font-medium"
                      >View Details →</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom-sheet order detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          riders={riders}
          onClose={() => setSelectedOrderId(null)}
          onStatusChange={onStatusChange}
          onAssignRider={onAssignRider}
          onCancel={onCancelOrder}
          toast={toast}
        />
      )}
    </div>
  );
}

export default function OrdersPage({ orders, riders, onStatusChange, onAssignRider, onCancelOrder, toast, isMobile = false, initialSelectedOrderId, onClearInitialSelected }) {
  const [view, setView] = useState("kanban");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Auto-open order from notification click (desktop)
  useEffect(() => {
    if (!initialSelectedOrderId) return;
    setSelectedOrderId(initialSelectedOrderId);
    onClearInitialSelected?.();
  }, [initialSelectedOrderId]); // eslint-disable-line

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  // Mobile: render the focused card view
  if (isMobile) {
    return (
      <MobileOrdersView
        orders={orders}
        riders={riders}
        onStatusChange={onStatusChange}
        onAssignRider={onAssignRider}
        onCancelOrder={onCancelOrder}
        toast={toast}
        initialSelectedOrderId={initialSelectedOrderId}
        onClearInitialSelected={onClearInitialSelected}
      />
    );
  }

  const KANBAN_COLS = ["pending", "confirmed", "preparing", "delivering", "delivered"];

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !q || String(o.orderNumber || "").includes(q) || o.id?.toLowerCase().includes(q) || o.customer?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
          {["kanban", "table"].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === v ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-300"}`}>
              {v === "kanban" ? "📋 Kanban" : "📄 Table"}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search order or customer..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <LiveIndicator label="Real-time" />
          <span className="text-xs text-gray-500">{filtered.length} orders</span>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLS.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const colOrders = filtered.filter((o) => o.status === status && (status !== "delivered" || isToday(o)));
            return (
              <div key={status} className="min-w-[220px] flex-shrink-0">
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${cfg.bg} ${cfg.border} border border-b-0`}>
                  <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon} {cfg.label}{status === "delivered" ? " · Today" : ""}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-900 ${cfg.color}`}>{colOrders.length}</span>
                </div>
                <div className={`border ${cfg.border} border-t-0 rounded-b-xl p-2 space-y-2 min-h-[120px] bg-gray-900/50`}>
                  {colOrders.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className="bg-gray-800 border border-white/8 rounded-xl p-3 cursor-pointer hover:border-orange-500/30 hover:bg-gray-750 transition-all group"
                    >
                      <div className="text-[10px] text-gray-500 font-mono">#{fmtOrder(o)}</div>
                      <div className="text-sm font-semibold text-white mt-1">{o.customer}</div>
                      <div className="text-xs text-gray-500 mt-1 truncate">{(o.items || []).map(i => i.name).join(", ")}</div>
                      {o.riderName && (
                        <div className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                          🛵 {o.riderName}
                          {o.deliveryStep && (
                            <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full capitalize">
                              {o.deliveryStep}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-bold text-orange-400">${o.total}</span>
                        <span className="text-[10px] text-gray-600">{o.time}</span>
                      </div>
                    </div>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="text-center py-6 text-xs text-gray-600">No orders</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === "table" && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Order ID", "Customer", "Items", "Total", "Payment", "Status", "Rider", "Time", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedOrderId(o.id)} className="font-mono text-orange-400 hover:text-orange-300 font-semibold">#{fmtOrder(o)}</button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{o.customer}</div>
                      <div className="text-xs text-gray-500">{o.phone}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="truncate text-gray-400 text-xs">{(o.items || []).map(i => i.name).join(", ")}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">${o.total}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-800 border border-white/10 rounded-lg px-2 py-1 text-gray-300">{o.payment}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} config={STATUS_CONFIG} /></td>
                    <td className="px-4 py-3">
                      <div className="text-cyan-400 text-xs">
                        {o.riderName || <span className="text-gray-600">—</span>}
                        {o.deliveryStep && (
                          <div className="text-[9px] text-cyan-500/70 capitalize mt-0.5">{o.deliveryStep}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{o.time}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(o.id)}>View</Button>
                        {o.status === "pending" && (
                          <Button variant="success" size="sm" onClick={async () => { await onStatusChange(o.id, "confirmed"); toast.success("Order confirmed"); }}>Accept</Button>
                        )}
                        {o.status === "pending" && (
                          <Button variant="danger" size="sm" onClick={async () => { await onCancelOrder(o.id, "Admin cancelled"); toast.success("Order cancelled"); }}>Cancel</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">No orders found</div>
            )}
          </div>
        </Card>
      )}

      {/* Order detail modal — derived from orders[] so it auto-updates on Firestore changes */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          riders={riders}
          onClose={() => setSelectedOrderId(null)}
          onStatusChange={onStatusChange}
          onAssignRider={onAssignRider}
          onCancel={onCancelOrder}
          toast={toast}
        />
      )}
    </div>
  );
}
