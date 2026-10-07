/**
 * Wizard step definitions (logic only, no Svelte imports).
 *
 * Step `component` is set in `stepComponents.js` to keep this file
 * importable in plain Node tests.
 *
 * Each step has:
 *   id           short identifier
 *   title        shown in step nav
 *   subtitle     shown above the form
 *   help         optional help text shown in a "?" popover
 *   component    Svelte component (set in stepComponents.js)
 *   isComplete   (job) => bool   -- can the user advance from this step?
 *   canEnter     (job) => bool   -- is the step reachable at all?
 *   skippable    bool            -- can the user skip past without completing?
 *
 * Validation strategy:
 *   - Hard rules (missing required fields) block "Next" with an inline message.
 *   - Soft rules (recommended but not required) show a yellow notice but
 *     don't block.
 *
 * Product awareness:
 *   A job is for a cover, a liner, or both. The customer / A-B / perimeter /
 *   cross-dim / obstacle steps are shared — one walk-around serves both
 *   products — and then the product decides which spec steps follow. Use
 *   `stepsForJob(job)` rather than `STEPS` anywhere the job is known; `STEPS`
 *   remains the cover sequence.
 */

/**
 * Soft warnings shown as yellow notices on the step (don't block advance).
 * Returns an array of {field, message} or empty.
 */
export function stepWarnings(step, job) {
  const w = [];
  if (!step || !job) return w;
  if (step.id === 'ab-setup') {
    const m = job.measurement || {};
    const d = parseFloat(m.ab_distance_ft);
    if (d > 0 && d < 10) {
      w.push({ field: 'ab_distance_ft', message: 'A-B distance below 10ft minimum; reconstruction will be poor.' });
    }
    if (d > 100) {
      w.push({ field: 'ab_distance_ft', message: 'A-B distance over 100ft; use a longer tape or split the job.' });
    }
    if (parseFloat(m.ab_offset_from_pool_ft) < 3) {
      w.push({ field: 'ab_offset_from_pool_ft', message: 'A-B line should be at least 3ft from pool edge.' });
    }
  }
  if (step.id === 'perimeter') {
    const m = job.measurement || {};
    const pts = m.perimeter_points || [];
    if (pts.length > 0 && pts.length < 4) {
      w.push({ field: 'perimeter_points', message: `Only ${pts.length} points so far. Need at least 4 to close the loop.` });
    }
    const zeroPts = pts.filter(p => !p.a_distance_ft || !p.b_distance_ft).length;
    if (zeroPts > 0) {
      w.push({ field: 'perimeter_points', message: `${zeroPts} point(s) have a missing A or B distance.` });
    }
  }
  if (step.id === 'cross-dims') {
    if (!((job.measurement?.cross_dimensions?.length) > 0)) {
      w.push({ field: 'cross_dimensions', message: 'Industry standard requires 2-4 cross-dimensions. Add at least 2 before submitting.' });
    }
  }
  if (step.id === 'wall-heights') {
    const walls = job.measurement?.liner?.wall_heights || [];
    if (walls.length > 0 && !walls.some(x => String(x.label || '').toLowerCase().includes('shallow'))) {
      w.push({
        field: 'wall_heights',
        message: 'No wall labelled for the shallow end. Step risers are checked against that reading.',
      });
    }
  }
  if (step.id === 'liner-profile') {
    const segs = job.measurement?.liner?.profile_segments || [];
    if (segs.length > 0 && !segs.some(x => x.kind === 'shallow_floor')) {
      w.push({
        field: 'profile_segments',
        message: 'No shallow floor run. Start the section at the shallow wall and work to the deep end.',
      });
    }
  }
  if (step.id === 'fittings') {
    const kinds = (job.measurement?.liner?.fittings || []).map(f => f.kind);
    if (kinds.length === 0) {
      w.push({
        field: 'fittings',
        message: 'Every skimmer, return, light and main drain needs a cut-out location.',
      });
    } else if (!kinds.includes('skimmer')) {
      w.push({ field: 'fittings', message: 'No skimmer recorded. Confirm the pool has none.' });
    }
  }
  return w;
}

/** Is this step's product in scope for the job? */
function productOf(job) {
  return job?.product_type || 'cover';
}

export function needsCover(job) {
  const p = productOf(job);
  return p === 'cover' || p === 'both';
}

export function needsLiner(job) {
  const p = productOf(job);
  return p === 'liner' || p === 'both';
}

/** Liner steps have their own vertical capture; these live between the shared
 * perimeter work and the final review. */
