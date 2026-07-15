"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, RotateCcw, Smartphone } from "lucide-react";
import { managerApi, type ManagerSession } from "@/lib/manager-api";
import { managerErrorText } from "@/lib/manager-ui";

type StoredChallenge = { challengeId: string; maskedPhone: string; expiresInSeconds: number; resendAfterSeconds: number; devCode?: string; phone: string };

export function SimpleManagerVerify() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<StoredChallenge | null>(null);
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittedRef = useRef("");

  useEffect(() => {
    const stored = window.sessionStorage.getItem("zenvy-manager-otp");
    if (!stored) router.replace("/manager/login");
    else setChallenge(JSON.parse(stored) as StoredChallenge);
  }, [router]);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const verifyCode = useCallback(async (nextCode: string) => {
    if (!challenge || nextCode.length !== 6 || loading || submittedRef.current === nextCode) return;
    submittedRef.current = nextCode;
    setLoading(true);
    setError("");
    try {
      const session = await managerApi<ManagerSession>("/api/manager/auth/otp/verify", { method: "POST", body: JSON.stringify({ challengeId: challenge.challengeId, code: nextCode }) });
      window.sessionStorage.removeItem("zenvy-manager-otp");
      router.replace(session.needsName ? "/manager/onboarding" : session.needsField ? "/manager/fields/new?first=1" : "/manager");
    } catch (requestError) {
      setError(managerErrorText(requestError));
      submittedRef.current = "";
    } finally { setLoading(false); }
  }, [challenge, loading, router]);

  useEffect(() => { if (code.length === 6) void verifyCode(code); }, [code, verifyCode]);
  useEffect(() => {
    if (!("OTPCredential" in window) || !navigator.credentials) return;
    const controller = new AbortController();
    navigator.credentials.get({ otp: { transport: ["sms"] }, signal: controller.signal } as unknown as CredentialRequestOptions)
      .then((credential) => {
        const nextCode = (credential as Credential & { code?: string } | null)?.code?.replace(/\D/g, "").slice(0, 6);
        if (nextCode?.length === 6) setCode(nextCode);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function resend() {
    if (!challenge || seconds > 0) return;
    try {
      const result = await managerApi<Omit<StoredChallenge, "phone">>("/api/manager/auth/otp/request", { method: "POST", body: JSON.stringify({ phone: challenge.phone }) });
      const next = { ...result, phone: challenge.phone };
      window.sessionStorage.setItem("zenvy-manager-otp", JSON.stringify(next));
      setChallenge(next);
      setCode("");
      setSeconds(60);
      submittedRef.current = "";
    } catch (requestError) { setError(managerErrorText(requestError)); }
  }
  if (!challenge) return <main className="min-h-screen bg-[#f8f7f3]" />;
  return <main className="manager-simple grid min-h-screen place-items-center bg-[#f8f7f3] px-4 py-8"><form onSubmit={(event: FormEvent) => { event.preventDefault(); void verifyCode(code); }} className="w-full max-w-[430px] border border-line bg-white p-5 text-center sm:p-8"><button type="button" onClick={() => router.push("/manager/login")} className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 font-extrabold text-muted"><ChevronLeft className="h-5 w-5" /> নম্বর বদলান</button><span className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full bg-[#e9edff] text-olive"><Smartphone className="h-10 w-10" /></span><h1 className="mt-5 text-3xl font-extrabold">৬ সংখ্যার কোড</h1><p className="mt-2 font-bold text-muted">{challenge.maskedPhone}</p><input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-6 min-h-[76px] w-full border-2 border-line bg-white px-4 text-center text-4xl font-extrabold tracking-[0.35em] outline-none focus:border-olive" aria-label="Six digit code" />{challenge.devCode ? <p className="mt-3 border border-line bg-panel p-2 text-sm font-bold text-muted">DEV: {challenge.devCode}</p> : null}{error ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-3 font-extrabold text-red-700">{error}</p> : null}<button disabled={loading || code.length !== 6} className="manager-action-press mt-4 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{loading ? "..." : "যাচাই করুন"}</button><button type="button" disabled={seconds > 0} onClick={() => void resend()} className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 font-extrabold text-muted disabled:opacity-50"><RotateCcw className="h-5 w-5" />{seconds > 0 ? `${seconds}s` : "আবার কোড নিন"}</button></form></main>;
}
