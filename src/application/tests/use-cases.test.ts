import { describe, expect, test } from "bun:test";
import { batchResolveUseCase, type BatchResolveDeps } from "../library/batch-resolve.service";
import { dispatchUseCase, type DispatchDeps } from "../dispatch/dispatch.service";
import { auditProjectUseCase, type AuditDeps } from "../audit/audit.service";
import type { LibraryEntry } from "@/server/mcp/types";

function entry(overrides: Partial<LibraryEntry> & { id: string }): LibraryEntry {
  return {
    name: overrides.id,
    aliases: [],
    description: "stub",
    docsUrl: "https://example.com/docs",
    language: [],
    tags: [],
    ...overrides,
  };
}

const batchStubs: BatchResolveDeps = {
  isSourceEnabled: () => true,
  lookupByAlias: (name: string) =>
    name === "react" ? entry({ id: "facebook/react", name: "React" }) : undefined,
  fuzzySearch: (name: string) =>
    name === "reactjs" ? [entry({ id: "facebook/react", name: "React" })] : [],
  isLibraryBlocked: (id: string) => id === "blocked/lib",
};

describe("batch-resolve use case with stubbed infrastructure", () => {
  test("resolves alias, fuzzy, missing, and extraction-flagged names", async () => {
    const { response, resolved } = await batchResolveUseCase(
      { libraryNames: ["react", "reactjs", "nope-missing", "list all libraries"] },
      batchStubs,
    );
    expect(resolved).toBe(true);
    expect(response.structuredContent.total).toBe(4);
    expect(response.structuredContent.found).toBe(2);
    const flagged = response.structuredContent.results[3];
    expect(flagged?.found).toBe(false);
    expect(flagged).toHaveProperty("blocked", true);
  });

  test("reported blocked entries name the Sources settings", async () => {
    const blockedStubs: BatchResolveDeps = {
      ...batchStubs,
      lookupByAlias: (name: string) =>
        name === "evil" ? entry({ id: "blocked/lib", name: "Evil" }) : undefined,
    };
    const { response } = await batchResolveUseCase({ libraryNames: ["evil"] }, blockedStubs);
    expect(response.structuredContent.found).toBe(0);
    expect(response.content[0]?.text).toContain("blocked by the Sources settings");
  });
});

const dispatchStubs: DispatchDeps = {
  detectIntent: ({ query }) => ({
    tool: "gl_search",
    args: { query },
    reason: "stub",
    confidence: 0.5,
  }),
  renderRoutingTable: () => "ROUTING-TABLE-STUB",
  routingRationale: { gl_search: "stub rationale" },
  routingFallback: "stub fallback",
};

describe("dispatch use case with stubbed infrastructure", () => {
  test("renders the guidance block without touching the network", async () => {
    const { response, resolved } = await dispatchUseCase({ query: "use gl" }, dispatchStubs);
    expect(resolved).toBe(true);
    expect(response.structuredContent.tool).toBe("gl_search");
    expect(response.content[0]?.text).toContain("ROUTING-TABLE-STUB");
    expect(response.content[0]?.text).toContain("stub rationale");
  });

  test("guards the project path for project-level tools", async () => {
    const projectStubs: DispatchDeps = {
      ...dispatchStubs,
      detectIntent: () => ({
        tool: "gl_audit",
        args: {},
        reason: "stub",
        confidence: 0.9,
      }),
    };
    const { response } = await dispatchUseCase(
      { query: "find issues", projectPath: "/etc" },
      projectStubs,
    );
    // /etc is blocked: the use case keeps the bare marker and lets the
    // real tool re-validate, instead of throwing out of dispatch.
    expect(response.structuredContent.tool).toBe("gl_audit");
  });
});

describe("audit use case with stubbed infrastructure", () => {
  const stubDeps: AuditDeps = {
    readProjectFiles: async () => [{ path: "a.ts", content: "const x = 1;" }],
    runPatterns: () => [],
    groupIssues: () => new Map(),
    detectDependencies: async () => [],
    fetchBestPractice: async () => "",
    renderAuditReport: () => ({
      text: "STUB-REPORT",
      structuredContent: {
        projectPath: "/stub",
        filesScanned: 1,
        totalIssues: 0,
        uniqueIssueTypes: 0,
        issues: [],
      },
    }),
  };

  test("rejects blocked paths without reading anything", async () => {
    let read = false;
    const { response, resolved } = await auditProjectUseCase(
      { projectPath: "/etc", categories: ["all"], tokens: 4000, maxFiles: 50 },
      {
        ...stubDeps,
        readProjectFiles: async (...args: Parameters<AuditDeps["readProjectFiles"]>) => {
          read = true;
          return stubDeps.readProjectFiles(...args);
        },
      },
    );
    expect(resolved).toBe(false);
    expect(read).toBe(false);
    expect(response.content[0]?.text).toContain("Invalid project path");
  });

  test("explains manifest-only directories via the dependency seam", async () => {
    const { response } = await auditProjectUseCase(
      { projectPath: "/stub", categories: ["all"], tokens: 4000, maxFiles: 50 },
      {
        ...stubDeps,
        readProjectFiles: async () => [],
        detectDependencies: async () => [{ file: "package.json", dependencies: ["react", "next"] }],
      },
    );
    expect(response.content[0]?.text).toContain("No source files found");
    expect(response.content[0]?.text).toContain("2 declared dependencies");
  });
});
