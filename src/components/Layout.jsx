// src/components/Layout.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { NAV_ITEMS } from "../utils/mockData";
import { LiveIndicator } from "./UI";

const SECTIONS = [
  { id: "main",     label: "Main"     },
  { id: "people",   label: "People"   },
  { id: "insights", label: "Insights" },
  { id: "system",   label: "System"   },
];

export default function Layout({
  page, setPage, pendingCount, children, toastContainer,
  notifications = [], onClearNotif, onClearAll, onNotifNavigate,
  isMobile = false,
}) {
  const { adminData, logout } = useAuth();
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [showNotif,    setShowNotif]    = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount  = notifications.filter((n) => n.unread).length;
  const closeSidebar = () => setSidebarOpen(false);

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") closeSidebar(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setShowNotif(false); setShowUserMenu(false); };
    if (showNotif || showUserMenu) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showNotif, showUserMenu]);

  const navTo = (id) => { setPage(id); closeSidebar(); };

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  // Phone: a focused, minimal header + orders only. No sidebar, no nav.
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-950 font-body flex flex-col">

        {/* Minimal mobile header */}
        <header className="h-14 bg-gray-900 border-b border-white/8 flex items-center px-4 gap-3 flex-shrink-0 sticky top-0 z-30">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-base shadow-lg shadow-orange-500/20">🍔</div>
            <div>
              <div className="text-sm font-black text-white font-display leading-tight">FoodDash</div>
              <div className="text-[9px] text-orange-400 font-bold uppercase tracking-widest leading-tight">{page === "reports" ? "Reports" : "Orders"}</div>
            </div>
          </div>

          <LiveIndicator />

          {/* Pending badge */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-orange-400">{pendingCount} new</span>
            </div>
          )}

          {/* Notifications */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowNotif(!showNotif); setShowUserMenu(false); }}
              className="relative w-9 h-9 bg-gray-800 border border-white/10 rounded-xl flex items-center justify-center text-base hover:bg-gray-700 transition-colors"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute top-12 right-0 w-72 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                  <span className="font-semibold text-white text-sm">Notifications</span>
                  <button className="text-xs text-orange-400" onClick={() => onClearAll?.()}>Mark all read</button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">No notifications</div>
                  ) : notifications.map((n) => (
                    <div key={n.id} onClick={() => { onClearNotif?.(n.id); setShowNotif(false); if (n.navPage) onNotifNavigate?.(n.navPage, n.orderId); }}
                      className={`flex gap-3 px-4 py-3 cursor-pointer border-b border-white/5 last:border-0 ${n.unread ? "bg-orange-500/5" : ""} hover:bg-white/5 active:bg-white/10 transition-colors`}>
                      <span className="text-xl mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{n.title}</div>
                        <div className="text-xs text-gray-400 truncate">{n.sub}</div>
                      </div>
                      {n.unread && <span className="w-2 h-2 bg-orange-500 rounded-full mt-2" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User avatar + logout */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotif(false); }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-sm font-bold text-white"
            >
              {(adminData?.name || "A")[0]}
            </button>
            {showUserMenu && (
              <div className="absolute top-12 right-0 w-44 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="text-sm font-semibold text-white truncate">{adminData?.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{adminData?.role}</div>
                </div>
                <button onClick={() => { navTo(page === "reports" ? "orders" : "reports"); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                  {page === "reports" ? "📦 Admin Panel" : "📊 Report"}
                </button>
                <div className="border-t border-white/8" />
                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/5 transition-colors">
                  ⏻ Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content — just orders */}
        <div className="flex-1 overflow-y-auto p-3">
          {children}
        </div>

        {toastContainer}
      </div>
    );
  }

  // ── DESKTOP / TABLET LAYOUT ─────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-950 font-body overflow-hidden">

      {/* Sidebar overlay on tablet */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 xl:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        w-60 bg-gray-900 border-r border-white/8
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        xl:static xl:translate-x-0 xl:min-w-[240px] xl:z-auto
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-orange-500/30">🍔</div>
            <div>
              <div className="text-base font-black text-white font-display">FoodDash</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Admin Panel</div>
            </div>
          </div>
          <button onClick={closeSidebar} className="xl:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {SECTIONS.map((section) => {
            const items = NAV_ITEMS.filter((n) => n.section === section.id);
            if (!items.length) return null;
            return (
              <div key={section.id}>
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">{section.label}</div>
                {items.map((item) => {
                  const isActive = page === item.id;
                  const badge    = item.id === "orders" ? pendingCount : 0;
                  return (
                    <button key={item.id} onClick={() => navTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 relative text-left ${
                        isActive ? "bg-orange-500/10 text-orange-400" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                      }`}
                    >
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-orange-500 rounded-r-full" />}
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(adminData?.name || "A")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{adminData?.name || "Admin"}</div>
              <div className="text-xs text-gray-500 capitalize">{adminData?.role || "owner"}</div>
            </div>
            <button onClick={logout} title="Sign out" className="text-gray-500 hover:text-red-400 text-sm transition-colors flex-shrink-0">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-gray-900 border-b border-white/8 flex items-center px-4 xl:px-6 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden w-9 h-9 bg-gray-800 border border-white/10 rounded-xl flex items-center justify-center text-lg text-gray-400 hover:text-white transition-colors"
          >☰</button>

          <h1 className="text-base xl:text-lg font-bold text-white font-display flex-1 truncate">
            <span className="mr-1.5">{NAV_ITEMS.find((n) => n.id === page)?.icon}</span>
            {NAV_ITEMS.find((n) => n.id === page)?.label}
          </h1>

          <LiveIndicator />

          {/* Notifications */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowNotif(!showNotif); setShowUserMenu(false); }}
              className="relative w-9 h-9 bg-gray-800 border border-white/10 rounded-xl flex items-center justify-center text-base hover:bg-gray-700 transition-colors">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute top-12 right-0 w-80 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                  <span className="font-semibold text-white text-sm">Notifications</span>
                  <button className="text-xs text-orange-400 hover:text-orange-300" onClick={() => onClearAll?.()}>Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No notifications yet</div>
                  ) : notifications.map((n) => (
                    <div key={n.id} onClick={() => { onClearNotif?.(n.id); setShowNotif(false); if (n.navPage) onNotifNavigate?.(n.navPage, n.orderId); }}
                      className={`flex gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors ${n.unread ? "bg-orange-500/5" : ""}`}>
                      <span className="text-xl mt-0.5 flex-shrink-0">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{n.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{n.sub}</div>
                        <div className="text-xs text-gray-600 mt-1">{n.time}</div>
                      </div>
                      {n.unread && <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotif(false); }}
              className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 bg-gray-800 border border-white/10 rounded-xl hover:bg-gray-700 transition-colors">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                {(adminData?.name || "A")[0]}
              </div>
              <span className="hidden sm:block text-sm text-white font-medium">{adminData?.name?.split(" ")[0] || "Admin"}</span>
              <span className="text-gray-500 text-xs">▾</span>
            </button>
            {showUserMenu && (
              <div className="absolute top-12 right-0 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => { navTo("settings"); setShowUserMenu(false); }}>⚙️ Settings</button>
                <div className="border-t border-white/8" />
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/5 transition-colors" onClick={logout}>⏻ Sign Out</button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 xl:p-6">
          {children}
        </div>
      </main>

      {toastContainer}
    </div>
  );
}
