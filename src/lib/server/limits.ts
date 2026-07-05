// Shared rate-limit budgets. Imported by the HTTP API route and the MCP layer
// so both share one bucket per client IP (A2 DRY, C5 MCP-wide budget).

/** Capsule creation: 10/min per client IP. Shared by POST /api/capsules and MCP create_prompt_tape. */
export const CREATE_RATE = { windowMs: 60_000, max: 10 };

/** Coarse budget across ALL /mcp requests (initialize / tools-list / tools-call / bad JSON) per IP. */
export const MCP_RATE = { windowMs: 60_000, max: 60 };
