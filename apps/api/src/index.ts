/**
 * PoolOS API Worker. Every write from the phone goes through here
 * (DESIGN.md section 3, constraint 12). Routes arrive with M2.
 */
export default {
	async fetch(request): Promise<Response> {
		const { pathname } = new URL(request.url);
		if (pathname === '/api/health') return Response.json({ ok: true });
		return Response.json({ error: 'not_found' }, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
