import { definePrompt } from "../registry/prompt-registry";
import { userMessage } from "./message";

export function registerComparePrompts(): void {
  definePrompt({
    name: "compare-libraries",
    description: "Compare libraries with gl_compare before choosing one.",
    args: [
      { name: "libraries", description: "Comma-separated library names, e.g. react,vue,svelte.", required: true },
      { name: "criteria", description: "Comparison angle, e.g. performance or DX.", required: false },
    ],
    render: (args) => {
      const criteria = args.criteria?.trim() ? ` focusing on ${args.criteria.trim()}` : "";
      return userMessage(
        [
          `Compare these libraries${criteria}: ${args.libraries}.`,
          "",
          "Call gl_compare with the same libraries and criteria, then recommend one with tradeoffs.",
        ].join("\n"),
      );
    },
  });
}
