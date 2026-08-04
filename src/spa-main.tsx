import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./components/app-shell";
import "./app/globals.css";
import "./app/browser-fixes.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  });
}
