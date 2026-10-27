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
 * point, e.g. "Cross dimension 2 (to)". `undo` is what undoDeletePoint needs
 * to reverse it later.
 */
export function deletePerimeterPoint(job, num) {
  const next = clone(job);
  return { job: next, ...removePoint(next, num) };
}

/**
 * deletePerimeterPoint on the job itself, in place. The form uses this so
 * the rows an undo entry remembers stay the job's own rows.
 */
export function removePoint(job, num) {
  const target = Number(num);
  const m = job.measurement;
  const points = m.perimeter_points || [];
  const index = points.findIndex((p) => Number(p.number) === target);
  const removed = index >= 0 ? clone(points[index]) : null;
  m.perimeter_points = points
    .filter((p) => Number(p.number) !== target)
    .map((p, i) => ({ ...p, number: i + 1 }));
  const cleared = [];
  // The rows whose reference was cleared, to put back on undo.
  const clearedSlots = [];
  for (const [obj, key, label] of refSlots(job)) {
    const raw = obj[key];
    if (raw == null || raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (n === target) {
      obj[key] = null;
      cleared.push(label);
      clearedSlots.push({ row: obj, key });
    } else if (n > target) {
      obj[key] = n - 1;
    }
  }
  return { cleared, undo: { num: target, index, point: removed, clearedSlots } };
}

/**
 * Reverse a delete on the job as it is now, in place.
 *
 * This is the inverse remap, not a restored copy: the point goes back at its
 * place, every reference n >= num becomes n + 1 (including ones picked after
 * the delete), and a reference the delete cleared gets num back if that row
 * is still there and still blank. Any other edit since the delete (a fitting
 * re-pointed, a row added or removed, depths) is left as it is.
 */
export function undoDeletePoint(job, undo) {
  if (!undo || !undo.point) return job;
  const m = job.measurement;
  const target = undo.num;
  const points = [...(m.perimeter_points || [])];
  const at = Math.max(0, Math.min(undo.index, points.length));
  points.splice(at, 0, clone(undo.point));
  m.perimeter_points = points.map((p, i) => ({ ...p, number: i + 1 }));
  const slots = refSlots(job);
  for (const [obj, key] of slots) {
    const raw = obj[key];
    if (raw == null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= target) obj[key] = n + 1;
  }
  const live = new Set(slots.map(([obj]) => obj));
  for (const { row, key } of undo.clearedSlots || []) {
    if (live.has(row) && (row[key] == null || row[key] === '')) row[key] = target;
  }
  return job;
}
