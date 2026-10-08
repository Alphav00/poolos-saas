/**
 * MVP happy-path e2e: load a fixture, walk it through all 8 wizard steps,
 * verify the data lands in the right shape, and the PDF is fetchable.
 *
 * This is the "use today" smoke test: the tech can do the whole job.
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:8765';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }

async function api(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}: ${await r.text()}`);
  if (r.status === 204) return null;
  return r.json();
}

(async () => {
  // ---------- 1. Load a fixture (rectangular pool, 32x18) ----------
  const fixture = await api('GET', '/api/fixtures/rectangular');
  ok(fixture.id, '1: fixture has an id');
  ok(fixture.measurement.shape_type === 'rectangular', '1: shape is rectangular');
  ok(fixture.measurement.perimeter_points.length >= 4, '1: has perimeter points');

  // ---------- 2. Create a real DB job from the fixture ----------
  const created = await api('POST', '/api/jobs', {
    meta: fixture.meta,
    measurement: fixture.measurement,
    cover_spec: fixture.cover_spec,
    hardware: fixture.hardware,
  });
  ok(created.id, '2: created job id');

  // ---------- 3. Update with full MVP data (simulating tech going through wizard) ----------
  // Customer meta
  await api('PUT', `/api/jobs/${created.id}`, {
    meta: {
      ...created.meta,
      customer_name: 'Smith Family',
      customer_address: '123 Pool Lane, Hamilton NJ',
      customer_phone: '555-0123',
      customer_email: 'smith@example.com',
      photos_attached: true,
    },
    measurement: {
      ...created.measurement,
      ab_distance_ft: '24',
      ab_orientation: 'A_left_B_right_facing_pool',
      ab_offset_from_pool_ft: '4',
      ab_note: 'Standard A-B on long side, 4ft from edge, stakes in lawn',
      pool_length: '40',
      pool_width: '20',
      shallow_depth_ft: '3.5',
      deep_depth_ft: '8',
      obstacles: [
        { kind: 'handrail', front_point: 5, back_point: 6, description: 'Main ladder' },
        { kind: 'rock', front_point: 22, back_point: null, description: 'Rock waterfall feature' },
      ],
      cross_dimensions: [
        { from_point: 1, to_point: 17, distance_ft: '32' },  // length
        { from_point: 9, to_point: 25, distance_ft: '18' },  // width
        { from_point: 5, to_point: 28, distance_ft: '36' },  // diagonal
      ],
      step: { location: 'right', size_length_ft: '4', size_width_ft: '8', offset_ft: '2' },
    },
    cover_spec: {
      type: 'mesh_super',
      color: 'green',
      spacing: '5x5',
      anchor_type: 'concrete',
      overlap_standard_in: '12',
      overlap_planter_in: null,
    },
    hardware: {
      y_straps: 0, wood_deck_anchors: 0, beauty_rings: 0,
      beauty_rings_entire_pool: false, lawn_stakes: 0, paver_tubes_ft: '0',
      perimeter_padding_entire_pool: false,
      perimeter_padding_from_pt: null, perimeter_padding_to_pt: null,
    },
    notes: 'Tech walked the pool, captured all points, generated order form on site.',
  });
  ok(true, '3: full data PUT succeeded');

  // ---------- 4. Read back, verify shape ----------
  const job = await api('GET', `/api/jobs/${created.id}`);
  ok(job.meta.customer_name === 'Smith Family', '4: customer name round-trips');
  ok(job.measurement.obstacles.length === 2, '4: 2 obstacles stored');
  ok(job.measurement.cross_dimensions.length === 3, '4: 3 cross-dims stored');
  ok(job.measurement.step !== null, '4: step stored');
  ok(job.cover_spec.color === 'green', '4: cover color stored');
  ok(job.notes && job.notes.includes('walked'), '4: notes stored');

  // ---------- 5. Reconstruction works on the populated job ----------
  const recon = await api('POST', `/api/jobs/${created.id}/reconstruct`);
  ok(recon.points && recon.points.length > 0, '5: reconstruction has points');
  ok(recon.length_ft && parseFloat(recon.length_ft) > 0, '5: length computed');
  // Rectangular fixture should be ~32x18
  const lengthFt = parseFloat(recon.length_ft);
  const widthFt = parseFloat(recon.width_ft);
  ok(Math.abs(lengthFt - 32) < 1, `5: length ~32ft, got ${lengthFt}`);
  ok(Math.abs(widthFt - 18) < 1, `5: width ~18ft, got ${widthFt}`);

  // ---------- 6. Order form JSON endpoint ----------
  const orderForm = await api('POST', `/api/jobs/${created.id}/order-form`);
  ok(orderForm.schema_version, '6: order form has schema version');
  ok(orderForm.job.id === created.id, '6: order form references the job');
  ok(orderForm.reconstructed.area_sqft, '6: order form has reconstructed area');

  // ---------- 7. PDF download ----------
  const pdfRes = await fetch(`${BASE}/api/jobs/${created.id}/order-form.pdf`);
  ok(pdfRes.ok, '7: PDF endpoint returns 200');
  ok(pdfRes.headers.get('content-type') === 'application/pdf', '7: PDF content-type');
  const pdfBytes = await pdfRes.arrayBuffer();
  ok(pdfBytes.byteLength > 1000, `7: PDF is non-trivial size (${pdfBytes.byteLength} bytes)`);
  // First 4 bytes of a PDF are "%PDF"
  const header = new TextDecoder().decode(new Uint8Array(pdfBytes, 0, 5));
  ok(header.startsWith('%PDF'), '7: PDF starts with %PDF magic');

  // ---------- 8. Cross-dim validation works server-side (validate endpoint) ----------
  const v = await api('POST', `/api/jobs/${created.id}/validate`);
  ok(Array.isArray(v.warnings), '8: validate returns warnings array');

  // ---------- 9. Kidney fixture end-to-end ----------
  const kidney = await api('GET', '/api/fixtures/kidney');
  const kidneyJob = await api('POST', '/api/jobs', {
    meta: kidney.meta,
    measurement: kidney.measurement,
    cover_spec: kidney.cover_spec,
    hardware: kidney.hardware,
  });
  const kidneyRecon = await api('POST', `/api/jobs/${kidneyJob.id}/reconstruct`);
  const kLength = parseFloat(kidneyRecon.length_ft);
  const kWidth = parseFloat(kidneyRecon.width_ft);
  ok(Math.abs(kLength - 38) < 0.1, `9: kidney length ~38ft, got ${kLength}`);
  ok(Math.abs(kWidth - 15.4) < 0.1, `9: kidney width ~15.4ft, got ${kWidth}`);

  // ---------- 10. Freeform fixture end-to-end ----------
  const freeform = await api('GET', '/api/fixtures/freeform');
  const ffJob = await api('POST', '/api/jobs', {
    meta: freeform.meta,
    measurement: freeform.measurement,
    cover_spec: freeform.cover_spec,
    hardware: freeform.hardware,
  });
  const ffRecon = await api('POST', `/api/jobs/${ffJob.id}/reconstruct`);
  const fLength = parseFloat(ffRecon.length_ft);
  const fWidth = parseFloat(ffRecon.width_ft);
  ok(Math.abs(fLength - 44.92) < 0.1, `10: freeform length ~44.92ft, got ${fLength}`);
  ok(Math.abs(fWidth - 23.37) < 0.1, `10: freeform width ~23.37ft, got ${fWidth}`);

  console.log(`\nMVP happy-path e2e: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    for (const f of fails) console.log(`  - ${f}`);
    process.exit(1);
  }
})();
