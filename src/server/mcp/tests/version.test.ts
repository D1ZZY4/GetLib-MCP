import { describe, expect, test } from "bun:test";
import { SERVER_NAME, SERVER_VERSION } from "../constants";
import packageJson from "../../../../package.json";

describe("version contract", () => {
  test("server version matches package.json - one version, no drift", () => {
    expect(SERVER_VERSION).toBe(packageJson.version);
  });

  test("server name is stable for MCP clients", () => {
    expect(SERVER_NAME).toBe("getlib-mcp");
  });

  test("version follows semver", () => {
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
