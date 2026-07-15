"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleHelp, LogOut, MessageCircle, Phone, PlayCircle, X } from "lucide-react";
import { managerApi } from "@/lib/manager-api";

const supportPhone = process.env.NEXT_PUBLIC_MANAGER_SUPPORT_PHONE ?? "";
const supportWhatsapp = (process.env.NEXT_PUBLIC_MANAGER_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");

export function ManagerHelp() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await managerApi("/api/manager/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/manager/login");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="সাহায্য" className="manager-action-press grid h-[52px] w-[52px] shrink-0 place-items-center border border-line bg-white text-ink">
        <CircleHelp className="h-6 w-6" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] bg-ink/35">
          <button type="button" aria-label="Close help" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full" />
          <section className="absolute inset-x-0 bottom-0 border-t border-line bg-paper p-5 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-24px_70px_rgba(23,22,19,0.2)] md:left-auto md:right-5 md:bottom-5 md:w-[420px] md:border">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><CircleHelp className="h-7 w-7 text-olive" /><strong className="text-xl">সাহায্য</strong></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-12 w-12 place-items-center border border-line bg-white"><X className="h-5 w-5" /></button>
            </header>
            <div className="mt-5 grid gap-3">
              <Link href="/manager?practice=1" onClick={() => setOpen(false)} className="manager-action-press flex min-h-16 items-center gap-4 border border-line bg-white px-4 text-base font-bold">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#eef0ff] text-olive"><PlayCircle className="h-6 w-6" /></span>
                বুকিং করা দেখুন
              </Link>
              {supportPhone ? <a href={`tel:${supportPhone}`} className="manager-action-press flex min-h-16 items-center gap-4 border border-line bg-white px-4 text-base font-bold"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#edf8f0] text-[#28704d]"><Phone className="h-6 w-6" /></span>ফোন করুন</a> : null}
              {supportWhatsapp ? <a href={`https://wa.me/${supportWhatsapp}`} target="_blank" rel="noreferrer" className="manager-action-press flex min-h-16 items-center gap-4 border border-line bg-white px-4 text-base font-bold"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#e9f8ee] text-[#167744]"><MessageCircle className="h-6 w-6" /></span>WhatsApp</a> : null}
              <button type="button" onClick={() => void logout()} className="manager-action-press flex min-h-14 items-center justify-center gap-2 text-sm font-bold text-muted"><LogOut className="h-5 w-5" /> লগ আউট</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
