import { SunMoon } from "lucide-react";
import { Brand } from "@/components/brand";
import { Cover } from "@/components/cover";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/Theme.context";
import { useTranslation } from "react-i18next";

export default function AuthSplit({
  title,
  lead,
  children,
}: {
  title: React.ReactNode;
  lead: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation(["auth", "common"]);
  const { toggleTheme } = useTheme();

  return (
    <div className="grid min-h-dvh bg-background md:grid-cols-2">
      <aside className="hidden flex-col gap-8 bg-surface-sunken px-6 py-10 md:flex lg:px-20">
        <Brand />
        <div className="m-auto flex w-full max-w-md flex-col gap-6">
          <div className="aspect-[2/1] overflow-hidden rounded-lg">
            <Cover pattern="hills" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-lead text-foreground">{t("split.tagline")}</p>
            <p className="text-sm text-muted-foreground">{t("split.lead")}</p>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col px-4 py-6 md:justify-center md:px-10 md:py-16">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("common:shell.toggleDark")}
          onClick={toggleTheme}
          className="absolute end-4 top-4"
        >
          <SunMoon />
        </Button>
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <Brand className="md:hidden" />
          <div className="flex flex-col gap-2">
            <h1>{title}</h1>
            <p className="text-muted-foreground">{lead}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
