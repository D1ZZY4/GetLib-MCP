import { definePrompt } from "../registry/prompt-registry";
import { userMessage } from "./message";

export function registerReviewPrompts(): void {
  definePrompt({
    name: "review-libraries",
    description: "Review installed libraries for version risks with gl_audit.",
    args: [
      {
        name: "projectPath",
        description: "Project directory to audit. Defaults to the current working directory.",
        required: false,
      },
    ],
    render: (args) => {
      const target = args.projectPath?.trim() ? ` in "${args.projectPath.trim()}"` : "";
      return userMessage(
        [
          `Review the installed libraries${target} for version risks.`,
          "",
          "Call gl_audit for the full scan, then summarize: what is outdated, what is vulnerable, and what to upgrade first.",
        ].join("\n"),
      );
    },
  });
}
