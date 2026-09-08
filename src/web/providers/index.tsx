import type { ReactNode } from "react";
import { Toast } from "@heroui/react";
import { SessionProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        {children}
        <Toast.Provider placement="bottom end" maxVisibleToasts={3} />
      </SessionProvider>
    </ThemeProvider>
  );
}
