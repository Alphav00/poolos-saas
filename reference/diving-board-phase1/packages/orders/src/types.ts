/**
 * Core data types for liner and safety-cover orders sent to manufacturers.
 *
 * Field coverage follows the existing liner-measure-pro order forms
 * (cover form: A-B reference line, perimeter A/B table, cross-dimensions,
 * obstacles, cover spec, hardware; liner form: shape, depths, wall heights,
 * floor profile, liner spec, closure checks, fittings cut-out schedule).
 *
 * Everything here is plain data (JSON-serialisable) so it can live in
 * KV / D1 / Durable Objects on Cloudflare Workers.
 */

export type Product = 'liner' | 'safety_cover';

export const PRODUCTS: readonly Product[] = ['liner', 'safety_cover'];

/** How an order physically reaches the manufacturer. */
export type SupplierChannel = 'email_pdf' | 'portal_manual' | 'fax' | 'api';

export type OrderStatus =
  | 'draft'
  | 'ready'
  | 'submitted'
  | 'acknowledged'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'needs_clarification'
  | 'rejected'
  | 'cancelled';

export type LengthUnit = 'ft' | 'in' | 'm' | 'cm';

/** ISO-8601 timestamp string (UTC). */
export type IsoTimestamp = string;

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

/** The pool installer / dealer placing the order. Their name heads the PDF. */
export interface Installer {
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  /** The installer's dealer/account number with this supplier, if any. */
  dealerAccountNumber?: string;
}

export interface Customer {
  name: string;
  phone?: string;
  email?: string;
}

export interface Site {
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  accessNotes?: string;
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

/** A lettered or named dimension (e.g. "A - length", "B - width"). */
export interface Dimension {
  label: string;
  value: number;
  /** Optional explicit unit; must equal the order's unit when present. */
  unit?: LengthUnit;
  note?: string;
}

/** A-B reference line used for triangulated (freeform) measurement. */
export interface AbReference {
  distance: number;
  offsetFromPool?: number;
  /** e.g. "A_left_B_right_facing_pool" */
  orientation?: string;
  note?: string;
}

export interface PerimeterPoint {
  number: number;
  aDistance: number;
  bDistance: number;
  notes?: string;
  isObstacle?: boolean;
}

export interface CrossDimension {
  fromPoint: number;
  toPoint: number;
  distance: number;
}

/** A point of the reconstructed plan-view polygon, in the order's unit. */
export interface SketchPoint {
  x: number;
  y: number;
  /** Optional perimeter point number, drawn as a label. */
  label?: string;
}

/** Wall height (bead receiver to top of cove) at a location. */
export interface WallHeight {
  label: string;
  height: number;
  atPoint?: number;
  unit?: LengthUnit;
  notes?: string;
}

/** A liner fitting / cut-out (skimmer, return, main drain, light, step...). */
export interface Fitting {
  kind: string;
  label?: string;
  quantity?: number;
  aDistance?: number;
  bDistance?: number;
  nearPoint?: number;
  depthBelowBead?: number;
  onFloor?: boolean;
  notes?: string;
}

/** Deck obstacle for a safety cover (fill spout, rail, rock, existing anchor...). */
export interface Obstacle {
  kind: string;
  frontPoint?: number;
  backPoint?: number;
  description?: string;
}

/**
 * Result of a closure / consistency check computed elsewhere (measure-core).
 * This package does not compute geometry; it only refuses to send an order
 * that carries a blocking check.
 */
export type ClosureStatus = 'pass' | 'warn' | 'block';

export interface ClosureCheck {
  name: string;
  status: ClosureStatus;
  measured?: number;
  expected?: number;
  /** Difference in inches, for display. */
  differenceIn?: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Product specs
// ---------------------------------------------------------------------------

export interface LinerSpec {
  patternName?: string;
  patternCode?: string;
  thicknessMil?: number;
  beadType?: string;
  copingType?: string;
  floorType?: string;
  coveType?: string;
  stepConstruction?: string;
  tileBorder?: string;
}

export interface CoverSpec {
  coverType?: string;
  color?: string;
  spacing?: string;
  anchorType?: string;
  overlapIn?: number;
  planterOverlapIn?: number;
}

/** Free-form hardware / add-on line (Y-straps, beauty rings, lawn stakes...). */
export interface AddOn {
  label: string;
  quantity: number;
  unit?: string;
}

export interface OrderLine {
  id: string;
  product: Product;
  quantity: number;
  /** e.g. "rectangle", "kidney", "freeform". */
  shape?: string;
  dimensions?: Dimension[];
  shallowDepth?: number;
  deepDepth?: number;
  abReference?: AbReference;
  perimeterPoints?: PerimeterPoint[];
  crossDimensions?: CrossDimension[];
  /** Plan-view polygon for the measurement sketch. */
  sketch?: SketchPoint[];

