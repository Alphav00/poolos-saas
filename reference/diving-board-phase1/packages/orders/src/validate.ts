import type {
  FieldRequirement,
  LengthUnit,
  Order,
  OrderLine,
  RequirableField,
  Severity,
  Supplier,
} from './types.js';

export interface ValidationIssue {
  /** Dotted path, e.g. "lines[0].wallHeights". */
  field: string;
  severity: Severity;
  message: string;
}

export function hasBlockingIssues(issues: readonly ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'block');
}

const FT_PER_UNIT: Record<LengthUnit, number> = {
  ft: 1,
  in: 1 / 12,
  m: 3.280839895,
  cm: 0.03280839895,
};

export function toFeet(value: number, unit: LengthUnit): number {
  return value * FT_PER_UNIT[unit];
}

/** Plausible ranges in feet; values outside usually mean the wrong unit. */
const PLAUSIBLE = {
  dimension: { min: 3, max: 150 },
  depth: { min: 1, max: 20 },
  wallHeight: { min: 1, max: 15 },
};

const isBlank = (s: string | undefined | null): boolean => s === undefined || s === null || s.trim() === '';
const isPositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Preflight checks an order must pass (no `block` issues) before it may move
 * from draft to ready. Pure function: no geometry is computed here; closure
 * results come in on each line as `closureChecks`.
 */
export function validateOrder(order: Order, supplier: Supplier): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (field: string, severity: Severity, message: string) => issues.push({ field, severity, message });

  // ---- supplier -----------------------------------------------------------
  if (order.supplierId !== supplier.id) {
    add('supplierId', 'block', `Order is for supplier "${order.supplierId}" but was validated against "${supplier.id}".`);
  }
  switch (supplier.channel) {
    case null:
      add('supplier.channel', 'block', `${supplier.name}: order channel not configured. Set it from your dealer account.`);
      break;
    case 'email_pdf':
      if (isBlank(supplier.contact.orderEmail)) add('supplier.contact.orderEmail', 'block', `${supplier.name}: no order email configured.`);
      break;
    case 'fax':
      if (isBlank(supplier.contact.fax)) add('supplier.contact.fax', 'block', `${supplier.name}: no fax number configured.`);
      break;
    case 'api':
      if (isBlank(supplier.contact.apiEndpoint)) add('supplier.contact.apiEndpoint', 'block', `${supplier.name}: no API endpoint configured.`);
      break;
    case 'portal_manual':
      if (isBlank(supplier.contact.portalUrl)) add('supplier.contact.portalUrl', 'warn', `${supplier.name}: no portal URL saved; staff must know where to enter the order.`);
      break;
  }
  if (!supplier.verified) {
    add('supplier.verified', 'warn', `${supplier.name}: contact details not yet confirmed from a dealer account.`);
  }

  // ---- parties ------------------------------------------------------------
  if (isBlank(order.installer?.companyName)) add('installer.companyName', 'block', 'Installer company name is required (it heads the order form).');
  if (isBlank(order.customer?.name)) add('customer.name', 'block', 'Customer name is required.');
  if (isBlank(order.customer?.phone) && isBlank(order.customer?.email)) {
    add('customer.contact', 'warn', 'No customer phone or email.');
  }
  if (isBlank(order.site?.addressLine1)) add('site.addressLine1', 'block', 'Site address is required.');
  if (isBlank(order.site?.city) && isBlank(order.site?.postalCode)) {
    add('site.city', 'warn', 'Site city or postal code missing.');
  }
  if (!(order.units in FT_PER_UNIT)) add('units', 'block', `Unknown unit "${String(order.units)}".`);

  // ---- lines --------------------------------------------------------------
  if (!order.lines || order.lines.length === 0) {
    add('lines', 'block', 'Order has no lines.');
    return issues;
  }
  const ids = new Set<string>();
  order.lines.forEach((line, i) => {
    const p = `lines[${i}]`;
    if (ids.has(line.id)) add(`${p}.id`, 'block', `Duplicate line id "${line.id}".`);
    ids.add(line.id);
    if (!supplier.products.includes(line.product)) {
      add(`${p}.product`, 'block', `${supplier.name} is not set up for ${productName(line.product)} orders.`);
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) add(`${p}.quantity`, 'block', 'Quantity must be a whole number of at least 1.');

    const reqs = supplier.template.requirements[line.product] ?? [];
    for (const req of reqs) checkRequirement(line, req, p, add);

    checkUnits(line, order.units, p, add);
    checkValues(line, order.units, p, add);
    checkClosure(line, p, add);

    if (line.product === 'liner') checkLiner(line, p, add);
    else checkCover(line, p, add);
  });

  return dedupe(issues);
}

type Add = (field: string, severity: Severity, message: string) => void;

function productName(p: OrderLine['product']): string {
  return p === 'liner' ? 'liner' : 'safety cover';
}