export const LINER_STEPS = [
  {
    id: 'liner-shape',
    title: 'Shape',
    subtitle: 'Which supplier form is this pool ordered on?',
    help:
      'Standard shapes (rectangle, grecian, true L, roman end...) are ordered by name plus ' +
      'lettered dimensions. Organic shapes (kidney, figure-8, mountain lake, freeform) are ' +
      'ordered from the A/B plot itself, so the walk-around has to be complete.',
    isComplete: (job) => !!job.measurement?.liner?.shape,
    canEnter: (job) => !!((job.meta?.customer_name || '').trim()),
    skippable: false,
    fields: ['liner.shape'],
  },
  {
    id: 'wall-heights',
    title: 'Wall heights',
    subtitle: 'Bead receiver down to the top of the cove',
    help:
      'One reading per wall, plus one anywhere the wall steps. Measure from where the liner ' +
      'snaps into the track — NOT from the top of the deck or the coping edge. A liner cut ' +
      'from coping-edge numbers will not fit.',
    isComplete: (job) => (job.measurement?.liner?.wall_heights || []).length > 0,
    canEnter: (job) => (job.measurement?.perimeter_points?.length || 0) >= 4,
    skippable: false,
    fields: ['liner.wall_heights'],
  },
  {
    id: 'liner-profile',
    title: 'Floor profile',
    subtitle: 'The section from the shallow wall to the deep wall',
    help:
      'Break the floor into runs: flat shallow floor, slope, hopper bottom. For each, the ' +
      'horizontal (map) distance and the depth at each end. The horizontal runs must add up ' +
      'to the pool length — that is the check the fabricator relies on.',
    isComplete: (job) => (job.measurement?.liner?.profile_segments || []).length > 0,
    canEnter: (job) => (job.measurement?.liner?.wall_heights || []).length > 0,
    skippable: false,
    fields: ['liner.profile_segments', 'liner.hopper'],
  },
  {
    id: 'liner-steps',
    title: 'Steps',
    subtitle: 'Vinyl-over risers and treads',
    help:
      'Only vinyl-over steps need riser detail — the liner terminates at a fiberglass step. ' +
      'Measure every riser individually; they must add up to the shallow wall height.',
    isComplete: () => true,  // optional: plenty of pools have no vinyl-over step
    canEnter: () => true,
    skippable: true,
    fields: ['liner.steps'],
  },
  {
    id: 'fittings',
    title: 'Fittings',
    subtitle: 'Every cut-out the liner needs',
    help:
      'Skimmers, returns, lights, main drains, step jets, vacuum ports. Locate each by A/B ' +
      'tape pair or by the nearest perimeter point, and record how far below the bead it sits.',
    isComplete: () => true,  // optional but warned
    canEnter: () => true,
    skippable: true,
    fields: ['liner.fittings'],
  },
  {
    id: 'liner-spec',
    title: 'Liner',
    subtitle: 'Pattern, gauge, bead and site condition',
    help:
      'Pattern and thickness are what the shop cuts. Bead type and coping decide how it hangs. ' +
      'Floor and drainage condition drive the hydrostatic call on drain day.',
    isComplete: (job) => !!String(job.liner_spec?.pattern_name || '').trim(),
    canEnter: () => true,
    skippable: false,
    fields: ['liner_spec', 'liner.floor_type', 'liner.cove_type', 'liner.drainage_system'],
  },
];

