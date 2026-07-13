import { Icon } from "@/components/Icon";

export function SearchInput({ placeholder }: { placeholder: string }) {
  return (
    <form role="search" className="flex h-11 items-center gap-3 border border-[#9f988c] bg-white/80 px-3.5 md:h-[52px]">
      <Icon name="search" className="h-[19px] w-[19px]" />
      <label className="sr-only" htmlFor="inventory-search">
        Search product inventory
      </label>
      <input id="inventory-search" type="search" placeholder={placeholder} className="w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-[#706b64]" />
    </form>
  );
}
