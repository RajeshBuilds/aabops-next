"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      toastOptions={{
        classNames: {
          toast: "bg-popover text-popover-foreground border border-border",
        },
      }}
    />
  );
}
