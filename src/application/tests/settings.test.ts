import { describe, expect, test } from "bun:test";
import { getSettingsSnapshot } from "../settings/settings.service";
import { getAuthConfig } from "../auth/auth.service";
import { getRuntimeInfo } from "../runtime/runtime.service";
import { liveSettingsDeps } from "@/server/mcp/infrastructure/deps/settings-deps";
import { liveRuntimeDeps } from "@/server/mcp/infrastructure/deps/runtime-deps";

describe("settings application service", () => {
  test("exposes env-driven configuration without secrets", async () => {
    const snapshot = await getSettingsSnapshot(liveSettingsDeps);
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

  test("no control-plane snapshot carries secret-bearing keys", async () => {
    const snapshots = [
      await getSettingsSnapshot(liveSettingsDeps),
      getAuthConfig(),
      await getRuntimeInfo(liveRuntimeDeps),
    ];
    const forbidden = ["password", "passwd", "secret", "token", "apikey", "privatekey"];
    const keys: string[] = [];
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (value !== null && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
          keys.push(key.toLowerCase().replace(/[_-]/g, ""));
          walk(nested);
        }
      }
    };
    snapshots.forEach(walk);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      for (const bad of forbidden) {
        expect(key.includes(bad)).toBe(false);
      }
    }
  });
});
