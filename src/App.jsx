// src/App.jsx
// ─── ROOT APP — wires all pages, state, Firebase listeners ───────────────────

import { useState, useEffect, useRef } from "react";

// Detect phone-sized screen (< 1024px = no desktop sidebar)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { ToastContainer, useToast, Spinner } from "./components/UI";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import MenuPage from "./pages/MenuPage";
import RidersPage from "./pages/RidersPage";
import CustomersPage from "./pages/CustomersPage";
import ReportsPage from "./pages/ReportsPage";
import { PromotionsPage, LogsPage, HistoryPage, SettingsPage } from "./pages/OtherPages";
import LiveMapPage from "./pages/LiveMapPage";

// ── Firestore service functions ───────────────────────────────────────────────
import {
  subscribeOrders, updateOrderStatus, assignRider, cancelOrder,
  subscribeMenuItems, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability,
  subscribeRiders, approveRider, suspendRider, activateRider,
  subscribeCustomers, blockCustomer, unblockCustomer,
  subscribePromoCodes, addPromoCode, deletePromoCode, togglePromoCode,
  subscribeActivityLogs,
  sendPushNotification,
} from "./services/firestoreService";
import AuthPage from "./pages/AuthPage";

// ── Browser notification helper ───────────────────────────────────────────────
function notifyBrowser(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}

