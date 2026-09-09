import { describe, expect, test } from "bun:test";
import { getInstallCatalog } from "../install/install.service";
import { TRANSPORT_MODES } from "@/domain/mcp/catalog";

describe("install application service", () => {
  test("assistants and transports are present", () => {
    const catalog = getInstallCatalog();
    expect(catalog.assistants.length).toBeGreaterThan(0);
    expect(catalog.transports.length).toBe(TRANSPORT_MODES.length);
  });

  test("transports derive from the canonical registry", () => {
    const catalog = getInstallCatalog();
    const ids = catalog.transports.map((mode) => mode.id).sort();
    const canonical = TRANSPORT_MODES.map((mode) => mode.id).sort();
    expect(ids).toEqual(canonical);
  });
});
