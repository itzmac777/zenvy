import type { Kpi } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones: Record<Kpi["tone"], string> = {
  positive: "text-[#496c3e]",
  neutral: "text-muted",
  warning: "text-[#8b643d]",
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <article className="grid min-h-[126px] content-between gap-4 rounded-[7px] border border-line/90 bg-white/75 p-4 shadow-soft md:min-h-[154px] md:p-6">
      <span className="text-[11px] leading-snug text-muted md:text-xs">{kpi.label}</span>
      <strong className="font-serif text-[clamp(29px,8vw,34px)] font-normal leading-none md:text-[38px]">{kpi.value}</strong>
      <p className={cn("m-0 text-[11px] leading-snug md:text-xs", tones[kpi.tone])}>{kpi.trend}</p>
    </article>
  );
}
