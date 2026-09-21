import type { MervTypeInfo } from "@shared/products";
import { cn } from "@/lib/utils";

export default function MervBadge({
  type,
  className,
}: {
  type: MervTypeInfo;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-h-12 w-full items-center justify-center rounded-md px-1.5 py-1.5 text-center text-[0.68rem] font-extrabold italic leading-[1.05] tracking-tight text-white shadow-[0_0_0_1.5px_rgba(255,255,255,0.38),0_8px_18px_rgba(8,14,26,0.28)] sm:text-[0.78rem]",
        className,
      )}
      style={{ backgroundColor: type.badgeColor }}
    >
      {type.key === "carbon" ? (
        <span className="flex flex-col items-center">
          <span>MERV 8</span>
          <span>Carbon</span>
        </span>
      ) : (
        type.name
      )}
    </span>
  );
}
