/**
 * Shape check for the `field` board, where the app (not a Claude artifact)
 * keeps each pool's readings for the day: readings/<pool>:<yyyy-mm-dd>.
 * Returns a reason when the document is refused, or null when it is fine.
 */
const PARAMS = new Set(['fc', 'ph', 'ta', 'cya', 'ch', 'salt', 'temp']);
const METHODS = new Set(['strip', 'drop', 'meter']);
const ID = /^[a-z0-9-]{1,60}:\d{4}-\d{2}-\d{2}$/;

export function checkFieldDoc(collection: string, id: string, data: Record<string, unknown>): string | null {
	if (collection !== 'readings') return 'The field board only keeps "readings"';
	if (!ID.test(id)) return 'Reading ids look like "<pool>:<yyyy-mm-dd>"';
	if (!METHODS.has(data.method as string)) return 'method must be strip, drop or meter';
	const values = data.values;
	if (!values || typeof values !== 'object' || Array.isArray(values)) return 'values must be an object';
	for (const [k, v] of Object.entries(values)) {
		if (!PARAMS.has(k)) return `Unknown reading "${k}"`;
		if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100000) return `"${k}" must be a number`;
	}
	const extra = Object.keys(data).filter((k) => !['pool', 'date', 'method', 'values'].includes(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}
