import type { Metadata } from "next";
import { AuthGate } from "../auth-gate";

export const metadata: Metadata = {
  title: "Sign up - GetLib MCP",
  description: "Create an account to open the GetLib dashboard.",
};

export default function Page() {
  return <AuthGate mode="sign-up" />;
}
