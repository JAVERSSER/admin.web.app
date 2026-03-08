// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ConnectivityGate from "./components/ConnectivityGate";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConnectivityGate>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConnectivityGate>
  </React.StrictMode>
);