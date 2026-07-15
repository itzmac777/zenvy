import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="manager-simple grid min-h-screen place-items-center bg-paper px-5">
      <section className="w-full max-w-sm border border-line bg-white p-7 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff1ee] text-[#9f4a3f]"><WifiOff className="h-8 w-8" /></span>
        <h1 className="mt-5 text-2xl font-extrabold">ইন্টারনেট নেই</h1>
        <p className="mt-2 text-sm text-muted">সংযোগ এলে আবার চেষ্টা করুন</p>
        <Link href="/manager" className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-olive bg-olive px-5 font-bold text-white"><RefreshCw className="h-5 w-5" /> আবার চেষ্টা</Link>
      </section>
    </main>
  );
}
