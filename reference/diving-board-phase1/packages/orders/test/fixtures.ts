import { createOrder, type NewOrderInput } from '../src/lifecycle.js';
import { SupplierRegistry, BUILTIN_SUPPLIERS } from '../src/suppliers.js';
import type { Actor, Order, OrderLine, Supplier } from '../src/types.js';

export const installerActor: Actor = { kind: 'user', id: 'u_1', name: 'Pat Installer' };
export const supplierActor: Actor = { kind: 'supplier', id: 'merlin', name: 'Order desk' };

/** Deterministic randomness so references are stable in tests. */
export const fixedRandom = (n: number) => new Uint8Array(n).map((_, i) => (i * 7 + 3) % 200);

export function configuredMerlin(): Supplier {
  const reg = new SupplierRegistry(BUILTIN_SUPPLIERS);
  return reg.configure('merlin', {
    channel: 'email_pdf',
    contact: { orderEmail: 'orders@example.test' },
    verified: true,
    ackSlaBusinessDays: 2,
  });
}

export function linerLine(overrides: Partial<OrderLine> = {}): OrderLine {
  return {
    id: 'L1',
    product: 'liner',
    quantity: 1,
    shape: 'rectangle',
    dimensions: [
      { label: 'A - length', value: 32 },
      { label: 'B - width', value: 16 },
    ],
    shallowDepth: 3.5,
    deepDepth: 8,
    wallHeights: [
      { label: 'Shallow end', height: 3.5 },
      { label: 'Deep end', height: 3.5 },
    ],
    fittings: [
      { kind: 'skimmer', quantity: 1 },
      { kind: 'return', quantity: 2 },
      { kind: 'main_drain', onFloor: true },
    ],
    liner: { patternName: 'Blue Tile', thicknessMil: 20, beadType: 'standard' },
    closureChecks: [{ name: 'floor_length', status: 'pass', measured: 32, expected: 32, differenceIn: 0 }],
    sketch: [
      { x: 0, y: 0, label: '1' },
      { x: 32, y: 0, label: '2' },
      { x: 32, y: 16, label: '3' },
      { x: 0, y: 16, label: '4' },
    ],
    ...overrides,
  };
}

export function coverLine(overrides: Partial<OrderLine> = {}): OrderLine {
  return {
    id: 'C1',
    product: 'safety_cover',
    quantity: 1,
    shape: 'freeform',
    abReference: { distance: 16, offsetFromPool: 3, orientation: 'A_left_B_right_facing_pool' },
    perimeterPoints: [
      { number: 1, aDistance: 6.292, bDistance: 21.25 },
      { number: 2, aDistance: 8.375, bDistance: 21.917 },
      { number: 3, aDistance: 11.333, bDistance: 24.625 },
      { number: 4, aDistance: 14.25, bDistance: 26.583, notes: 'Anchor start', isObstacle: true },
    ],
    crossDimensions: [{ fromPoint: 1, toPoint: 3, distance: 15.75 }],
    dimensions: [{ label: 'Longest length', value: 32.63 }],
    obstacles: [{ kind: 'fill_spout', frontPoint: 4, description: 'Existing anchor' }],
    cover: { coverType: 'mesh_standard', color: 'blue', spacing: '5x5', anchorType: 'concrete', overlapIn: 12 },
    ...overrides,
  };
}

export function baseInput(lines: OrderLine[] = [linerLine()]): NewOrderInput {
  return {
    id: 'ord_1',
    supplierId: 'merlin',
    installer: { companyName: 'Blue Lagoon Pools LLC', phone: '555-0100', email: 'office@bluelagoon.test' },
    customer: { name: 'Jane Apple', phone: '555-0199' },
    site: { addressLine1: '20 Apple Way', city: 'Springfield', postalCode: '01101' },
    jobId: 'd77ebff0',
    units: 'ft',
    lines,
    notes: 'Replacement liner.',
  };
}

export function draftOrder(lines?: OrderLine[]): Order {
  return createOrder(baseInput(lines), '2026-10-05T14:00:00Z', installerActor, fixedRandom);
}
