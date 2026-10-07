/**
 * Parity test: the JS liner checks must agree with the Python backend.
 *
 * This is a hard requirement, not a nicety. The wizard grades closure locally
 * so the tech gets the verdict while the tape is still in hand; the backend
 * grades it again before it will cut a PDF. If the two disagree, the app tells
 * the tech a job is good and then refuses to export it — the worst possible
 * failure, because by then they have left the site.
 *
 * Run with: node tests/liner_parity.test.js
 * Requires the backend on API_BASE (default http://127.0.0.1:8765).
 */
import {
  assessHydrostaticRisk,
  computeTakeoff,
  validateLinerJob,
} from '../src/lib/utils/linerValidation.js';
import { reconstructPool } from '../src/lib/utils/reconstruct.js';

const BASE = process.env.API_BASE || 'http://127.0.0.1:8765';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function eq(a, b, msg) {
  if (a === b) pass++;
  else { fail++; fails.push(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}
function near(a, b, tol, msg) {
  if (Math.abs(a - b) < tol) pass++;
  else { fail++; fails.push(`${msg}: |${a} - ${b}| = ${Math.abs(a - b).toFixed(6)} >= ${tol}`); }
}

async function fetchJSON(path, opts) {
  const r = await fetch(BASE + path, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
  return r.json();
}

const FIXTURES = ['rectangular-liner', 'kidney-liner'];

(async () => {
  let backendAvailable = true;
  try {
    await fetchJSON('/api/health');
  } catch {
    backendAvailable = false;
    console.warn(`Backend not available at ${BASE} -- running offline checks only`);
  }

  // ---------- offline: the shape catalog split is duplicated, so pin it ----------
  {
    const r = assessHydrostaticRisk('stone', 'none', 0, false);
    eq(r.severity, 'medium', '0a: offline hydrostatic still grades');
  }

  if (!backendAvailable) {
    console.log(`\nLiner parity tests: ${pass} passed, ${fail} failed (backend skipped)`);
    if (fail) { for (const f of fails) console.log(`  FAIL: ${f}`); process.exit(1); }
    return;
  }

  // ---------- 1. Shape catalog agrees ----------
  {
    const shapes = await fetchJSON('/api/liner/shapes');
    const { requiresAbPlot } = await import('../src/lib/utils/linerValidation.js');
    for (const s of shapes) {
      eq(requiresAbPlot(s.value), s.requires_ab_plot,
        `1: ${s.value} ordering route matches the backend`);
    }
  }

  // ---------- 2. Per-fixture parity on checks, verdict and takeoff ----------
  for (const name of FIXTURES) {
    const job = await fetchJSON(`/api/fixtures/${name}`);
    const server = await fetchJSON(`/api/jobs/${name}/liner-takeoff`, { method: 'POST' });

    const m = job.measurement;
    const rec = reconstructPool(
      m.perimeter_points,
      parseFloat(m.ab_distance_ft),
      parseFloat(m.shallow_depth_ft),
      parseFloat(m.deep_depth_ft),
    );

    // The reconstruction itself must agree first, or nothing downstream can.
    // The API rounds these to 2dp, so 0.01 is the tightest meaningful bound
    // here; the raw-precision parity is asserted in reconstruct_parity.test.js.
    near(rec.lengthFt, parseFloat(server.reconstructed.length_ft), 0.01,
      `2.${name}: reconstructed length matches`);
    near(rec.widthFt, parseFloat(server.reconstructed.width_ft), 0.01,
      `2.${name}: reconstructed width matches`);

    const local = validateLinerJob(job, {
      lengthFt: rec.lengthFt,
      widthFt: rec.widthFt,
      perimeterFt: rec.perimeterFt,
      areaSqft: rec.areaSqft,
      invalidReasons: rec.invalidReasons || [],
    });

    // ---- verdict ----
    eq(local.ok, server.validation.ok, `2.${name}: verdict matches`);
    eq(local.blocking.length, server.validation.blocking.length,
      `2.${name}: same number of blocking reasons`);
    eq(local.warnings.length, server.validation.warnings.length,
      `2.${name}: same number of warnings`);

    // ---- closure checks, by name ----
    const serverChecks = new Map(server.validation.checks.map((c) => [c.name, c]));
    const localChecks = new Map(local.checks.map((c) => [c.name, c]));
    eq(localChecks.size, serverChecks.size, `2.${name}: same number of closure checks`);

    for (const [checkName, sc] of serverChecks) {
      const lc = localChecks.get(checkName);
      ok(lc !== undefined, `2.${name}: ${checkName} present locally`);
      if (!lc) continue;
      eq(lc.status, sc.status, `2.${name}: ${checkName} status matches`);
      near(lc.measuredFt, parseFloat(sc.measured_ft), 0.01,
        `2.${name}: ${checkName} measured matches`);
      near(lc.expectedFt, parseFloat(sc.expected_ft), 0.01,
        `2.${name}: ${checkName} expected matches`);
      near(lc.differenceIn, parseFloat(sc.difference_in), 0.05,
        `2.${name}: ${checkName} difference matches`);
    }

    // ---- hydrostatic ----
    eq(local.hydrostatic.severity, server.validation.hydrostatic.severity,
      `2.${name}: hydrostatic severity matches`);
    eq(local.hydrostatic.notes.length, server.validation.hydrostatic.notes.length,
      `2.${name}: same hydrostatic notes`);

    // ---- takeoff ----
    const liner = m.liner;
    const localTakeoff = computeTakeoff({
      perimeterFt: rec.perimeterFt,
      planAreaSqft: rec.areaSqft,
      reconstructedLengthFt: rec.lengthFt,
      wallHeightsFt: liner.wall_heights.map((w) => parseFloat(w.height_ft)),
      segments: liner.profile_segments,
      steps: liner.steps,
      wasteFactorPct: parseFloat(job.liner_spec.waste_factor_pct),
    });
    const st = server.takeoff;

    near(localTakeoff.wallAreaSqft, parseFloat(st.wall_area_sqft), 0.02,
      `2.${name}: wall area matches`);
    near(localTakeoff.floorDevelopedLengthFt, parseFloat(st.floor_developed_length_ft), 0.02,
      `2.${name}: developed floor length matches`);
    near(localTakeoff.floorDevelopedAreaSqft, parseFloat(st.floor_developed_area_sqft), 0.05,
      `2.${name}: developed floor area matches`);
    near(localTakeoff.stepAreaSqft, parseFloat(st.step_area_sqft), 0.02,
      `2.${name}: step area matches`);
    near(localTakeoff.totalMaterialSqft, parseFloat(st.total_material_sqft), 0.1,
      `2.${name}: total material matches`);
  }

  // ---------- 3. A job that fails must fail on both sides ----------
  {
    const job = await fetchJSON('/api/fixtures/rectangular-liner');
    // Shorten the shallow run by 3ft, well past the 2in tolerance.
    job.measurement.liner.profile_segments[0].horizontal_run_ft = '9';

    const payload = { ...job };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    const created = await fetchJSON('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const server = await fetchJSON(`/api/jobs/${created.id}/liner-takeoff`, { method: 'POST' });

    const m = created.measurement;
    const rec = reconstructPool(
      m.perimeter_points,
      parseFloat(m.ab_distance_ft),
      parseFloat(m.shallow_depth_ft),
      parseFloat(m.deep_depth_ft),
    );
    const local = validateLinerJob(created, {
      lengthFt: rec.lengthFt,
      widthFt: rec.widthFt,
      perimeterFt: rec.perimeterFt,
      areaSqft: rec.areaSqft,
      invalidReasons: rec.invalidReasons || [],
    });

    eq(server.validation.ok, false, '3: backend blocks a non-closing profile');
    eq(local.ok, false, '3: the JS port blocks it too');
    ok(local.blocking.some((b) => b.includes('Re-tape the floor section')),
      '3: the local message tells the tech to re-tape');

    await fetch(`${BASE}/api/jobs/${created.id}`, { method: 'DELETE' });
  }

  console.log(`\nLiner parity tests: ${pass} passed, ${fail} failed`);
  if (fail) {
    for (const f of fails) console.log(`  FAIL: ${f}`);
    process.exit(1);
  }
})().catch((e) => {
  console.error('Liner parity test crashed:', e);
  process.exit(1);
});
