import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import "./App.css";

const pathname = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
const RootComponent = pathname === "/diagnostics" ? DiagnosticsPage : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RootComponent />
    </ErrorBoundary>
  </React.StrictMode>
);
