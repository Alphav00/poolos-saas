/**
 * Unit tests for wizard step logic. Plain node, no Svelte.
 *
 * Run with: node tests/wizard.test.js
 *
 * Tests:
 *   1. Empty job: step 0 (Customer) is incomplete
 *   2. With customer name: step 0 complete, can advance
 *   3. firstIncompleteStep: returns the right index for various job states
 *   4. furthestReachableStep: caps at first canEnter=false
 *   5. stepWarnings: returns warnings for ab-setup when distance is bad
 *   6. stepWarnings: warns for cross-dims when none provided
 *   7. skippable steps don't block firstIncompleteStep
 */
import {
  LINER_STEPS,
  STEPS,
  stepWarnings,
  firstIncompleteStep,
  furthestReachableStep,
  needsCover,
  needsLiner,
  stepsForJob,
} from '../src/lib/wizard/steps.js';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function eq(a, b, msg) { ok(a === b, `${msg}: expected ${b}, got ${a}`); }

const emptyJob = () => ({
  meta: { customer_name: '', dealer_name: '' },
  measurement: {
    ab_distance_ft: 20,
    ab_orientation: 'A_left_B_right_facing_pool',
    ab_offset_from_pool_ft: 4,
    perimeter_points: [],
    cross_dimensions: [],
  },
  cover_spec: { type: 'mesh_standard' },
});

// ---------- 1. Empty job: step 0 incomplete ----------
{
  const job = emptyJob();
  const i = firstIncompleteStep(job);
  eq(i, 0, '1: empty job -> first incomplete is step 0');
}

// ---------- 2. With customer name: can advance from step 0 ----------
{
  const job = emptyJob();
  job.meta.customer_name = 'Test';
  job.meta.dealer_name = 'Dealer';
  // Step 1 (AB setup) defaults ab_distance_ft to 20 (valid), so it's complete.
  // For this test, set it to an invalid value so we land on step 1.
  job.measurement.ab_distance_ft = 5;
  const step0 = STEPS[0];
  ok(step0.isComplete(job), '2: step 0 complete with customer + dealer');
  const i = firstIncompleteStep(job);
  eq(i, 1, '2: next incomplete is step 1 (AB setup)');
}

// ---------- 3. firstIncompleteStep on various states ----------
{
  // Full rectangular job: only step 7 (cover) is incomplete? No, cover is set.
  // After: only step 8 (review) is left, but review isComplete returns true.
  // So firstIncompleteStep returns last index.
  const job = emptyJob();
  job.meta.customer_name = 'C';
  job.meta.dealer_name = 'D';
  job.measurement.perimeter_points = [
    { number: 1, a_distance_ft: 4, b_distance_ft: 16 },
    { number: 2, a_distance_ft: 4, b_distance_ft: 16 },
    { number: 3, a_distance_ft: 4, b_distance_ft: 16 },
    { number: 4, a_distance_ft: 4, b_distance_ft: 16 },
  ];
  // Cross-dims, obstacles, step/spa are all skippable so they don't block
  // Cover is set
  const i = firstIncompleteStep(job);
  ok(i === STEPS.length - 1, `3: complete job -> first incomplete is last step, got ${i}`);
}

// ---------- 4. furthestReachableStep: blocks on canEnter=false ----------
{
  // No customer name -> canEnter for step 1 returns false -> furthest is 0
  const job = emptyJob();
  const f = furthestReachableStep(job);
  eq(f, 0, '4: empty job -> furthest is step 0');
}
{
  // With customer name but bad AB distance -> canEnter for step 2 (perimeter)
  // requires ab_distance_ft >= 10. 20 is fine. But if we lower it...
  const job = emptyJob();
  job.meta.customer_name = 'C';
  job.meta.dealer_name = 'D';
  job.measurement.ab_distance_ft = 5;  // invalid
  const f = furthestReachableStep(job);
  eq(f, 1, '4: invalid AB -> furthest is step 1 (AB setup)');
}

// ---------- 5. stepWarnings for ab-setup ----------
{
  const job = emptyJob();
  job.meta.customer_name = 'C';
  job.meta.dealer_name = 'D';
  job.measurement.ab_distance_ft = 5;  // below 10
  const w = stepWarnings(STEPS[1], job);
  ok(w.some(x => x.message.includes('10ft')), '5: warns on short AB distance');
}
{
  const job = emptyJob();
  job.meta.customer_name = 'C';
  job.meta.dealer_name = 'D';
  job.measurement.ab_distance_ft = 200;  // above 100
  const w = stepWarnings(STEPS[1], job);
  ok(w.some(x => x.message.includes('100ft')), '5: warns on long AB distance');
}
{
  const job = emptyJob();
  job.meta.customer_name = 'C';
  job.meta.dealer_name = 'D';
  job.measurement.ab_offset_from_pool_ft = 1;  // below 3
  const w = stepWarnings(STEPS[1], job);
  ok(w.some(x => x.message.includes('3ft')), '5: warns on close AB offset');
}

