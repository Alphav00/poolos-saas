/**
 * Shape checks for the `field` board, where the app (not a Claude artifact)
 * keeps its own documents:
 *   readings/<pool>:<yyyy-mm-dd>   one pool's readings for the day, with optional arrival and departure times
 *   settings/products              the company's chemicals, with label facts (owner only)
 *   settings/targets               the company's target ranges, with a source (owner only)
 *   pools/<id>                     a customer's pool: who, where, which day, what it is (engine output is not kept here)
 *   staff/<id>                     a staff member: name, sign-in email, role, route
 * Returns a reason when the document is refused, or null when it is fine.
 */
import { ROLES } from './roles';

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

const CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/;

function checkReadings(id: string, data: Record<string, unknown>): string | null {
	if (!ID.test(id)) return 'Reading ids look like "<pool>:<yyyy-mm-dd>"';
	if (!METHODS.has(data.method as string)) return 'method must be strip, drop or meter';
	const values = data.values;
	if (!values || typeof values !== 'object' || Array.isArray(values)) return 'values must be an object';
	for (const [k, v] of Object.entries(values)) {
		if (!PARAMS.has(k)) return `Unknown reading "${k}"`;
		if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100000) return `"${k}" must be a number`;
	}
	for (const k of ['arrivedAt', 'leftAt'] as const) {
		if (data[k] !== undefined && (typeof data[k] !== 'string' || !CLOCK.test(data[k]))) return `"${k}" must be a time like "9:05"`;
	}
	const extra = Object.keys(data).filter((k) => !['pool', 'date', 'method', 'values', 'arrivedAt', 'leftAt'].includes(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}

/** setBy and setAt on a settings document are stamped by the Worker (stampSettings), not the form. */
const SETTINGS_STAMPS = ['setBy', 'setAt'];
function checkStamps(data: Record<string, unknown>): string | null {
	if (data.setBy !== undefined && typeof data.setBy !== 'string') return 'setBy is set by the server';
	if (data.setAt !== undefined && (typeof data.setAt !== 'string' || Number.isNaN(Date.parse(data.setAt)))) return 'setAt is set by the server';
	return null;
}

/** settings/products: { products: [{ id, kind, name, ...facts }], setBy, setAt }. Facts are numbers from the label. */
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
	const extra = Object.keys(data).filter((k) => k !== 'products' && !SETTINGS_STAMPS.includes(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return checkStamps(data);
}

/** settings/targets: { source, ranges: { fc: [low, high], ... }, setBy, setAt }. The source says who set them. */
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
	const extra = Object.keys(data).filter((k) => !['source', 'ranges', ...SETTINGS_STAMPS].includes(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return checkStamps(data);
}

const POOL_ID = /^[a-z0-9-]{1,60}$/;
const POOL_FIELDS = new Set(['name', 'address', 'phone', 'serviceDay', 'order', 'tags', 'gallons', 'tds', 'cell', 'equipment', 'note', 'demo']);
/** Weekly service day: the customer is on that day's route. */
const DAYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const isTextList = (v: unknown) => Array.isArray(v) && v.length <= 20 && v.every((t) => isText(t));

/**
 * pools/<id>: { name, address?, phone?, serviceDay?, order?, tags?, gallons?, tds?,
 * cell?: {make, model}, equipment?, note?, demo? }. order is the stop's place on
 * its day's route.
 */
function checkPool(id: string, data: Record<string, unknown>): string | null {
	if (!POOL_ID.test(id)) return 'Pool ids are lower-case letters, digits and dashes';
	if (!isText(data.name, 80)) return 'a pool needs a name (at most 80 characters)';
	for (const k of ['gallons', 'tds'] as const) {
		if (data[k] !== undefined && (!isNumber(data[k]) || (data[k] as number) <= 0 || (data[k] as number) > 1_000_000)) return `"${k}" must be a positive number`;
	}
	if (data.cell !== undefined) {
		const c = data.cell as Record<string, unknown> | null;
		if (!c || typeof c !== 'object' || Array.isArray(c) || !isText(c.make, 60) || !isText(c.model, 60) || Object.keys(c).length !== 2) {
			return 'cell must be {make, model}';
		}
	}
	for (const k of ['tags', 'equipment'] as const) {
		if (data[k] !== undefined && !isTextList(data[k])) return `"${k}" must be a list of at most 20 short texts`;
	}
	if (data.note !== undefined && !isText(data.note, 500)) return 'note must be text of at most 500 characters';
	if (data.address !== undefined && !isText(data.address, 200)) return 'address must be text of at most 200 characters';
	if (data.phone !== undefined && !isText(data.phone, 40)) return 'phone must be text of at most 40 characters';
	if (data.serviceDay !== undefined && !DAYS.has(data.serviceDay as string)) return 'serviceDay must be one of mon, tue, wed, thu, fri, sat, sun';
	if (data.order !== undefined && (!Number.isInteger(data.order) || (data.order as number) < 0 || (data.order as number) > 1_000_000)) return 'order must be a whole number';
	if (data.demo !== undefined && typeof data.demo !== 'boolean') return 'demo must be true or false';
	const extra = Object.keys(data).filter((k) => !POOL_FIELDS.has(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}

const STAFF_FIELDS = new Set(['name', 'email', 'role', 'route', 'demo', 'createdAt', 'createdBy']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * staff/<id>: { name, email, role, route?, demo?, createdAt, createdBy }. The id
 * is a slug (ids cannot hold "@"); the email is what sign-in is matched against,
 * kept lower-case. createdAt and createdBy are stamped by the Worker
 * (stampStaff, called from boards.ts), not the form.
 */
function checkStaff(id: string, data: Record<string, unknown>): string | null {
	if (!POOL_ID.test(id)) return 'Staff ids are lower-case letters, digits and dashes';
	if (!isText(data.name, 80)) return 'staff need a name (at most 80 characters)';
	if (typeof data.email !== 'string' || data.email.length > 120 || data.email !== data.email.toLowerCase() || !EMAIL.test(data.email)) {
		return 'email must be a lower-case email address (at most 120 characters)';
	}
	if (!(ROLES as readonly unknown[]).includes(data.role)) return `role must be one of ${ROLES.join(', ')}`;
	if (data.route !== undefined && !isText(data.route, 40)) return 'route must be text of at most 40 characters';
	if (data.demo !== undefined && typeof data.demo !== 'boolean') return 'demo must be true or false';
	if (data.createdAt !== undefined && (typeof data.createdAt !== 'string' || Number.isNaN(Date.parse(data.createdAt)))) return 'createdAt is set by the server';
	if (data.createdBy !== undefined && typeof data.createdBy !== 'string') return 'createdBy is set by the server';
	const extra = Object.keys(data).filter((k) => !STAFF_FIELDS.has(k));
	if (extra.length) return `Unexpected field "${extra[0]}"`;
	return null;
}

/** Who added someone and when come from the sign-in and the server, and never change; emails are kept lower-case so sign-in matches. */
export function stampStaff(data: Record<string, unknown>, previous: Record<string, unknown> | null, by: string, at: string) {
	const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email;
	return { ...data, email, createdAt: previous?.createdAt ?? at, createdBy: previous?.createdBy ?? by };
}

/** Who last changed the chemistry setup and when come from the sign-in and the server, whatever the form sends. */
export function stampSettings(data: Record<string, unknown>, by: string, at: string) {
	return { ...data, setBy: by, setAt: at };
}

export function checkFieldDoc(collection: string, id: string, data: Record<string, unknown>): string | null {
	if (collection === 'readings') return checkReadings(id, data);
	if (collection === 'pools') return checkPool(id, data);
	if (collection === 'staff') return checkStaff(id, data);
	if (collection === 'settings') {
		if (id === 'products') return checkProducts(data);
		if (id === 'targets') return checkTargets(data);
		return 'The field board keeps settings/products and settings/targets only';
	}
	return 'The field board only keeps "readings", "settings", "pools" and "staff"';
}
