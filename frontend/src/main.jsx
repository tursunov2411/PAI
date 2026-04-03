import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const root = ReactDOM.createRoot(document.getElementById("root"));

if (!publishableKey) {
  console.warn("VITE_CLERK_PUBLISHABLE_KEY is not set. Auth flows will not work until it is configured.");

  root.render(
    <React.StrictMode>
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="glass-panel max-w-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-text-primary">Missing Clerk configuration</h1>
          <p className="mt-3 text-sm text-text-muted">
            Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>frontend/.env</code> to
            enable sign-in and protected routes.
          </p>
        </div>
      </div>
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </React.StrictMode>,
  );
}
