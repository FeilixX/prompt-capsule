import type { RequestHandler } from './$types';
import {
	McpServer,
	WebStandardStreamableHTTPServerTransport,
	type CallToolResult
} from '@modelcontextprotocol/server';
import * as z from 'zod';
import { getDb, config } from '$lib/server/db';
import { checkRateLimit } from '$lib/server/rateLimit';
import { MCP_RATE } from '$lib/server/limits';
import { mcpCreate, mcpRead, mcpDelete, type McpResult } from '$lib/server/mcp';

// Adapt the pure wrapper result (kept SDK-free for bun test) to the SDK's
// CallToolResult. Runtime shapes match (content[]/structuredContent/isError);
// only the hand-declared type differs, so this cast is safe at the SDK boundary.
const toResult = (r: McpResult): CallToolResult => r as unknown as CallToolResult;

// Remote MCP endpoint. Thin shell: the SDK transport handles the MCP protocol
// (lifecycle, protocol-version negotiation, JSON-RPC framing); all tool logic
// lives in $lib/server/mcp.ts. Stateless (a fresh server+transport per POST),
// so per-request client IP flows into the tool wrappers via closure.

const TAPE_LIMITS = { maxTtl: 604800 };

function buildServer(clientIp: string): McpServer {
	const server = new McpServer({ name: 'prompt-tape', version: '0.1.0' });
	const deps = () => ({ db: getDb(), config, clientIp, nowMs: Date.now() });

	server.registerTool(
		'create_prompt_tape',
		{
			description:
				'把一段提示词/文本封成一次性卡带 URL。content ≤16KB;ttl_seconds ≤604800(7天,缺省7天)。返回 view_url(人看)、raw_url(agent 直接 fetch)、delete_token、expires_at、agent_text。',
			inputSchema: z.object({
				content: z.string().describe('要封存的提示词/文本正文'),
				title: z.string().max(200).optional(),
				ttl_seconds: z.number().int().positive().max(TAPE_LIMITS.maxTtl).optional()
			})
		},
		async (args) => toResult(mcpCreate(deps(), args))
	);

	server.registerTool(
		'read_prompt_tape',
		{
			description: '读取一个卡带的正文。target 可以是 slug 或完整 URL(/c/… 或 /view/…)。',
			inputSchema: z.object({ target: z.string().describe('slug 或卡带 URL') })
		},
		async (args) => toResult(mcpRead(deps(), args))
	);

	server.registerTool(
		'delete_prompt_tape',
		{
			description: '用 delete_token 删除一个卡带。',
			inputSchema: z.object({ slug: z.string(), delete_token: z.string() })
		},
		async (args) => toResult(mcpDelete(deps(), args))
	);

	return server;
}

/** C4: reject browser cross-origin (DNS-rebinding). Non-browser clients omit Origin -> allowed. */
function originAllowed(request: Request): boolean {
	const origin = request.headers.get('origin');
	if (!origin) return true; // Claude/Cursor/curl send no Origin
	let host: string;
	try {
		host = new URL(origin).hostname;
	} catch {
		return false;
	}
	if (host === 'localhost' || host === '127.0.0.1') return true;
	return config.allowedHosts.includes(host);
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const clientIp = getClientAddress();

	if (!originAllowed(request)) {
		return Response.json({ error: 'origin not allowed' }, { status: 403 });
	}

	// C5: coarse per-IP budget across ALL /mcp requests.
	const rl = checkRateLimit(`mcp:${clientIp}`, Date.now(), MCP_RATE);
	if (!rl.allowed) {
		return Response.json({ error: 'rate limited' }, { status: 429 });
	}

	try {
		const server = buildServer(clientIp);
		const transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true
		});
		await server.connect(transport);
		return await transport.handleRequest(request);
	} catch (e) {
		console.error(JSON.stringify({ evt: 'mcp_route_error', msg: String(e) }));
		return Response.json(
			{ jsonrpc: '2.0', error: { code: -32603, message: 'internal error' }, id: null },
			{ status: 500 }
		);
	}
};

// C9: explicit 405 for GET (stateless: no server-initiated SSE stream).
export const GET: RequestHandler = async () =>
	new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
