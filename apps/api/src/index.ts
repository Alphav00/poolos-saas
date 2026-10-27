/**
 * PoolOS Worker. Every request is checked against Cloudflare Access before
 * anything is served, including the static pages. Every write from the phone
 * goes through here (DESIGN.md section 3, constraint 12).
 */
import { viewerFrom } from './auth';
import { boardFor, handleBoards } from './boards';
import { companiesFor, companyFrom, refusedCompany } from './company';
import { handleChem } from './chem';
import { handleMeasure } from './measure';
import { canEditPools, roleFor } from './roles';
import { handleWeather } from './weather';

const fail = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

/** Path segments decoded, or null when one holds a malformed escape like "%E0%A4%A". */
function pathParts(rest: string): string[] | null {
	try {
		return rest.split('/').filter(Boolean).map(decodeURIComponent);
	} catch {
		return null;
	}
}

/**
 * A write from another site riding on the Access cookie. Browsers say where a
 * request came from in Sec-Fetch-Site; older ones only send Origin. Tools with
 * neither (curl, the e2e runner) are not browsers and carry no cookie to abuse.
 */
function crossSiteWrite(request: Request): boolean {
	if (request.method === 'GET' || request.method === 'HEAD') return false;
	const site = request.headers.get('Sec-Fetch-Site');
	if (site) return site === 'cross-site' || site === 'same-site';
	const origin = request.headers.get('Origin');
	return origin !== null && origin !== new URL(request.url).origin;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/api/health') return Response.json({ ok: true });
		if (url.pathname.startsWith('/api/') && crossSiteWrite(request)) return fail(403, 'forbidden', 'Writes must come from this site');

		const signedIn = await viewerFrom(request, env);
		const viewer = signedIn && { ...signedIn, company: companyFrom(request) };
		if (!viewer) {
			return url.pathname.startsWith('/api/')
				? Response.json({ error: { code: 'unauthenticated', message: 'Sign in through Cloudflare Access' } }, { status: 401 })
				: new Response('Sign in required.', { status: 401, headers: { 'Content-Type': 'text/plain' } });
		}

		if (url.pathname === '/api/me') {
			const role = await roleFor(env, viewer.email, viewer.company);
			// companies: where this viewer may work ('' is the default company); 'all' for an owner.
			const companies = viewer.isOwner ? 'all' : await companiesFor(env, viewer.email);
			return Response.json({ email: viewer.email, isOwner: viewer.isOwner, role, canEditPools: canEditPools(viewer.isOwner, role), company: viewer.company, companies });
		}
		if (url.pathname === '/api/boards' || url.pathname.startsWith('/api/boards/')) {
			const parts = pathParts(url.pathname.slice('/api/boards'.length));
			if (!parts) return fail(400, 'bad_request', 'Bad escape in the address');
			// A team board's documents belong to a company; the board list and owner boards do not.
			if (parts[0] && boardFor(parts[0], viewer).board?.access === 'team') {
				const refused = await refusedCompany(env, viewer);
				if (refused) return refused;
			}
			return handleBoards(request, env, viewer, parts);
		}
		if (url.pathname === '/api/measure' || url.pathname.startsWith('/api/measure/')) {
			const parts = pathParts(url.pathname.slice('/api/measure'.length));
			// Measure answers errors as {detail}, the shape its app reads (src/measure.ts).
			if (!parts) return Response.json({ detail: 'Bad escape in the address' }, { status: 400 });
			// Saved jobs belong to a company; shapes, fixtures and health do not.
			if (parts[0] === 'jobs') {
				const refused = await refusedCompany(env, viewer);
				if (refused) return refused;
			}
			return handleMeasure(request, env, viewer, parts);
		}
		if (url.pathname.startsWith('/api/chem/')) {
			return handleChem(request, url.pathname.slice('/api/chem/'.length).split('/').filter(Boolean));
		}
		if (url.pathname === '/api/weather') return handleWeather(request, fetch, caches.default, (p) => ctx.waitUntil(p));
		if (url.pathname.startsWith('/api/')) return Response.json({ error: { code: 'not_found', message: 'No such route' } }, { status: 404 });

		// Owner-only board pages are refused here, before the page is served.
		const page = url.pathname.match(/^\/boards\/([a-z0-9-]+)(?:\.html)?\/?$/);
		if (page && page[1] && boardFor(page[1], viewer).board && !boardFor(page[1], viewer).allowed) {
			return new Response('This board is for owners only.', { status: 403, headers: { 'Content-Type': 'text/plain' } });
		}

		// Measure is its own single-page app under /measure: client-side routes
		// (no file extension) get its index.html.
		if (/^\/measure(\/|$)/.test(url.pathname) && !/\.[a-z0-9]+$/i.test(url.pathname)) {
			return env.ASSETS.fetch(new Request(new URL('/measure/', url), request));
		}

		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