  // liner
  liner?: LinerSpec;
  wallHeights?: WallHeight[];
  /** `undefined` = not captured. Liners must list at least one fitting. */
  fittings?: Fitting[];

  // safety cover
  cover?: CoverSpec;
  /** `undefined` = not captured; `[]` = surveyed, nothing on the deck. */
  obstacles?: Obstacle[];
  addOns?: AddOn[];

  /** Closure-check results supplied by the measuring code. */
  closureChecks?: ClosureCheck[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// Order + audit trail
// ---------------------------------------------------------------------------

export type ActorKind = 'user' | 'supplier' | 'system';

export interface Actor {
  kind: ActorKind;
  id: string;
  name?: string;
}

export type OrderEventType =
  | 'created'
  | 'mark_ready'
  | 'reopen'
  | 'submit'
  | 'acknowledge'
  | 'start_production'
  | 'ship'
  | 'deliver'
  | 'request_clarification'
  | 'resubmit'
  | 'reject'
  | 'cancel';

/** One immutable audit-trail entry. */
export interface OrderEventRecord {
  readonly seq: number;
  readonly type: OrderEventType;
  readonly from: OrderStatus | null;
  readonly to: OrderStatus;
  readonly at: IsoTimestamp;
  readonly actor: Readonly<Actor>;
  readonly detail?: Readonly<Record<string, string>>;
}

export interface Order {
  id: string;
  /** Stable reference, DB-<yyyymmdd>-<6 chars>; used to match supplier replies. */
  reference: string;
  tenantId?: string;
  supplierId: string;
  installer: Installer;
  customer: Customer;
  site: Site;
  jobId?: string;
  /** All lengths in the order use this unit. */
  units: LengthUnit;
  lines: OrderLine[];
  notes?: string;
  status: OrderStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Supplier's own order/confirmation number, set on acknowledgement. */
  supplierOrderNumber?: string;
  trackingNumber?: string;
  readonly events: readonly OrderEventRecord[];
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

/** Fields a supplier template can require on an order line. */
export type RequirableField =
  | 'shape'
  | 'dimensions'
  | 'depths'
  | 'abReference'
  | 'perimeterPoints'
  | 'crossDimensions'
  | 'sketch'
  | 'wallHeights'
  | 'fittings'
  | 'closureChecks'
  | 'obstacles'
  | 'liner.patternName'
  | 'liner.thicknessMil'
  | 'liner.beadType'
  | 'cover.coverType'
  | 'cover.color'
  | 'cover.spacing'
  | 'cover.anchorType';

export type Severity = 'block' | 'warn';

export interface FieldRequirement {
  field: RequirableField;
  severity: Severity;
  /** Optional override message shown to the installer. */
  message?: string;
}

/** What a supplier's order form needs, per product. Pure data. */
export interface SupplierTemplate {
  id: string;
  name: string;
  requirements: Partial<Record<Product, FieldRequirement[]>>;
}

export interface SupplierContact {
  orderEmail: string | null;
  portalUrl: string | null;
  fax: string | null;
  phone: string | null;
  apiEndpoint: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  products: Product[];
  /** `null` until the installer confirms how their dealer account orders. */
  channel: SupplierChannel | null;
  contact: SupplierContact;
  /** True only once the installer has confirmed contact + channel from their dealer account. */
  verified: boolean;
  /** Business days to wait for an acknowledgement before flagging. */
  ackSlaBusinessDays: number;
  template: SupplierTemplate;
  /** Where the public facts (name, products) were checked. */
  sources?: string[];
  todo?: string;
  /** Built-in registry entry vs. tenant-defined. */
  builtIn: boolean;
}
