import React, { createContext, useContext } from "react";
import { Dialog } from "./components/ui/dialog";

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DialogContext.Provider
      value={{
        open,
        setOpen,
      }}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        {children}
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside DialogProvider");
  return ctx;
}
