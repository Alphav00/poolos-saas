/**
 * E2E test for A-B setup with the new pool_length / pool_width fields.
 * Verifies the API accepts the optional fields and round-trips them.
 */
const BASE = 'http://127.0.0.1:8000';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }

async function api(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  if (r.status === 204) return null;
  return r.json();
}

// Create a job with pool_length and pool_width
{
  const created = await api('POST', '/api/jobs', {
    meta: { customer_name: 'AB Setup Test', dealer_name: 'Test' },
    measurement: {
      pool_length: 40,
      pool_width: 20,
      ab_distance_ft: 26,
      ab_orientation: 'A_left_B_right_facing_pool',
      ab_offset_from_pool_ft: 4,
      ab_note: 'Standard A-B on long side',
      shape_type: 'rectangular',
      perimeter_points: [
        { number: 1, a_distance_ft: 4, b_distance_ft: 22 },
        { number: 2, a_distance_ft: 4, b_distance_ft: 22 },
        { number: 3, a_distance_ft: 4, b_distance_ft: 22 },
        { number: 4, a_distance_ft: 4, b_distance_ft: 22 },
      ],
      deck: { min_width_ft: 3, deck_type: 'concrete' },
      shallow_depth_ft: 3.5,
      deep_depth_ft: 8,
    },
    cover_spec: {}, hardware: {},
  });
  ok(created.measurement.pool_length != null, '1: pool_length persisted');
  ok(parseFloat(created.measurement.pool_length) === 40, '1: pool_length = 40');
  ok(parseFloat(created.measurement.ab_distance_ft) === 26, '1: ab_distance_ft = 26');
  ok(created.measurement.ab_note === 'Standard A-B on long side', '1: ab_note persisted');
}

// Create a job WITHOUT pool_length (should be null/optional)
{
  const created = await api('POST', '/api/jobs', {
    meta: { customer_name: 'No Pool Length', dealer_name: 'Test' },
    measurement: {
      ab_distance_ft: 20,
      shape_type: 'rectangular',
      perimeter_points: [
        { number: 1, a_distance_ft: 4, b_distance_ft: 16 },
        { number: 2, a_distance_ft: 4, b_distance_ft: 16 },
        { number: 3, a_distance_ft: 4, b_distance_ft: 16 },
        { number: 4, a_distance_ft: 4, b_distance_ft: 16 },
      ],
      deck: { min_width_ft: 3, deck_type: 'concrete' },
      shallow_depth_ft: 3.5,
      deep_depth_ft: 8,
    },
    cover_spec: {}, hardware: {},
  });
  ok(created.measurement.pool_length === null, '2: pool_length is null when not provided');
  ok(parseFloat(created.measurement.ab_distance_ft) === 20, '2: ab_distance_ft = 20');
}

// Update with new ab_distance
{
  const created = await api('POST', '/api/jobs', {
    meta: { customer_name: 'Update AB', dealer_name: 'Test' },
    measurement: {
      ab_distance_ft: 20,
      shape_type: 'rectangular',
      perimeter_points: [
        { number: 1, a_distance_ft: 4, b_distance_ft: 16 },
        { number: 2, a_distance_ft: 4, b_distance_ft: 16 },
        { number: 3, a_distance_ft: 4, b_distance_ft: 16 },
        { number: 4, a_distance_ft: 4, b_distance_ft: 16 },
      ],
      deck: { min_width_ft: 3, deck_type: 'concrete' },
      shallow_depth_ft: 3.5, deep_depth_ft: 8,
    },
    cover_spec: {}, hardware: {},
  });
  const updated = await api('PUT', `/api/jobs/${created.id}`, {
    meta: created.meta,
    measurement: {
      ...created.measurement,
      ab_distance_ft: 25,
      ab_orientation: 'A_right_B_left_facing_pool',
      pool_length: 38,
    },
    cover_spec: {}, hardware: {},
  });
  ok(parseFloat(updated.measurement.ab_distance_ft) === 25, '3: update changed AB distance');
  ok(updated.measurement.ab_orientation === 'A_right_B_left_facing_pool', '3: update changed orientation');
  ok(parseFloat(updated.measurement.pool_length) === 38, '3: update set pool_length');
}

console.log(`\nE2E AB setup: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
