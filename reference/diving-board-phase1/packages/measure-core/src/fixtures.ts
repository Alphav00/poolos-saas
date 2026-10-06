/**
 * Built-in fixture pools. Port of `backend/app/services/fixtures.py`.
 *
 * Three cover pools (rectangular, kidney, freeform) and two liner pools
 * (rectangular-liner, kidney-liner) that carry the full vertical capture. The
 * perimeter points are generated from ground-truth geometry, so the
 * reconstruction can be checked against the known shape:
 *
 *   rectangular  32 × 18 ft
 *   kidney       38 × 23.5 ft (23.51 reconstructed)
 *   freeform     46 × 21.06 ft
 *
 * Tape distances are rounded to 3 decimals with Python's `round` semantics so
 * the generated points equal the backend's digit for digit.
 *
 * Differences from the Python: fixtures are pure, so `id` is a deterministic
 * `fixture-<name>` string instead of a random uuid4, and `meta.date` is an
 * ISO string.
 */
import { pyRound } from './format';
import type {
  Fitting,
  JobMeasurement,
  JobMeta,
  LinerSpec,
  LinerStep,
  PerimeterPoint,
  PoolJob,
} from './types';

type XY = readonly [number, number];

const dist = (a: XY, b: XY): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Convert an ordered ground-truth outline into numbered perimeter points with
 * A/B tape distances, sampling each edge at roughly `stepFt` intervals.
 */
export function perimeterFromXY(ptsXY: readonly XY[], A: XY, B: XY, stepFt = 2.0): PerimeterPoint[] {
  const out: PerimeterPoint[] = [];
  let n = 0;
  const segCount = ptsXY.length;
  for (let i = 0; i < segCount; i++) {
    const p0 = ptsXY[i]!;
    const p1 = ptsXY[(i + 1) % segCount]!;
    const segLen = dist(p0, p1);
    const steps = Math.max(1, Math.trunc(pyRound(segLen / stepFt)));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const x = p0[0] + (p1[0] - p0[0]) * t;
      const y = p0[1] + (p1[1] - p0[1]) * t;
      n += 1;
      out.push({
        number: n,
        a_distance_ft: pyRound(dist([x, y], A), 3),
        b_distance_ft: pyRound(dist([x, y], B), 3),
      });
    }
  }
  return out;
}

function meta(customer: string): JobMeta {
  return {
    customer_name: customer,
    customer_address: '123 Test Lane, Testville NJ',
    customer_phone: '555-0123',
    customer_email: `${customer.toLowerCase().split(' ').join('.')}@example.com`,
    dealer_name: 'Merlin Test Dealer',
    dealer_location: 'Hamilton, NJ',
    date: '2026-08-08T00:00:00',
    photos_attached: false,
  };
}

/** `LinerSpec()` with the backend's defaults. */
export function defaultLinerSpec(): LinerSpec {
  return {
    thickness_mil: 27,
    pattern_name: '',
    pattern_code: null,
    bead_type: 'standard_bead',
    coping_type: 'concrete',
    step_construction: 'none',
    tile_border: false,
    tile_border_pattern: null,
    measured_at_bead_receiver: true,
    waste_factor_pct: 10,
    warranty_years: null,
  };
}

function job(name: string, measurement: JobMeasurement, customer: string): PoolJob {
  return {
    id: `fixture-${name}`,
    meta: meta(customer),
    product_type: 'cover',
    measurement,
    cover_spec: {
      type: 'mesh_super',
      color: 'green',
      spacing: '5x5',
      anchor_type: 'concrete',
      overlap_standard_in: 12,
    },
    liner_spec: defaultLinerSpec(),
    hardware: {},
  };
}

// ---------- 1. Rectangular: 32 ft x 18 ft ----------

function rectangularFixture(): PoolJob {
  const A: XY = [0, 0];
  const B: XY = [24, 0];
  // 32x18 rectangle, A-B line 4 ft from one long side
  const corners: XY[] = [[4, 4], [36, 4], [36, 22], [4, 22]];
  const pts = perimeterFromXY(corners, A, B, 2.0);
  return job('rectangular', {
    ab_distance_ft: 24,
    ab_orientation: 'A_left_B_right_facing_pool',
    ab_offset_from_pool_ft: 4,
    ab_note: 'Standard A-B on long side, 4ft from edge',
    shape_type: 'rectangular',
    perimeter_points: pts,
    cross_dimensions: [
      { from_point: 1, to_point: 17, distance_ft: 32 },
      { from_point: 9, to_point: 25, distance_ft: 18 },
    ],
    obstacles: [],
    step: null,
    spa: null,
    deck: { min_width_ft: 3, deck_type: 'concrete' },
    shallow_depth_ft: 3.5,
    deep_depth_ft: 8,
  }, 'Rectangular Test');
}

// ---------- 2. Kidney: classic two-lobe, 38 ft long ----------