// ---------- 6. stepWarnings for cross-dims ----------
{
  const job = emptyJob();
  job.meta.customer_name = 'C';
  job.meta.dealer_name = 'D';
  job.measurement.cross_dimensions = [];
  const w = stepWarnings(STEPS[3], job);
  ok(w.some(x => x.message.includes('cross')), '6: warns on no cross-dims');
}
{
  const job = emptyJob();
  job.measurement.cross_dimensions = [
    { from_point: 1, to_point: 2, distance_ft: 10 },
    { from_point: 3, to_point: 4, distance_ft: 20 },
  ];
  const w = stepWarnings(STEPS[3], job);
  eq(w.length, 0, '6: no warning when cross-dims present');
}

// ---------- 7. Skippable steps don't block firstIncompleteStep ----------
{
  // Job with everything except step 5 (obstacles) which is skippable
  const job = emptyJob();
  job.meta.customer_name = 'C';
  job.meta.dealer_name = 'D';
  job.measurement.perimeter_points = [
    { number: 1, a_distance_ft: 4, b_distance_ft: 16 },
    { number: 2, a_distance_ft: 4, b_distance_ft: 16 },
    { number: 3, a_distance_ft: 4, b_distance_ft: 16 },
    { number: 4, a_distance_ft: 4, b_distance_ft: 16 },
  ];
  // Cross-dims (skippable), obstacles (skippable), step/spa (skippable) all empty -> OK
  const i = firstIncompleteStep(job);
  ok(i === STEPS.length - 1, `7: skippable steps skipped, got ${i}`);
}

// ---------- 8. Steps structure ----------
{
  eq(STEPS.length, 8, '8: 8 wizard steps');
  eq(STEPS[0].id, 'meta', '8: step 0 is meta');
  eq(STEPS[7].id, 'review', '8: step 7 is review');
  ok(STEPS.every(s => s.id && s.title && typeof s.isComplete === 'function'),
     '8: every step has id, title, isComplete');
  ok(STEPS.every(s => Array.isArray(s.fields)),
     '8: every step has fields list');
  const skippable = STEPS.filter(s => s.skippable);
  ok(skippable.length >= 3, `8: at least 3 skippable steps, got ${skippable.length}`);
}

// ---------- 9. Product-aware step lists ----------
{
  // A cover job (and any job saved before liner support, which has no
  // product_type at all) gets exactly the original sequence.
  eq(stepsForJob({}).length, 8, '9: a job with no product_type gets the cover steps');
  ok(stepsForJob({}) === STEPS, '9: and gets the STEPS array itself, not a copy');
  eq(stepsForJob({ product_type: 'cover' }).length, 8, '9: cover -> 8 steps');

  const linerIds = stepsForJob({ product_type: 'liner' }).map(s => s.id);
  eq(linerIds.length, 12, '9: liner -> 12 steps');
  ok(!linerIds.includes('cover'), '9: a liner job has no cover step');
  ok(!linerIds.includes('step-spa'), '9: a liner job has no cover step/spa step');
  ok(linerIds.includes('liner-profile'), '9: a liner job has the floor profile step');
  eq(linerIds[linerIds.length - 1], 'review', '9: review is last on a liner job');

  const bothIds = stepsForJob({ product_type: 'both' }).map(s => s.id);
  eq(bothIds.length, 14, '9: both -> 14 steps');
  ok(bothIds.includes('cover') && bothIds.includes('liner-spec'),
     '9: a both job carries the cover step and the liner spec step');
  eq(bothIds[bothIds.length - 1], 'review', '9: review is last on a both job');

  // The shared front half is walked once, in the same order, whatever the product.
  const shared = ['meta', 'ab-setup', 'perimeter', 'cross-dims', 'obstacles'];
  for (const list of [stepsForJob({}), stepsForJob({ product_type: 'liner' }),
                      stepsForJob({ product_type: 'both' })]) {
    ok(list.slice(0, 5).every((s, i) => s.id === shared[i]),
       '9: the shared front half is identical across products');
  }
}

// ---------- 10. Product predicates ----------
{
  ok(needsCover({}) && !needsLiner({}), '10: an unset product means cover');
  ok(needsCover({ product_type: 'cover' }), '10: cover needs a cover');
  ok(!needsLiner({ product_type: 'cover' }), '10: cover does not need a liner');
  ok(needsLiner({ product_type: 'liner' }), '10: liner needs a liner');
  ok(!needsCover({ product_type: 'liner' }), '10: liner does not need a cover');
  ok(needsCover({ product_type: 'both' }) && needsLiner({ product_type: 'both' }),
     '10: both needs both');
}

