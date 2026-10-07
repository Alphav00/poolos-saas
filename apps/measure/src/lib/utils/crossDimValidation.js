/**
 * Cross-dimension validation logic.
 *
 * Used by CrossDimensionsForm.svelte to auto-detect the role of each
 * measurement (Length / Width / Diagonal) and check it against the
 * reconstructed length or width.
 *
 * Pure functions; tested in tests/crossDimValidation.test.js.
 */

/**
 * Tolerance bands.
 *   role: 10% (a measurement within 10% of the matching dimension
 *         is labeled Length or Width, otherwise Diagonal)
 *   green: within 1% (or 0.5ft floor)
 *   yellow: within 5% (or 2ft floor)
 */
const TOL_ROLE = 0.10;
const TOL_GREEN_PCT = 0.01;
const TOL_GREEN_MIN = 0.5;
const TOL_YELLOW_PCT = 0.05;
const TOL_YELLOW_MIN = 2.0;

/**
 * Classify a single cross-dim measurement.
 *
 * @param {number} dist - the cross-dim distance in ft
 * @param {number} lengthFt - reconstructed pool length
 * @param {number} widthFt - reconstructed pool width
 * @returns {{role: 'Length'|'Width'|'Diagonal'|'-', status: 'green'|'yellow'|'red'|'info'|'none', message: string, diffFt?: number}}
 */
export function classifyCrossDim(dist, lengthFt, widthFt) {
  const d = Number(dist) || 0;
  if (d <= 0) {
    return { role: '-', status: 'none', message: 'enter dist.' };
  }

  const reconstructedValid = lengthFt > 0 && widthFt > 0;

  // Role detection
  let role = 'Diagonal';
  if (reconstructedValid) {
    if (lengthFt > widthFt && Math.abs(d - lengthFt) <= lengthFt * TOL_ROLE) {
      role = 'Length';
    } else if (Math.abs(d - widthFt) <= widthFt * TOL_ROLE) {
      role = 'Width';
    }
  }

  // Validation
  if (role === 'Diagonal') {
    return { role, status: 'info', message: 'skip' };
  }

  const target = role === 'Length' ? lengthFt : widthFt;
  const diff = Math.abs(d - target);
  const greenLimit = Math.max(target * TOL_GREEN_PCT, TOL_GREEN_MIN);
  const yellowLimit = Math.max(target * TOL_YELLOW_PCT, TOL_YELLOW_MIN);

  let status, message;
  if (diff <= greenLimit) {
    status = 'green';
    message = '\u2713';
  } else if (diff <= yellowLimit) {
    status = 'yellow';
    message = '\u26A0';
  } else {
    status = 'red';
    message = `off ${diff.toFixed(1)}ft`;
  }
  return { role, status, message, diffFt: diff };
}

/**
 * Structural validation: are the from/to points valid?
 *
 * @param {{from_point, to_point}} entry
 * @param {number} pointCount - number of perimeter points
 * @returns {string|null} warning message, or null if OK
 */
export function entryWarning(entry, pointCount) {
  if (!entry) return null;
  if (entry.from_point == null || entry.to_point == null) return 'select both points';
  if (pointCount === 0) return 'capture the perimeter first';
  const fromN = Number(entry.from_point);
  const toN = Number(entry.to_point);
  if (!Number.isFinite(fromN) || fromN < 1 || fromN > pointCount) {
    return `point ${entry.from_point} doesn't exist (1\u2013${pointCount})`;
  }
  if (!Number.isFinite(toN) || toN < 1 || toN > pointCount) {
    return `point ${entry.to_point} doesn't exist (1\u2013${pointCount})`;
  }
  if (fromN === toN) {
    return 'from and to must differ';
  }
  return null;
}
