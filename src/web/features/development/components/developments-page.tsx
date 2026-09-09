"use client";

import { useState } from "react";
import { Button, Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchRuntimeInfo } from "@/web/features/settings/services/runtime-api.service";
import {
  fetchDevelopmentSettings,
  resetDevelopmentData,
  seedDevelopmentData,
  updateDatabaseMode,
  type DatabaseModeOption,
} from "../services/development-api.service";

const MODE_META: Record<DatabaseModeOption, { label: string; description: string }> = {
  mock: {
    label: "Mock",
    description: "Deterministic in-memory data. Fast UI work and offline development.",
  },
  supabase: {
    label: "Supabase Development",
    description: "Real persistence against the development Supabase project.",
  },
};

function isActiveMode(settings: { databaseMode: string }, mode: DatabaseModeOption): boolean {
  return mode === "mock" ? settings.databaseMode === "mock" : settings.databaseMode !== "mock";
}

/**
 * Development page - development runtime controls.
 * Development-only surface: in production it renders an unavailable notice
 * instead of any runtime controls, and the sidebar link stays hidden.
 * Database-mode switches apply immediately to the running server process;
 * env-based settings (auth, Supabase keys) need an env change plus restart.
 */
export function DevelopmentsPage() {
  const {
    data: runtime,
    loading: runtimeLoading,
    error: runtimeError,
    retry: retryRuntime,
  } = useApiData(fetchRuntimeInfo, "We couldn't load development status. Try again in a moment.");
  const {
    data: settings,
    loading: settingsLoading,
    error: settingsError,
    retry: retrySettings,
  } = useApiData(
    fetchDevelopmentSettings,
    "We couldn't load development settings. Try again in a moment.",
  );
  const [saving, setSaving] = useState<DatabaseModeOption | "env-reset" | "seed" | "data-reset" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lifecycleDone, setLifecycleDone] = useState<string | null>(null);

  const loading = runtimeLoading || settingsLoading;
  const error = runtimeError ?? settingsError;
  const failed = runtime === null || settings === null;

  async function applyMode(mode: DatabaseModeOption | null) {
    setSaving(mode === null ? "env-reset" : mode);
    setSaveError(null);
    try {
      await updateDatabaseMode(mode);
      retrySettings();
      retryRuntime();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't switch database mode. Try again.");
    } finally {
      setSaving(null);
    }
  }

  async function applyLifecycle(action: "seed" | "reset") {
    setSaving(action === "seed" ? "seed" : "data-reset");
    setSaveError(null);
    setLifecycleDone(null);
    try {
      if (action === "seed") {
        await seedDevelopmentData();
        setLifecycleDone("Seeded development data.");
      } else {
        await resetDevelopmentData();
        setLifecycleDone("Reset development data and reseeded.");
      }
      retrySettings();
      retryRuntime();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't update development data. Try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Development"
        description="Development runtime behavior and diagnostics. Available in development only."
      />

      {loading ? (
        <div role="status" aria-label="Loading development status" className="flex flex-col gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : error !== null || failed || runtime === null || settings === null ? (
        <LoadError
          message={error ?? "We could not load development status."}
          onRetry={() => {
            retryRuntime();
            retrySettings();
          }}
        />
      ) : runtime.environment !== "development" ? (
        <Card>
          <Card.Header>
            <Card.Title>Not available in production</Card.Title>
            <Card.Description>
              Development controls are hidden on production. This page only exists in
              development environments.
            </Card.Description>
          </Card.Header>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <Card.Header>
              <Card.Title>Database mode</Card.Title>
              <Card.Description>
                Switches apply immediately to this server process. Restoring the env
                default happens on restart.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div role="group" aria-label="Database mode" className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(MODE_META) as DatabaseModeOption[]).map((mode) => {
                  const active = isActiveMode(settings, mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      disabled={saving !== null}
                      onClick={() => {
                        if (!active) void applyMode(mode);
                      }}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border hover:bg-surface-secondary"
                      } disabled:cursor-wait disabled:opacity-60`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{MODE_META[mode].label}</span>
                        {active ? (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                            Active
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">
                        {MODE_META[mode].description}
                      </span>
                    </button>
                  );
                })}
              </div>
              {saving !== null ? (
                <p role="status" className="mt-3 text-sm text-muted">
                  Switching database mode...
                </p>
              ) : null}
              {saveError !== null ? (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {saveError}
                </p>
              ) : null}
              {settings.override !== null ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-secondary px-3 py-2">
                  <p className="text-xs text-muted">
                    Realtime override active. Env default is {settings.envDefault}.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    isDisabled={saving !== null}
                    onPress={() => void applyMode(null)}
                  >
                    Reset to env default
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  Following env default ({settings.envDefault}). Pick a mode above for a
                  realtime override.
                </p>
              )}
              {!settings.supabaseConfigured ? (
                <p className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
                  Supabase is not configured. Switching to Supabase Development will report
                  unavailable until GETLIB_SUPABASE_URL and GETLIB_SUPABASE_ANON_KEY are set
                  and the server restarts.
                </p>
              ) : null}
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Seed and reset</Card.Title>
              <Card.Description>
                Development data lifecycle. Seeding ensures the bootstrap record exists;
                reset clears in-memory mock data and reseeds. Real database modes are
                never wiped.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  isDisabled={saving !== null}
                  onPress={() => void applyLifecycle("seed")}
                >
                  {saving === "seed" ? "Seeding..." : "Seed data"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isDisabled={saving !== null}
                  onPress={() => void applyLifecycle("reset")}
                >
                  {saving === "data-reset" ? "Resetting..." : "Reset data"}
                </Button>
              </div>
              {lifecycleDone !== null ? (
                <p role="status" className="mt-3 text-sm text-muted">
                  {lifecycleDone}
                </p>
              ) : null}
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Environment</Card.Title>
              <Card.Description>Active runtime and database status.</Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Environment</dt>
                  <dd className="font-medium">{runtime.environment}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Database mode</dt>
                  <dd className="font-medium">{runtime.databaseMode}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Supabase configured</dt>
                  <dd className="font-medium">{runtime.supabaseConfigured ? "Yes" : "No"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Database health</dt>
                  <dd className="font-medium capitalize">{runtime.database.health}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Authentication</dt>
                  <dd className="font-medium">
                    {runtime.auth.enabled ? "Enabled" : "Disabled"} (env, needs restart to change)
                  </dd>
                </div>
              </dl>
              {runtime.isMock ? (
                <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm">
                  Mock database is active. Data is deterministic and in-memory.
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Real database mode. Mock controls are unavailable.
                </p>
              )}
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Diagnostics</Card.Title>
              <Card.Description>Runtime information for local debugging.</Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">NODE_ENV</dt>
                  <dd>{runtime.nodeEnv ?? "unset"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">VERCEL_ENV</dt>
                  <dd>{runtime.vercelEnv ?? "unset"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Uptime</dt>
                  <dd>{runtime.health.uptimeSeconds}s</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Tools</dt>
                  <dd>{runtime.health.tools}</dd>
                </div>
              </dl>
            </Card.Content>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