export default function App() {
  const { user, loading } = useAuth();
  const { toasts, toast } = useToast();
  const isMobile = useIsMobile();

  // ── Page routing ──────────────────────────────────────────────────────────
  const [page, setPage] = useState("dashboard");

  // ── App state (populated by real-time Firestore listeners) ──────────────
  const [orders,    setOrders]    = useState([]);
  const [menu,      setMenu]      = useState([]);
  const [riders,    setRiders]    = useState([]);
  const [customers, setCustomers] = useState([]);
  const [promos,    setPromos]    = useState([]);
  const [logs,      setLogs]      = useState([]);

  // In-memory admin notification bell feed
  const [adminNotifs,   setAdminNotifs]   = useState([]);
  const [notifOrderId,  setNotifOrderId]  = useState(null);
  const addAdminNotif = (icon, title, sub, navPage = null, orderId = null) =>
    setAdminNotifs((prev) => [{ id: Date.now(), icon, title, sub, navPage, orderId, unread: true, time: "just now" }, ...prev.slice(0, 29)]);
  const clearAdminNotif = (id) =>
    setAdminNotifs((prev) => prev.map((n) => n.id === id ? { ...n, unread: false } : n));
  const clearAllAdminNotifs = () =>
    setAdminNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));

  // Track order IDs we've already seen so we only notify on genuinely new ones
  const seenOrderIds    = useRef(new Set());
  const initialLoadDone = useRef(false);

  // ── Internet connectivity ─────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Request browser notification permission ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [user]);

  // ── Real-time Firestore listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsubs = [
      subscribeOrders((firestoreOrders) => {
        if (!initialLoadDone.current) {
          // First snapshot: seed seenOrderIds silently — no notifications
          firestoreOrders.forEach((o) => seenOrderIds.current.add(o.id));
          initialLoadDone.current = true;
          setOrders(firestoreOrders);
          return;
        }

        // Detect genuinely new pending orders
        firestoreOrders.forEach((order) => {
          if (!seenOrderIds.current.has(order.id) && order.status === "pending") {
            const name  = order.customer || order.customerName || "A customer";
            const total = `$${Number(order.total || 0).toFixed(2)}`;
            const msg   = `${name} placed a new order — ${total}`;
            toast.success(`🛎️ New Order! ${msg}`);
            notifyBrowser("🛎️ New Order Received!", msg);
            addAdminNotif("📦", "New Order", `${name} · ${total}`, "orders", order.id);
          }
          seenOrderIds.current.add(order.id);
        });

        setOrders(firestoreOrders);
      }),

      subscribeMenuItems((items) => setMenu(items)),
      subscribeRiders((incoming) => {
        setRiders((prev) => {
          // Detect newly-online riders (not on first load)
          if (prev.length > 0) {
            incoming.forEach((r) => {
              const old = prev.find((p) => p.id === r.id);
              if (old && old.status !== "online" && r.status === "online") {
                addAdminNotif("🛵", "Rider Online", `${r.name} is now available`, "riders");
              }
              if (!old && !r.approved) {
                addAdminNotif("🆕", "New Rider", `${r.name} registered — needs approval`, "riders");
              }
            });
          }
          return incoming;
        });
      }),
      subscribeCustomers((c)     => setCustomers(c)),
      subscribePromoCodes((p)    => setPromos(p)),
      subscribeActivityLogs((l)  => setLogs(l)),
    ];

    return () => unsubs.forEach((u) => u());
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values ───────────────────────────────────────────────────────
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  // Status → human-readable push notification text for the customer
  const CUSTOMER_STATUS_MSGS = {
    confirmed:      { title: "Order Confirmed ✅",    body: "Your order has been confirmed and is being processed." },
    preparing:      { title: "Kitchen is Cooking 👨‍🍳", body: "Your order is now being prepared." },
    rider_assigned: { title: "Rider Assigned 🛵",     body: "A delivery rider has been assigned to your order." },
    delivering:     { title: "On the Way! 🚀",         body: "Your order is out for delivery." },
    delivered:      { title: "Order Delivered 🎉",    body: "Your order has been delivered. Enjoy your meal!" },
    cancelled:      { title: "Order Cancelled ❌",    body: "Your order has been cancelled." },
  };

  // ── ORDER handlers (write to Firestore + push notification to customer) ───
  const handleOrderStatusChange = async (orderId, status) => {
    // Capture order BEFORE optimistic update (same object, just the closure reference)
    const order = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    try {
      await updateOrderStatus(orderId, status);
      // Notify the customer via Firestore in-app notification
      const msg = CUSTOMER_STATUS_MSGS[status];
      if (order?.customerId && msg) {
        sendPushNotification(order.customerId, msg.title, msg.body, { orderId, status }).catch(() => {});
      }
      toast.success(`Order status updated to ${status.replace(/_/g, " ")}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update order status");
      // Revert optimistic update on failure
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: order?.status ?? o.status } : o));
    }
  };

  const handleAssignRider = async (orderId, riderId, riderName) => {
    const order = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.map((o) =>
      o.id === orderId ? { ...o, riderId, riderName, status: "rider_assigned" } : o
    ));
    try {
      await assignRider(orderId, riderId, riderName);
      // Notify the assigned rider
      if (riderId) {
        sendPushNotification(
          riderId,
          "New Delivery Assigned 📦",
          `You have been assigned order #${order?.orderNumber || (() => { let n = 0; for (let i = 0; i < orderId.length; i++) n = (n * 31 + orderId.charCodeAt(i)) >>> 0; return (n % 900000) + 100000; })()}. Please accept to proceed.`,
          { orderId }
        ).catch(() => {});
      }
      // Also notify the customer
      if (order?.customerId) {
        sendPushNotification(
          order.customerId,
          "Rider Assigned 🛵",
          `${riderName || "A rider"} has been assigned to your order.`,
          { orderId, status: "rider_assigned" }
        ).catch(() => {});
      }
      toast.success(`Rider ${riderName} assigned successfully`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign rider");
    }
  };

  const handleCancelOrder = async (orderId, reason) => {
    const order = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.map((o) =>
      o.id === orderId ? { ...o, status: "cancelled", cancelReason: reason } : o
    ));
    try {
      await cancelOrder(orderId, reason);
      if (order?.customerId) {
        sendPushNotification(
          order.customerId,
          "Your Order Has Been Cancelled",
          `We're sorry! Your order could not be completed${reason ? ` — ${reason}` : ""}. We apologize for the inconvenience. Please feel free to place a new order anytime. 🙏`,
          { orderId, status: "cancelled" }
        ).catch(() => {});
      }
      toast.success("Order cancelled");
    } catch (e) {
      console.error(e);
      toast.error("Failed to cancel order");
    }
  };

  // ── MENU handlers ─────────────────────────────────────────────────────────
  const handleAddMenuItem = async (data, imageFile) => {
    const newItem = { ...data, id: `M${Date.now()}`, orders: 0 };
    setMenu((prev) => [...prev, newItem]);
    try { await addMenuItem(data, imageFile); } catch (e) { console.error(e); }
  };

  const handleEditMenuItem = async (itemId, data, imageFile) => {
    setMenu((prev) => prev.map((i) => i.id === itemId ? { ...i, ...data } : i));
    try { await updateMenuItem(itemId, data, imageFile); } catch (e) { console.error(e); }
  };

  const handleDeleteMenuItem = async (itemId) => {
    setMenu((prev) => prev.filter((i) => i.id !== itemId));
    try { await deleteMenuItem(itemId); } catch (e) { console.error(e); }
  };

  const handleToggleMenuItem = async (itemId, available) => {
    setMenu((prev) => prev.map((i) => i.id === itemId ? { ...i, available } : i));
    try { await toggleMenuItemAvailability(itemId, available); } catch (e) { console.error(e); }
  };

  // ── RIDER handlers ────────────────────────────────────────────────────────
  const handleApproveRider = async (riderId) => {
    setRiders((prev) => prev.map((r) => r.id === riderId ? { ...r, approved: true } : r));
    try { await approveRider(riderId); } catch (e) { console.error(e); }
  };

  const handleSuspendRider = async (riderId, reason) => {
    setRiders((prev) => prev.map((r) =>
      r.id === riderId ? { ...r, suspended: true, suspendReason: reason, status: "offline" } : r
    ));
    try { await suspendRider(riderId, reason); } catch (e) { console.error(e); }
  };

  const handleActivateRider = async (riderId) => {
    setRiders((prev) => prev.map((r) =>
      r.id === riderId ? { ...r, suspended: false, suspendReason: null } : r
    ));
    try { await activateRider(riderId); } catch (e) { console.error(e); }
  };

  // ── CUSTOMER handlers ─────────────────────────────────────────────────────
  const handleBlockCustomer = async (customerId) => {
    setCustomers((prev) => prev.map((c) => c.id === customerId ? { ...c, blocked: true } : c));
    try { await blockCustomer(customerId); } catch (e) { console.error(e); }
  };

  const handleUnblockCustomer = async (customerId) => {
    setCustomers((prev) => prev.map((c) => c.id === customerId ? { ...c, blocked: false } : c));
    try { await unblockCustomer(customerId); } catch (e) { console.error(e); }
  };

  // ── PROMO handlers ────────────────────────────────────────────────────────
  const handleAddPromo = async (data) => {
    const newPromo = { ...data, id: `P${Date.now()}`, used: 0 };
    setPromos((prev) => [...prev, newPromo]);
    try { await addPromoCode(data); } catch (e) { console.error(e); }
  };

  const handleDeletePromo = async (promoId) => {
    setPromos((prev) => prev.filter((p) => p.id !== promoId));
    try { await deletePromoCode(promoId); } catch (e) { console.error(e); }
  };

  const handleTogglePromo = async (promoId, active) => {
    setPromos((prev) => prev.map((p) => p.id === promoId ? { ...p, active } : p));
    try { await togglePromoCode(promoId, active); } catch (e) { console.error(e); }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isOffline) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-6xl">📶</div>
        <h2 className="text-xl font-black text-white">No Internet Connection</h2>
        <p className="text-gray-500 text-sm">Please check your connection and try again.</p>
        <div className="flex items-center gap-2 text-gray-600 text-xs mt-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />Offline
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col gap-4">
        <div className="text-4xl">🍔</div>
        <Spinner size="lg" />
        <div className="text-gray-500 text-sm">Loading FoodDash...</div>
      </div>
    );
  }

  // ── Not logged in → show login ─────────────────────────────────────────
  if (!user) {
    return (
      <>
        <AuthPage />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // ── Logged in → show admin panel ─────────────────────────────────────────
  const pageProps = { toast };

  const ordersPageProps = {
    orders, riders,
    onStatusChange: handleOrderStatusChange,
    onAssignRider:  handleAssignRider,
    onCancelOrder:  handleCancelOrder,
    isMobile,
    initialSelectedOrderId: notifOrderId,
    onClearInitialSelected: () => setNotifOrderId(null),
    ...pageProps,
  };

  return (
    <Layout
      page={page} setPage={setPage} pendingCount={pendingCount}
      notifications={adminNotifs} onClearNotif={clearAdminNotif} onClearAll={clearAllAdminNotifs}
      onNotifNavigate={(navPage, orderId) => { setPage(navPage); if (orderId) setNotifOrderId(orderId); }}
      toastContainer={<ToastContainer toasts={toasts} />}
      isMobile={isMobile}
    >
      {/* Mobile: always show orders-only view */}
      {isMobile ? (
        <OrdersPage {...ordersPageProps} />
      ) : (
        <>
          {page === "dashboard"  && <DashboardPage  orders={orders} riders={riders} onOrderClick={() => setPage("orders")} setPage={setPage} onStatusChange={handleOrderStatusChange} onAssignRider={handleAssignRider} onCancelOrder={handleCancelOrder} {...pageProps} />}
          {page === "orders"     && <OrdersPage     {...ordersPageProps} />}
          {page === "livemap"    && <LiveMapPage     riders={riders} orders={orders} />}
          {page === "menu"       && <MenuPage        items={menu} onAdd={handleAddMenuItem} onEdit={handleEditMenuItem} onDelete={handleDeleteMenuItem} onToggle={handleToggleMenuItem} {...pageProps} />}
          {page === "riders"     && <RidersPage      riders={riders} onApprove={handleApproveRider} onSuspend={handleSuspendRider} onActivate={handleActivateRider} {...pageProps} />}
          {page === "customers"  && <CustomersPage   customers={customers} orders={orders} onBlock={handleBlockCustomer} onUnblock={handleUnblockCustomer} {...pageProps} />}
          {page === "reports"    && <ReportsPage     orders={orders} riders={riders} {...pageProps} />}
          {page === "promotions" && <PromotionsPage  promos={promos} onAdd={handleAddPromo} onDelete={handleDeletePromo} onToggle={handleTogglePromo} {...pageProps} />}
          {page === "logs"       && <LogsPage        logs={logs} {...pageProps} />}
          {page === "history"    && <HistoryPage     orders={orders} {...pageProps} />}
          {page === "settings"   && <SettingsPage    {...pageProps} />}
        </>
      )}
    </Layout>
  );
}
