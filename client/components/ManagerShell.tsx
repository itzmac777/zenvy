"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, ChevronDown, ClipboardList, Goal, Home, MoreHorizontal, Plus } from "lucide-react";
import { managerApi, type ManagerFieldSummary, type ManagerSession } from "@/lib/manager-api";

type ManagerWorkspace = {
  session: ManagerSession;
  fields: ManagerFieldSummary[];
  selectedField: ManagerFieldSummary | null;
  setSelectedFieldId: (id: string) => void;
  refresh: () => Promise<void>;
};

const ManagerWorkspaceContext = createContext<ManagerWorkspace | null>(null);

export function useManagerWorkspace() {
  const context = useContext(ManagerWorkspaceContext);
  if (!context) throw new Error("Manager workspace is unavailable.");
  return context;
}

const navigation = [
  { label: "Today", href: "/manager", icon: Home },
  { label: "Calendar", href: "/manager/calendar", icon: CalendarDays },
  { label: "Fields", href: "/manager/fields", icon: Goal },
  { label: "Bookings", href: "/manager/bookings", icon: ClipboardList },
  { label: "More", href: "/manager/more", icon: MoreHorizontal },
];

function activePath(pathname: string, href: string) {
  if (href === "/manager") return pathname === href;
  return pathname.startsWith(href);
}

function canCreateFirstField(pathname: string) {
  return pathname.startsWith("/manager/fields/new");
}

export function ManagerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<ManagerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldIdState] = useState("");

  const refresh = useCallback(async () => {
    const nextSession = await managerApi<ManagerSession>("/api/manager/auth/me");
    if (nextSession.needsName) {
      router.replace("/manager/onboarding");
      return;
    }
    if (nextSession.needsField && !canCreateFirstField(pathname)) {
      router.replace("/manager/fields/new?first=1");
      return;
    }
    setSession(nextSession);
  }, [pathname, router]);

  useEffect(() => {
    refresh()
      .catch(() => router.replace("/manager/login"))
      .finally(() => setLoading(false));
  }, [refresh, router]);

  const fields = useMemo(() => session?.fields ?? [], [session]);
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0] ?? null;

  useEffect(() => {
    if (!fields.length) {
      setSelectedFieldIdState("");
      return;
    }
    const storedField = window.localStorage.getItem("zenvy-manager-field");
    const nextField = fields.find((field) => field.id === storedField)?.id ?? fields[0].id;
    setSelectedFieldIdState(nextField);
  }, [fields]);

  function setSelectedFieldId(id: string) {
    setSelectedFieldIdState(id);
    window.localStorage.setItem("zenvy-manager-field", id);
  }

  if (loading || !session) {
    return <div className="dashboard-surface grid min-h-screen place-items-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-olive" aria-label="Loading manager workspace" /></div>;
  }

  const context: ManagerWorkspace = { session, fields, selectedField, setSelectedFieldId, refresh };

  return (
    <ManagerWorkspaceContext.Provider value={context}>
      <div className="dashboard-surface min-h-screen pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center gap-4 px-4 md:min-h-[78px] md:px-7 xl:px-10">
            <Link href="/manager" className="inline-flex shrink-0 items-center gap-2" aria-label="Zenvy manager home">
              <Image src="/zenvy-football-logo.png" alt="" width={42} height={42} className="h-10 w-10 rounded-full object-cover" priority />
              <span className="font-serif text-[32px] leading-none md:text-[36px]">Zenvy</span>
            </Link>

            <nav className="ml-5 hidden items-center gap-1 lg:flex" aria-label="Manager navigation">
              {navigation.slice(0, 4).map((item) => (
                <Link key={item.href} href={item.href} className={`inline-flex min-h-10 items-center gap-2 px-3 text-[13px] font-bold ${activePath(pathname, item.href) ? "bg-[#eef0ff] text-ink" : "text-muted hover:text-ink"}`}>
                  <item.icon className="h-4 w-4" />{item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto hidden items-center gap-2 md:flex">
              {fields.length ? (
                <label className="relative">
                  <span className="sr-only">Field</span>
                  <select value={selectedField?.id ?? ""} onChange={(event) => setSelectedFieldId(event.target.value)} className="min-h-10 max-w-[220px] appearance-none border border-line bg-white py-2 pl-3 pr-8 text-xs font-bold outline-none focus:border-olive">
                    {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </label>
              ) : null}
              <button type="button" aria-label="Notifications" className="grid h-10 w-10 place-items-center border border-line bg-white text-muted"><Bell className="h-4 w-4" /></button>
              <Link href="/manager/fields/new" className="inline-flex min-h-10 items-center gap-2 border border-olive bg-olive px-4 text-xs font-bold text-white hover:bg-olive-dark"><Plus className="h-4 w-4" /> Add field</Link>
            </div>

            <div className="ml-auto min-w-0 text-right md:hidden">
              <strong className="block truncate text-sm">{selectedField?.name ?? "Create your field"}</strong>
              <span className="block truncate text-[11px] text-muted">{session.user.name ?? session.user.phone}</span>
            </div>
          </div>
        </header>

        {children}

        <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-[#fffefd]/97 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_36px_rgba(23,22,19,0.08)] backdrop-blur-xl md:hidden" aria-label="Manager mobile navigation">
          {navigation.map((item) => {
            const active = activePath(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`grid min-h-[64px] place-items-center content-center gap-1 px-1 text-[10px] font-bold ${active ? "text-olive" : "text-muted"}`}>
                <item.icon className="h-[19px] w-[19px]" /><span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ManagerWorkspaceContext.Provider>
  );
}
