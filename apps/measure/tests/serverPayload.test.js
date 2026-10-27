/**
 * Tests for what of a draft goes to the server, and the API error text.
 * Run with: node tests/serverPayload.test.js
 */
import { canCreate, serverPayload } from '../src/lib/utils/serverPayload.js';
import { errorMessage } from '../src/lib/api.js';

let pass = 0, fail = 0;
const fails = [];
function eq(a, b, msg) {
  if (JSON.stringify(a) === JSON.stringify(b)) pass++;
  else { fail++; fails.push(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}

const pts = (n) => Array.from({ length: n }, (_, i) => ({ number: i + 1, a_distance_ft: 12, b_distance_ft: 14 }));

function draft() {
  return {
    id: 'not-sent',
    product_type: 'liner',
    meta: { customer_name: 'Sample Customer', dealer_name: 'Sample Dealer' },
    measurement: {
      ab_distance_ft: 20,
      pool_length: '',
      shallow_depth_ft: 3.5,
      perimeter_points: pts(4),
      cross_dimensions: [
        { from_point: 1, to_point: 3, distance_ft: 30 },
        { from_point: null, to_point: 3, distance_ft: 16 },
        { from_point: 2, to_point: 2, distance_ft: 5 },
        { from_point: 2, to_point: 4, distance_ft: '' },
      ],
      break_off_points: [{ side: 'deep', from_point: 1, to_point: '', distance_ft: 4 }],
      obstacles: [{ kind: 'step', front_point: '' }, { kind: '' }],
      liner: {
        wall_heights: [{ label: 'Shallow', height_ft: 3.5 }, { label: 'Deep', height_ft: '' }, { label: ' ', height_ft: 4 }],
        fittings: [
          { kind: 'skimmer', near_point: 2 },
          { kind: 'return', a_distance_ft: 8, b_distance_ft: 9 },
          { kind: 'main_drain', a_distance_ft: 8, b_distance_ft: '' },
          { kind: 'light', near_point: null },
        ],
      },
    },
    cover_spec: { overlap_standard_in: '' },
    liner_spec: {},
    hardware: { y_straps: '', perimeter_padding_from_pt: '' },
    notes: '',
  };
}

// ---------- 1. Only editable fields are sent ----------
{
  const body = serverPayload(draft());
  eq(Object.keys(body), ['meta', 'product_type', 'measurement', 'cover_spec', 'liner_spec', 'hardware', 'notes'], '1: fields');
  eq(body.notes, '', '1: blank text kept');
}

// ---------- 2. Cleared number boxes are dropped, not sent as '' ----------
{
  const body = serverPayload(draft());
  eq('pool_length' in body.measurement, false, '2: pool_length dropped');
  eq('overlap_standard_in' in body.cover_spec, false, '2: overlap dropped');
  eq(body.hardware, {}, '2: hardware blanks dropped');
  eq(body.measurement.obstacles, [{ kind: 'step' }], '2: obstacle point dropped, kindless row out');
}

// ---------- 3. Incomplete rows are left out ----------
{
  const body = serverPayload(draft());
  eq(body.measurement.cross_dimensions, [{ from_point: 1, to_point: 3, distance_ft: 30 }], '3: cross dims');
  eq(body.measurement.break_off_points, [], '3: break-offs');
  eq(body.measurement.liner.wall_heights.map((w) => w.label), ['Shallow'], '3: wall heights');
  eq(body.measurement.liner.fittings.map((f) => f.kind), ['skimmer', 'return'], '3: fittings must be locatable');
}

// ---------- 4. The draft itself is untouched ----------
{
  const d = draft();
  serverPayload(d);
  eq(d.measurement.cross_dimensions.length, 4, '4: draft keeps all cross dims');
  eq(d.measurement.liner.fittings.length, 4, '4: draft keeps all fittings');
  eq(d.measurement.pool_length, '', '4: draft keeps the blank');
}

// ---------- 5. canCreate: four perimeter points with A and B ----------
{
  const d = draft();
  eq(canCreate(serverPayload(d)), true, '5: four points ok');
  d.measurement.perimeter_points = pts(3);
  eq(canCreate(serverPayload(d)), false, '5: three points not enough');
  d.measurement.perimeter_points = pts(4);
  d.measurement.perimeter_points[2].b_distance_ft = '';
  eq(canCreate(serverPayload(d)), false, '5: a point without B');
  eq(canCreate(serverPayload({ measurement: null })), false, '5: no measurement');
}

// ---------- 6. API error text ----------
{
  eq(errorMessage({ detail: 'Job not found' }, 404), 'Job not found', '6: string detail');
  eq(
    errorMessage({ detail: [
      { type: 'too_short', loc: ['body', 'measurement', 'perimeter_points'], msg: 'List should have at least 4 items after validation, not 2' },
      { type: 'missing', loc: ['body', 'meta'], msg: 'Field required' },
    ] }, 422),
    'body.measurement.perimeter_points: List should have at least 4 items after validation, not 2; body.meta: Field required',
    '6: 422 detail list',
  );
  eq(errorMessage({ detail: { code: 'x' } }, 400), '{"code":"x"}', '6: object detail');
  eq(errorMessage({ error: { code: 'not_staff' } }, 403), '{"error":{"code":"not_staff"}}', '6: body without detail');
  eq(errorMessage(null, 500), 'HTTP 500', '6: empty body');
}

// ---------- 7. A cleared number box from bind:value (null) ----------
{
  const job = {
    measurement: { ab_distance_ft: 20, ab_offset_from_pool_ft: null, pool_length: null, perimeter_points: pts(4) },
    cover_spec: { overlap_standard_in: null, overlap_planter_in: null },
    liner_spec: { waste_factor_pct: null, warranty_years: null },
    hardware: { y_straps: null, lawn_stakes: '', perimeter_padding_from_pt: null },
  };
  const body = serverPayload(job);
  eq('ab_offset_from_pool_ft' in body.measurement, false, '7: defaulted null dropped (offset)');
  eq('overlap_standard_in' in body.cover_spec, false, '7: defaulted null dropped (overlap)');
  eq('waste_factor_pct' in body.liner_spec, false, '7: defaulted null dropped (waste)');
  eq('y_straps' in body.hardware, false, '7: defaulted null dropped (int)');
  eq('lawn_stakes' in body.hardware, false, '7: defaulted blank dropped');
  eq(body.measurement.pool_length, null, '7: optional null kept');
  eq(body.cover_spec.overlap_planter_in, null, '7: optional null kept (planter)');
  eq(body.hardware.perimeter_padding_from_pt, null, '7: optional point null kept');
}

console.log(`serverPayload: ${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of fails) console.log('  FAIL', f);
  process.exit(1);
}
