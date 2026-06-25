import type { ActivityItem } from "@/lib/types";

export function ActivityLog({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="mt-5 grid list-none border-t border-line p-0">
      {items.map((item) => (
        <li key={item.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3.5 border-b border-line py-4">
          <span className="mt-1.5 h-2 w-2 rounded-full bg-olive shadow-[0_0_0_5px_#eee8dd]" />
          <div>
            <strong className="block text-sm leading-snug">{item.title}</strong>
            <p className="mt-1 text-xs leading-snug text-muted">{item.meta}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
