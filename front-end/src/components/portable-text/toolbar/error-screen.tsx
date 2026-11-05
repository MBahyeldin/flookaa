import { t } from "@/i18n";
import { Button } from "@/components/ui/button";
import { isError } from "remeda";

export function ErrorScreen(props: {
  area: string;
  error: Error;
  dismiss: () => void;
}) {
  return (
    <div className="flex-1 bg-destructive/10 border border-destructive text-destructive flex flex-col gap-2 p-2">
      <div className="font-medium">
        {t("editor:crashed", { area: props.area })}
      </div>
      <div className="font-mono text-sm">
        {getErrorMessage(props.error, t("editor:unknownError"))}
      </div>
      <Button
        variant="destructive"
        className="self-start"
        size="sm"
        onClick={props.dismiss}
      >
        {t("common:actions.tryAgain")}
      </Button>
    </div>
  );
}

export function getErrorMessage(error: unknown, fallback: string) {
  return isError(error) ? error.message : fallback;
}
