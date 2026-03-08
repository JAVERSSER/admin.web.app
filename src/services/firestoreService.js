// src/services/firestoreService.js
// All Firebase Firestore read/write operations

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, getDocs,
  serverTimestamp, getDoc, setDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";

// ─── ORDERS ──────────────────────────────────────────────────────────────────

const tsToMs = (t) => {
  if (!t) return 0;
  if (typeof t === "number") return t;                          // plain Date.now()
  if (typeof t.toMillis === "function") return t.toMillis();   // Firestore Timestamp
  if (typeof t.seconds === "number") return t.seconds * 1000;  // plain {seconds,nanoseconds}
  if (t instanceof Date) return t.getTime();
  return 0;
};

export const subscribeOrders = (callback) => {
  return onSnapshot(collection(db, "orders"), (snap) => {
    const orders = snap.docs
      .map((d) => {
        const data = d.data({ serverTimestamps: "estimate" });
        // placedAt = plain Date.now() added by Customer app (most reliable)
        // fall back through createdAt → updatedAt
        const _ms = tsToMs(data.placedAt)
                 || tsToMs(data.createdAt)
                 || tsToMs(data.updatedAt)
                 || 0;
        return { id: d.id, ...data, _ms };
      })
      .sort((a, b) => b._ms - a._ms);
    callback(orders);
  });
};

export const updateOrderStatus = async (orderId, status, extra = {}) => {
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp(),
    ...extra,
  });
  // Log to order timeline — fire-and-forget so a rules failure never blocks notifications
  addDoc(collection(db, "orderTimeline"), {
    orderId,
    status,
    changedBy: "admin",
    timestamp: serverTimestamp(),
  }).catch(() => {});
};

export const assignRider = async (orderId, riderId, riderName) => {
  await updateDoc(doc(db, "orders", orderId), {
    riderId,
    riderName,
    status: "rider_assigned",
    updatedAt: serverTimestamp(),
  });
};

export const cancelOrder = async (orderId, reason) => {
  await updateDoc(doc(db, "orders", orderId), {
    status: "cancelled",
    cancelReason: reason,
    updatedAt: serverTimestamp(),
  });
};

