import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/web/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GetLib MCP - Library dashboard",
  description:
    "GetLib MCP dashboard - resolve libraries, browse docs, and audit dependencies with sample data.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
