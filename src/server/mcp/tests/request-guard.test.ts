import { describe, expect, test } from "bun:test";
import { assertAllowedOrigin, OriginRejectedError } from "../transport/request-guard";

function request(url: string, origin?: string): Request {
  return new Request(url, origin === undefined ? {} : { headers: { origin } });
}

describe("transport origin guard", () => {
  test("non-browser clients without Origin pass through", () => {
    expect(() => assertAllowedOrigin(request("http://localhost/api/mcp"))).not.toThrow();
  });

  test("same-host and localhost origins pass", () => {
    expect(() =>
      assertAllowedOrigin(request("https://get-lib.example.com/api/mcp", "https://get-lib.example.com")),
    ).not.toThrow();
    expect(() =>
      assertAllowedOrigin(request("https://get-lib.example.com/api/mcp", "http://localhost:3000")),
    ).not.toThrow();
  });

  test("forged cross-site origins are rejected", () => {
    expect(() =>
      assertAllowedOrigin(request("https://get-lib.example.com/api/mcp", "https://evil.example")),
    ).toThrow(OriginRejectedError);
  });

  test("malformed Origin headers are rejected", () => {
    expect(() =>
      assertAllowedOrigin(request("https://get-lib.example.com/api/mcp", "not a url [[[ ValueList")),
    ).toThrow(OriginRejectedError);
  });
});
