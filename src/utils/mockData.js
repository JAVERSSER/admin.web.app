// src/utils/mockData.js
// Used as fallback / demo data when Firebase is not yet connected

export const MOCK_ORDERS = [
  { id: "ORD-1001", customer: "Sophea Meas", phone: "012 345 678", items: [{ name: "Beef Burger", qty: 2, price: 7.5 }, { name: "French Fries", qty: 1, price: 3.0 }], total: 18.0, status: "pending", riderId: null, riderName: null, address: "St. 271, Phnom Penh", time: "10:32 AM", payment: "Cash", createdAt: new Date() },
  { id: "ORD-1002", customer: "Dara Keo", phone: "096 123 456", items: [{ name: "Pad Thai", qty: 1, price: 6.0 }, { name: "Spring Roll", qty: 3, price: 2.0 }], total: 12.0, status: "confirmed", riderId: "R001", riderName: "Visal Sok", address: "BKK1, Phnom Penh", time: "10:28 AM", payment: "Card", createdAt: new Date() },
  { id: "ORD-1003", customer: "Maly Chan", phone: "077 654 321", items: [{ name: "Pizza Margherita", qty: 1, price: 9.5 }], total: 9.5, status: "preparing", riderId: "R002", riderName: "Ratanak Lim", address: "Toul Kork, Phnom Penh", time: "10:20 AM", payment: "Card", createdAt: new Date() },
  { id: "ORD-1004", customer: "Borey Pich", phone: "085 987 654", items: [{ name: "Fried Rice", qty: 2, price: 5.0 }, { name: "Coke", qty: 2, price: 1.5 }], total: 13.0, status: "delivering", riderId: "R003", riderName: "Phearum Ny", address: "Daun Penh, Phnom Penh", time: "10:05 AM", payment: "Cash", createdAt: new Date() },
  { id: "ORD-1005", customer: "Sreyleak Heng", phone: "089 111 222", items: [{ name: "Noodle Soup", qty: 1, price: 4.5 }, { name: "Orange Juice", qty: 1, price: 3.0 }], total: 7.5, status: "delivered", riderId: "R001", riderName: "Visal Sok", address: "Sen Sok, Phnom Penh", time: "09:50 AM", payment: "Wallet", createdAt: new Date() },
  { id: "ORD-1006", customer: "Kimhak Sorn", phone: "012 777 888", items: [{ name: "BBQ Chicken", qty: 1, price: 8.0 }, { name: "Steamed Rice", qty: 2, price: 1.5 }], total: 11.0, status: "cancelled", riderId: null, riderName: null, address: "Mean Chey, Phnom Penh", time: "09:40 AM", payment: "Cash", createdAt: new Date() },
  { id: "ORD-1007", customer: "Channary Ros", phone: "097 333 444", items: [{ name: "Sushi Set", qty: 1, price: 12.0 }, { name: "Miso Soup", qty: 1, price: 2.0 }], total: 14.0, status: "pending", riderId: null, riderName: null, address: "Chamkarmon, Phnom Penh", time: "10:35 AM", payment: "Card", createdAt: new Date() },
  { id: "ORD-1008", customer: "Piseth Tan", phone: "078 555 666", items: [{ name: "Beef Steak", qty: 1, price: 18.0 }, { name: "Caesar Salad", qty: 1, price: 6.5 }], total: 24.5, status: "confirmed", riderId: null, riderName: null, address: "7 Makara, Phnom Penh", time: "10:38 AM", payment: "Card", createdAt: new Date() },
];

