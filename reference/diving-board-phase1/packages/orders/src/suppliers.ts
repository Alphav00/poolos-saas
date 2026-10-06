import type {
  FieldRequirement,
  Product,
  Supplier,
  SupplierChannel,
  SupplierContact,
  SupplierTemplate,
} from './types.js';
import { PRODUCTS } from './types.js';

/**
 * Generic order-form template. Built-in suppliers use it too: none of the
 * manufacturers' own form layouts are encoded here (they are not public and
 * were not verified). A tenant can register a stricter template per supplier.
 */
export const GENERIC_TEMPLATE: SupplierTemplate = Object.freeze({
  id: 'generic',
  name: 'Generic order form',
  requirements: {
    liner: [
      { field: 'shape', severity: 'block' },
      { field: 'dimensions', severity: 'block' },
      { field: 'depths', severity: 'block' },
      { field: 'wallHeights', severity: 'block' },
      { field: 'fittings', severity: 'block' },
      { field: 'liner.thicknessMil', severity: 'warn' },
      { field: 'liner.patternName', severity: 'warn' },
      { field: 'liner.beadType', severity: 'warn' },
      {
        field: 'closureChecks',
        severity: 'warn',
        message: 'No closure checks supplied; the manufacturer cannot see that the measurements add up.',
      },
    ],
    safety_cover: [
      { field: 'shape', severity: 'block' },
      { field: 'dimensions', severity: 'block' },
      { field: 'obstacles', severity: 'block' },
      { field: 'cover.anchorType', severity: 'block' },
      { field: 'cover.coverType', severity: 'block' },
      { field: 'cover.color', severity: 'warn' },
      { field: 'cover.spacing', severity: 'warn' },
    ],
  },
}) as SupplierTemplate;

export const DEFAULT_ACK_SLA_BUSINESS_DAYS = 2;

const UNVERIFIED_TODO =
  'Installer: fill in the order channel and contact (order email / portal URL / fax) from your dealer account, then set verified: true. Nothing here was taken from the manufacturer.';

function emptyContact(): SupplierContact {
  return { orderEmail: null, portalUrl: null, fax: null, phone: null, apiEndpoint: null };
}

/**
 * Built-in manufacturers. Only the company name and the product categories
 * (vinyl liners, safety covers) were checked against public sources.
 * Channel and contacts are deliberately null: dealer ordering details differ
 * per account and are not published.
 */
export const BUILTIN_SUPPLIERS: readonly Supplier[] = Object.freeze([
  {
    id: 'latham',
    name: 'Latham Pool Products',
    products: ['liner', 'safety_cover'],
    channel: null,
    contact: emptyContact(),
    verified: false,
    ackSlaBusinessDays: DEFAULT_ACK_SLA_BUSINESS_DAYS,
    template: GENERIC_TEMPLATE,
    sources: ['https://www.lathampool.com/ (product lines: vinyl liners, safety covers)'],
    todo: UNVERIFIED_TODO,
    builtIn: true,
  },
  {
    id: 'merlin',
    name: 'Merlin Industries',
    products: ['liner', 'safety_cover'],
    channel: null,
    contact: emptyContact(),
    verified: false,
    ackSlaBusinessDays: DEFAULT_ACK_SLA_BUSINESS_DAYS,
    template: GENERIC_TEMPLATE,
    sources: ['https://merlinindustries.com/ (safety covers, vinyl liners, spa covers)'],
    todo: UNVERIFIED_TODO,
    builtIn: true,
  },
  {
    id: 'loop-loc',
    name: 'Loop-Loc',
    products: ['liner', 'safety_cover'],
    channel: null,
    contact: emptyContact(),
    verified: false,
    ackSlaBusinessDays: DEFAULT_ACK_SLA_BUSINESS_DAYS,
    template: GENERIC_TEMPLATE,
    sources: [
      'https://www.poolspanews.com/?p=7457 (Loop-Loc Luxury Liners)',
      'Loop-Loc dealer sites on looploc.com (safety covers, liners FAQ)',
    ],
    todo: UNVERIFIED_TODO,
    builtIn: true,
  },
  {
    id: 'garrett',
    name: 'Garrett Liners',
    products: ['liner', 'safety_cover'],
    channel: null,
    contact: emptyContact(),
    verified: false,
    ackSlaBusinessDays: DEFAULT_ACK_SLA_BUSINESS_DAYS,
    template: GENERIC_TEMPLATE,
    sources: [
      'https://www.aquamagazine.com/directory/swimming-pools/pools-in-ground-vinyl-liner/company/15116825/garrett-liners-safety-covers',
    ],
    todo: UNVERIFIED_TODO,
    builtIn: true,
  },
] satisfies Supplier[]);

