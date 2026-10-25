import { Sailboat } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Brand({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-semibold text-foreground", size === "md" ? "text-xl" : "text-base", className)}>
      <Sailboat aria-hidden className={cn("text-primary", size === "md" ? "size-[22px]" : "size-[18px]")} />
      Flookaa
    </Link>
  );
}