// ---------- 11. Liner step structure and gating ----------
{
  ok(LINER_STEPS.every(s => s.id && s.title && typeof s.isComplete === 'function'),
     '11: every liner step has id, title, isComplete');
  ok(LINER_STEPS.every(s => Array.isArray(s.fields)), '11: every liner step has a fields list');

  const byId = Object.fromEntries(LINER_STEPS.map(s => [s.id, s]));

  // Wall heights gate the profile: the profile is checked against them.
  ok(!byId['liner-profile'].canEnter({ measurement: { liner: { wall_heights: [] } } }),
     '11: the profile step is locked until a wall height exists');
  ok(byId['liner-profile'].canEnter({ measurement: { liner: { wall_heights: [{ height_ft: 3.5 }] } } }),
     '11: and unlocks once one is captured');

  // The perimeter gates wall heights.
  ok(!byId['wall-heights'].canEnter({ measurement: { perimeter_points: [] } }),
     '11: wall heights are locked until the perimeter is walked');

  // Steps and fittings are optional; shape and spec are not.
  ok(byId['liner-steps'].skippable && byId['fittings'].skippable,
     '11: steps and fittings are skippable');
  ok(!byId['liner-shape'].skippable && !byId['liner-spec'].skippable,
     '11: shape and liner spec are required');

  ok(!byId['liner-spec'].isComplete({ liner_spec: { pattern_name: '  ' } }),
     '11: a blank pattern leaves the liner spec incomplete');
  ok(byId['liner-spec'].isComplete({ liner_spec: { pattern_name: 'Sandstone' } }),
     '11: a pattern completes it');
}

// ---------- 12. Review is gated on whichever spec the job orders ----------
{
  const review = stepsForJob({ product_type: 'both' }).find(s => s.id === 'review');
  ok(!review.canEnter({ product_type: 'both', cover_spec: { type: 'mesh_standard' }, liner_spec: {} }),
     '12: a both job cannot review without a liner pattern');
  ok(!review.canEnter({ product_type: 'both', cover_spec: {}, liner_spec: { pattern_name: 'X' } }),
     '12: nor without a cover type');
  ok(review.canEnter({
    product_type: 'both',
    cover_spec: { type: 'mesh_standard' },
    liner_spec: { pattern_name: 'X' },
  }), '12: with both, it opens');

  const linerReview = stepsForJob({ product_type: 'liner' }).find(s => s.id === 'review');
  ok(linerReview.canEnter({ product_type: 'liner', cover_spec: {}, liner_spec: { pattern_name: 'X' } }),
     '12: a liner job does not need a cover type to review');
}

// ---------- 13. Liner step warnings ----------
{
  const jobWith = (liner) => ({ measurement: { liner } });

  const noShallow = stepWarnings(
    { id: 'wall-heights' },
    jobWith({ wall_heights: [{ label: 'north_wall', height_ft: 3.5 }] }),
  );
  ok(noShallow.some(w => w.message.includes('shallow')),
     '13: an unlabelled shallow wall warns, since risers check against it');

  const withShallow = stepWarnings(
    { id: 'wall-heights' },
    jobWith({ wall_heights: [{ label: 'shallow_end', height_ft: 3.5 }] }),
  );
  eq(withShallow.length, 0, '13: labelling it clears the warning');

  const noShallowRun = stepWarnings(
    { id: 'liner-profile' },
    jobWith({ profile_segments: [{ kind: 'slope' }] }),
  );
  ok(noShallowRun.some(w => w.message.includes('shallow floor')),
     '13: a profile that does not start shallow warns');

  const noFittings = stepWarnings({ id: 'fittings' }, jobWith({ fittings: [] }));
  ok(noFittings.some(w => w.message.includes('cut-out')), '13: no fittings warns');

  const noSkimmer = stepWarnings({ id: 'fittings' }, jobWith({ fittings: [{ kind: 'return' }] }));
  ok(noSkimmer.some(w => w.message.includes('skimmer')), '13: a missing skimmer warns');
}

// ---------- 14. Navigation helpers respect the job's own list ----------
{
  const linerJob = {
    product_type: 'liner',
    meta: { customer_name: 'C', dealer_name: 'D' },
    measurement: {
      ab_distance_ft: 20,
      perimeter_points: [],
      cross_dimensions: [],
      liner: { shape: 'rectangle', wall_heights: [] },
    },
    liner_spec: { pattern_name: '' },
  };
  // Perimeter is empty, so the first incomplete step is the perimeter (index 2).
  eq(firstIncompleteStep(linerJob), 2, '14: firstIncompleteStep walks the liner list');
  // canEnter chain stops at the perimeter for the same reason.
  ok(furthestReachableStep(linerJob) >= 2, '14: furthestReachableStep walks the liner list');
}

console.log(`\nWizard tests: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
