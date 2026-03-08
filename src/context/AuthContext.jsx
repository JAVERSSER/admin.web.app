// src/context/AuthContext.jsx
// Real Firebase Auth — no demo mode

import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext(null);

const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email":        "Invalid email address.",
  "auth/user-not-found":       "No account found with this email.",
  "auth/wrong-password":       "Incorrect password.",
  "auth/invalid-credential":   "Invalid email or password.",
  "auth/too-many-requests":    "Too many failed attempts. Please try again later.",
  "auth/user-disabled":        "This account has been disabled. Contact support.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password":        "Password must be at least 6 characters.",
};

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, "admins", firebaseUser.uid));
          setAdminData(
            snap.exists()
              ? snap.data()
              : { name: firebaseUser.displayName || "Admin", role: "owner", shopName: "" }
          );
        } catch {
          setAdminData({ name: "Admin", role: "owner", shopName: "" });
        }
      } else {
        setUser(null);
        setAdminData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      return true;
    } catch (err) {
      setError(AUTH_ERROR_MESSAGES[err.code] || "Login failed. Please try again.");
      return false;
    }
  };

  // Register a new admin — creates Firebase Auth account + Firestore profile
  const register = async (email, password, profile) => {
    setError("");
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      await setDoc(doc(db, "admins", newUser.uid), {
        name:      profile.name.trim(),
        email:     email.trim().toLowerCase(),
        role:      profile.role || "manager",
        phone:     profile.phone?.trim() || "",
        shopName:  profile.shopName?.trim() || "",
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      setError(AUTH_ERROR_MESSAGES[err.code] || "Registration failed. Please try again.");
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email) => {
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (err) {
      setError(AUTH_ERROR_MESSAGES[err.code] || "Failed to send reset email.");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, adminData, loading, error, setError, login, register, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
