import type {
  BootstrapRecord,
  DatabaseRepository,
  DatabaseStatus,
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

  reset(): void {
    this.bootstrap = null;
    this.logs = [];
  }
}
