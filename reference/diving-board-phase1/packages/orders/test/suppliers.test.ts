import { describe, expect, it } from 'vitest';
import {
  BUILTIN_SUPPLIERS,
  GENERIC_SUPPLIER,
  SupplierDefinitionError,
  SupplierRegistry,
  createSupplierRegistry,
  defineSupplier,
} from '../src/suppliers.js';

describe('built-in suppliers', () => {
  it('lists Latham, Merlin, Loop-Loc and Garrett', () => {
    expect(BUILTIN_SUPPLIERS.map((s) => s.name)).toEqual(['Latham Pool Products', 'Merlin Industries', 'Loop-Loc', 'Garrett Liners']);
  });

  it.each(BUILTIN_SUPPLIERS.map((s) => [s.id, s] as const))('%s carries no invented contact data', (_id, s) => {
    expect(s.verified).toBe(false);
    expect(s.channel).toBeNull();
    expect(Object.values(s.contact).every((v) => v === null)).toBe(true);
    expect(s.todo).toMatch(/dealer account/);
    expect(s.template.id).toBe('generic');
    expect(s.products.length).toBeGreaterThan(0);
    expect(s.sources?.length).toBeGreaterThan(0);
  });

  it('has a generic supplier template', () => {
    expect(GENERIC_SUPPLIER.id).toBe('generic');
    expect(GENERIC_SUPPLIER.verified).toBe(false);
  });
});

describe('SupplierRegistry', () => {
  it('finds suppliers by product', () => {
    const reg = new SupplierRegistry();
    expect(reg.forProduct('liner').length).toBe(4);
    expect(reg.forProduct('safety_cover').length).toBe(4);
  });

  it('lets a tenant add their own supplier from plain data', () => {
    const reg = new SupplierRegistry();
    const s = reg.add({ id: 'local-shop', name: 'Local Liner Shop', products: ['liner'], channel: 'fax', contact: { fax: '555-0123' }, ackSlaBusinessDays: 3 });
    expect(reg.get('local-shop')).toBe(s);
    expect(s).toMatchObject({ builtIn: false, verified: false, channel: 'fax', ackSlaBusinessDays: 3 });
    expect(s.contact.orderEmail).toBeNull();
    expect(() => reg.add({ id: 'local-shop', name: 'x', products: ['liner'] })).toThrow(SupplierDefinitionError);
  });

  it('configure() fills in dealer-account details without touching other entries', () => {
    const reg = new SupplierRegistry();
    const m = reg.configure('merlin', { channel: 'email_pdf', contact: { orderEmail: 'me@example.test' }, verified: true });
    expect(m).toMatchObject({ name: 'Merlin Industries', builtIn: true, verified: true, channel: 'email_pdf' });
    expect(m.contact.orderEmail).toBe('me@example.test');
    expect(BUILTIN_SUPPLIERS.find((s) => s.id === 'merlin')?.contact.orderEmail).toBeNull();
    expect(reg.require('latham').channel).toBeNull();
  });

  it('createSupplierRegistry merges tenant data over built-ins', () => {
    const reg = createSupplierRegistry([
      { id: 'garrett', name: 'Garrett Liners', products: ['liner'], channel: 'portal_manual', contact: { portalUrl: 'https://dealer.example.test' } },
      { id: 'acme', name: 'Acme Covers', products: ['safety_cover'] },
    ]);
    expect(reg.require('garrett')).toMatchObject({ channel: 'portal_manual', products: ['liner'], builtIn: true });
    expect(reg.require('acme').channel).toBeNull();
    expect(reg.list()).toHaveLength(5);
    expect(JSON.parse(JSON.stringify(reg))).toHaveLength(5);
    expect(reg.remove('acme')).toBe(true);
    expect(() => reg.require('acme')).toThrow(/Unknown supplier/);
  });

  it('defineSupplier reports every problem', () => {
    try {
      defineSupplier({ id: 'Bad Id', name: '', products: ['pool' as never], channel: 'pigeon' as never, ackSlaBusinessDays: -1 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SupplierDefinitionError);
      expect((e as SupplierDefinitionError).problems).toHaveLength(5);
    }
  });
});
