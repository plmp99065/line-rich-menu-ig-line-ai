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
