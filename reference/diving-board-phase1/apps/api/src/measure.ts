import {
  computeJobTakeoff,
  rawReconstruction,
  toReconstructedPool,
  validateJob,
  type ApiLinerTakeoff,
  type ApiReconstructedPool,
  type JobMeasurement,
  type LinerSpec,
} from '@diving-board/measure-core';
import type { ClosureCheck } from '@diving-board/orders';

export type JobKind = 'liner' | 'cover' | 'both';
export type CheckScope = 'liner' | 'cover';

export interface JobCheck extends ClosureCheck {
  /** Which products this check gates. */
  applies: CheckScope[];
}

/** The server's verdict on a capture, stored on the job as `closure`. */
export interface JobClosure {
  checks: JobCheck[];
  /** Checks with status `block`, for quick display. */
  blocking: JobCheck[];
  reconstruction: ApiReconstructedPool | null;
  takeoff: ApiLinerTakeoff | null;
  hydrostatic: { severity: string; notes: string[] } | null;
}

const BOTH: CheckScope[] = ['liner', 'cover'];
const block = (name: string, message: string, applies = BOTH): JobCheck => ({ name, status: 'block', message, applies });

/**
 * Every number the math reads must be a real, finite number. The math port
 * passes unreadable values through as NaN, so the server refuses them here
 * instead of letting NaN reach an order.
 */
function badNumbers(m: Record<string, unknown>): string[] {
  const bad: string[] = [];
  const check = (path: string, v: unknown, required = false) => {
    if (v === undefined || v === null || v === '') {
      if (required) bad.push(`${path} is missing`);
      return;
    }
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (!Number.isFinite(n) || n < 0) bad.push(`${path} must be a number of feet, 0 or more`);
  };
  check('A-B distance', m.ab_distance_ft, true);
  check('Shallow depth', m.shallow_depth_ft);
  check('Deep depth', m.deep_depth_ft);
  const points = Array.isArray(m.perimeter_points) ? m.perimeter_points : [];
  const seen = new Set<number>();
  points.forEach((p, i) => {
    const pt = (p ?? {}) as Record<string, unknown>;
    const num = pt.number;
    if (typeof num !== 'number' || !Number.isInteger(num)) bad.push(`Perimeter point ${i + 1} needs a whole point number`);
    else if (seen.has(num)) bad.push(`Point #${num} is entered twice`);
    else seen.add(num);
    check(`Point #${String(num ?? i + 1)} A distance`, pt.a_distance_ft, true);
    check(`Point #${String(num ?? i + 1)} B distance`, pt.b_distance_ft, true);
  });
  const liner = (m.liner ?? {}) as Record<string, unknown>;
  (Array.isArray(liner.wall_heights) ? liner.wall_heights : []).forEach((w, i) => {
    const wh = (w ?? {}) as Record<string, unknown>;
    check(`Wall height "${String(wh.label ?? i + 1)}"`, wh.height_ft, true);
  });
  return bad;
}

function scoped(status: 'pass' | 'warn' | 'fail'): ClosureCheck['status'] {
  return status === 'fail' ? 'block' : status;
}

/**
 * Recomputes every check for a saved capture. A job with any `block` check
 * cannot go to review, and an order built from it cannot be marked ready.
 */
export function evaluateMeasurement(kind: JobKind, measurement: Record<string, unknown>): JobClosure {
  const checks: JobCheck[] = [];
  const done = (extra: Partial<JobClosure> = {}): JobClosure => ({
    checks,
    blocking: checks.filter((c) => c.status === 'block'),
    reconstruction: null,
    takeoff: null,
    hydrostatic: null,
    ...extra,
  });

  const points = Array.isArray(measurement.perimeter_points) ? measurement.perimeter_points : [];
  if (points.length === 0) {
    checks.push(block('Perimeter', 'No perimeter points captured yet'));
    return done();
  }
  const bad = badNumbers(measurement);
  if (bad.length > 0) {
    for (const message of bad) checks.push(block('Input', message));
    return done();
  }

  const m = measurement as unknown as JobMeasurement & { liner_spec?: LinerSpec };
  const job = { measurement: m, ...(m.liner_spec ? { liner_spec: m.liner_spec } : {}) };
  const result = rawReconstruction(job);
  const reconstruction = toReconstructedPool(job, result);

  if (result.invalidReasons.length > 0) {
    for (const reason of result.invalidReasons) checks.push(block('Perimeter reconstruction', reason));
  } else {
    checks.push({ name: 'Perimeter reconstruction', status: 'pass', message: `${points.length} points close into a valid outline`, applies: BOTH });
  }

  if (kind === 'cover') return done({ reconstruction });

  if (!m.liner) {
    checks.push(block('Liner capture', 'Wall heights, floor profile and fittings are needed for a liner', ['liner']));
    return done({ reconstruction });
  }

  const report = validateJob(job, result);
  for (const c of report.checks) {
    checks.push({
      name: c.name,
      status: scoped(c.status),
      measured: c.measured_ft,
      expected: c.expected_ft,
      differenceIn: c.difference_in,
      message: c.message,
      applies: ['liner'],
    });
  }
  // Blocking findings that are not closure checks (shape rules, bead receiver, ...).
  const named = new Set(report.checks.map((c) => c.message));
  for (const message of report.blocking) if (!named.has(message)) checks.push(block('Liner', message, ['liner']));
  for (const message of report.warnings) if (!named.has(message)) checks.push({ name: 'Liner', status: 'warn', message, applies: ['liner'] });

  return done({ reconstruction, takeoff: computeJobTakeoff(job, result), hydrostatic: report.hydrostatic });
}
