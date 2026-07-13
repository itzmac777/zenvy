"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Smartphone } from "lucide-react";
import { managerApi } from "@/lib/manager-api";

type OtpResponse = { challengeId: string; maskedPhone: string; expiresInSeconds: number; resendAfterSeconds: number; devCode?: string };

export function ManagerAuthClient() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await managerApi<OtpResponse>("/api/manager/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      window.sessionStorage.setItem("zenvy-manager-otp", JSON.stringify({ ...result, phone }));
      router.push("/manager/verify");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-surface grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-[460px] border border-line bg-[#fffefd]/95 p-6 shadow-[0_24px_80px_rgba(23,22,19,0.08)] sm:p-9">
        <Link href="/" className="inline-flex items-center gap-3" aria-label="Zenvy home">
          <Image src="/zenvy-football-logo.png" alt="" width={46} height={46} className="h-11 w-11 rounded-full object-cover" priority />
          <span className="font-serif text-[38px] leading-none">Zenvy</span>
        </Link>

        <div className="mt-10">
          <span className="grid h-11 w-11 place-items-center border border-line bg-panel text-olive"><Smartphone className="h-5 w-5" /></span>
          <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Field owner</p>
          <h1 className="mt-2 font-serif text-[42px] font-normal leading-[0.96]">Run your fields from anywhere.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">Enter your Bangladesh phone number. We will verify it before opening your field workspace.</p>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-bold">
            Phone number
            <input
              autoFocus
              required
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              className="min-h-12 w-full border border-line bg-white px-4 text-base font-normal outline-none transition placeholder:text-muted/60 focus:border-olive"
            />
          </label>
          {error ? <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <button disabled={loading || phone.trim().length < 10} className="inline-flex min-h-12 items-center justify-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white transition hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Sending code..." : "Continue with OTP"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-7 flex items-start gap-2 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          Password-free access. Your manager session stays signed in securely on this device.
        </p>
      </section>
    </main>
  );
}
