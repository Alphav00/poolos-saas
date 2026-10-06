import { describe, expect, it } from 'vitest';
import { hasBlockingIssues, toFeet, validateOrder, type ValidationIssue } from '../src/validate.js';
import { SupplierRegistry, BUILTIN_SUPPLIERS, GENERIC_TEMPLATE } from '../src/suppliers.js';
import type { Order, OrderLine, Supplier } from '../src/types.js';
import { configuredMerlin, coverLine, draftOrder, linerLine } from './fixtures.js';

const supplier = configuredMerlin();
const find = (issues: ValidationIssue[], field: string) => issues.find((i) => i.field === field);
const blocks = (issues: ValidationIssue[]) => issues.filter((i) => i.severity === 'block').map((i) => i.field);

describe('validateOrder - happy paths', () => {
  it('a complete liner order has no issues', () => {
    expect(validateOrder(draftOrder(), supplier)).toEqual([]);
  });
  it('a complete cover order has no issues', () => {
    expect(validateOrder(draftOrder([coverLine()]), supplier)).toEqual([]);
  });
  it('a mixed liner + cover order passes', () => {
    expect(hasBlockingIssues(validateOrder(draftOrder([linerLine(), coverLine()]), supplier))).toBe(false);
  });
});

describe('validateOrder - parties', () => {
  it('requires installer, customer and site', () => {
    const o: Order = {
      ...draftOrder(),
      installer: { companyName: '' },
      customer: { name: ' ' },
      site: { addressLine1: '' },
    };
    const b = blocks(validateOrder(o, supplier));
    expect(b).toEqual(expect.arrayContaining(['installer.companyName', 'customer.name', 'site.addressLine1']));
    const issues = validateOrder(o, supplier);
    expect(find(issues, 'customer.contact')?.severity).toBe('warn');
    expect(find(issues, 'site.city')?.severity).toBe('warn');
  });
  it('requires at least one line', () => {
    expect(blocks(validateOrder({ ...draftOrder(), lines: [] }, supplier))).toEqual(['lines']);
  });
  it('rejects duplicate line ids and bad quantities', () => {
    const o = draftOrder([linerLine(), linerLine({ quantity: 0 })]);
    const b = blocks(validateOrder(o, supplier));
    expect(b).toContain('lines[1].id');
    expect(b).toContain('lines[1].quantity');
  });
});

describe('validateOrder - supplier', () => {
  it('blocks an unconfigured built-in supplier (null channel) and warns unverified', () => {
    const merlin = new SupplierRegistry(BUILTIN_SUPPLIERS).require('merlin');
    const issues = validateOrder(draftOrder(), merlin);
    expect(find(issues, 'supplier.channel')?.severity).toBe('block');
    expect(find(issues, 'supplier.verified')?.severity).toBe('warn');
  });
  it('requires the contact matching the channel', () => {
    const base: Supplier = { ...supplier, contact: { orderEmail: null, portalUrl: null, fax: null, phone: null, apiEndpoint: null } };
    expect(find(validateOrder(draftOrder(), { ...base, channel: 'email_pdf' }), 'supplier.contact.orderEmail')?.severity).toBe('block');
    expect(find(validateOrder(draftOrder(), { ...base, channel: 'fax' }), 'supplier.contact.fax')?.severity).toBe('block');
    expect(find(validateOrder(draftOrder(), { ...base, channel: 'api' }), 'supplier.contact.apiEndpoint')?.severity).toBe('block');
    expect(find(validateOrder(draftOrder(), { ...base, channel: 'portal_manual' }), 'supplier.contact.portalUrl')?.severity).toBe('warn');
  });
  it('blocks a product the supplier does not take', () => {
    const linerOnly: Supplier = { ...supplier, products: ['liner'] };
    expect(blocks(validateOrder(draftOrder([coverLine()]), linerOnly))).toContain('lines[0].product');
  });
  it('blocks validating against the wrong supplier', () => {
    expect(blocks(validateOrder(draftOrder(), { ...supplier, id: 'latham' }))).toContain('supplierId');
  });
});

