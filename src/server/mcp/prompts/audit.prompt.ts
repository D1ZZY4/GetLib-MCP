import { definePrompt } from "../registry/prompt-registry";
import { userMessage } from "./message";

export function registerAuditPrompts(): void {
  definePrompt({
    name: "audit-project",
    description: "Audit a project directory for dependency issues with gl_audit.",
    args: [
      {
        name: "projectPath",
        description: "Project directory to audit. Defaults to the current working directory.",
        required: false,
      },
    ],
    render: (args) => {
      const target = args.projectPath?.trim() ? ` at "${args.projectPath.trim()}"` : "";
      return userMessage(
        [
          `Audit the project${target} for dependency issues.`,
          "",
          "Call gl_audit and gl_auto_scan for the project, then report outdated, vulnerable, and unused dependencies with fixes.",
        ].join("\n"),
      );
    },
  });
}
