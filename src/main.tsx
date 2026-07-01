import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}

// Auto-recover from stale-deploy chunk errors instead of showing an error page.
// Whenever a new deploy replaces the old content-hashed asset files, a browser
// tab that's still running the previous build can fail to lazy-load a route
// chunk by its old filename (404 — the file no longer exists). Vite fires
// "vite:preloadError" for exactly this case; a single forced reload fetches
// the current index.html and the matching new chunks. Guarded with a
// sessionStorage flag so a genuine, persistent failure doesn't reload-loop.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const key = "legacynest.reloadedForChunkError";
  if (sessionStorage.getItem(key)) return; // already tried once this session — let the error boundary show
  sessionStorage.setItem(key, "1");
  window.location.reload();
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

// The app rendered successfully — clear the guard a few seconds later so a
// distinct chunk error from a later deploy (still within the same tab
// session) can also trigger one more auto-reload, rather than being
// permanently blocked by a single past occurrence.
window.setTimeout(() => sessionStorage.removeItem("legacynest.reloadedForChunkError"), 5000);

// PWA: register the service worker in production so the app is installable on Android.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* non-fatal: app still works without the SW */
    });
  });
}