describe('validateOrder - liner rules', () => {
  it.each([
    ['shape', { shape: undefined }],
    ['dimensions', { dimensions: [] }],
    ['depths', { deepDepth: undefined }],
    ['wallHeights', { wallHeights: undefined }],
    ['fittings', { fittings: undefined }],
  ] as Array<[string, Partial<OrderLine>]>)('blocks missing %s', (field, patch) => {
    expect(blocks(validateOrder(draftOrder([linerLine(patch)]), supplier))).toContain(`lines[0].${field}`);
  });

  it('blocks an empty fittings list', () => {
    expect(blocks(validateOrder(draftOrder([linerLine({ fittings: [] })]), supplier))).toEqual(['lines[0].fittings']);
  });

  it('warns on missing liner spec details and closure checks', () => {
    const issues = validateOrder(draftOrder([linerLine({ liner: {}, closureChecks: undefined })]), supplier);
    expect(hasBlockingIssues(issues)).toBe(false);
    for (const f of ['liner.thicknessMil', 'liner.patternName', 'liner.beadType', 'closureChecks']) {
      expect(find(issues, `lines[0].${f}`)?.severity).toBe('warn');
    }
  });

  it('blocks non-positive wall heights and fittings without a kind', () => {
    const line = linerLine({ wallHeights: [{ label: 'x', height: 0 }], fittings: [{ kind: '' }, { kind: 'return', quantity: 1.5 }] });
    const b = blocks(validateOrder(draftOrder([line]), supplier));
    expect(b).toEqual(expect.arrayContaining(['lines[0].wallHeights[0]', 'lines[0].fittings[0].kind', 'lines[0].fittings[1].quantity']));
  });

  it('warns when deep depth is less than shallow', () => {
    const issues = validateOrder(draftOrder([linerLine({ shallowDepth: 8, deepDepth: 3.5 })]), supplier);
    expect(find(issues, 'lines[0].deepDepth')?.severity).toBe('warn');
  });
});

describe('validateOrder - closure checks', () => {
  it("blocks when any check is 'block'", () => {
    const line = linerLine({
      closureChecks: [
        { name: 'floor_length', status: 'pass' },
        { name: 'perimeter', status: 'block', differenceIn: 4.5 },
      ],
    });
    const issues = validateOrder(draftOrder([line]), supplier);
    const i = find(issues, 'lines[0].closureChecks[1]');
    expect(i?.severity).toBe('block');
    expect(i?.message).toContain('4.5');
  });
  it("warns when a check is 'warn'", () => {
    const line = linerLine({ closureChecks: [{ name: 'perimeter', status: 'warn', message: 'within 1 in' }] });
    const issues = validateOrder(draftOrder([line]), supplier);
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(find(issues, 'lines[0].closureChecks[0]')?.message).toContain('within 1 in');
  });
  it('applies to covers too', () => {
    const line = coverLine({ closureChecks: [{ name: 'ab_closure', status: 'block' }] });
    expect(blocks(validateOrder(draftOrder([line]), supplier))).toContain('lines[0].closureChecks[0]');
  });
});

describe('validateOrder - units', () => {
  it('blocks a dimension in a different unit from the order', () => {
    const line = linerLine({ dimensions: [{ label: 'A', value: 384, unit: 'in' }] });
    expect(blocks(validateOrder(draftOrder([line]), supplier))).toContain('lines[0].dimensions[0].unit');
  });
  it('blocks a wall height in a different unit', () => {
    const line = linerLine({ wallHeights: [{ label: 'W', height: 1.07, unit: 'm' }] });
    expect(blocks(validateOrder(draftOrder([line]), supplier))).toContain('lines[0].wallHeights[0].unit');
  });
  it('accepts explicit units equal to the order unit', () => {
    const line = linerLine({ dimensions: [{ label: 'A', value: 32, unit: 'ft' }] });
    expect(validateOrder(draftOrder([line]), supplier)).toEqual([]);
  });
  it('warns on implausible magnitudes that suggest a unit mix-up', () => {
    const line = linerLine({ dimensions: [{ label: 'A', value: 384 }] }); // 384 ft: probably inches
    expect(find(validateOrder(draftOrder([line]), supplier), 'lines[0].dimensions[0]')?.severity).toBe('warn');
    const metric: Order = { ...draftOrder([linerLine({ dimensions: [{ label: 'A', value: 9.75 }], shallowDepth: 1.07, deepDepth: 2.44, wallHeights: [{ label: 'w', height: 1.07 }] })]), units: 'm' };
    expect(validateOrder(metric, supplier)).toEqual([]);
  });
  it('blocks an unknown unit', () => {
    const o = { ...draftOrder(), units: 'yd' } as unknown as Order;
    expect(blocks(validateOrder(o, supplier))).toContain('units');
  });
  it('converts to feet', () => {
    expect(toFeet(12, 'in')).toBe(1);
    expect(toFeet(1, 'm')).toBeCloseTo(3.2808, 4);
  });
});

