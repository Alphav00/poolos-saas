/**
 * Which company's data a request works on. The web app's placeholder sign-in
 * (apps/web/src/lib/app/account.svelte.ts) sets the poolos_company cookie to
 * the brand pack id when a build carries several packs; the default pack sets
 * none. Team boards are then kept per company (boards.ts), so two testers
 * sharing one deployment never see each other's staff, pools or posts.
 *
 * This is a placeholder, not access control: Cloudflare Access decides who
 * gets in, and anyone it lets in can pick either company (DECISIONS d0022).
 */
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
