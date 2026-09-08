export interface PromptTextMessage {
  role: "user";
  content: { type: "text"; text: string };
}

/** Single user-message envelope every prompt render returns. */
export function userMessage(text: string): { messages: PromptTextMessage[] } {
  return { messages: [{ role: "user", content: { type: "text", text } }] };
}
