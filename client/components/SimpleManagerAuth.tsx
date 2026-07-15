"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Phone } from "lucide-react";
import { managerApi } from "@/lib/manager-api";
import { managerErrorText } from "@/lib/manager-ui";

type OtpResponse = { challengeId: string; maskedPhone: string; expiresInSeconds: number; resendAfterSeconds: number; devCode?: string };

export function SimpleManagerAuth() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await managerApi<OtpResponse>("/api/manager/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
      window.sessionStorage.setItem("zenvy-manager-otp", JSON.stringify({ ...result, phone }));
      router.push("/manager/verify");
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setLoading(false); }
  }
  return <main className="manager-simple grid min-h-screen place-items-center bg-[#f8f7f3] px-4 py-8"><form onSubmit={submit} className="w-full max-w-[430px] border border-line bg-white p-5 sm:p-8"><Image src="/zenvy-football-logo.png" alt="Zenvy" width={72} height={72} className="mx-auto h-[72px] w-[72px] rounded-full object-cover" priority /><span className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-[#e9edff] text-olive"><Phone className="h-10 w-10" /></span><h1 className="mt-5 text-center text-3xl font-extrabold">ফোন নম্বর</h1><input autoFocus required inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01XXXXXXXXX" className="mt-6 min-h-[68px] w-full border-2 border-line bg-white px-4 text-center text-2xl font-extrabold outline-none focus:border-olive" />{error ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-3 text-center font-extrabold text-red-700">{error}</p> : null}<button disabled={loading || phone.replace(/\D/g, "").length < 10} className="manager-action-press mt-4 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{loading ? "..." : "কোড নিন"}</button></form></main>;
}
