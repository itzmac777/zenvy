import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { QuickAction } from "@/lib/types";

export function QuickActionRail({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="scrollbar-none flex min-w-0 gap-3 overflow-x-auto pb-0.5">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="inline-flex min-h-[50px] min-w-[156px] flex-none items-center gap-2.5 rounded-[13px] border border-line bg-white/70 px-4 text-[15px] font-bold shadow-[0_10px_24px_rgba(38,35,30,0.035)] md:min-h-14 md:min-w-[172px] md:px-5"
        >
          <Icon name={action.icon} className="h-[18px] w-[18px] text-olive" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}
