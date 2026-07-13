"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { managerApi, type ManagerSession } from "@/lib/manager-api";

type StoredChallenge = { challengeId: string; maskedPhone: string; expiresInSeconds: number; resendAfterSeconds: number; devCode?: string; phone: string };

export function ManagerVerifyClient() {
  const router = useRouter();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [challenge, setChallenge] = useState<StoredChallenge | null>(null);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  function setDigit(index: number, value: string) {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((digit, digitIndex) => digitIndex === index ? nextValue : digit));
    if (nextValue && index < 5) refs.current[index + 1]?.focus();
  }

  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  }

  function paste(event: ClipboardEvent<HTMLInputElement>) {
    const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (value.length !== 6) return;
    event.preventDefault();
    setDigits(value.split(""));
    refs.current[5]?.focus();
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    setLoading(true);
    setError("");
    try {
      const session = await managerApi<ManagerSession>("/api/manager/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.challengeId, code: digits.join("") }),
      });
      window.sessionStorage.removeItem("zenvy-manager-otp");
      router.replace(session.needsName ? "/manager/onboarding" : session.needsField ? "/manager/fields/new?first=1" : "/manager");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!challenge || seconds > 0) return;
    setError("");
    try {
      const result = await managerApi<Omit<StoredChallenge, "phone">>("/api/manager/auth/otp/request", { method: "POST", body: JSON.stringify({ phone: challenge.phone }) });
      const next = { ...result, phone: challenge.phone };
      setChallenge(next);
      window.sessionStorage.setItem("zenvy-manager-otp", JSON.stringify(next));
      setDigits(["", "", "", "", "", ""]);
      setSeconds(60);
      refs.current[0]?.focus();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to resend OTP.");
    }
  }

  if (!challenge) return <main className="dashboard-surface min-h-screen" />;

  return (
    <main className="dashboard-surface grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-[500px] border border-line bg-[#fffefd]/95 p-6 shadow-[0_24px_80px_rgba(23,22,19,0.08)] sm:p-9">
        <Link href="/manager/login" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Change number</Link>
        <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Phone verification</p>
        <h1 className="mt-2 font-serif text-[42px] font-normal leading-none">Enter your code.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">We sent a six-digit code to <strong className="text-ink">{challenge.maskedPhone}</strong>.</p>

        <form className="mt-8" onSubmit={verify}>
          <div className="grid grid-cols-6 gap-2" onPaste={paste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { refs.current[index] = element; }}
                aria-label={`OTP digit ${index + 1}`}
                autoFocus={index === 0}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(event) => setDigit(index, event.target.value)}
                onKeyDown={(event) => keyDown(index, event)}
                className="aspect-square min-w-0 border border-line bg-white text-center text-xl font-bold outline-none transition focus:border-olive"
              />
            ))}
          </div>

          {challenge.devCode ? <p className="mt-4 border border-line bg-panel px-3 py-2 text-center text-xs text-muted">Development code: <strong className="text-ink">{challenge.devCode}</strong></p> : null}
          {error ? <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

          <button disabled={loading || digits.some((digit) => !digit)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white transition hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Verifying..." : "Verify and continue"}<ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <button type="button" disabled={seconds > 0} onClick={resend} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-muted hover:text-ink disabled:cursor-default disabled:opacity-65">
          <RotateCcw className="h-4 w-4" />{seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
        </button>
      </section>
    </main>
  );
}
