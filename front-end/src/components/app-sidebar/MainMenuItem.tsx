import clsx from "clsx";
import { PanelLeft, TvIcon } from "lucide-react";

export default function MainMenuItem({
  setOpen,
}: {
  setOpen: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <>
      <TvIcon
        onClick={() => setOpen(true)}
        className={clsx({
          "cursor-pointer": open,
          "cursor-w-resize ltr:cursor-e-resize": !open,
        })}
        aria-hidden="true"
        width={18}
      />
      <PanelLeft
        onClick={() => setOpen(false)}
        className={clsx("no-draggable cursor-w-resize rtl:cursor-e-resize")}
      />
    </>
  );
}
