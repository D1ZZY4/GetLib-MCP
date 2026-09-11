"use client";

interface TooltipDatum {
  name?: unknown;
  value?: unknown;
  color?: unknown;
  payload?: unknown;
}

interface ChartTooltipCardProps {
  active?: boolean;
  payload?: TooltipDatum[];
  label?: unknown;
}

function datumName(datum: unknown): string {
  if (datum !== null && typeof datum === "object" && "name" in datum) {
    const name = (datum as { name?: unknown }).name;
    if (typeof name === "string" || typeof name === "number") return String(name);
  }
  return "";
}

function colorOf(item: TooltipDatum): string {
  if (typeof item.color === "string" && item.color.length > 0) return item.color;
  const fill = datumFill(item.payload);
  return fill ?? "var(--accent)";
}

function datumFill(payload: unknown): string | null {
  if (payload !== null && typeof payload === "object" && "fill" in payload) {
    const fill = (payload as { fill?: unknown }).fill;
    if (typeof fill === "string" && fill.length > 0) return fill;
  }
  return null;
}

/**
 * Shared recharts tooltip modeled on the shadcn chart tooltip pattern:
 * a compact card with a label row plus mono tabular values, themed with
 * product tokens so it adapts to light and dark mode. Owned by shared
 * UI: consumed by the statistics and dashboard features.
 */
export function ChartTooltipCard({ active, payload, label }: ChartTooltipCardProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="grid min-w-32 items-start gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {label !== undefined && label !== "" ? (
        <p className="font-medium text-foreground">{String(label)}</p>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item, index) => {
          const name =
            (typeof item.name === "string" || typeof item.name === "number"
              ? String(item.name)
              : datumName(item.payload)) || "";
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: colorOf(item) }}
                />
                {name}
              </span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {item.value === undefined || item.value === null ? "-" : String(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
