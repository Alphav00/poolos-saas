/**
 * What of a draft job goes to the server.
 *
 * The local draft keeps everything the tech typed, half-finished rows
 * included. The server checks every save against the job models in
 * @poolos/measure-core and rejects the whole body for one bad row, so the
 * payload leaves out what cannot pass yet:
 *   - cleared number boxes ('') are dropped, so the server uses its default
 *     (or reports the one required field that is really missing)
 *   - cross dimensions and break-offs without both points and a distance
 *   - obstacles without a kind
 *   - wall heights without a label or a height
 *   - fittings that cannot be located (need A and B, or a near point)
 *
 * `canCreate` mirrors the minimum create shape (PoolJobCreateV): at least
 * four perimeter points, each with A and B. Until then a new job is only
 * kept on the phone.
 *
 * Pure functions; tested in tests/serverPayload.test.js.
 */

const FIELDS = ['meta', 'product_type', 'measurement', 'cover_spec', 'liner_spec', 'hardware', 'notes'];

// Keys whose values are numbers. A cleared input for one of these sends ''.
const NUMERIC_KEY = /(?:_ft|_in|_pct|_mil|_years|_days|_point|_pt)$|^(?:number|index|order|pool_length|pool_width|y_straps|wood_deck_anchors|beauty_rings|lawn_stakes)$/;

const blank = (v) => v === null || v === undefined || v === '';
const isNum = (v) => !blank(v) && Number.isFinite(Number(v));

/** Deep copy, dropping '' from numeric keys. */
function dropBlankNumbers(v) {
  if (Array.isArray(v)) return v.map(dropBlankNumbers);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      if (x === '' && NUMERIC_KEY.test(k)) continue;
      out[k] = dropBlankNumbers(x);
    }
    return out;
  }
  return v;
}

const complete = (row, keys) => keys.every((k) => isNum(row?.[k]));
const locatable = (f) => (isNum(f?.a_distance_ft) && isNum(f?.b_distance_ft)) || isNum(f?.near_point);

/** The body to send for a save: the job's editable fields, incomplete rows left out. */
export function serverPayload(job) {
  const body = {};
  for (const k of FIELDS) body[k] = dropBlankNumbers(job[k] ?? null);
  const m = body.measurement;
  if (m) {
    if (Array.isArray(m.cross_dimensions)) {
      m.cross_dimensions = m.cross_dimensions.filter(
        (c) => complete(c, ['from_point', 'to_point', 'distance_ft']) && Number(c.from_point) !== Number(c.to_point),
      );
    }
    if (Array.isArray(m.break_off_points)) {
      m.break_off_points = m.break_off_points.filter((b) => complete(b, ['from_point', 'to_point', 'distance_ft']));
    }
    if (Array.isArray(m.obstacles)) m.obstacles = m.obstacles.filter((o) => o && o.kind);
    const liner = m.liner;
    if (liner) {
      if (Array.isArray(liner.wall_heights)) {
        liner.wall_heights = liner.wall_heights.filter((w) => w && String(w.label ?? '').trim() && Number(w.height_ft) > 0);
      }
      if (Array.isArray(liner.fittings)) liner.fittings = liner.fittings.filter(locatable);
    }
  }
  return body;
}

/** Whether a payload passes the server's minimum create shape. */
export function canCreate(payload) {
  const pts = payload?.measurement?.perimeter_points;
  return Array.isArray(pts) && pts.length >= 4 && pts.every((p) => complete(p, ['a_distance_ft', 'b_distance_ft']));
}
