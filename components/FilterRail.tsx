import { Icon } from "@/components/Icon";

const filters = ["All items", "Low stock", "Drafts", "Active"];

export function FilterRail() {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto">
      {filters.map((filter, index) => (
        <button
          key={filter}
          type="button"
          className={
            index === 0
              ? "inline-flex min-h-[34px] flex-none items-center justify-center rounded-full border border-olive bg-olive px-4 text-xs font-extrabold uppercase tracking-[0.02em] text-white"
              : "inline-flex min-h-[34px] flex-none items-center justify-center rounded-full border border-line bg-white/70 px-4 text-xs font-extrabold uppercase tracking-[0.02em]"
          }
        >
          {filter}
        </button>
      ))}
      <button type="button" aria-label="Filter settings" className="inline-grid h-[34px] w-[38px] flex-none place-items-center rounded-full border border-line bg-white/70">
        <Icon name="filters" className="h-4 w-4" />
      </button>
    </div>
  );
}
