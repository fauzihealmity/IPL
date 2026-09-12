"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SortableHeader({
  field,
  label,
  currentSort,
  currentOrder,
}: {
  field: string;
  label: string;
  currentSort?: string;
  currentOrder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : "asc";

  function handleSort() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("order", nextOrder);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const Icon = !isActive ? ArrowUpDown : currentOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={handleSort}
      className={cn(
        "flex items-center gap-1 font-medium hover:text-foreground",
        isActive && "text-foreground"
      )}
    >
      {label}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