function kidneyFixture(): PoolJob {
  const A: XY = [5, 0];
  const B: XY = [45, 0];
  const n = 50;
  const ptsXY: XY[] = [];
  for (let k = 0; k < n; k++) {
    const t = 2 * Math.PI * k / n;
    const x = 19.0 * Math.cos(t) + 25.0;
    const y = 11.0 * Math.sin(t) * (1.0 + 0.4 * Math.cos(t)) + 18.0;
    ptsXY.push([x, y]);
  }
  const pts = perimeterFromXY(ptsXY, A, B, 2.0);
  return job('kidney', {
    ab_distance_ft: 40,
    ab_orientation: 'A_left_B_right_facing_pool',
    ab_offset_from_pool_ft: 4,
    ab_note: 'Standard A-B on long side, 4ft from edge',
    shape_type: 'kidney',
    perimeter_points: pts,
    cross_dimensions: [
      { from_point: 15, to_point: 45, distance_ft: 22 },
      { from_point: 8, to_point: 38, distance_ft: 28 },
    ],
    obstacles: [
      { kind: 'handrail', front_point: 12, back_point: 13, description: 'Ladder handrail' },
    ],
    step: { location: 'right', size_length_ft: 4, size_width_ft: 8, offset_ft: 2 },
    spa: null,
    deck: { min_width_ft: 3, deck_type: 'concrete' },
    shallow_depth_ft: 3.5,
    deep_depth_ft: 7.5,
  }, 'Kidney Test');
}

// ---------- 3. Freeform ----------

function freeformFixture(): PoolJob {
  const A: XY = [5, 0];
  const B: XY = [55, 0];
  const nOuter = 60;
  const outer: XY[] = [];
  for (let k = 0; k < nOuter; k++) {
    const t = 2 * Math.PI * k / nOuter;
    const x = 20.0 * Math.cos(t) + 30.0 + 3.0 * Math.cos(3 * t);
    const y = 12.0 * Math.sin(t) + 18.0 + 1.5 * Math.sin(3 * t);
    outer.push([x, y]);
  }
  const pts = perimeterFromXY(outer, A, B, 2.0);
  return job('freeform', {
    ab_distance_ft: 50,
    ab_orientation: 'A_left_B_right_facing_pool',
    ab_offset_from_pool_ft: 4,
    ab_note: 'Freeform with rock waterfall on far side',
    shape_type: 'freeform',
    perimeter_points: pts,
    cross_dimensions: [
      { from_point: 10, to_point: 40, distance_ft: 28 },
      { from_point: 20, to_point: 50, distance_ft: 35 },
    ],
    obstacles: [
      { kind: 'rock', front_point: 18, back_point: 22, description: 'Rock waterfall feature' },
      { kind: 'handrail', front_point: 5, back_point: 6, description: 'Ladder handrail' },
    ],
    step: { location: 'center', size_length_ft: 5, size_width_ft: 10 },
    spa: null,
    deck: {
      min_width_ft: 2.5,
      deck_type: 'concrete',
      narrow_sections: ['Pt 18-22: rock waterfall'],
    },
    shallow_depth_ft: 3.5,
    deep_depth_ft: 8.5,
  }, 'Freeform Test');
}

// ---------- liner fixtures ----------
//
// These reuse the cover fixtures' A/B walk and bolt the vertical capture onto
// it: one walk, two orders. The profile runs close on the reconstructed length
// and the hopper on the reconstructed width.

function linerSpec(pattern: string): LinerSpec {
  return {
    ...defaultLinerSpec(),
    thickness_mil: 27,
    pattern_name: pattern,
    pattern_code: pattern.toUpperCase().split(' ').join('-').slice(0, 12),
    bead_type: 'standard_bead',
    coping_type: 'concrete',
    step_construction: 'vinyl_over_standard',
    measured_at_bead_receiver: true,
    waste_factor_pct: 10,
    warranty_years: 20,
  };
}

/** One skimmer, two returns, a light, and a main drain on the hopper floor. */
function standardFittings(): Fitting[] {
  return [
    { kind: 'skimmer', label: 'Skimmer 1', near_point: 8, depth_below_bead_ft: 0.75 },
    { kind: 'return', label: 'Return 1', near_point: 15, depth_below_bead_ft: 1.25 },
    { kind: 'return', label: 'Return 2', near_point: 35, depth_below_bead_ft: 1.25 },
    { kind: 'light', label: 'Pool light', near_point: 42, depth_below_bead_ft: 1.5 },
    { kind: 'main_drain', label: 'Main drain', near_point: 25, on_floor: true },
  ];
}

/** A 3-riser vinyl-over step whose risers close on the shallow wall height. */
function vinylOverStep(widthFt: number, shallowWallFt: number): LinerStep {
  const r1 = 1.25;
  const r2 = 1.25;
  const r3 = shallowWallFt - r1 - r2;
  return {
    construction: 'vinyl_over_standard',
    location: 'center',
    width_ft: widthFt,
    corner_type: 'radius',
    foam_thickness_in: 0.125,
    risers: [
      { index: 1, riser_height_ft: r1, tread_depth_ft: 1 },
      { index: 2, riser_height_ft: r2, tread_depth_ft: 1 },
      { index: 3, riser_height_ft: r3, tread_depth_ft: 1 },
    ],
    notes: 'Vinyl-over step, radius back corners',
  };
}