/** Template for a tenant's own supplier; copy and fill in. */
export const GENERIC_SUPPLIER: Supplier = Object.freeze({
  id: 'generic',
  name: 'Generic supplier',
  products: ['liner', 'safety_cover'],
  channel: 'email_pdf',
  contact: emptyContact(),
  verified: false,
  ackSlaBusinessDays: DEFAULT_ACK_SLA_BUSINESS_DAYS,
  template: GENERIC_TEMPLATE,
  todo: 'Set name, products, channel and contact for your supplier.',
  builtIn: true,
}) as Supplier;

// ---------------------------------------------------------------------------
// Data-driven definition
// ---------------------------------------------------------------------------

export class SupplierDefinitionError extends Error {
  override readonly name = 'SupplierDefinitionError';
  constructor(readonly problems: string[]) {
    super(`Invalid supplier definition: ${problems.join('; ')}`);
  }
}

const CHANNELS: readonly SupplierChannel[] = ['email_pdf', 'portal_manual', 'fax', 'api'];

/** Loose input shape, e.g. parsed from a tenant's JSON settings. */
export interface SupplierInput {
  id: string;
  name: string;
  products: Product[];
  channel?: SupplierChannel | null;
  contact?: Partial<SupplierContact>;
  verified?: boolean;
  ackSlaBusinessDays?: number;
  template?: SupplierTemplate;
  sources?: string[];
  todo?: string;
}

/**
 * Build a tenant supplier from plain data, filling defaults and checking the
 * shape. Throws SupplierDefinitionError listing every problem.
 */
export function defineSupplier(input: SupplierInput): Supplier {
  const problems: string[] = [];
  if (typeof input.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(input.id)) {
    problems.push('id must be lowercase letters, digits, "-" or "_"');
  }
  if (typeof input.name !== 'string' || input.name.trim() === '') problems.push('name is required');
  if (!Array.isArray(input.products) || input.products.length === 0) {
    problems.push('products must list at least one product');
  } else {
    for (const p of input.products) {
      if (!PRODUCTS.includes(p)) problems.push(`unknown product "${String(p)}"`);
    }
  }
  const channel = input.channel ?? null;
  if (channel !== null && !CHANNELS.includes(channel)) problems.push(`unknown channel "${String(channel)}"`);
  const sla = input.ackSlaBusinessDays ?? DEFAULT_ACK_SLA_BUSINESS_DAYS;
  if (!Number.isInteger(sla) || sla < 0) problems.push('ackSlaBusinessDays must be a non-negative integer');
  const template = input.template ?? GENERIC_TEMPLATE;
  problems.push(...checkTemplate(template));
  if (problems.length > 0) throw new SupplierDefinitionError(problems);

  const supplier: Supplier = {
    id: input.id,
    name: input.name.trim(),
    products: [...new Set(input.products)],
    channel,
    contact: { ...emptyContact(), ...input.contact },
    verified: input.verified ?? false,
    ackSlaBusinessDays: sla,
    template,
    builtIn: false,
  };
  if (input.sources) supplier.sources = [...input.sources];
  if (input.todo) supplier.todo = input.todo;
  return supplier;
}

