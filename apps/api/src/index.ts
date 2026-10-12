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

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/api/health') return Response.json({ ok: true });

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
			const parts = url.pathname.slice('/api/boards'.length).split('/').filter(Boolean).map(decodeURIComponent);
			// A team board's documents belong to a company; the board list and owner boards do not.
			if (parts[0] && boardFor(parts[0], viewer).board?.access === 'team') {
				const refused = await refusedCompany(env, viewer);
				if (refused) return refused;
			}
			return handleBoards(request, env, viewer, parts);
		}
		if (url.pathname === '/api/measure' || url.pathname.startsWith('/api/measure/')) {
			const parts = url.pathname.slice('/api/measure'.length).split('/').filter(Boolean).map(decodeURIComponent);
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
