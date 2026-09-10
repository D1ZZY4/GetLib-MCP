import type { DispatchDeps } from "@/application/dispatch/dispatch.service";
import { detectIntent, renderRoutingTable } from "@/server/mcp/services/intent-router";
import { ROUTING_FALLBACK, ROUTING_RATIONALE } from "@/server/mcp/sources/routing-rationale";

/**
 * Live infrastructure binding for the dispatch use case. The tool
 * adapter injects this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveDispatchDeps: DispatchDeps = {
  detectIntent,
  renderRoutingTable,
  routingRationale: ROUTING_RATIONALE,
  routingFallback: ROUTING_FALLBACK,
};
