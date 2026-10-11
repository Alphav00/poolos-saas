/**
 * Which company's data a request works on. The web app's placeholder sign-in
 * (apps/web/src/lib/app/account.svelte.ts) sets the poolos_company cookie to
 * the brand pack id when a build carries several packs; the default pack sets
 * none. Team boards are then kept per company (boards.ts), so two testers
 * sharing one deployment never see each other's staff, pools or posts.
 *
 * With COMPANY_LOCK = "staff" (wrangler.jsonc), the cookie is checked: an
 * owner may open any company, everyone else only a company whose staff list
 * has their email (refusedCompany below; DECISIONS d0023).
 */
import type { Viewer } from './auth';

const COMPANY = /^[a-z0-9-]{1,40}$/;

/** The company named by the poolos_company cookie, or '' for the default company. */
export function companyFrom(request: Request): string {
	const cookie = request.headers.get('Cookie') ?? '';
	for (const part of cookie.split(';')) {
		const [name, ...rest] = part.trim().split('=');
		if (name === 'poolos_company') {
			const value = rest.join('=').trim();
			return COMPANY.test(value) ? value : '';
		}
	}
	return '';
}

/** The D1 board key: the board itself for the default company, <board>@<company> otherwise. */
export const boardKey = (board: string, company: string | undefined) => (company ? `${board}@${company}` : board);

/** The companies whose staff list has this email ('' is the default company). */
export async function companiesFor(env: Env, email: string): Promise<string[]> {
	const want = email.trim().toLowerCase();
	if (!want) return [];
	const rows = await env.DB.prepare(
		"SELECT DISTINCT board FROM board_docs WHERE collection = 'staff' AND deleted = 0 AND (board = 'field' OR board LIKE 'field@%') AND json_valid(data) AND lower(json_extract(data, '$.email')) = ?",
	).bind(want).all<{ board: string }>();
	return rows.results.map((r) => (r.board === 'field' ? '' : r.board.slice('field@'.length)));
}

/**
 * A 403 when the lock is on and the viewer is not on the staff list of the
 * company they asked for; null when they may go ahead. Owners go anywhere.
 */
export async function refusedCompany(env: Env, viewer: Viewer): Promise<Response | null> {
	if (env.COMPANY_LOCK !== 'staff' || viewer.isOwner) return null;
	const company = viewer.company ?? '';
	if ((await companiesFor(env, viewer.email)).includes(company)) return null;
	const message = `You are not on ${company || 'this company'}'s staff list`;
	return Response.json({ error: { code: 'not_staff', message } }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}
