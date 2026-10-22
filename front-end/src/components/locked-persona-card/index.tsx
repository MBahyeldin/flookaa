import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LockedPersonaCard({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-xl border border-border/70 shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">This persona is private</p>
        <p className="text-sm text-muted-foreground">Follow it to see its profile.</p>
        {children}
      </CardContent>
    </Card>
  );
}
