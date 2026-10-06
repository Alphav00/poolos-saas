/**
 * Cross-dimension validation. Port of
 * `frontend/src/lib/utils/crossDimValidation.js` (JS-only; no Python version).
 *
 * Auto-detects the role of a tape-measured cross dimension (Length / Width /
 * Diagonal) against the reconstructed pool and grades the agreement.
 *
 * Tolerance bands (decimal feet):
 *   role:   within 10% of the matching dimension -> Length / Width, else Diagonal
 *   green:  within max(1%, 0.5 ft)
 *   yellow: within max(5%, 2 ft)
 *   red:    beyond yellow
 */
import type { CrossDimension, Numeric } from './types';

export const TOL_ROLE = 0.10;
export const TOL_GREEN_PCT = 0.01;
export const TOL_GREEN_MIN_FT = 0.5;
export const TOL_YELLOW_PCT = 0.05;
export const TOL_YELLOW_MIN_FT = 2.0;

export type CrossDimRole = 'Length' | 'Width' | 'Diagonal' | '-';
export type CrossDimStatus = 'green' | 'yellow' | 'red' | 'info' | 'none';

export interface CrossDimClassification {
  role: CrossDimRole;
  status: CrossDimStatus;
  message: string;
  diffFt?: number;
}

/** Classify a single cross-dim distance against the reconstructed L × W. */
export function classifyCrossDim(
  dist: Numeric | null | undefined,
  lengthFt: number,
  widthFt: number,
): CrossDimClassification {
  const d = Number(dist) || 0;
  if (d <= 0) return { role: '-', status: 'none', message: 'enter dist.' };

  const reconstructedValid = lengthFt > 0 && widthFt > 0;

  let role: CrossDimRole = 'Diagonal';
  if (reconstructedValid) {
    if (lengthFt > widthFt && Math.abs(d - lengthFt) <= lengthFt * TOL_ROLE) {
      role = 'Length';
    } else if (Math.abs(d - widthFt) <= widthFt * TOL_ROLE) {
      role = 'Width';
    }
  }

  if (role === 'Diagonal') return { role, status: 'info', message: 'skip' };

  const target = role === 'Length' ? lengthFt : widthFt;
  const diff = Math.abs(d - target);
  const greenLimit = Math.max(target * TOL_GREEN_PCT, TOL_GREEN_MIN_FT);
  const yellowLimit = Math.max(target * TOL_YELLOW_PCT, TOL_YELLOW_MIN_FT);

  let status: CrossDimStatus;
  let message: string;
  if (diff <= greenLimit) {
    status = 'green';
    message = '✓';
  } else if (diff <= yellowLimit) {
    status = 'yellow';
    message = '⚠';
  } else {
    status = 'red';
    message = `off ${diff.toFixed(1)}ft`;
  }
  return { role, status, message, diffFt: diff };
}

/** Partial entry as the form holds it while the tech is typing. */
export interface CrossDimEntry {
  from_point?: CrossDimension['from_point'] | string | null;
  to_point?: CrossDimension['to_point'] | string | null;
}

/** Structural check of a cross-dim entry; a warning string or null if OK. */
export function entryWarning(
  entry: CrossDimEntry | null | undefined,
  pointCount: number,
): string | null {
  if (!entry) return null;
  if (entry.from_point === null || entry.from_point === undefined
    || entry.to_point === null || entry.to_point === undefined) {
    return 'select both points';
  }
  if (pointCount === 0) return 'capture the perimeter first';
  const fromN = Number(entry.from_point);
  const toN = Number(entry.to_point);
  if (!Number.isFinite(fromN) || fromN < 1 || fromN > pointCount) {
    return `point ${entry.from_point} doesn't exist (1–${pointCount})`;
  }
  if (!Number.isFinite(toN) || toN < 1 || toN > pointCount) {
    return `point ${entry.to_point} doesn't exist (1–${pointCount})`;
  }
  if (fromN === toN) return 'from and to must differ';
  return null;
}
