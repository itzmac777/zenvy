"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );
      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(keys.filter((key) => key.startsWith("zenvy-manager-shell-")).map((key) => caches.delete(key))),
        );
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installation is optional; the manager portal remains a normal website.
    });
  }, []);

  return null;
}
