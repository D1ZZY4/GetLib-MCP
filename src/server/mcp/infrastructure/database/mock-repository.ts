import type {
  ApiKeyRecord,
  BootstrapRecord,
  DatabaseRepository,
  DatabaseStatus,
  NewApiKey,
  PersistedLogEntry,
  StoredLogEntry,
} from "./types";

/**
 * Deterministic in-memory repository for development mock mode and tests.
 * Never used in production - resolveDatabaseMode() forbids it there.
 */
export class MockDatabaseRepository implements DatabaseRepository {
  readonly mode = "mock" as const;
  private bootstrap: BootstrapRecord | null = null;
  private logs: PersistedLogEntry[] = [];
  private apiKeys: ApiKeyRecord[] = [];
  private nextApiKeyId = 1;

  async getStatus(): Promise<DatabaseStatus> {
    return {
      mode: this.mode,
      health: "mock",
      configured: false,
      latencyMs: 0,
      error: null,
      checkedAt: new Date().toISOString(),
    };
  }

  async getBootstrap(): Promise<BootstrapRecord | null> {
    return this.bootstrap;
  }

  async saveBootstrap(record: BootstrapRecord): Promise<void> {
    this.bootstrap = { ...record };
  }

  async saveLog(entry: PersistedLogEntry): Promise<void> {
    this.logs.unshift({ ...entry });
    if (this.logs.length > 200) {
      this.logs.length = 200;
    }
  }

  async listLogs(limit: number): Promise<StoredLogEntry[]> {
    return this.logs.slice(0, Math.max(0, limit)).map((entry, index) => ({
      ...entry,
      id: index + 1,
      timestamp: new Date().toISOString(),
    }));
  }

  async countLogs(): Promise<number> {
    return this.logs.length;
  }

  async listApiKeys(): Promise<ApiKeyRecord[]> {
    return this.apiKeys.map((key) => ({ ...key }));
  }

  async saveApiKey(record: NewApiKey): Promise<ApiKeyRecord> {
    const stored: ApiKeyRecord = {
      id: this.nextApiKeyId++,
      name: record.name,
      keyHash: record.keyHash,
      keyPrefix: record.keyPrefix,
      revoked: false,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    this.apiKeys.unshift({ ...stored });
    return { ...stored };
  }

  async revokeApiKey(id: number): Promise<boolean> {
    const found = this.apiKeys.find((key) => key.id === id);
    if (!found || found.revoked) return false;
    found.revoked = true;
    return true;
  }

  async touchApiKeyLastUsed(id: number): Promise<void> {
    const found = this.apiKeys.find((key) => key.id === id);
    if (found) found.lastUsedAt = new Date().toISOString();
  }

  reset(): void {
    this.bootstrap = null;
    this.logs = [];
    this.apiKeys = [];
    this.nextApiKeyId = 1;
  }
}
