"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ClipboardList, Goal, Home, MoreHorizontal, Plus } from "lucide-react";
import { ManagerConnectivityProvider } from "@/components/ManagerConnectivity";
import { ManagerHelp } from "@/components/ManagerHelp";
import { PwaRegistration } from "@/components/PwaRegistration";
import { managerApi, type ManagerFieldSummary, type ManagerSession } from "@/lib/manager-api";
import { managerCopy, simpleManagerUi } from "@/lib/manager-ui";

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

const classicNavigation = [
  { label: "Today", href: "/manager", icon: Home },
  { label: "Calendar", href: "/manager/calendar", icon: CalendarDays },
  { label: "Fields", href: "/manager/fields", icon: Goal },
  { label: "Bookings", href: "/manager/bookings", icon: ClipboardList },
  { label: "More", href: "/manager/more", icon: MoreHorizontal },
];

const simpleNavigation = [
  { label: managerCopy.today, href: "/manager", icon: CalendarDays },
  { label: managerCopy.bookings, href: "/manager/bookings", icon: ClipboardList },
  { label: managerCopy.fields, href: "/manager/fields", icon: Goal },
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

  if (simpleManagerUi) {
    return (
      <ManagerWorkspaceContext.Provider value={context}>
        <ManagerConnectivityProvider>
          <SimpleManagerFrame pathname={pathname} session={session} fields={fields} selectedField={selectedField} setSelectedFieldId={setSelectedFieldId}>
            {children}
          </SimpleManagerFrame>
        </ManagerConnectivityProvider>
      </ManagerWorkspaceContext.Provider>
    );
  }

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
              {classicNavigation.slice(0, 4).map((item) => (
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
              <Link href="/manager/fields/new" className="inline-flex min-h-10 items-center gap-2 border border-olive bg-olive px-4 text-xs font-bold text-white hover:bg-olive-dark"><Plus className="h-4 w-4" /> Add field</Link>
            </div>

            <div className="ml-auto min-w-0 text-right md:hidden">
              <strong className="block truncate text-sm">{selectedField?.name ?? "Create your field"}</strong>
              <span className="block truncate text-[11px] text-muted">{session.user.name ?? session.user.phone}</span>
            </div>
          </div>
        </header>

        {children}

        <nav className="manager-mobile-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Manager mobile navigation">
          {classicNavigation.map((item) => {
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

function SimpleManagerFrame({ pathname, session, fields, selectedField, setSelectedFieldId, children }: {
  pathname: string;
  session: ManagerSession;
  fields: ManagerFieldSummary[];
  selectedField: ManagerFieldSummary | null;
  setSelectedFieldId: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="manager-simple min-h-screen bg-[#f8f7f3] pb-[calc(78px+env(safe-area-inset-bottom))] text-ink md:pb-0">
      <PwaRegistration />
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[70px] max-w-[1280px] items-center gap-3 px-4 md:min-h-[76px] md:px-7">
          <Link href="/manager" className="inline-flex shrink-0 items-center gap-2" aria-label="Zenvy manager home">
            <Image src="/zenvy-football-logo.png" alt="" width={42} height={42} className="h-10 w-10 rounded-full object-cover" priority />
            <span className="hidden text-2xl font-extrabold tracking-0 sm:inline">Zenvy</span>
          </Link>

          <nav className="ml-5 hidden items-center gap-2 md:flex" aria-label="Manager navigation">
            {simpleNavigation.map((item) => {
              const active = activePath(pathname, item.href);
              return <Link key={item.href} href={item.href} className={`manager-action-press inline-flex min-h-[52px] items-center gap-2 border px-5 text-sm font-bold ${active ? "border-olive bg-olive text-white" : "border-line bg-white text-ink"}`}><item.icon className="h-5 w-5" />{item.label}</Link>;
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            {fields.length ? (
              <label className="relative hidden sm:block">
                <span className="sr-only">Field</span>
                <select value={selectedField?.id ?? ""} onChange={(event) => setSelectedFieldId(event.target.value)} className="min-h-[52px] max-w-[220px] appearance-none border border-line bg-white py-2 pl-3 pr-9 text-sm font-bold outline-none focus:border-olive">
                  {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              </label>
            ) : (
              <span className="hidden text-sm font-bold sm:block">{session.user.name}</span>
            )}
            <div className="min-w-0 text-right sm:hidden"><strong className="block max-w-[150px] truncate text-sm">{selectedField?.name ?? session.user.name}</strong><span className="block text-[11px] text-muted">{session.user.phone.slice(-6)}</span></div>
            <ManagerHelp />
          </div>
        </div>
      </header>

      {children}

      <nav className="manager-mobile-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Manager mobile navigation">
        {simpleNavigation.map((item) => {
          const active = activePath(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`grid min-h-[70px] place-items-center content-center gap-1 px-2 text-xs font-extrabold ${active ? "text-olive" : "text-muted"}`}><item.icon className="h-6 w-6" /><span>{item.label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
