import { definePrompt } from "../registry/prompt-registry";
import { userMessage } from "./message";

export function registerMigrationPrompts(): void {
  definePrompt({
    name: "migrate-library",
    description: "Plan a library upgrade with gl_migration and gl_changelog.",
    args: [
      { name: "libraryId", description: "Library ID or package name.", required: true },
      { name: "fromVersion", description: "Currently installed version.", required: false },
      { name: "toVersion", description: "Target version.", required: false },
    ],
    render: (args) => {
      const from = args.fromVersion?.trim() ? ` from ${args.fromVersion.trim()}` : "";
      const to = args.toVersion?.trim() ? ` to ${args.toVersion.trim()}` : "";
      return userMessage(
        [
          `Plan migrating "${args.libraryId}"${from}${to}.`,
          "",
          "Call gl_migration with the same versions, check gl_changelog for breaking changes, then list the steps in order with code changes.",
        ].join("\n"),
      );
    },
  });
}
