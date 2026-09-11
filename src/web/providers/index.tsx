import type { ReactNode } from "react";
import { SessionProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastViewport } from "@/web/components/ui/toast-viewport";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        {children}
        <ToastViewport />
      </SessionProvider>
    </ThemeProvider>
  );
}