/**
 * 32 × 18 rectangle, ordered from a lettered form.
 * Longitudinal: 12 + 12 + 8 = 32 ft. Transverse: 5 + 8 + 5 = 18 ft.
 */
function rectangularLinerFixture(): PoolJob {
  const j = rectangularFixture();
  const shallowWall = 3.5;
  j.id = 'fixture-rectangular-liner';
  j.product_type = 'liner';
  j.liner_spec = linerSpec('Sandstone Mosaic');
  j.meta = meta('Rectangular Liner Test');
  j.measurement.liner = {
    shape: 'rectangle',
    wall_heights: [
      { label: 'shallow_end', at_point: 1, height_ft: shallowWall },
      { label: 'north_wall', at_point: 12, height_ft: 3.5 },
      { label: 'deep_end', at_point: 25, height_ft: 3.5 },
      { label: 'south_wall', at_point: 38, height_ft: 3.5 },
    ],
    profile_segments: [
      { order: 1, kind: 'shallow_floor', horizontal_run_ft: 12, depth_start_ft: 3.5, depth_end_ft: 3.5, label: 'Shallow floor' },
      { order: 2, kind: 'slope', horizontal_run_ft: 12, depth_start_ft: 3.5, depth_end_ft: 8, label: 'Slope to hopper' },
      { order: 3, kind: 'deep_floor', horizontal_run_ft: 8, depth_start_ft: 8, depth_end_ft: 8, label: 'Hopper bottom' },
    ],
    hopper: {
      left_slope_width_ft: 5,
      bottom_width_ft: 8,
      right_slope_width_ft: 5,
      bottom_length_ft: 8,
    },
    steps: [vinylOverStep(8, shallowWall)],
    fittings: standardFittings(),
    floor_type: 'vermiculite',
    cove_type: 'foam',
    floor_repair: 'standard_wash',
    drainage_system: 'french_drain',
    hydrostatic_relief_valve: true,
    recent_rainfall_days: 0,
  };
  j.measurement.deep_depth_ft = 8;
  j.measurement.shallow_depth_ft = 3.5;
  return j;
}

/**
 * 38 × 23.5 kidney: the A/B plot is the order.
 * Longitudinal: 14 + 16 + 8 = 38 ft. Transverse: 7.75 + 8 + 7.76 = 23.51 ft.
 */
function kidneyLinerFixture(): PoolJob {
  const j = kidneyFixture();
  const shallowWall = 3.5;
  j.id = 'fixture-kidney-liner';
  j.product_type = 'both';
  j.liner_spec = linerSpec('Blue Granite');
  j.meta = meta('Kidney Liner Test');
  j.measurement.liner = {
    shape: 'kidney',
    wall_heights: [
      { label: 'shallow_end', at_point: 1, height_ft: shallowWall },
      { label: 'north_wall', at_point: 13, height_ft: 3.5 },
      { label: 'deep_end', at_point: 26, height_ft: 3.75 },
      { label: 'south_wall', at_point: 39, height_ft: 3.5 },
    ],
    profile_segments: [
      { order: 1, kind: 'shallow_floor', horizontal_run_ft: 14, depth_start_ft: 3.5, depth_end_ft: 3.5, label: 'Shallow floor' },
      { order: 2, kind: 'hopper_slope', horizontal_run_ft: 16, depth_start_ft: 3.5, depth_end_ft: 8.5, label: 'Slope to hopper' },
      { order: 3, kind: 'deep_floor', horizontal_run_ft: 8, depth_start_ft: 8.5, depth_end_ft: 8.5, label: 'Hopper bottom' },
    ],
    hopper: {
      left_slope_width_ft: 7.75,
      bottom_width_ft: 8,
      right_slope_width_ft: 7.76,
      bottom_length_ft: 8,
    },
    steps: [vinylOverStep(10, shallowWall)],
    fittings: standardFittings(),
    floor_type: 'vermiculite',
    cove_type: 'foam',
    floor_repair: 'minor_patching',
    drainage_system: 'none',
    hydrostatic_relief_valve: false,
    recent_rainfall_days: 0,
    water_table_notes: 'No French drain; monitor during install.',
  };
  j.measurement.deep_depth_ft = 8.5;
  j.measurement.shallow_depth_ft = 3.5;
  return j;
}

export type FixtureName =
  | 'rectangular' | 'kidney' | 'freeform' | 'rectangular-liner' | 'kidney-liner';

/** Fixture factories; each call returns a fresh job. */
export const FIXTURES: Readonly<Record<FixtureName, () => PoolJob>> = {
  rectangular: rectangularFixture,
  kidney: kidneyFixture,
  freeform: freeformFixture,
  'rectangular-liner': rectangularLinerFixture,
  'kidney-liner': kidneyLinerFixture,
};

export const FIXTURE_NAMES = Object.keys(FIXTURES) as FixtureName[];