describe('validateOrder - cover rules', () => {
  it('blocks missing anchor type and obstacle survey', () => {
    const line = coverLine({ cover: { coverType: 'mesh' }, obstacles: undefined });
    const b = blocks(validateOrder(draftOrder([line]), supplier));
    expect(b).toEqual(expect.arrayContaining(['lines[0].cover.anchorType', 'lines[0].obstacles']));
  });
  it('accepts an empty obstacle list (surveyed, none present)', () => {
    expect(validateOrder(draftOrder([coverLine({ obstacles: [] })]), supplier)).toEqual([]);
  });
  it('blocks obstacles without a kind', () => {
    expect(blocks(validateOrder(draftOrder([coverLine({ obstacles: [{ kind: '' }] })]), supplier))).toContain('lines[0].obstacles[0].kind');
  });
  it('blocks a cover with neither perimeter points nor dimensions', () => {
    const line = coverLine({ perimeterPoints: undefined, dimensions: undefined, crossDimensions: undefined });
    expect(blocks(validateOrder(draftOrder([line]), supplier))).toEqual(expect.arrayContaining(['lines[0].perimeterPoints', 'lines[0].dimensions']));
  });
  it('blocks perimeter points without an A-B distance and duplicate point numbers', () => {
    const pts = [
      { number: 1, aDistance: 5, bDistance: 6 },
      { number: 1, aDistance: 5, bDistance: 6 },
      { number: 2, aDistance: 0, bDistance: 6 },
    ];
    const b = blocks(validateOrder(draftOrder([coverLine({ abReference: undefined, perimeterPoints: pts, crossDimensions: [] })]), supplier));
    expect(b).toEqual(expect.arrayContaining(['lines[0].abReference', 'lines[0].perimeterPoints[1]', 'lines[0].perimeterPoints[2]']));
  });
  it('warns on cross dimensions that reference unknown points', () => {
    const issues = validateOrder(draftOrder([coverLine({ crossDimensions: [{ fromPoint: 1, toPoint: 99, distance: 10 }] })]), supplier);
    expect(find(issues, 'lines[0].crossDimensions[0]')?.severity).toBe('warn');
  });
  it('warns on missing color and spacing', () => {
    const issues = validateOrder(draftOrder([coverLine({ cover: { coverType: 'mesh', anchorType: 'brass' } })]), supplier);
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(find(issues, 'lines[0].cover.color')?.severity).toBe('warn');
    expect(find(issues, 'lines[0].cover.spacing')?.severity).toBe('warn');
  });
});

describe('validateOrder - supplier templates are data-driven', () => {
  it('applies a stricter tenant template', () => {
    const strict: Supplier = {
      ...supplier,
      template: {
        id: 'strict',
        name: 'Strict',
        requirements: {
          liner: [
            ...(GENERIC_TEMPLATE.requirements.liner ?? []),
            { field: 'sketch', severity: 'block' },
            { field: 'perimeterPoints', severity: 'block', message: 'Shop needs the A/B table.' },
          ],
        },
      },
    };
    const issues = validateOrder(draftOrder([linerLine({ sketch: undefined })]), strict);
    expect(blocks(issues)).toEqual(expect.arrayContaining(['lines[0].sketch', 'lines[0].perimeterPoints']));
    expect(find(issues, 'lines[0].perimeterPoints')?.message).toBe('Shop needs the A/B table.');
  });
  it('a lenient template still enforces the hard liner and cover rules', () => {
    const lenient: Supplier = { ...supplier, template: { id: 'l', name: 'L', requirements: {} } };
    const b = blocks(validateOrder(draftOrder([linerLine({ fittings: undefined }), coverLine({ id: 'C1', obstacles: undefined })]), lenient));
    expect(b).toEqual(expect.arrayContaining(['lines[0].fittings', 'lines[1].obstacles']));
  });
  it('warns about a degenerate sketch', () => {
    const issues = validateOrder(draftOrder([linerLine({ sketch: [{ x: 0, y: 0 }] })]), supplier);
    expect(find(issues, 'lines[0].sketch')?.severity).toBe('warn');
  });
});
