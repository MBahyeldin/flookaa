import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";

export function LockedPersonaCard({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-lg border">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">{t("personas:locked.title")}</p>
        <p className="text-sm text-muted-foreground">{t("personas:locked.body")}</p>
        {children}
      </CardContent>
    </Card>
  );
}