const FIELD_LABEL: Record<RequirableField, string> = {
  shape: 'Pool shape',
  dimensions: 'Pool dimensions',
  depths: 'Shallow and deep depths',
  abReference: 'A-B reference line',
  perimeterPoints: 'A/B perimeter points',
  crossDimensions: 'Cross dimensions',
  sketch: 'Measurement sketch',
  wallHeights: 'Wall heights',
  fittings: 'Fittings / cut-out schedule',
  closureChecks: 'Closure checks',
  obstacles: 'Obstacle survey',
  'liner.patternName': 'Liner pattern',
  'liner.thicknessMil': 'Liner thickness (mil)',
  'liner.beadType': 'Bead type',
  'cover.coverType': 'Cover type',
  'cover.color': 'Cover color',
  'cover.spacing': 'Strap spacing',
  'cover.anchorType': 'Anchor type',
};

function isPresent(line: OrderLine, field: RequirableField): boolean {
  switch (field) {
    case 'shape':
      return !isBlank(line.shape);
    case 'dimensions':
      return (line.dimensions?.length ?? 0) > 0;
    case 'depths':
      return isPositive(line.shallowDepth) && isPositive(line.deepDepth);
    case 'abReference':
      return isPositive(line.abReference?.distance);
    case 'perimeterPoints':
      return (line.perimeterPoints?.length ?? 0) >= 3;
    case 'crossDimensions':
      return (line.crossDimensions?.length ?? 0) > 0;
    case 'sketch':
      return (line.sketch?.length ?? 0) >= 3;
    case 'wallHeights':
      return (line.wallHeights?.length ?? 0) > 0;
    case 'fittings':
      return (line.fittings?.length ?? 0) > 0;
    case 'closureChecks':
      return (line.closureChecks?.length ?? 0) > 0;
    case 'obstacles':
      return Array.isArray(line.obstacles);
    case 'liner.patternName':
      return !isBlank(line.liner?.patternName) || !isBlank(line.liner?.patternCode);
    case 'liner.thicknessMil':
      return isPositive(line.liner?.thicknessMil);
    case 'liner.beadType':
      return !isBlank(line.liner?.beadType);
    case 'cover.coverType':
      return !isBlank(line.cover?.coverType);
    case 'cover.color':
      return !isBlank(line.cover?.color);
    case 'cover.spacing':
      return !isBlank(line.cover?.spacing);
    case 'cover.anchorType':
      return !isBlank(line.cover?.anchorType);
  }
}

function checkRequirement(line: OrderLine, req: FieldRequirement, p: string, add: Add): void {
  if (isPresent(line, req.field)) return;
  add(`${p}.${req.field}`, req.severity, req.message ?? `${FIELD_LABEL[req.field]} is required for a ${productName(line.product)} order.`);
}

function checkUnits(line: OrderLine, units: LengthUnit, p: string, add: Add): void {
  line.dimensions?.forEach((d, j) => {
    if (d.unit !== undefined && d.unit !== units) {
      add(`${p}.dimensions[${j}].unit`, 'block', `Dimension "${d.label}" is in ${d.unit} but the order is in ${units}. Convert before sending.`);
    }
  });
  line.wallHeights?.forEach((w, j) => {
    if (w.unit !== undefined && w.unit !== units) {
      add(`${p}.wallHeights[${j}].unit`, 'block', `Wall height "${w.label}" is in ${w.unit} but the order is in ${units}. Convert before sending.`);
    }
  });
}

