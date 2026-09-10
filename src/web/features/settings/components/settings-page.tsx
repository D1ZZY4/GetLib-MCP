"use client";

import { useEffect, useState } from "react";
import { Button, Card, Skeleton } from "@heroui/react";
import { useSearchParams } from "next/navigation";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { DefinitionListSkeleton } from "@/web/components/ui/skeletons";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchRuntimeInfo } from "../services/runtime-api.service";
import { fetchSettings } from "../services/settings-api.service";

type TabId = "profile" | "account" | "preferences" | "security" | "about" | "configuration";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
  { id: "about", label: "About" },
  { id: "configuration", label: "Configuration" },
];

function validTab(raw: string | null): TabId {
  if (
    raw === "account" ||
    raw === "preferences" ||
    raw === "security" ||
    raw === "about" ||
    raw === "configuration"
  ) {
    return raw;
  }
  return "profile";
}

export function SettingsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(() => validTab(searchParams.get("tab")));
  useEffect(() => {
    setTab(validTab(searchParams.get("tab")));
  }, [searchParams]);
  const { data: runtime, loading, error, retry } = useApiData(
    fetchRuntimeInfo,
    "We couldn't load settings. Try again in a moment.",
  );
  const {
    data: settings,
    loading: settingsLoading,
    error: settingsError,
    retry: retrySettings,
  } = useApiData(fetchSettings, "We couldn't load configuration. Try again in a moment.");

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description={`Application configuration and account controls.${runtime ? ` Environment: ${runtime.environment} - database: ${runtime.databaseMode}.` : ""}`}
      />

      <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Button
            key={entry.id}
            variant={tab === entry.id ? "primary" : "secondary"}
            size="sm"
            onPress={() => setTab(entry.id)}
            aria-current={tab === entry.id ? "page" : undefined}
          >
            {entry.label}
          </Button>
        ))}
      </nav>

      {loading ? (
        <div role="status" aria-label="Loading settings" className="flex flex-col gap-4">
          <Card>
            <Card.Header>
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </Card.Header>
            <Card.Content>
              <DefinitionListSkeleton rows={4} />
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-48 max-w-full rounded" />
            </Card.Header>
            <Card.Content>
              <DefinitionListSkeleton rows={3} />
            </Card.Content>
          </Card>
        </div>
      ) : error !== null || runtime === null ? (
        <LoadError message={error ?? "We could not load settings."} onRetry={retry} />
      ) : (
        <>
          {tab === "profile" ? (
            <Card>
              <Card.Header>
                <Card.Title>Profile</Card.Title>
                <Card.Description>Display identity for this dashboard context.</Card.Description>
              </Card.Header>
              <Card.Content>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Authentication</dt>
                    <dd className="font-medium">{runtime.auth.enabled ? "Enabled" : "Disabled"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Environment</dt>
                    <dd className="font-medium">{runtime.environment}</dd>
                  </div>
                </dl>
              </Card.Content>
            </Card>
          ) : null}

          {tab === "account" ? (
            <Card>
              <Card.Header>
                <Card.Title>Account</Card.Title>
                <Card.Description>Authentication status and bootstrap credentials.</Card.Description>
              </Card.Header>
              <Card.Content>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Auth mode</dt>
                    <dd className="font-medium">{runtime.auth.enabled ? "Enabled" : "Disabled"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Default credentials</dt>
                    <dd className="font-medium">
                      {runtime.auth.fallbackActive ? "Fallback active - rotate now" : "Custom"}
                    </dd>
                  </div>
                </dl>
                {runtime.auth.fallbackActive ? (
                  <p role="alert" className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
                    Fallback credentials are active. Set GETLIB_DEFAULT_ACCOUNT and
                    GETLIB_DEFAULT_PASS, then restart. Never share the password.
                  </p>
                ) : null}
                {!runtime.auth.enabled ? (
                  <p className="mt-3 text-sm text-muted">
                    Authentication is disabled, so no sign-in is required. Sensitive
                    management operations remain policy-protected.
                  </p>
                ) : null}
              </Card.Content>
            </Card>
          ) : null}

          {tab === "preferences" ? (
            <Card>
              <Card.Header>
                <Card.Title>Preferences</Card.Title>
                <Card.Description>Personal display preferences.</Card.Description>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-muted">
                  Theme controls live in the sidebar. More preferences will appear here
                  when this dashboard gains user-configurable display options.
                </p>
              </Card.Content>
            </Card>
          ) : null}

          {tab === "security" ? (
            <Card>
              <Card.Header>
                <Card.Title>Security</Card.Title>
                <Card.Description>Authentication policy and protected operations.</Card.Description>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-muted">
                  Disabling authentication never disables validation, rate limiting, SSRF
                  protection, or transport security. Password values are never readable
                  after they are stored.
                </p>
              </Card.Content>
            </Card>
          ) : null}

          {tab === "about" ? (
            <Card>
              <Card.Header>
                <Card.Title>About</Card.Title>
                <Card.Description>Server identity and capability counts.</Card.Description>
              </Card.Header>
              <Card.Content>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Server</dt>
                    <dd className="font-medium">
                      {runtime.health.name} v{runtime.health.version}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Registry</dt>
                    <dd className="font-medium">{runtime.health.registryEntries} libraries</dd>
                  </div>
                </dl>
              </Card.Content>
            </Card>
          ) : null}

          {tab === "configuration" ? (
            <Card>
              <Card.Header>
                <Card.Title>Configuration</Card.Title>
                <Card.Description>
                  Environment-driven application configuration. Values change via environment
                  variables plus restart - secrets are never shown here.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                {settingsLoading ? (
                  <div role="status" aria-label="Loading configuration" className="flex flex-col gap-2">
                    <Skeleton className="h-6 rounded-lg" />
                    <Skeleton className="h-6 rounded-lg" />
                    <Skeleton className="h-6 rounded-lg" />
                  </div>
                ) : settingsError !== null || settings === null ? (
                  <LoadError message={settingsError ?? "Configuration snapshot unavailable."} onRetry={retrySettings} />
                ) : (
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Server</dt>
                      <dd className="font-medium">
                        {settings.general.server} v{settings.general.version}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Environment</dt>
                      <dd className="font-medium">{settings.general.environment}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Authentication</dt>
                      <dd className="font-medium">
                        {settings.authentication.enabled ? "Enabled" : "Disabled"}
                        {settings.authentication.fallbackActive ? " (fallback credentials)" : ""}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Transports</dt>
                      <dd className="font-medium">{settings.mcp.transports.join(" + ")}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Capabilities</dt>
                      <dd className="font-medium tabular-nums">
                        {settings.mcp.tools} tools · {settings.mcp.resources} resources ·{" "}
                        {settings.mcp.prompts} prompts
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Database</dt>
                      <dd className="font-medium">
                        {settings.database.mode}
                        {settings.database.isMock ? " (mock)" : ""}
                      </dd>
                    </div>
                  </dl>
                )}
              </Card.Content>
            </Card>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
