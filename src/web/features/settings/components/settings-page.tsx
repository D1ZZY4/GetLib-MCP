"use client";

import { useState } from "react";
import { Button, Card, Skeleton } from "@heroui/react";
import { useSearchParams } from "next/navigation";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchRuntimeInfo } from "../services/runtime-api.service";

type TabId = "profile" | "account" | "preferences" | "security" | "about";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
  { id: "about", label: "About" },
];

function validTab(raw: string | null): TabId {
  if (raw === "account" || raw === "preferences" || raw === "security" || raw === "about") {
    return raw;
  }
  return "profile";
}

export function SettingsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(() => validTab(searchParams.get("tab")));
  const { data: runtime, loading, error, retry } = useApiData(
    fetchRuntimeInfo,
    "We couldn't load settings. Try again in a moment.",
  );

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Application configuration and account controls.
          {runtime ? ` Environment: ${runtime.environment} - database: ${runtime.databaseMode}.` : ""}
        </p>
      </header>

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
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : error !== null || runtime === null ? (
        <Card>
          <Card.Header>
            <Card.Title>Settings unavailable</Card.Title>
            <Card.Description>{error ?? "We could not load settings."}</Card.Description>
          </Card.Header>
          <Card.Footer>
            <Button variant="secondary" onPress={retry}>
              Retry
            </Button>
          </Card.Footer>
        </Card>
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
                    <dt className="text-muted">Display name</dt>
                    <dd className="font-medium">{runtime.auth.displayName ?? "Guest"}</dd>
                  </div>
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
                  Theme controls live in the sidebar. Additional preferences land here as
                  they are added.
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
        </>
      )}
    </PageContainer>
  );
}
