import type { Metadata } from "next";
import { InstallAssistant } from "@/web/features/install/components/install-assistant";

export const metadata: Metadata = {
  title: "Install to your AI agents - GetLib MCP",
  description: "Copy the MCP snippet and follow the setup steps for your AI agent.",
};

export default function Page() {
  return <InstallAssistant />;
}
