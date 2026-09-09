import { describe, expect, test } from "bun:test";
import { getSettingsSnapshot } from "../settings/settings.service";

describe("settings application service", () => {
  test("exposes env-driven configuration without secrets", async () => {
    const snapshot = await getSettingsSnapshot();
    expect(["development", "production"]).toContain(snapshot.general.environment);
    expect(typeof snapshot.general.server).toBe("string");
    expect(typeof snapshot.authentication.enabled).toBe("boolean");
    expect(snapshot.mcp.transports.length).toBeGreaterThan(0);
    expect(snapshot.mcp.tools).toBeGreaterThan(0);
    expect(["mock", "supabase-development", "supabase-production"]).toContain(
      snapshot.database.mode,
    );
    const serialized = JSON.stringify(snapshot).toLowerCase();
    expect(serialized).not.toContain("getlib123");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token");
  });
});
