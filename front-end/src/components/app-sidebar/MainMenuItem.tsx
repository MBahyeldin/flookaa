import clsx from "clsx";
import { PanelLeft, TvIcon } from "lucide-react";

/**
 * Presentational only. The enclosing SidebarMenuButton owns the click handler
 * and the accessible name — these icons used to carry their own onClick, which
 * put two different actions inside a single <button>.
 */
export default function MainMenuItem({ open }: { open: boolean }) {
  return (
    <>
      <TvIcon
        className={clsx({
          "cursor-pointer": open,
          "cursor-w-resize ltr:cursor-e-resize": !open,
        })}
        aria-hidden="true"
        width={18}
      />
      <PanelLeft
        className={clsx("no-draggable cursor-w-resize rtl:cursor-e-resize")}
        aria-hidden="true"
      />
    </>
  );
}
