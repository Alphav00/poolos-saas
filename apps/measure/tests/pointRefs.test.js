/**
 * Tests for perimeter point deletion and the references that follow it.
 * Run with: node tests/pointRefs.test.js
 */
import { deletePerimeterPoint, removePoint, undoDeletePoint } from '../src/lib/utils/pointRefs.js';

let pass = 0, fail = 0;
const fails = [];
function eq(a, b, msg) {
  if (JSON.stringify(a) === JSON.stringify(b)) pass++;
  else { fail++; fails.push(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
}

const pt = (n) => ({ number: n, a_distance_ft: 10 + n, b_distance_ft: 20 + n, notes: '' });

function job() {
  return {
    measurement: {
      shallow_depth_ft: 3.5,
      perimeter_points: [1, 2, 3, 4, 5, 6].map(pt),
      cross_dimensions: [
        { from_point: 1, to_point: 4, distance_ft: 30 },
        { from_point: 3, to_point: 6, distance_ft: 16 },
      ],
      break_off_points: [{ side: 'deep', from_point: 2, to_point: 5, distance_ft: 12 }],
      obstacles: [{ kind: 'step', front_point: 3, back_point: 5 }],
      spa: { flush_with_pool: true, spillover: false, separate_cover: false, from_point: 5, to_point: 6 },
      step: null,
      liner: {
        steps: [{ construction: 'none', from_point: 2, to_point: 3 }],
        wall_heights: [{ label: 'Shallow', at_point: 3, height_ft: 3.5 }, { label: 'Deep', at_point: 6, height_ft: 4 }],
        fittings: [{ kind: 'skimmer', label: 'Skimmer', near_point: 3 }, { kind: 'main_drain', near_point: null, a_distance_ft: 9, b_distance_ft: 9 }],
      },
    },
    hardware: { perimeter_padding_from_pt: 2, perimeter_padding_to_pt: 4 },
  };
}

// ---------- 1. Points renumber 1..N ----------
{
  const before = job();
  const { job: after } = deletePerimeterPoint(before, 3);
  eq(after.measurement.perimeter_points.map((p) => p.number), [1, 2, 3, 4, 5], '1: renumbered');
  eq(after.measurement.perimeter_points.map((p) => p.a_distance_ft), [11, 12, 14, 15, 16], '1: kept the right points');
  eq(before.measurement.perimeter_points.length, 6, '1: input untouched');
}

// ---------- 2. References above the deleted point shift down, ones on it clear ----------
{
  const { job: after, cleared } = deletePerimeterPoint(job(), 3);
  const m = after.measurement;
  eq(m.cross_dimensions, [
    { from_point: 1, to_point: 3, distance_ft: 30 },
    { from_point: null, to_point: 5, distance_ft: 16 },
  ], '2: cross dimensions');
  eq([m.break_off_points[0].from_point, m.break_off_points[0].to_point], [2, 4], '2: break-off');
  eq([m.obstacles[0].front_point, m.obstacles[0].back_point], [null, 4], '2: obstacle');
  eq([m.spa.from_point, m.spa.to_point], [4, 5], '2: spa');
  eq([m.liner.steps[0].from_point, m.liner.steps[0].to_point], [2, null], '2: liner step');
  eq(m.liner.wall_heights.map((w) => w.at_point), [null, 5], '2: wall heights');
  eq(m.liner.fittings.map((f) => f.near_point), [null, null], '2: fittings');
  eq([after.hardware.perimeter_padding_from_pt, after.hardware.perimeter_padding_to_pt], [2, 3], '2: padding');
  eq(cleared, [
    'Cross dimension 2 (from)',
    'Obstacle 1 step (front)',
    'Liner step 1 (to)',
    'Wall height Shallow (point)',
    'Fitting Skimmer (near point)',
  ], '2: cleared list');
}

// ---------- 3. Deleting the last point clears refs to it, shifts nothing ----------
{
  const { job: after, cleared } = deletePerimeterPoint(job(), 6);
  eq(after.measurement.cross_dimensions[1].to_point, null, '3: to_point cleared');
  eq(after.measurement.cross_dimensions[0].to_point, 4, '3: others unchanged');
  eq(cleared.length, 3, '3: three refs cleared (cross dim, spa, wall height)');
}

// ---------- 4. Cover-only job (no liner, no hardware) ----------
{
  const j = job();
  j.measurement.liner = null;
  delete j.hardware;
  const { job: after } = deletePerimeterPoint(j, 1);
  eq(after.measurement.cross_dimensions[0], { from_point: null, to_point: 3, distance_ft: 30 }, '4: works without liner');
}

// ---------- 5. Undo reverses the delete, not other fields ----------
{
  const j = job();
  const { undo } = removePoint(j, 3);
  j.measurement.shallow_depth_ft = 4;  // typed after the delete
  undoDeletePoint(j, undo);
  eq(j.measurement.perimeter_points, job().measurement.perimeter_points, '5: points restored');
  eq(j.measurement.cross_dimensions, job().measurement.cross_dimensions, '5: cross dims restored');
  eq(j.measurement.obstacles, job().measurement.obstacles, '5: obstacles restored');
  eq(j.measurement.liner, job().measurement.liner, '5: liner refs restored');
  eq(j.hardware, job().hardware, '5: padding restored');
  eq(j.measurement.shallow_depth_ft, 4, '5: later edits kept');
}

// ---------- 6. Undo leaves list edits made since the delete ----------
{
  const j = job();
  const { undo } = removePoint(j, 3);
  const m = j.measurement;
  // After the delete: the skimmer is re-pointed at (new) 4, i.e. old point 5,
  // the deep wall height is relabelled, and a cross dimension is added.
  m.liner.fittings[0].near_point = 4;
  m.liner.wall_heights[1].label = 'Deep end';
  m.cross_dimensions.push({ from_point: 1, to_point: 5, distance_ft: 22 });
  undoDeletePoint(j, undo);
  eq(m.liner.fittings[0].near_point, 5, '6: re-pointed fitting kept, shifted with its point');
  eq(m.liner.wall_heights[1], { label: 'Deep end', at_point: 6, height_ft: 4 }, '6: relabel kept');
  eq(m.liner.wall_heights[0].at_point, 3, '6: cleared ref restored');
  eq(m.cross_dimensions.length, 3, '6: added row kept');
  eq(m.cross_dimensions[2], { from_point: 1, to_point: 6, distance_ft: 22 }, '6: added row follows its points');
  eq(m.cross_dimensions[1], { from_point: 3, to_point: 6, distance_ft: 16 }, '6: cleared end restored');
}

// ---------- 7. Two deletes undo in order; a removed row is not revived ----------
{
  const j = job();
  const first = removePoint(j, 3).undo;
  const second = removePoint(j, 4).undo;  // old point 5
  j.measurement.obstacles = [];  // the obstacle row is gone since
  undoDeletePoint(j, second);
  undoDeletePoint(j, first);
  eq(j.measurement.perimeter_points, job().measurement.perimeter_points, '7: points back');
  eq(j.measurement.spa, job().measurement.spa, '7: spa back');
  eq(j.measurement.break_off_points, job().measurement.break_off_points, '7: break-off back');
  eq(j.measurement.obstacles, [], '7: removed row stays removed');
}

console.log(`pointRefs: ${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of fails) console.log('  FAIL', f);
  process.exit(1);
}
