import { describe, expect, test } from "bun:test";
import {
  migrationUseCase,
  type MigrationDeps,
} from "../library/migration.service";

function baseStubs(): MigrationDeps {
  return {
    lookupById: () => undefined,
    lookupByAlias: () => undefined,
    resolveDynamic: async () => null,
    checkLibraryAccess: () => null,
    fetchVersionGuide: async () => null,
    fetchGitHubMigrationDocs: async () => [],
    fetchConventionalUpgradeDocs: async () => null,
    searchForUpgradeGuide: async () => null,
  };
}

function textOf(result: { response: { content: Array<{ type: "text"; text: string }> } }): string {
  return result.response.content[0]?.text ?? "";
}

describe("migration use case with stubbed infrastructure", () => {
  test("fuzzy-mismatched dynamic result ends in a clean miss", async () => {
    const result = await migrationUseCase(
      { libraryId: "fictional-xyz-999", fromVersion: "1", toVersion: "2", tokens: 1000 },
      {
        ...baseStubs(),
        resolveDynamic: async () => ({
          docsUrl: "https://github.com/oftherivier/fictional",
          displayName: "fictional",
        }),
      },
    );
    expect(result.resolved).toBe(false);
    expect(textOf(result)).toContain('Could not resolve "fictional-xyz-999"');
    expect(textOf(result)).not.toContain("Migration Guide");
  });

  test("matching dynamic result proceeds past the identity gate", async () => {
    const result = await migrationUseCase(
      { libraryId: "mylib", fromVersion: "1", toVersion: "2", tokens: 1000 },
      {
        ...baseStubs(),
        resolveDynamic: async () => ({
          docsUrl: "https://example.com/mylib",
          displayName: "mylib docs",
        }),
      },
    );
    expect(result.resolved).toBe(false);
    expect(textOf(result)).toContain("No migration guides found");
  });

  test("explicit URL targets skip the identity gate", async () => {
    const result = await migrationUseCase(
      { libraryId: "https://docs.example.com", tokens: 1000 },
      {
        ...baseStubs(),
        resolveDynamic: async () => ({
          docsUrl: "https://docs.example.com",
          displayName: "Totally Unrelated Title",
        }),
      },
    );
    expect(textOf(result)).toContain("No migration guides found");
  });
});
