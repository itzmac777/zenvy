"use client";

import { useState } from "react";
import { Check, Hand, Phone, Plus, X } from "lucide-react";

const steps = [
  { title: "সময় চাপুন", detail: "খালি সময়ের + চিহ্ন চাপুন", icon: Plus },
  { title: "ঘণ্টা নিন", detail: "১, ২, ৩ অথবা ৪ চাপুন", icon: Hand },
  { title: "ফোন লিখুন", detail: "নম্বর দিয়ে নিশ্চিত করুন", icon: Phone },
];

export function ManagerPracticeGuide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/70 p-4">
      <section className="relative w-full max-w-[420px] border border-line bg-[#fffefd] p-5 text-center shadow-2xl">
        <button type="button" aria-label="Close practice" onClick={onClose} className="absolute right-3 top-3 grid h-12 w-12 place-items-center border border-line bg-white"><X className="h-6 w-6" /></button>
        <span className="mx-auto mt-10 grid h-28 w-28 place-items-center rounded-full bg-[#e9edff] text-olive"><Icon className="h-14 w-14" /></span>
        <div className="relative mx-auto mt-4 h-12 w-12 animate-[manager-hand-tap_1.3s_ease-in-out_infinite] text-ink"><Hand className="h-12 w-12" /></div>
        <h2 className="mt-3 text-3xl font-extrabold">{current.title}</h2>
        <p className="mt-2 text-lg font-bold text-muted">{current.detail}</p>
        <div className="mt-6 flex justify-center gap-2">{steps.map((_, index) => <span key={index} className={`h-2.5 w-8 ${index === step ? "bg-olive" : "bg-line"}`} />)}</div>
        {step < steps.length - 1 ? <button type="button" onClick={() => setStep((value) => value + 1)} className="manager-action-press mt-6 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white">পরের</button> : <button type="button" onClick={onClose} className="manager-action-press mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-olive bg-olive text-base font-extrabold text-white"><Check className="h-6 w-6" /> শুরু করুন</button>}
        <p className="mt-3 text-xs font-bold text-muted">এটি শুধু অনুশীলন। কোনো বুকিং হবে না।</p>
      </section>
    </div>
  );
}
