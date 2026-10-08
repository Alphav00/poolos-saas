/**
 * Shape checks for the `field` board, where the app (not a Claude artifact)
 * keeps its own documents:
 *   readings/<pool>:<yyyy-mm-dd>   one pool's readings for the day
 *   settings/products              the company's chemicals, with label facts
 *   settings/targets               the company's target ranges, with a source
 * Returns a reason when the document is refused, or null when it is fine.
 */
const PARAMS = new Set(['fc', 'ph', 'ta', 'cya', 'ch', 'salt', 'temp']);
const METHODS = new Set(['strip', 'drop', 'meter']);
const ID = /^[a-z0-9-]{1,60}:\d{4}-\d{2}-\d{2}$/;

/** Chemical kinds the engine can dose, and the label facts each one needs. */
export const PRODUCT_FACTS: Record<string, readonly string[]> = {
	'liquid-chlorine': ['tradePercent'],
	acid: ['hclPercent', 'densityGPerMl'],
	'soda-ash': ['assayPercent'],
	bicarbonate: ['assayPercent'],
	'calcium-chloride': ['assayPercent', 'form'],
	'cyanuric-acid': ['assayPercent'],
	salt: ['assayPercent'],
};
const FORMS = new Set(['anhydrous', 'dihydrate']);
const MAX_TEXT = 120;

const isText = (v: unknown, max = MAX_TEXT) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function checkReadings(id: string, data: Record<string, unknown>): string | null {
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

/** settings/products: { products: [{ id, kind, name, ...facts }] }. Facts are numbers from the label. */
function checkProducts(data: Record<string, unknown>): string | null {
	const list = data.products;
	if (!Array.isArray(list) || list.length > 50) return 'products must be a list of at most 50';
	const ids = new Set<string>();
	for (const p of list as unknown[]) {
		if (!p || typeof p !== 'object' || Array.isArray(p)) return 'each product must be an object';
		const o = p as Record<string, unknown>;
		if (!isText(o.id, 40) || !/^[a-z0-9-]+$/.test(o.id as string)) return 'product id must be lower-case letters, digits and dashes';
		if (ids.has(o.id as string)) return `duplicate product id "${o.id as string}"`;
		ids.add(o.id as string);
		const facts = PRODUCT_FACTS[o.kind as string];
		if (!facts) return `product kind must be one of ${Object.keys(PRODUCT_FACTS).join(', ')}`;
		if (!isText(o.name)) return 'each product needs a name from its label';
		for (const f of facts) {
			if (f === 'form') {
				if (!FORMS.has(o.form as string)) return 'calcium chloride form must be anhydrous or dihydrate';
			} else if (!isNumber(o[f]) || (o[f] as number) <= 0) return `product "${o.name as string}" needs ${f} from its label`;
		}
		const allowed = new Set(['id', 'kind', 'name', ...facts]);
		const extra = Object.keys(o).filter((k) => !allowed.has(k));
		if (extra.length) return `Unexpected product field "${extra[0]}"`;
	}
	const extra = Object.keys(data).filter((k) => k !== 'products');
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}

/** settings/targets: { source, ranges: { fc: [low, high], ... } }. The source says who set them. */
function checkTargets(data: Record<string, unknown>): string | null {
	if (!isText(data.source, 200)) return 'targets need a source: who set them, and from what';
	const ranges = data.ranges;
	if (!ranges || typeof ranges !== 'object' || Array.isArray(ranges)) return 'ranges must be an object';
	for (const [k, v] of Object.entries(ranges)) {
		if (!PARAMS.has(k) || k === 'temp') return `No target for "${k}"`;
		if (!Array.isArray(v) || v.length !== 2 || !v.every(isNumber) || (v[0] as number) < 0 || (v[0] as number) > (v[1] as number)) {
			return `"${k}" target must be [low, high] with low ≤ high`;
		}
	}
	const extra = Object.keys(data).filter((k) => !['source', 'ranges'].includes(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}

export function checkFieldDoc(collection: string, id: string, data: Record<string, unknown>): string | null {
	if (collection === 'readings') return checkReadings(id, data);
	if (collection === 'settings') {
		if (id === 'products') return checkProducts(data);
		if (id === 'targets') return checkTargets(data);
		return 'The field board keeps settings/products and settings/targets only';
	}
	return 'The field board only keeps "readings" and "settings"';
}
