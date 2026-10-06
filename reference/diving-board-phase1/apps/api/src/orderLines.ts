import type { JobMeasurement, LinerSpec as MeasuredLinerSpec } from '@diving-board/measure-core';
import type { AddOn, CoverSpec, LinerSpec, OrderLine, Product } from '@diving-board/orders';
import { badRequest } from './errors';
import type { JobClosure } from './measure';
import { newId } from './util';

/** What the client may choose on a line. Every measured value comes from the job. */
const CLIENT_FIELDS = ['id', 'product', 'quantity', 'liner', 'cover', 'addOns', 'notes'] as const;

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v));
const r2 = (v: number) => Math.round(v * 100) / 100;
const opt = <K extends string, V>(key: K, v: V | null | undefined) =>
  (v === null || v === undefined || v === '' ? {} : { [key]: v }) as Partial<Record<K, V>>;

function linerSpecFrom(m: JobMeasurement & { liner_spec?: MeasuredLinerSpec }): LinerSpec {
  const s = m.liner_spec ?? {};
  return {
    ...opt('patternName', s.pattern_name),
    ...opt('patternCode', s.pattern_code),
    ...opt('thicknessMil', s.thickness_mil),
    ...opt('beadType', s.bead_type),
    ...opt('copingType', s.coping_type),
    ...opt('floorType', m.liner?.floor_type),
    ...opt('coveType', m.liner?.cove_type),
    ...opt('stepConstruction', s.step_construction),
    ...opt('tileBorder', s.tile_border ? (s.tile_border_pattern ?? 'yes') : undefined),
  };
}

/**
 * Builds an order line from the saved job. Dimensions, A/B readings, wall
 * heights, fittings, obstacles and closure results are copied from the
 * measurement the server checked, so an order can never carry numbers that
 * differ from what was measured. Units are feet.
 */
export function buildOrderLine(raw: unknown, index: number, measurement: Record<string, unknown>, closure: JobClosure): OrderLine {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw badRequest(`lines[${index}] must be an object`);
  const input = raw as Record<string, unknown>;
  const extra = Object.keys(input).filter((k) => !(CLIENT_FIELDS as readonly string[]).includes(k));
  if (extra.length > 0) {
    throw badRequest(`lines[${index}]: ${extra.join(', ')} come from the measurement and cannot be set on an order. Edit the job instead.`);
  }
  const product = input.product as Product;
  if (product !== 'liner' && product !== 'safety_cover') throw badRequest(`lines[${index}].product must be liner or safety_cover`);
  const quantity = input.quantity ?? 1;
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) throw badRequest(`lines[${index}].quantity must be a whole number, 1 or more`);

  const m = measurement as unknown as JobMeasurement & { liner_spec?: MeasuredLinerSpec };
  const rec = closure.reconstruction;
  const scope = product === 'liner' ? 'liner' : 'cover';

  const line: OrderLine = {
    id: typeof input.id === 'string' ? input.id : newId(),
    product,
    quantity,
    shape: product === 'liner' ? (m.liner?.shape ?? m.shape_type) : m.shape_type,
    dimensions: rec
      ? [
          { label: 'Length', value: rec.length_ft },
          { label: 'Width', value: rec.width_ft },
          { label: 'Perimeter', value: rec.perimeter_ft },
        ]
      : [],
    shallowDepth: num(m.shallow_depth_ft),
    deepDepth: num(m.deep_depth_ft),
    abReference: {
      distance: num(m.ab_distance_ft),
      ...opt('offsetFromPool', m.ab_offset_from_pool_ft === undefined ? undefined : num(m.ab_offset_from_pool_ft)),
      ...opt('orientation', m.ab_orientation),
      ...opt('note', m.ab_note),
    },
    perimeterPoints: m.perimeter_points.map((p) => ({
      number: p.number,
      aDistance: num(p.a_distance_ft),
      bDistance: num(p.b_distance_ft),
      ...opt('notes', p.notes),
      ...(p.is_obstacle ? { isObstacle: true } : {}),
    })),
    crossDimensions: (m.cross_dimensions ?? []).map((d) => ({ fromPoint: d.from_point, toPoint: d.to_point, distance: num(d.distance_ft) })),
    sketch: (rec?.points ?? []).map((p) => ({ x: p.x_ft, y: p.y_ft, label: String(p.number) })),
    closureChecks: closure.checks.filter((c) => c.applies.includes(scope)).map(({ applies: _a, ...c }) => c),
    ...opt('notes', typeof input.notes === 'string' ? input.notes : undefined),
  };

  if (product === 'liner') {
    line.wallHeights = (m.liner?.wall_heights ?? []).map((w) => ({
      label: w.label, height: r2(num(w.height_ft)), ...opt('atPoint', w.at_point), ...opt('notes', w.notes),
    }));
    if (m.liner?.fittings) {
      line.fittings = m.liner.fittings.map((f) => ({
        kind: f.kind,
        ...opt('label', f.label),
        ...opt('aDistance', f.a_distance_ft == null ? undefined : num(f.a_distance_ft)),
        ...opt('bDistance', f.b_distance_ft == null ? undefined : num(f.b_distance_ft)),
        ...opt('nearPoint', f.near_point),
        ...opt('depthBelowBead', f.depth_below_bead_ft == null ? undefined : num(f.depth_below_bead_ft)),
        ...(f.on_floor ? { onFloor: true } : {}),
        ...opt('notes', f.notes),
      }));
    }
    line.liner = { ...linerSpecFrom(m), ...((input.liner ?? {}) as LinerSpec) };
  } else {
    if (m.obstacles) {
      line.obstacles = m.obstacles.map((o) => ({
        kind: o.kind, ...opt('frontPoint', o.front_point), ...opt('backPoint', o.back_point), ...opt('description', o.description),
      }));
    }
    line.cover = (input.cover ?? {}) as CoverSpec;
  }
  if (Array.isArray(input.addOns)) line.addOns = input.addOns as AddOn[];
  return line;
}
