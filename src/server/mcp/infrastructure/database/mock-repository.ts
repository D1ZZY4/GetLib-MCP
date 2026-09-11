import type {
  ApiKeyRecord,
  BootstrapRecord,
  ClientRecord,
  DatabaseRepository,
  DatabaseStatus,
  NewApiKey,
  NewClientSighting,
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
  private clients: ClientRecord[] = [];
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
    return this.bootstrap ? { ...this.bootstrap } : null;
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
      subject: entry.subject ?? null,
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

  async findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const found = this.apiKeys.find((key) => key.keyHash === keyHash);
    return found ? { ...found } : null;
  }

  async saveApiKey(record: NewApiKey): Promise<ApiKeyRecord> {
    const stored: ApiKeyRecord = {
      id: this.nextApiKeyId++,
      name: record.name,
      keyHash: record.keyHash,
      keyPrefix: record.keyPrefix,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    this.apiKeys.unshift({ ...stored });
    return { ...stored };
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const index = this.apiKeys.findIndex((key) => key.id === id);
    if (index < 0) return false;
    this.apiKeys.splice(index, 1);
    return true;
  }

  async touchApiKeyLastUsed(id: number): Promise<void> {
    const found = this.apiKeys.find((key) => key.id === id);
    if (found) found.lastUsedAt = new Date().toISOString();
  }

  async touchClient(sighting: NewClientSighting): Promise<void> {
    const now = new Date().toISOString();
    const found = this.clients.find((client) => client.id === sighting.id);
    if (found) {
      found.name = sighting.name;
      found.clientVersion = sighting.clientVersion ?? null;
      found.transport = sighting.transport;
      found.userAgent = sighting.userAgent ?? null;
      found.apiKeyId = sighting.apiKeyId ?? null;
      found.authType = sighting.authType;
      found.lastSeenAt = now;
      found.requestCount += 1;
      return;
    }
    this.clients.unshift({
      id: sighting.id,
      name: sighting.name,
      clientVersion: sighting.clientVersion ?? null,
      transport: sighting.transport,
      userAgent: sighting.userAgent ?? null,
      apiKeyId: sighting.apiKeyId ?? null,
      authType: sighting.authType,
      firstSeenAt: now,
      lastSeenAt: now,
      requestCount: 1,
    });
  }

  async listClients(limit: number): Promise<ClientRecord[]> {
    return this.clients
      .slice()
      .sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1))
      .slice(0, Math.max(0, limit))
      .map((client) => ({ ...client }));
  }

  async getClientById(id: string): Promise<ClientRecord | null> {
    const found = this.clients.find((client) => client.id === id);
    return found ? { ...found } : null;
  }

  reset(): void {
    this.bootstrap = null;
    this.logs = [];
    this.apiKeys = [];
    this.clients = [];
    this.nextApiKeyId = 1;
  }
}
