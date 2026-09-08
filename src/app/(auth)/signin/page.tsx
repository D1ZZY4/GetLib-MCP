import type { Metadata } from "next";
import { AuthGate } from "../auth-gate";

export const metadata: Metadata = {
  title: "Sign in - GetLib MCP",
  description: "Sign in to open the GetLib dashboard.",
};

export default function Page() {
  return <AuthGate mode="sign-in" />;
}
