import { describe, expect, test } from "bun:test";
import { assertPublicUrl } from "../utils/guard";

function blocked(url: string): void {
  expect(() => assertPublicUrl(url)).toThrow("Private/internal URL");
}

function allowed(url: string): void {
  expect(() => assertPublicUrl(url)).not.toThrow();
}

describe("assertPublicUrl SSRF pre-check", () => {
  test("blocks loopback in decimal, octal, and hex forms", () => {
    blocked("http://127.0.0.1/");
    blocked("http://2130706433/");
    blocked("http://0177.0.0.1/");
    blocked("http://0x7f.0.0.1/");
    blocked("http://0x7f000001/");
    blocked("http://localhost/");
    blocked("http://localhost./");
    blocked("http://[::1]/");
  });

  test("blocks userinfo-smuggled private hosts", () => {
    // URL.hostname already excludes userinfo, so the private host is seen.
    blocked("http://public@127.0.0.1/");
    blocked("http://example.com@10.0.0.1/");
  });

  test("blocks private, CGNAT, link-local, and reserved ranges", () => {
    blocked("http://10.0.0.1/");
    blocked("http://172.16.0.1/");
    blocked("http://192.168.1.1/");
    blocked("http://100.64.0.1/");
    blocked("http://169.254.169.254/");
    blocked("http://0.0.0.0/");
    blocked("http://192.0.0.1/");
    blocked("http://192.0.2.1/");
    blocked("http://198.51.100.1/");
    blocked("http://203.0.113.1/");
    blocked("http://198.18.0.1/");
    blocked("http://224.0.0.1/");
  });

  test("blocks non-http protocols and invalid URLs", () => {
    expect(() => assertPublicUrl("file:///etc/passwd")).toThrow("Unsupported URL protocol");
    expect(() => assertPublicUrl("not a url")).toThrow("Invalid URL");
  });

  test("allows public hosts", () => {
    allowed("https://example.com/docs");
    allowed("https://8.8.8.8/");
    allowed("http://registry.npmjs.org/react");
  });
});
