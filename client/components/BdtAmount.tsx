import type { HTMLAttributes } from "react";

type BdtAmountProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  value: number | string;
  suffix?: string;
};

const numberFormatter = new Intl.NumberFormat("en-BD", {
  maximumFractionDigits: 0,
});

export function BdtAmount({ value, suffix = "", className = "", ...props }: BdtAmountProps) {
  const amount = typeof value === "number" ? numberFormatter.format(value) : value;

  return (
    <span {...props} className={`inline-flex items-baseline whitespace-nowrap ${className}`.trim()}>
      <span className="sr-only">BDT {amount}{suffix}</span>
      <span aria-hidden="true" className="bdt-symbol">৳</span>
      <span aria-hidden="true">{amount}{suffix}</span>
    </span>
  );
}
