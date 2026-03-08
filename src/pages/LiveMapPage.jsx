// src/pages/LiveMapPage.jsx
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MOCK_RIDERS, MOCK_ORDERS, RIDER_STATUS_CONFIG, STATUS_CONFIG } from "../utils/mockData";

// ── Demo coordinates (Phnom Penh) ──────────────────────────────────────────────
// 🔥 In production: read lat/lng from Firestore riders/{id} and orders/{id}
const RESTAURANT_POS = [11.5564, 104.9282];

const RIDER_DEMO_COORDS = {
  R001: [11.5620, 104.9150],
  R002: [11.5530, 104.9310],
  R003: [11.5590, 104.9240],
  R004: [11.5500, 104.9200],
  R005: [11.5660, 104.9340],
};

const ORDER_DEMO_COORDS = {
  "ORD-1001": [11.5710, 104.9185],
  "ORD-1002": [11.5615, 104.9198],
  "ORD-1003": [11.5520, 104.9330],
  "ORD-1004": [11.5665, 104.9258],
  "ORD-1007": [11.5640, 104.9310],
  "ORD-1008": [11.5570, 104.9220],
};

// ── Icon factory ───────────────────────────────────────────────────────────────
function makeIcon(emoji, bg, pulse = false) {
  const ring = pulse
    ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid ${bg};opacity:.5;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>`
    : "";
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:36px;">
      ${ring}
      <div style="background:${bg};width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:17px;">${emoji}</div>
    </div>`,
    className: "",
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
    popupAnchor:[0, -22],
  });
}