export const MOCK_RIDERS = [
  { id: "R001", name: "Visal Sok", phone: "012 111 222", email: "visal@rider.com", status: "online", approved: true, suspended: false, rating: 4.8, deliveries: 142, earnings: 85.5, vehicle: "Motorbike", plateNo: "2A-1234", joined: "Jan 2024" },
  { id: "R002", name: "Ratanak Lim", phone: "096 333 444", email: "ratanak@rider.com", status: "delivering", approved: true, suspended: false, rating: 4.6, deliveries: 98, earnings: 62.0, vehicle: "Motorbike", plateNo: "3B-5678", joined: "Mar 2024" },
  { id: "R003", name: "Phearum Ny", phone: "077 555 666", email: "phearum@rider.com", status: "delivering", approved: true, suspended: false, rating: 4.9, deliveries: 210, earnings: 110.0, vehicle: "Bicycle", plateNo: "—", joined: "Nov 2023" },
  { id: "R004", name: "Sokha Vin", phone: "085 777 888", email: "sokha@rider.com", status: "offline", approved: true, suspended: false, rating: 4.3, deliveries: 55, earnings: 30.0, vehicle: "Motorbike", plateNo: "1C-9012", joined: "May 2024" },
  { id: "R005", name: "Dina Phal", phone: "089 999 000", email: "dina@rider.com", status: "online", approved: false, suspended: false, rating: 0, deliveries: 0, earnings: 0, vehicle: "Motorbike", plateNo: "4D-3456", joined: "Feb 2025" },
];

export const MOCK_MENU = [
  { id: "M001", name: "Beef Burger", category: "Burgers", price: 7.5, available: true, emoji: "🍔", description: "Juicy beef patty with lettuce, tomato & cheese", orders: 234 },
  { id: "M002", name: "Pad Thai", category: "Noodles", price: 6.0, available: true, emoji: "🍜", description: "Classic Thai rice noodles with egg & peanuts", orders: 189 },
  { id: "M003", name: "Pizza Margherita", category: "Pizza", price: 9.5, available: true, emoji: "🍕", description: "Fresh tomato, mozzarella and basil", orders: 156 },
  { id: "M004", name: "Fried Rice", category: "Rice", price: 5.0, available: false, emoji: "🍚", description: "Wok-fried jasmine rice with vegetables", orders: 201 },
  { id: "M005", name: "Noodle Soup", category: "Noodles", price: 4.5, available: true, emoji: "🍲", description: "Slow-cooked bone broth with flat noodles", orders: 167 },
  { id: "M006", name: "BBQ Chicken", category: "Grills", price: 8.0, available: true, emoji: "🍗", description: "Char-grilled chicken with homemade BBQ sauce", orders: 143 },
  { id: "M007", name: "Sushi Set", category: "Japanese", price: 12.0, available: true, emoji: "🍱", description: "10-piece assorted fresh sushi", orders: 98 },
  { id: "M008", name: "Caesar Salad", category: "Salads", price: 6.5, available: false, emoji: "🥗", description: "Romaine, croutons, parmesan & caesar dressing", orders: 87 },
];

export const MOCK_CUSTOMERS = [
  { id: "C001", name: "Sophea Meas", email: "sophea@gmail.com", phone: "012 345 678", orders: 12, spent: 145.5, joined: "Feb 2024", blocked: false },
  { id: "C002", name: "Dara Keo", email: "dara@gmail.com", phone: "096 123 456", orders: 8, spent: 89.0, joined: "Mar 2024", blocked: false },
  { id: "C003", name: "Maly Chan", email: "maly@gmail.com", phone: "077 654 321", orders: 25, spent: 287.0, joined: "Jan 2024", blocked: false },
  { id: "C004", name: "Borey Pich", email: "borey@gmail.com", phone: "085 987 654", orders: 3, spent: 32.0, joined: "May 2024", blocked: false },
  { id: "C005", name: "Sreyleak Heng", email: "sreyleak@gmail.com", phone: "089 111 222", orders: 18, spent: 198.0, joined: "Jan 2024", blocked: true },
];

export const MOCK_PROMOS = [
  { id: "P001", code: "SAVE20", type: "percent", value: 20, used: 45, maxUse: 100, expiry: "2026-03-31", minOrder: 10, active: true },
  { id: "P002", code: "FREEDEL", type: "free_delivery", value: 0, used: 120, maxUse: 200, expiry: "2026-03-15", minOrder: 0, active: true },
  { id: "P003", code: "WELCOME5", type: "fixed", value: 5, used: 200, maxUse: 200, expiry: "2026-02-28", minOrder: 5, active: false },
];

