import { definePrompt } from "../registry/prompt-registry";
import { userMessage } from "./message";

export function registerBestPracticesPrompts(): void {
  definePrompt({
    name: "best-practices",
    description: "Get curated best practices for one library with gl_best_practices.",
    args: [
      { name: "libraryId", description: "Library ID, package name, or direct docs URL.", required: true },
      { name: "topic", description: "Practice area, e.g. authentication or performance.", required: false },
    ],
    render: (args) => {
      const topic = args.topic?.trim() ? ` for "${args.topic.trim()}"` : "";
      return userMessage(
        [
          `Give the current best practices for "${args.libraryId}"${topic}.`,
          "",
          "Call gl_best_practices with the same libraryId and topic, then summarize the guidance with source links.",
        ].join("\n"),
      );
    },
  });
}
