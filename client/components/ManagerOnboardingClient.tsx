"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { managerApi, type ManagerSession } from "@/lib/manager-api";

export function ManagerOnboardingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    managerApi<ManagerSession>("/api/manager/auth/me")
      .then((session) => {
        if (!session.needsName) router.replace(session.needsField ? "/manager/fields/new?first=1" : "/manager");
      })
      .catch(() => router.replace("/manager/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await managerApi("/api/manager/onboarding", { method: "POST", body: JSON.stringify({ name }) });
      router.replace("/manager/fields/new?first=1");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to finish setup.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="dashboard-surface min-h-screen" />;

  return (
    <main className="dashboard-surface grid min-h-screen place-items-center px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-[520px] border border-line bg-[#fffefd]/95 p-6 shadow-[0_24px_80px_rgba(23,22,19,0.08)] sm:p-9">
        <Image src="/zenvy-football-logo.png" alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" priority />
        <span className="mt-8 grid h-11 w-11 place-items-center border border-line bg-panel text-olive"><UserRound className="h-5 w-5" /></span>
        <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Owner setup</p>
        <h1 className="mt-2 font-serif text-[42px] font-normal leading-[0.96]">What should we call you?</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">This is the only account detail we need right now. After this, create your first field so players can find and book it.</p>

        <label className="mt-8 grid gap-2 text-sm font-bold">
          Owner name
          <input
            autoFocus
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className="min-h-12 border border-line bg-white px-4 text-base font-normal outline-none transition placeholder:text-muted/60 focus:border-olive"
          />
        </label>

        {error ? <p role="alert" className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button disabled={saving || name.trim().length < 2} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white transition hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Saving..." : "Continue to field setup"}<ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
