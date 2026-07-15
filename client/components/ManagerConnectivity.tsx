"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const ConnectivityContext = createContext(true);

export function ManagerConnectivityProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <ConnectivityContext.Provider value={online}>
      {!online ? (
        <div role="status" className="fixed inset-x-0 top-0 z-[90] flex min-h-14 items-center justify-center gap-3 bg-[#9f4a3f] px-3 text-center text-sm font-bold text-white">
          <WifiOff className="h-5 w-5 shrink-0" /> ইন্টারনেট নেই
          <button type="button" onClick={() => window.location.reload()} className="min-h-[44px] border border-white/70 bg-white px-3 font-extrabold text-[#7f3027]">আবার চেষ্টা</button>
        </div>
      ) : null}
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useManagerOnline() {
  return useContext(ConnectivityContext);
}