function riderColor(status) {
  if (status === "online")     return "#10b981";
  if (status === "delivering") return "#0ea5e9";
  return "#6b7280";
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, colorClass }) {
  return (
    <div className="bg-gray-800 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colorClass}`}>{icon}</div>
      <div>
        <div className="text-2xl font-black text-white leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ── Rider detail side panel ────────────────────────────────────────────────────
function RiderPanel({ rider, orders, onClose }) {
  const currentOrder = orders.find(
    (o) => o.riderId === rider.id && !["delivered", "cancelled"].includes(o.status)
  );
  const cfg = RIDER_STATUS_CONFIG[rider.status] || {};

  return (
    <div className="bg-gray-800 border border-white/8 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="font-bold text-white text-sm">Rider Details</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
      </div>

      <div className="p-4 space-y-4">
        {/* Rider info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-orange-500/30">
            {rider.name[0]}
          </div>
          <div>
            <div className="font-bold text-white">{rider.name}</div>
            <div className="text-xs text-gray-400">{rider.phone}</div>
            <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${rider.status !== "offline" ? "animate-pulse" : ""}`} />
              {cfg.label}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Rating",     value: `${rider.rating}★` },
            { label: "Deliveries", value: rider.deliveries   },
            { label: "Today $",    value: `$${rider.earnings}` },
          ].map((s) => (
            <div key={s.label} className="bg-gray-700/50 rounded-xl p-2 text-center">
              <div className="font-bold text-white text-sm">{s.value}</div>
              <div className="text-[10px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Current order */}
        {currentOrder ? (
          <div className="bg-gray-700/50 rounded-xl p-3 space-y-2">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Current Order</div>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">{currentOrder.id}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[currentOrder.status]?.bg} ${STATUS_CONFIG[currentOrder.status]?.color}`}>
                {STATUS_CONFIG[currentOrder.status]?.label}
              </span>
            </div>
            <div className="text-xs text-gray-300">{currentOrder.customer}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span>📍</span>{currentOrder.address}
            </div>
            <div className="text-xs text-gray-400">
              {currentOrder.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
            </div>
            <div className="font-bold text-orange-400 text-sm">${currentOrder.total.toFixed(2)}</div>
          </div>
        ) : (
          <div className="bg-gray-700/30 rounded-xl p-3 text-center">
            <div className="text-gray-500 text-xs">No active order</div>
          </div>
        )}

        {/* Vehicle */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>🏍️</span>
          <span>{rider.vehicle}{rider.plateNo !== "—" ? ` · ${rider.plateNo}` : ""}</span>
        </div>
      </div>
    </div>
  );
}

// ── Rider list (default sidebar state) ────────────────────────────────────────
function RiderListPanel({ riders, orders, onSelect }) {
  return (
    <div className="bg-gray-800 border border-white/8 rounded-2xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-white/8">
        <span className="font-bold text-white text-sm">All Riders</span>
        <span className="ml-2 text-xs text-gray-500">click to inspect</span>
      </div>
      <div className="overflow-y-auto flex-1">
        {riders.map((rider) => {
          const cfg = RIDER_STATUS_CONFIG[rider.status] || {};
          const hasOrder = orders.some(
            (o) => o.riderId === rider.id && !["delivered", "cancelled"].includes(o.status)
          );
          return (
            <button
              key={rider.id}
              onClick={() => onSelect(rider)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 text-left transition-colors"
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${rider.status !== "offline" ? "animate-pulse" : ""}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{rider.name}</div>
                <div className={`text-xs ${cfg.color}`}>{cfg.label}</div>
              </div>
              {hasOrder && (
                <span className="text-[10px] bg-sky-500/20 text-sky-400 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                  ON DELIVERY
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LiveMapPage({ riders = MOCK_RIDERS, orders = MOCK_ORDERS }) {
  const containerRef   = useRef(null);
  const mapRef         = useRef(null);
  const [selectedRider, setSelectedRider] = useState(null);

  const activeOrders  = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const onlineRiders  = riders.filter((r) => r.status !== "offline");
  const deliveringNow = riders.filter((r) => r.status === "delivering");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Inject the pulse keyframe once
    if (!document.getElementById("lm-ping-style")) {
      const style = document.createElement("style");
      style.id = "lm-ping-style";
      style.textContent = "@keyframes ping{75%,100%{transform:scale(2);opacity:0}}";
      document.head.appendChild(style);
    }

    const map = L.map(containerRef.current, { attributionControl: false, zoomControl: true })
      .setView(RESTAURANT_POS, 14);
    mapRef.current = map;

    // Dark CartoDB tile layer — matches admin dark theme
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Restaurant marker
    L.marker(RESTAURANT_POS, { icon: makeIcon("🏪", "#f97316", false) })
      .addTo(map)
      .bindPopup("<b>🍔 FoodDash Restaurant</b><br>Home base");

    // Rider markers
    riders.forEach((rider) => {
      const coords = RIDER_DEMO_COORDS[rider.id];
      if (!coords) return;
      const color = riderColor(rider.status);
      const pulse = rider.status === "delivering";

      L.marker(coords, { icon: makeIcon("🛵", color, pulse) })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:150px;padding:2px 0;">
            <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${rider.name}</div>
            <div style="color:#9ca3af;font-size:11px;">⭐ ${rider.rating} · 📦 ${rider.deliveries}</div>
            <div style="color:${color};font-size:11px;margin-top:3px;font-weight:600;">● ${rider.status}</div>
          </div>`
        )
        .on("click", () => setSelectedRider(rider));
    });

    // Active-order delivery destination markers
    activeOrders.forEach((order) => {
      const coords = ORDER_DEMO_COORDS[order.id];
      if (!coords) return;
      L.marker(coords, { icon: makeIcon("📦", "#f59e0b", false) })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;min-width:150px;padding:2px 0;">
            <div style="font-weight:700;font-size:13px;">${order.id}</div>
            <div style="color:#9ca3af;font-size:11px;">${order.customer}</div>
            <div style="color:#9ca3af;font-size:11px;margin-top:2px;">📍 ${order.address}</div>
          </div>`
        );
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Online Riders"  value={onlineRiders.length}  icon="🛵" colorClass="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Active Orders"  value={activeOrders.length}  icon="📦" colorClass="bg-amber-500/10  text-amber-400"   />
        <StatCard label="Delivering Now" value={deliveringNow.length} icon="🚀" colorClass="bg-sky-500/10    text-sky-400"     />
        <StatCard label="Pending"        value={orders.filter(o => o.status === "pending").length} icon="⏳" colorClass="bg-orange-500/10 text-orange-400" />
      </div>

      {/* Map + sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex-1 rounded-2xl overflow-hidden border border-white/8 min-h-[460px]">
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Online rider</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Delivering (pulsing)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /> Offline</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Order drop-off</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Restaurant</span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {selectedRider ? (
            <RiderPanel
              rider={selectedRider}
              orders={orders}
              onClose={() => setSelectedRider(null)}
            />
          ) : (
            <RiderListPanel riders={riders} orders={orders} onSelect={setSelectedRider} />
          )}
        </div>
      </div>
    </div>
  );
}