export const getOrderTimeline = async (orderId) => {
  const q = query(
    collection(db, "orderTimeline"),
    where("orderId", "==", orderId),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── MENU ITEMS ───────────────────────────────────────────────────────────────

export const subscribeMenuItems = (callback) => {
  const q = query(collection(db, "menuItems"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addMenuItem = async (item, imageFile) => {
  let imageUrl = item.imageUrl || "";
  if (imageFile) {
    const imgRef = storageRef(storage, `menuItems/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imgRef, imageFile);
    imageUrl = await getDownloadURL(imgRef);
  }
  return await addDoc(collection(db, "menuItems"), {
    ...item,
    imageUrl,
    available: true,
    createdAt: serverTimestamp(),
  });
};

export const updateMenuItem = async (itemId, data, imageFile) => {
  let imageUrl = data.imageUrl || "";
  if (imageFile) {
    const imgRef = storageRef(storage, `menuItems/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imgRef, imageFile);
    imageUrl = await getDownloadURL(imgRef);
  }
  await updateDoc(doc(db, "menuItems", itemId), {
    ...data,
    ...(imageFile ? { imageUrl } : {}),
    updatedAt: serverTimestamp(),
  });
};

export const deleteMenuItem = async (itemId) => {
  await deleteDoc(doc(db, "menuItems", itemId));
};

export const toggleMenuItemAvailability = async (itemId, available) => {
  await updateDoc(doc(db, "menuItems", itemId), { available });
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export const subscribeCategories = (callback) => {
  const q = query(collection(db, "categories"), orderBy("order"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addCategory = async (name) => {
  await addDoc(collection(db, "categories"), {
    name,
    createdAt: serverTimestamp(),
    order: Date.now(),
  });
};

export const deleteCategory = async (categoryId) => {
  await deleteDoc(doc(db, "categories", categoryId));
};

// ─── RIDERS ───────────────────────────────────────────────────────────────────

export const subscribeRiders = (callback) => {
  const q = query(collection(db, "riders"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const approveRider = async (riderId) => {
  await updateDoc(doc(db, "riders", riderId), {
    approved: true,
    approvedAt: serverTimestamp(),
  });
};

export const suspendRider = async (riderId, reason) => {
  await updateDoc(doc(db, "riders", riderId), {
    suspended: true,
    suspendReason: reason,
    suspendedAt: serverTimestamp(),
  });
};

export const activateRider = async (riderId) => {
  await updateDoc(doc(db, "riders", riderId), {
    suspended: false,
    suspendReason: null,
  });
};

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export const subscribeCustomers = (callback) => {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const blockCustomer = async (customerId) => {
  await updateDoc(doc(db, "users", customerId), { blocked: true });
};

export const unblockCustomer = async (customerId) => {
  await updateDoc(doc(db, "users", customerId), { blocked: false });
};

// ─── PROMO CODES ──────────────────────────────────────────────────────────────

export const subscribePromoCodes = (callback) => {
  const q = query(collection(db, "promoCodes"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addPromoCode = async (promo) => {
  await addDoc(collection(db, "promoCodes"), {
    ...promo,
    used: 0,
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const deletePromoCode = async (promoId) => {
  await deleteDoc(doc(db, "promoCodes", promoId));
};

export const togglePromoCode = async (promoId, active) => {
  await updateDoc(doc(db, "promoCodes", promoId), { active });
};

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

export const subscribeActivityLogs = (callback) => {
  const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const addActivityLog = async (action, detail, type, adminName) => {
  await addDoc(collection(db, "activityLogs"), {
    action,
    detail,
    type,
    adminName,
    timestamp: serverTimestamp(),
  });
};

// ─── SHOP SETTINGS ────────────────────────────────────────────────────────────

export const getShopSettings = async (shopId = "default") => {
  const snap = await getDoc(doc(db, "settings", shopId));
  return snap.exists() ? snap.data() : null;
};

export const subscribeShopSettings = (callback, shopId = "default") => {
  return onSnapshot(doc(db, "settings", shopId), (snap) => {
    callback(snap.exists() ? { id: shopId, ...snap.data() } : null);
  });
};

export const saveShopSettings = async (data, shopId = "default") => {
  await setDoc(doc(db, "settings", shopId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const getDailyReport = async (date) => {
  const snap = await getDoc(doc(db, "reports", date));
  return snap.exists() ? snap.data() : null;
};

export const getOrdersForDateRange = async (startDate, endDate) => {
  const q = query(
    collection(db, "orders"),
    where("createdAt", ">=", startDate),
    where("createdAt", "<=", endDate),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── UNIVERSAL FILE UPLOAD ────────────────────────────────────────────────────
// Supports: images, audio, video, PDF, Word (.doc/.docx), and any other file.
// Files are organized into subfolders by type under the given basePath.
// Returns: { url, path, name, size, type, mimeType }

const FILE_TYPE_MAP = {
  // Images
  "image/jpeg":       "images",
  "image/png":        "images",
  "image/webp":       "images",
  "image/gif":        "images",
  "image/svg+xml":    "images",
  // Audio
  "audio/mpeg":       "audio",
  "audio/mp4":        "audio",
  "audio/ogg":        "audio",
  "audio/wav":        "audio",
  "audio/webm":       "audio",
  // Video
  "video/mp4":        "video",
  "video/webm":       "video",
  "video/ogg":        "video",
  "video/quicktime":  "video",
  // Documents
  "application/pdf":                                                      "documents",
  "application/msword":                                                   "documents",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documents",
  "application/vnd.ms-excel":                                             "documents",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":   "documents",
};

const MAX_FILE_SIZES = {
  images:    10 * 1024 * 1024,  // 10 MB
  audio:     50 * 1024 * 1024,  // 50 MB
  video:    200 * 1024 * 1024,  // 200 MB
  documents: 20 * 1024 * 1024,  // 20 MB
  other:     20 * 1024 * 1024,  // 20 MB
};

export const uploadFile = async (file, basePath = "uploads") => {
  const mimeType   = file.type || "application/octet-stream";
  const folder     = FILE_TYPE_MAP[mimeType] || "other";
  const maxSize    = MAX_FILE_SIZES[folder];

  if (file.size > maxSize) {
    const mb = (maxSize / 1024 / 1024).toFixed(0);
    throw new Error(`File too large. Maximum size for ${folder} is ${mb} MB.`);
  }

  const ext       = file.name.split(".").pop();
  const safeName  = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath  = `${basePath}/${folder}/${safeName}`;
  const fileRef   = storageRef(storage, filePath);

  await uploadBytes(fileRef, file, { contentType: mimeType });
  const url = await getDownloadURL(fileRef);

  return {
    url,
    path:     filePath,
    name:     file.name,
    size:     file.size,
    type:     folder,           // "images" | "audio" | "video" | "documents" | "other"
    mimeType,
    ext,
  };
};

// Delete a file from Firebase Storage by its full storage path
export const deleteFile = async (filePath) => {
  if (!filePath) return;
  try {
    await deleteObject(storageRef(storage, filePath));
  } catch (_) { /* ignore if already deleted */ }
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const sendPushNotification = async (userId, title, body, data = {}) => {
  await addDoc(collection(db, "notifications", userId, "messages"), {
    title,
    body,
    data,
    isRead: false,
    createdAt: serverTimestamp(),
  });
};

// ─── RIDER DOC SUBSCRIPTION ───────────────────────────────────────────────────
// Subscribe to a single rider document — used by admin to watch live GPS (lat/lng).
export const subscribeRiderDoc = (riderId, callback) => {
  return onSnapshot(doc(db, "riders", riderId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
};