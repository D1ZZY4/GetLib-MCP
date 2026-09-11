import { describe, expect, test } from "bun:test";
import { connectStdio } from "./stdio";

describe("stdio transport", () => {
  test("connects the server via the SDK stdio transport", async () => {
    let connected = 0;
    const server = {
      connect: async () => {
        connected += 1;
      },
    };
    await connectStdio(server as never);
    expect(connected).toBe(1);
  });
});
