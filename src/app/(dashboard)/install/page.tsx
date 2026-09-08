import type { Metadata } from "next";
import { InstallAssistant } from "@/web/features/install/components/install-assistant";

export const metadata: Metadata = {
  title: "Install to assistant - GetLib MCP",
  description: "Copy the mock MCP snippet and follow the setup steps for your assistant.",
};

export default function Page() {
  return <InstallAssistant />;
}