export const STEPS = [
  {
    id: 'meta',
    title: 'Customer',
    subtitle: 'Who is this job for?',
    help: 'Customer and dealer info. Required for the order form.',
    isComplete: (job) =>
      !!((job.meta?.customer_name || '').trim()) && !!((job.meta?.dealer_name || '').trim()),
    canEnter: () => true,
    skippable: false,
    fields: ['meta'],
  },
  {
    id: 'ab-setup',
    title: 'A-B Line',
    subtitle: 'Set up the reference line',
    help:
      'Industry standard: A and B stakes are at least 10ft apart (typically 2/3 the pool length), ' +
      'at least 3ft from the pool edge, and the line between them does not intersect the pool. ' +
      'A is to the left of B as you face the pool.',
    isComplete: (job) => {
      const m = job.measurement || {};
      const d = parseFloat(m.ab_distance_ft);
      return d >= 10 && d <= 100;
    },
    canEnter: (job) => !!((job.meta?.customer_name || '').trim()),
    skippable: false,
    fields: ['ab_distance_ft', 'ab_offset_from_pool_ft', 'ab_orientation', 'ab_note'],
  },
  {
    id: 'perimeter',
    title: 'Perimeter',
    subtitle: 'Walk the pool and log A/B points',
    help:
      'Mark numbered points around the pool perimeter (every 2-3ft, 1ft on tight curves). ' +
      'For each point, record the A distance and B distance to the nearest ¼". ' +
      'Clockwise starting at the point closest to the middle of your A-B line.',
    isComplete: (job) => {
      const pts = job.measurement?.perimeter_points || [];
      return pts.length >= 4 && pts.every(p => parseFloat(p.a_distance_ft) > 0 && parseFloat(p.b_distance_ft) > 0);
    },
    canEnter: (job) => {
      const m = job.measurement || {};
      return parseFloat(m.ab_distance_ft) >= 10;
    },
    skippable: false,
    fields: ['perimeter_points'],
  },
  {
    id: 'cross-dims',
    title: 'Cross-dims',
    subtitle: 'Validate the chain with diagonal measurements',
    help:
      'Take 2-4 measurements between numbered points across the pool. ' +
      'These are the primary QA check against the A-B reconstruction.',
    isComplete: () => true,  // optional step
    canEnter: (job) => (job.measurement?.perimeter_points?.length || 0) >= 4,
    skippable: true,
    fields: ['cross_dimensions'],
  },
  {
    id: 'obstacles',
    title: 'Obstacles',
    subtitle: 'Non-removable items within 18in of the waterline',
    help: 'Handrails, grabrails, ladders, slide legs, rocks, waterfalls, raised walls, spa walls, fill spouts, dive stands, planters.',
    isComplete: () => true,  // optional
    canEnter: () => true,
    skippable: true,
    fields: ['obstacles'],
  },
  {
    id: 'step-spa',
    title: 'Step / Spa',
    subtitle: 'Step, swim-out, or attached spa',
    help: 'Location, size, and offset for any step or spa that needs a separate cover consideration.',
    isComplete: () => true,  // optional
    canEnter: () => true,
    skippable: true,
    fields: ['step', 'spa'],
  },
  {
    id: 'cover',
    title: 'Cover',
    subtitle: 'Cover type, color, spacing, hardware',
    help:
      'Mesh vs solid, color, anchor spacing (5x5 default, 3x3 for form-fit), ' +
      'anchor type, overlap, hardware add-ons.',
    isComplete: (job) => !!job.cover_spec?.type,
    canEnter: () => true,
    skippable: false,
    fields: ['cover_spec', 'hardware'],
  },
  {
    id: 'review',
    title: 'Review',
    subtitle: '3D preview and order form',
    help: 'Final review. 3D model + dimensions + PDF export.',
    isComplete: () => true,
    canEnter: (job) => !!job.cover_spec?.type,
    skippable: false,
    fields: [],
  },
];

/**
 * The step sequence for a job, decided by its product type.
 *
 * The shared front half (customer, A-B line, perimeter, cross-dims, obstacles)
 * is walked once no matter what is being ordered — a "both" job is one
 * walk-around and two orders. After that the cover steps and the liner steps
 * apply as the product requires, and review is always last.
 *
 * A cover-only job (the default, and every job saved before liner support)
 * gets exactly the original eight steps, in the original order.
 */
export function stepsForJob(job) {
  if (!needsLiner(job)) return STEPS;

  const byId = Object.fromEntries(STEPS.map(s => [s.id, s]));
  const shared = ['meta', 'ab-setup', 'perimeter', 'cross-dims', 'obstacles'].map(id => byId[id]);
  const coverSteps = needsCover(job) ? ['step-spa', 'cover'].map(id => byId[id]) : [];

  return [
    ...shared,
    ...coverSteps,
    ...LINER_STEPS,
    {
      ...byId.review,
      // Review needs whichever spec the job actually orders.
      canEnter: (j) =>
        (!needsCover(j) || !!j.cover_spec?.type)
        && (!needsLiner(j) || !!String(j.liner_spec?.pattern_name || '').trim()),
    },
  ];
}

/** Find the first step that is not yet complete (and not skippable). */
export function firstIncompleteStep(job, steps = stepsForJob(job)) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.skippable) continue;
    if (!(s.isComplete?.(job) ?? true)) return i;
  }
  return steps.length - 1;
}

/** Find the furthest step the user can currently reach. */
export function furthestReachableStep(job, steps = stepsForJob(job)) {
  let furthest = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].canEnter?.(job) ?? true) {
      furthest = i;
    } else {
      break;
    }
  }
  return furthest;
}
