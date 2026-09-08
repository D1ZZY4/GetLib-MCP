import { definePrompt } from "../registry/prompt-registry";

export function registerReviewPrompts() {
  definePrompt({
    name: "review-libraries",
    description: "Review installed libraries for version risks. (mock)",
    render: () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Review the installed libraries and flag outdated or vulnerable packages.",
          },
        },
      ],
      mock: true,
    }),
  });
}
