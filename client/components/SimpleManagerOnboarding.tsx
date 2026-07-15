"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { managerApi, type ManagerSession } from "@/lib/manager-api";
import { managerErrorText } from "@/lib/manager-ui";

export function SimpleManagerOnboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    managerApi<ManagerSession>("/api/manager/auth/me").then((session) => { if (!session.needsName) router.replace(session.needsField ? "/manager/fields/new?first=1" : "/manager"); }).catch(() => router.replace("/manager/login")).finally(() => setLoading(false));
  }, [router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await managerApi("/api/manager/onboarding", { method: "POST", body: JSON.stringify({ name }) });
      router.replace("/manager/fields/new?first=1");
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }
  if (loading) return <main className="min-h-screen bg-[#f8f7f3]" />;
  return <main className="manager-simple grid min-h-screen place-items-center bg-[#f8f7f3] px-4 py-8"><form onSubmit={submit} className="w-full max-w-[430px] border border-line bg-white p-5 text-center sm:p-8"><Image src="/zenvy-football-logo.png" alt="Zenvy" width={72} height={72} className="mx-auto h-[72px] w-[72px] rounded-full object-cover" priority /><span className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-[#e9edff] text-olive"><UserRound className="h-10 w-10" /></span><h1 className="mt-5 text-3xl font-extrabold">আপনার নাম</h1><input autoFocus required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="নাম লিখুন" className="mt-6 min-h-[68px] w-full border-2 border-line bg-white px-4 text-center text-2xl font-extrabold outline-none focus:border-olive" />{error ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-3 font-extrabold text-red-700">{error}</p> : null}<button disabled={saving || name.trim().length < 2} className="manager-action-press mt-4 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{saving ? "..." : "পরের"}</button></form></main>;
}
