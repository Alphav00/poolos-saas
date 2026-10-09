/**
 * Staff roles. Staff are kept on the `field` board at staff/<id> (owners add
 * them; apps/api/src/field.ts checks the shape). A viewer's role comes from the
 * staff record whose email matches their sign-in email.
 */
export const ROLES = ['Technician', 'Lead', 'Dispatcher', 'Operator'] as const;
export type Role = (typeof ROLES)[number];

/** Roles that may change pool profiles, besides owners. */
export const POOL_EDITORS: ReadonlySet<string> = new Set<Role>(['Lead', 'Dispatcher']);

/**
 * The role on the viewer's staff record, or null when they are not on file.
 * Writes keep one record per email (boards.ts); if two ever match (a race between two adds),
 * the viewer gets no role rather than the more powerful one.
 */
export async function roleFor(env: Env, email: string): Promise<Role | null> {
	const want = email.trim().toLowerCase();
	if (!want) return null;
	const rows = await env.DB.prepare(
		"SELECT json_extract(data, '$.role') AS role FROM board_docs WHERE board = 'field' AND collection = 'staff' AND deleted = 0 AND json_valid(data) AND lower(json_extract(data, '$.email')) = ? LIMIT 2",
	).bind(want).all<{ role: unknown }>();
	const only = rows.results.length === 1 ? rows.results[0]!.role : null;
	return (ROLES as readonly unknown[]).includes(only) ? (only as Role) : null;
}

/** Owners, and staff with a Lead or Dispatcher role, may change pool profiles. */
export const canEditPools = (isOwner: boolean, role: Role | null) => isOwner || (role !== null && POOL_EDITORS.has(role));
