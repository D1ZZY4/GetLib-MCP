/**
 * Transport-layer re-export of the canonical mode registry.
 *
 * The data lives in @/domain/mcp/catalog so transports and application
 * services share one source without importing each other. Import from the
 * domain module in new code; this barrel stays for existing import paths.
 */

export {
  TRANSPORT_MODES,
  transportModeIds,
  type TransportMode,
  type TransportModeId,
  type TransportModeStatus,
} from "@/domain/mcp/catalog";
