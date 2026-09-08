import { definePrompt } from "../registry/prompt-registry";
import { userMessage } from "./message";

export function registerDocsPrompts(): void {
  definePrompt({
    name: "get-docs",
    description: "Fetch documentation for one library with gl_get_docs.",
    args: [
      { name: "libraryId", description: "Library ID, package name, or direct docs URL.", required: true },
      { name: "topic", description: "What to look up inside the docs.", required: false },
    ],
    render: (args) => {
      const topic = args.topic?.trim() ? ` about "${args.topic.trim()}"` : "";
      return userMessage(
        [
          `Fetch the documentation for "${args.libraryId}"${topic}.`,
          "",
          "Call gl_get_docs with the same libraryId and topic, then answer from the returned content and cite the source URL.",
        ].join("\n"),
      );
    },
  });
}
