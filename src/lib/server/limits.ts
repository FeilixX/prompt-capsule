// Shared rate-limit budgets. Imported by the HTTP API route and the MCP layer
// so both share one bucket per client IP (A2 DRY, C5 MCP-wide budget).

/** Capsule creation: 10/min per client IP. Shared by POST /api/capsules and MCP create_prompt_tape. */
export const CREATE_RATE = { windowMs: 60_000, max: 10 };

/** Coarse budget across ALL /mcp requests (initialize / tools-list / tools-call / bad JSON) per IP. */
export const MCP_RATE = { windowMs: 60_000, max: 60 };

/** Copy telemetry from the /view copy buttons: 20/min per (slug, IP). Keyed per-target so no
 *  single actor can inflate one tape's copy_count past this cap (a per-IP-only bucket would let
 *  one IP pour its whole budget into one slug). Generous for a real reader; it's a vanity metric. */
export const COPY_RATE = { windowMs: 60_000, max: 20 };
