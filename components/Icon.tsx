import type { IconName } from "@/lib/types";
import { cn } from "@/lib/utils";

const paths: Record<IconName, string[]> = {
  analytics: ["M3 3v18h18", "M7 15l4-4 3 3 5-7"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  box: ["m12 3 8 4.5v9L12 21l-8-4.5v-9z", "M4 7.5l8 4.5 8-4.5", "M12 12v9"],
  calendar: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z"],
  card: ["M4 7h16v10H4z", "M4 10h16", "M7 15h4"],
  chart: ["M3 3v18h18", "M7 15l4-4 3 3 5-7"],
  filters: ["M4 7h10", "M18 7h2", "M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0", "M4 17h2", "M10 17h10", "M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0"],
  home: ["m3 11 9-8 9 8", "M5 10v10h14V10", "M9 20v-6h6v6"],
  jewelry: ["M8 4h8l3 5-7 11L5 9z", "M5 9h14", "M8 4l4 5 4-5"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  package: ["M4 7h16v13H4z", "M8 7a4 4 0 0 1 8 0"],
  plus: ["M12 5v14", "M5 12h14"],
  printer: ["M6 9V4h12v5", "M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2", "M6 14h12v6H6z"],
  refresh: ["M4 14a8 8 0 0 0 12 6", "M4 10a8 8 0 0 1 12-6", "M20 5v5h-5", "M4 19v-5h5"],
  search: ["m21 21-4.35-4.35", "m18.5 11.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"],
  tag: ["m20 12-8 8-8-8V4h8z", "M8.5 8.5h.01"],
  users: ["M16 21v-2a4 4 0 0 0-8 0v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  wand: ["M4 6h16", "M4 12h16", "M4 18h10"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  eye: ["M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  beauty: ["M10 3h4v5l3 4v8H7v-8l3-4z", "M9 13h6"],
  cup: ["M6 8h12v5a6 6 0 0 1-12 0z", "M5 8h14", "M8 20h8", "M18 11h2a2 2 0 0 1 0 4h-2"],
  kids: ["M8 10V7a2 2 0 0 1 4 0v3", "M12 10V7a2 2 0 0 1 4 0v3", "M5 11h14l-1 9H6z"],
};

type IconProps = {
  name: IconName;
  className?: string;
};

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]", className)}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
