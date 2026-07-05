import type { RequestHandler } from './$types';
import {
	McpServer,
	WebStandardStreamableHTTPServerTransport
} from '@modelcontextprotocol/server';
import * as z from 'zod';

// SPIKE (Task 1): minimal /mcp route with a single `ping` tool, to prove the
// MCP Streamable-HTTP transport works over SvelteKit + Bun with the full
// lifecycle (initialize -> tools/call). Stateless: a fresh server+transport
// per request (sessionIdGenerator: undefined). enableJsonResponse -> plain
// JSON replies (no SSE framing) which are simpler to consume.

function buildServer(): McpServer {
	const server = new McpServer({ name: 'prompt-tape', version: '0.1.0' });
	server.registerTool(
		'ping',
		{ description: 'health check', inputSchema: z.object({}) },
		async () => ({ content: [{ type: 'text', text: 'pong' }] })
	);
	return server;
}

export const POST: RequestHandler = async ({ request }) => {
	const server = buildServer();
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true
	});
	await server.connect(transport);
	return transport.handleRequest(request);
};