function checkValues(line: OrderLine, units: LengthUnit, p: string, add: Add): void {
  if (!(units in FT_PER_UNIT)) return;
  const plausible = (v: number, range: { min: number; max: number }) => {
    const ft = toFeet(v, units);
    return ft >= range.min && ft <= range.max;
  };

  line.dimensions?.forEach((d, j) => {
    if (!isPositive(d.value)) {
      add(`${p}.dimensions[${j}]`, 'block', `Dimension "${d.label}" must be a positive number.`);
    } else if (!plausible(d.value, PLAUSIBLE.dimension)) {
      add(`${p}.dimensions[${j}]`, 'warn', `Dimension "${d.label}" = ${d.value} ${units} looks implausible; check the unit.`);
    }
  });

  for (const key of ['shallowDepth', 'deepDepth'] as const) {
    const v = line[key];
    if (v === undefined) continue;
    if (!isPositive(v)) add(`${p}.${key}`, 'block', `${key === 'shallowDepth' ? 'Shallow' : 'Deep'} depth must be a positive number.`);
    else if (!plausible(v, PLAUSIBLE.depth)) add(`${p}.${key}`, 'warn', `Depth ${v} ${units} looks implausible; check the unit.`);
  }
  if (isPositive(line.shallowDepth) && isPositive(line.deepDepth) && line.deepDepth < line.shallowDepth) {
    add(`${p}.deepDepth`, 'warn', 'Deep depth is less than shallow depth.');
  }

  if (line.abReference !== undefined && !isPositive(line.abReference.distance)) {
    add(`${p}.abReference.distance`, 'block', 'A-B distance must be a positive number.');
  }

  const numbers = new Set<number>();
  line.perimeterPoints?.forEach((pt, j) => {
    if (numbers.has(pt.number)) add(`${p}.perimeterPoints[${j}]`, 'block', `Perimeter point #${pt.number} is listed twice.`);
    numbers.add(pt.number);
    if (!isPositive(pt.aDistance) || !isPositive(pt.bDistance)) {
      add(`${p}.perimeterPoints[${j}]`, 'block', `Perimeter point #${pt.number} needs positive A and B distances.`);
    }
  });
  if (line.perimeterPoints && line.perimeterPoints.length > 0 && !line.abReference) {
    add(`${p}.abReference`, 'block', 'A/B perimeter points given without the A-B reference distance.');
  }
  line.crossDimensions?.forEach((cd, j) => {
    if (!isPositive(cd.distance)) add(`${p}.crossDimensions[${j}]`, 'block', 'Cross dimension must be a positive number.');
    if (numbers.size > 0 && (!numbers.has(cd.fromPoint) || !numbers.has(cd.toPoint))) {
      add(`${p}.crossDimensions[${j}]`, 'warn', `Cross dimension ${cd.fromPoint}-${cd.toPoint} references a point not in the A/B table.`);
    }
  });

  if (line.sketch !== undefined) {
    if (line.sketch.length < 3) add(`${p}.sketch`, 'warn', 'Sketch needs at least 3 points; it will be omitted.');
    if (line.sketch.some((s) => !Number.isFinite(s.x) || !Number.isFinite(s.y))) {
      add(`${p}.sketch`, 'warn', 'Sketch has non-numeric points; it will be omitted.');
    }
  }
}

function checkClosure(line: OrderLine, p: string, add: Add): void {
  line.closureChecks?.forEach((c, j) => {
    const detail = c.message ? ` ${c.message}` : c.differenceIn !== undefined ? ` Off by ${c.differenceIn} in.` : '';
    if (c.status === 'block') {
      add(`${p}.closureChecks[${j}]`, 'block', `Closure check "${c.name}" failed; measurements do not close.${detail}`);
    } else if (c.status === 'warn') {
      add(`${p}.closureChecks[${j}]`, 'warn', `Closure check "${c.name}" is marginal.${detail}`);
    } else if (c.status !== 'pass') {
      add(`${p}.closureChecks[${j}]`, 'block', `Closure check "${c.name}" has unknown status "${String(c.status)}".`);
    }
  });
}

function checkLiner(line: OrderLine, p: string, add: Add): void {
  // Always required for a liner regardless of supplier template.
  if (line.fittings === undefined || line.fittings.length === 0) {
    add(`${p}.fittings`, 'block', 'List the fittings (skimmer, returns, drains, lights, steps) for the liner cut-out schedule.');
  } else {
    line.fittings.forEach((f, j) => {
      if (isBlank(f.kind)) add(`${p}.fittings[${j}].kind`, 'block', 'Fitting kind is required.');
      if (f.quantity !== undefined && (!Number.isInteger(f.quantity) || f.quantity < 1)) {
        add(`${p}.fittings[${j}].quantity`, 'block', 'Fitting quantity must be a whole number of at least 1.');
      }
    });
  }
  line.wallHeights?.forEach((w, j) => {
    if (!isPositive(w.height)) add(`${p}.wallHeights[${j}]`, 'block', `Wall height "${w.label}" must be a positive number.`);
  });
  if (line.cover !== undefined) add(`${p}.cover`, 'warn', 'Cover spec on a liner line will be ignored.');
}

function checkCover(line: OrderLine, p: string, add: Add): void {
  // Always required for a cover regardless of supplier template.
  if (isBlank(line.cover?.anchorType)) add(`${p}.cover.anchorType`, 'block', 'Anchor type is required for a safety cover.');
  if (!Array.isArray(line.obstacles)) {
    add(`${p}.obstacles`, 'block', 'Record the deck obstacle survey (use an empty list if there are none).');
  } else {
    line.obstacles.forEach((o, j) => {
      if (isBlank(o.kind)) add(`${p}.obstacles[${j}].kind`, 'block', 'Obstacle kind is required.');
    });
  }
  const hasPlan = (line.perimeterPoints?.length ?? 0) >= 3 || (line.dimensions?.length ?? 0) > 0;
  if (!hasPlan) add(`${p}.perimeterPoints`, 'block', 'A safety cover needs A/B perimeter points or lettered dimensions.');
  if (line.liner !== undefined || line.fittings !== undefined) add(`${p}.liner`, 'warn', 'Liner data on a cover line will be ignored.');
}

function dedupe(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.field}|${i.severity}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
