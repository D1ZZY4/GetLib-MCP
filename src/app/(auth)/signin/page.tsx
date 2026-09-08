import type { Metadata } from "next";
import { SignInGate } from "./signin-gate";

export const metadata: Metadata = {
  title: "Sign in - GetLib MCP",
  description: "Sign in with mock data to open the GetLib dashboard.",
};

export default function Page() {
  return <SignInGate />;
}
