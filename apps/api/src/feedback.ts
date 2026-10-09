/**
 * The `feedback` board: problem reports from people testing the app.
 *   reports/<id>   one report, written from the app's "Report a problem" form
 *
 * The Worker stamps who reported it and when. With the LINEAR_API_KEY secret
 * and the LINEAR_* vars in wrangler.jsonc set, a new report is also opened as a Linear issue and
 * the issue's id and link are saved on the report. Without them the report
 * stays in D1 for the owner to triage by hand.
 */
export const AREAS: Record<string, string> = {
	dispatch: 'Dispatch',
	route: 'Route View',
	field: 'Tech Field Portal',
	chemistry: 'Chemical Logger',
	measure: 'Measure',
	invoicing: 'Invoicing',
	other: 'Other',
};
export const SEVERITIES: Record<string, { label: string; linearPriority: number }> = {
	blocker: { label: 'Blocker: stops the work', linearPriority: 1 },
	major: { label: 'Major: wrong result or a hard workaround', linearPriority: 2 },
	minor: { label: 'Minor: annoying, has a workaround', linearPriority: 3 },
	idea: { label: 'Idea or wish', linearPriority: 4 },
};
export const DEVICES = new Set(['phone', 'tablet', 'desktop']);
const ID = /^r-\d{8}-\d{6}-[a-z0-9]{4}$/;
const LIMITS: Record<string, number> = { title: 120, expected: 2000, actual: 2000, steps: 2000, screen: 200, userAgent: 300 };
const REQUIRED = ['title', 'actual'];
const STAMPED = ['reporter', 'reportedAt', 'linear', 'linearUrl'];
/** Only links into Linear are kept, so the app never renders a javascript: or other link from a report. */
export const LINEAR_URL = /^https:\/\/linear\.app\/[^\s"<>]{1,180}$/;
const LINEAR_ID = /^[A-Z][A-Z0-9]{0,9}-\d{1,7}$/;

const isText = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export function checkFeedbackDoc(collection: string, id: string, data: Record<string, unknown>): string | null {
	if (collection !== 'reports') return 'The feedback board only keeps "reports"';
	if (!ID.test(id)) return 'Report ids look like "r-<yyyymmdd>-<hhmmss>-<4 letters>"';
	if (!Object.hasOwn(AREAS, String(data.area))) return `area must be one of ${Object.keys(AREAS).join(', ')}`;
	if (!Object.hasOwn(SEVERITIES, String(data.severity))) return `severity must be one of ${Object.keys(SEVERITIES).join(', ')}`;
	if (!DEVICES.has(data.device as string)) return 'device must be phone, tablet or desktop';
	for (const k of REQUIRED) if (!isText(data[k], LIMITS[k]!)) return `"${k}" is needed (at most ${LIMITS[k]} characters)`;
	for (const [k, max] of Object.entries(LIMITS)) {
		if (data[k] !== undefined && data[k] !== '' && !isText(data[k], max)) return `"${k}" must be text of at most ${max} characters`;
	}
	if (data.status !== undefined && !['new', 'in-linear', 'fixed', 'wont-fix'].includes(data.status as string)) return 'status must be new, in-linear, fixed or wont-fix';
	if ((data.linear === undefined) !== (data.linearUrl === undefined)) return 'linear and linearUrl go together';
	if (data.linear !== undefined && (typeof data.linear !== 'string' || !LINEAR_ID.test(data.linear))) return 'linear must be a Linear issue id like HEP-12';
	if (data.linearUrl !== undefined && (typeof data.linearUrl !== 'string' || !LINEAR_URL.test(data.linearUrl))) return 'linearUrl must be an https://linear.app/ link';
	const allowed = new Set(['area', 'severity', 'device', 'status', ...Object.keys(LIMITS), ...STAMPED]);
	const extra = Object.keys(data).filter((k) => !allowed.has(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}

/**
 * Who reported it and when come from the sign-in, not the form, and never change.
 * The Linear link and the status are set by the Worker (sendToLinear) or by an
 * owner; anything else a form sends for them is dropped, so a tester cannot plant
 * a link that the report list later shows, or mark their own report fixed.
 */
export function stampFeedback(data: Record<string, unknown>, previous: Record<string, unknown> | null, email: string, at: string, isOwner: boolean) {
	const { reporter: _reporter, reportedAt: _reportedAt, linear, linearUrl, status, ...rest } = data;
	const source = isOwner ? { linear, linearUrl, status } : { linear: previous?.linear, linearUrl: previous?.linearUrl, status: previous?.status };
	const out: Record<string, unknown> = { ...rest, reporter: previous?.reporter ?? email, reportedAt: previous?.reportedAt ?? at };
	for (const [k, v] of Object.entries(source)) if (v !== undefined) out[k] = v;
	return out;
}

export function linearMarkdown(r: Record<string, unknown>): string {
	const line = (label: string, v: unknown) => (typeof v === 'string' && v.trim() ? `**${label}:** ${v.trim()}\n\n` : '');
	return (
		`**Feature area:** ${AREAS[r.area as string]}\n\n` +
		`**Severity:** ${SEVERITIES[r.severity as string]!.label}\n\n` +
		`**Device / viewport:** ${r.device as string}\n\n` +
		line('Screen', r.screen) +
		line('Expected', r.expected) +
		line('Actual', r.actual) +
		line('Steps to repeat', r.steps) +
		`---\nReported in the app by ${r.reporter as string} at ${r.reportedAt as string}.` +
		(r.userAgent ? `\nBrowser: ${r.userAgent as string}` : '')
	);
}

/** Opens the report as a Linear issue. Returns null when Linear is not set up or refuses. */
export async function sendToLinear(env: Env, r: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<{ linear: string; linearUrl: string } | null> {
	if (!env.LINEAR_API_KEY || !env.LINEAR_TEAM_ID) return null;
	const input: Record<string, unknown> = {
		teamId: env.LINEAR_TEAM_ID,
		title: `[${AREAS[r.area as string]}] ${(r.title as string).trim()}`,
		description: linearMarkdown(r),
		priority: SEVERITIES[r.severity as string]!.linearPriority,
	};
	if (env.LINEAR_PROJECT_ID) input.projectId = env.LINEAR_PROJECT_ID;
	const labels = (env.LINEAR_LABEL_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
	if (labels.length) input.labelIds = labels;
	try {
		const res = await fetcher('https://api.linear.app/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: env.LINEAR_API_KEY },
			body: JSON.stringify({
				query: 'mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { identifier url } } }',
				variables: { input },
			}),
		});
		if (!res.ok) return null;
		const out = (await res.json()) as { data?: { issueCreate?: { success: boolean; issue?: { identifier: string; url: string } } } };
		const issue = out.data?.issueCreate?.issue;
		return out.data?.issueCreate?.success && issue ? { linear: issue.identifier, linearUrl: issue.url } : null;
	} catch {
		return null;
	}
}