export const MOCK_LOGS = [
  { id: 1, adminName: "Admin John", action: "Updated item price", detail: "Beef Burger: $6.50 → $7.50", type: "menu", timestamp: { toDate: () => new Date() } },
  { id: 2, adminName: "Admin Sarah", action: "Assigned rider", detail: "ORD-1002 → Visal Sok", type: "order", timestamp: { toDate: () => new Date() } },
  { id: 3, adminName: "Admin John", action: "Added new menu item", detail: "Sushi Set added to Japanese", type: "menu", timestamp: { toDate: () => new Date() } },
  { id: 4, adminName: "System", action: "Auto-assigned rider", detail: "ORD-1003 → Ratanak Lim", type: "system", timestamp: { toDate: () => new Date() } },
  { id: 5, adminName: "Admin Sarah", action: "Cancelled order", detail: "ORD-1006 — Customer request", type: "order", timestamp: { toDate: () => new Date() } },
  { id: 6, adminName: "Admin John", action: "Approved rider", detail: "Dina Phal — application approved", type: "rider", timestamp: { toDate: () => new Date() } },
  { id: 7, adminName: "System", action: "Daily report generated", detail: "Feb 27 summary created", type: "system", timestamp: { toDate: () => new Date() } },
];

export const SALES_DATA = [
  { day: "Mon", revenue: 320, orders: 42 },
  { day: "Tue", revenue: 280, orders: 38 },
  { day: "Wed", revenue: 410, orders: 55 },
  { day: "Thu", revenue: 390, orders: 51 },
  { day: "Fri", revenue: 520, orders: 68 },
  { day: "Sat", revenue: 640, orders: 84 },
  { day: "Sun", revenue: 580, orders: 76 },
];

export const STATUS_CONFIG = {
  pending:       { label: "Pending",       color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/30",  dot: "bg-amber-400",   icon: "⏳", next: "confirmed"  },
  confirmed:     { label: "Confirmed",     color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/30",   dot: "bg-blue-400",    icon: "✅", next: "preparing"  },
  preparing:     { label: "Preparing",     color: "text-violet-400",  bg: "bg-violet-400/10",  border: "border-violet-400/30", dot: "bg-violet-400",  icon: "👨‍🍳", next: "delivering" },
  rider_assigned:{ label: "Rider Assigned",color: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/30",   dot: "bg-cyan-400",    icon: "🛵", next: "delivering" },
  delivering:    { label: "On the Way",    color: "text-sky-400",     bg: "bg-sky-400/10",     border: "border-sky-400/30",    dot: "bg-sky-400",     icon: "🛵", next: "delivered"  },
  delivered:     { label: "Delivered",     color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30",dot: "bg-emerald-400", icon: "🎉", next: null         },
  cancelled:     { label: "Cancelled",     color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/30",    dot: "bg-red-400",     icon: "❌", next: null         },
};

export const RIDER_STATUS_CONFIG = {
  online:     { label: "Online",     color: "text-emerald-400", dot: "bg-emerald-400" },
  offline:    { label: "Offline",    color: "text-gray-500",    dot: "bg-gray-500"    },
  delivering: { label: "Delivering", color: "text-sky-400",     dot: "bg-sky-400"     },
};

export const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",      icon: "📊", section: "main"     },
  { id: "orders",      label: "Orders",         icon: "📦", section: "main"     },
  { id: "livemap",     label: "Live Map",       icon: "🗺️", section: "main"     },
  { id: "menu",        label: "Menu",           icon: "🍔", section: "main"     },
  { id: "riders",      label: "Riders",         icon: "🛵", section: "people"   },
  { id: "customers",   label: "Customers",      icon: "👥", section: "people"   },
  { id: "reports",     label: "Reports",        icon: "📈", section: "insights" },
  { id: "promotions",  label: "Promotions",     icon: "🏷️", section: "insights" },
  { id: "logs",        label: "Activity Logs",  icon: "📋", section: "insights" },
  { id: "history",     label: "Order History",  icon: "🕐", section: "insights" },
  { id: "settings",    label: "Settings",       icon: "⚙️", section: "system"   },
];