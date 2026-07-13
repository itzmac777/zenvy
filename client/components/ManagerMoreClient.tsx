"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Goal, LogOut, Plus, UserRound } from "lucide-react";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { managerApi } from "@/lib/manager-api";

export function ManagerMoreClient() {
  const router = useRouter();
  const { session, fields } = useManagerWorkspace();

  async function logout() {
    await managerApi("/api/manager/auth/logout", { method: "POST" });
    router.replace("/manager/login");
  }

  return (
    <main className="mx-auto max-w-[900px] px-5 py-7 md:px-8 md:py-10">
      <header><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Workspace settings</p><h1 className="mt-2 font-serif text-[42px] font-normal leading-none md:text-[56px]">More</h1></header>
      <section className="mt-7 grid gap-4 md:grid-cols-2">
        <article className="border border-line bg-white/75 p-5">
          <UserRound className="h-5 w-5 text-olive" />
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Owner account</p>
          <h2 className="mt-2 font-serif text-[28px] font-normal">{session.user.name}</h2>
          <p className="mt-2 text-sm text-muted">{session.user.phone}</p>
          <button type="button" onClick={() => void logout()} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-line bg-white px-4 text-sm font-bold"><LogOut className="h-4 w-4" /> Sign out</button>
        </article>
        <article className="border border-line bg-white/75 p-5">
          <Goal className="h-5 w-5 text-olive" />
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Fields</p>
          <h2 className="mt-2 font-serif text-[28px] font-normal">{fields.length} field{fields.length === 1 ? "" : "s"}</h2>
          <p className="mt-2 text-sm text-muted">Create and manage all player-bookable fields from this account.</p>
          <Link href="/manager/fields/new" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-olive bg-olive px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Add field</Link>
        </article>
      </section>
      <section className="mt-5 border border-line bg-white/70">
        <header className="border-b border-line p-5"><h2 className="font-serif text-[28px] font-normal">Your fields</h2></header>
        {fields.length ? fields.map((field) => (
          <Link key={field.id} href={`/manager/fields/${field.id}`} className="flex items-start gap-3 border-b border-line p-5 transition hover:bg-white last:border-0">
            <Goal className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
            <div><strong>{field.name}</strong><p className="mt-1 text-sm text-muted">{field.format} · {field.status.toLowerCase()}</p></div>
          </Link>
        )) : <div className="p-5 text-sm text-muted">Create your first field to start taking bookings.</div>}
      </section>
    </main>
  );
}