function checkTemplate(t: SupplierTemplate): string[] {
  const out: string[] = [];
  if (!t || typeof t.id !== 'string' || t.id === '') out.push('template.id is required');
  if (!t || typeof t.requirements !== 'object' || t.requirements === null) {
    out.push('template.requirements is required');
    return out;
  }
  for (const [product, reqs] of Object.entries(t.requirements)) {
    if (!PRODUCTS.includes(product as Product)) out.push(`template has unknown product "${product}"`);
    for (const r of (reqs ?? []) as FieldRequirement[]) {
      if (r.severity !== 'block' && r.severity !== 'warn') {
        out.push(`template requirement ${String(r.field)} has bad severity`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Per-tenant view of suppliers: built-ins plus the tenant's own entries.
 * A tenant entry with a built-in id overrides it (that is how an installer
 * fills in their dealer-account contact details for e.g. Merlin).
 */
export class SupplierRegistry {
  readonly #byId = new Map<string, Supplier>();

  constructor(entries: readonly Supplier[] = BUILTIN_SUPPLIERS) {
    for (const s of entries) this.#byId.set(s.id, s);
  }

  get(id: string): Supplier | undefined {
    return this.#byId.get(id);
  }

  require(id: string): Supplier {
    const s = this.#byId.get(id);
    if (!s) throw new Error(`Unknown supplier "${id}"`);
    return s;
  }

  has(id: string): boolean {
    return this.#byId.has(id);
  }

  list(): Supplier[] {
    return [...this.#byId.values()];
  }

  forProduct(product: Product): Supplier[] {
    return this.list().filter((s) => s.products.includes(product));
  }

  /** Add a tenant supplier. Refuses to silently replace an existing id. */
  add(input: SupplierInput): Supplier {
    if (this.#byId.has(input.id)) throw new SupplierDefinitionError([`supplier "${input.id}" already exists`]);
    const s = defineSupplier(input);
    this.#byId.set(s.id, s);
    return s;
  }

  /**
   * Fill in or change an entry's channel/contact/SLA/template (typically
   * from the installer's dealer account). Name and products of a built-in
   * stay as verified unless explicitly passed.
   */
  configure(
    id: string,
    patch: Partial<Omit<SupplierInput, 'id' | 'contact'>> & { contact?: Partial<SupplierContact> },
  ): Supplier {
    const current = this.require(id);
    const next = defineSupplier({
      id,
      name: patch.name ?? current.name,
      products: patch.products ?? current.products,
      channel: patch.channel === undefined ? current.channel : patch.channel,
      contact: { ...current.contact, ...patch.contact },
      verified: patch.verified ?? current.verified,
      ackSlaBusinessDays: patch.ackSlaBusinessDays ?? current.ackSlaBusinessDays,
      template: patch.template ?? current.template,
      ...(patch.sources ?? current.sources ? { sources: patch.sources ?? current.sources } : {}),
      ...(patch.todo ?? current.todo ? { todo: patch.todo ?? current.todo } : {}),
    });
    const merged: Supplier = { ...next, builtIn: current.builtIn };
    this.#byId.set(id, merged);
    return merged;
  }

  remove(id: string): boolean {
    return this.#byId.delete(id);
  }

  toJSON(): Supplier[] {
    return this.list();
  }
}

/** Registry of built-ins plus a tenant's stored supplier definitions. */
export function createSupplierRegistry(tenantSuppliers: readonly SupplierInput[] = []): SupplierRegistry {
  const reg = new SupplierRegistry(BUILTIN_SUPPLIERS);
  for (const input of tenantSuppliers) {
    if (reg.has(input.id)) {
      const { id, contact, ...rest } = input;
      reg.configure(id, { ...rest, ...(contact ? { contact } : {}) });
    } else {
      reg.add(input);
    }
  }
  return reg;
}
