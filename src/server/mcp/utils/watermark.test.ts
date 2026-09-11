import { describe, expect, test } from "bun:test";
import { detectWatermark, embedWatermark } from "./watermark";
import { setConfigOverride, resetConfigOverride } from "../config";

describe("watermark forensic roundtrip", () => {
  test("embedded watermark is detectable with stable install id shape", () => {
    setConfigOverride({ watermarkDisabled: false });
    try {
      const watermarked = embedWatermark("line one\nline two");
      const result = detectWatermark(watermarked);
      expect(result.found).toBe(true);
      expect(result.installId).toMatch(/^[0-9a-f]{8}$/);
      expect(result.nonce).toMatch(/^[0-9a-f]{8}$/);
    } finally {
      resetConfigOverride();
    }
  });

  test("plain text has no watermark", () => {
    expect(detectWatermark("plain text without watermark").found).toBe(false);
  });
});
