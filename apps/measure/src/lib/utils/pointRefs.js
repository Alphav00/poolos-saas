/**
 * Perimeter point references.
 *
 * Deleting a perimeter point renumbers the ones after it, so everything that
 * names a point by number has to move with them: cross dimensions, break-off
 * points, obstacles, spa and step, liner steps, wall heights, fittings and the
 * cover's padding range. A reference to the deleted point itself is cleared
 * (set to null) and reported, so the form can tell the tech what to re-pick.
 *
 * Pure functions; tested in tests/pointRefs.test.js.
 */

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

/** Every [object, key, label] that names a perimeter point by number. */
function refSlots(job) {
  const m = job.measurement || {};
  const liner = m.liner || {};
  const slots = [];
  const each = (rows, keys, label) => {
    (rows || []).forEach((row, i) => {
      if (!row) return;
      for (const [key, end] of keys) slots.push([row, key, `${label(row, i)} (${end})`]);
    });
  };
  each(m.cross_dimensions, [['from_point', 'from'], ['to_point', 'to']], (_, i) => `Cross dimension ${i + 1}`);
  each(m.break_off_points, [['from_point', 'from'], ['to_point', 'to']], (_, i) => `Break-off ${i + 1}`);
  each(m.obstacles, [['front_point', 'front'], ['back_point', 'back']], (o, i) => `Obstacle ${i + 1}${o.kind ? ` ${o.kind}` : ''}`);
  if (m.spa) each([m.spa], [['from_point', 'from'], ['to_point', 'to']], () => 'Spa');
  if (m.step) each([m.step], [['from_point', 'from'], ['to_point', 'to']], () => 'Step');
  each(liner.steps, [['from_point', 'from'], ['to_point', 'to']], (_, i) => `Liner step ${i + 1}`);
  each(liner.wall_heights, [['at_point', 'point']], (w, i) => `Wall height ${w.label || i + 1}`);
  each(liner.fittings, [['near_point', 'near point']], (f, i) => `Fitting ${f.label || f.kind || i + 1}`);
  if (job.hardware) {
    each([job.hardware], [['perimeter_padding_from_pt', 'from'], ['perimeter_padding_to_pt', 'to']], () => 'Perimeter padding');
  }
  return slots;
}

/**
 * Delete perimeter point `num` from a job.
 *
 * Returns a new job (the input is not touched) whose points are renumbered
 * 1..N and whose references follow them: n > num becomes n - 1, n == num
 * becomes null. `cleared` lists the references that pointed at the deleted
 * point, e.g. "Cross dimension 2 (to)".
 */
export function deletePerimeterPoint(job, num) {
  const next = clone(job);
  const target = Number(num);
  next.measurement.perimeter_points = (next.measurement.perimeter_points || [])
    .filter((p) => Number(p.number) !== target)
    .map((p, i) => ({ ...p, number: i + 1 }));
  const cleared = [];
  for (const [obj, key, label] of refSlots(next)) {
    const raw = obj[key];
    if (raw == null || raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (n === target) {
      obj[key] = null;
      cleared.push(label);
    } else if (n > target) {
      obj[key] = n - 1;
    }
  }
  return { job: next, cleared };
}

/** A deep copy of the points and every reference to them, for undo. */
export function pointRefsSnapshot(job) {
  const m = job.measurement || {};
  const liner = m.liner;
  return clone({
    perimeter_points: m.perimeter_points || [],
    cross_dimensions: m.cross_dimensions,
    break_off_points: m.break_off_points,
    obstacles: m.obstacles,
    spa: m.spa,
    step: m.step,
    liner: liner ? { steps: liner.steps, wall_heights: liner.wall_heights, fittings: liner.fittings } : null,
    padding: job.hardware
      ? { from: job.hardware.perimeter_padding_from_pt, to: job.hardware.perimeter_padding_to_pt }
      : null,
  });
}

/**
 * Put a snapshot back onto a job, in place. Only the point-bearing fields
 * move; anything else typed since (depths, notes) is left alone.
 */
export function restorePointRefs(job, snap) {
  const s = clone(snap);
  const m = job.measurement;
  for (const k of ['perimeter_points', 'cross_dimensions', 'break_off_points', 'obstacles', 'spa', 'step']) {
    if (s[k] !== undefined) m[k] = s[k];
  }
  if (s.liner && m.liner) {
    for (const k of ['steps', 'wall_heights', 'fittings']) {
      if (s.liner[k] !== undefined) m.liner[k] = s.liner[k];
    }
  }
  if (s.padding && job.hardware) {
    job.hardware.perimeter_padding_from_pt = s.padding.from;
    job.hardware.perimeter_padding_to_pt = s.padding.to;
  }
  return job;
}
