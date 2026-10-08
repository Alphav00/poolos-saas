import { describe, expect, it } from 'vitest';
import { call } from './helpers';

const WATER = { temperatureF: 84, ph: 7.8, totalAlkalinity: 90, calciumHardness: 280, cyanuricAcid: 45, freeChlorine: 4, salt: 3200 };
const api = (path: string, init: Parameters<typeof call>[1] = {}) => call(`/api/chem${path}`, init);

describe('chem: PHREEQC in the Worker', () => {
	it('is behind Cloudflare Access', async () => {
		expect((await api('/analyze', { method: 'POST', body: WATER, as: null })).status).toBe(401);
	});

	it('names its engine', async () => {
		const info = (await (await api('/engine')).json()) as { iphreeqcCommit: string };
		expect(info.iphreeqcCommit).toMatch(/^[0-9a-f]{40}$/);
	});

	it('analyzes readings', async () => {
		const res = await api('/analyze', { method: 'POST', body: WATER });
		expect(res.status).toBe(200);
		const r = (await res.json()) as { ok: true; value: { saturationIndex: number; chlorine: { hocl: number }; totalAlkalinity: number } };
		expect(r.value.totalAlkalinity).toBeCloseTo(90, 6);
		expect(r.value.saturationIndex).toBeGreaterThan(-1);
		expect(r.value.saturationIndex).toBeLessThan(1);
		expect(r.value.chlorine.hocl).toBeGreaterThan(0);
	});

	it('asks instead of guessing', async () => {
		const { salt: _salt, ...noSalt } = WATER;
		const res = await api('/analyze', { method: 'POST', body: noSalt });
		expect(res.status).toBe(422);
		expect(((await res.json()) as { questions: { field: string }[] }).questions.map((q) => q.field)).toEqual(['salt']);
	});

	it('doses acid to a target pH', async () => {
		const body = { kind: 'acid', water: WATER, target: 7.4, gallons: 18000, product: { hclPercent: 31.45, densityGPerMl: 1.16 } };
		const res = await api('/dose', { method: 'POST', body });
		expect(res.status).toBe(200);
		const d = (await res.json()) as { value: { fluidOunces: number; after: { ph: number } } };
		expect(d.value.after.ph).toBeCloseTo(7.4, 9);
		expect(d.value.fluidOunces).toBeGreaterThan(0);
	});

	it('asks for the calcium chloride form and the label facts', async () => {
		const res = await api('/dose', { method: 'POST', body: { kind: 'calcium-chloride', water: WATER, target: 350, gallons: 18000, product: { assayPercent: 94 } } });
		expect(res.status).toBe(422);
		const acid = await api('/dose', { method: 'POST', body: { kind: 'acid', water: WATER, target: 7.4, gallons: 18000 } });
		expect(((await acid.json()) as { questions: { field: string }[] }).questions.map((q) => q.field)).toEqual(['hclPercent', 'densityGPerMl']);
	});

	it('rejects bad requests', async () => {
		expect((await api('/dose', { method: 'POST', body: { kind: 'magic' } })).status).toBe(400);
		expect((await api('/analyze', { method: 'POST', body: '[1]' })).status).toBe(400);
		expect((await api('/analyze')).status).toBe(405);
		expect((await api('/nope')).status).toBe(404);
	});
});

describe('chem: salt by the cell', () => {
	it('asks for an unknown make or model instead of giving a number', async () => {
		const res = await api('/salt-cell?make=Sample&model=Model%20X');
		expect(res.status).toBe(422);
		const r = (await res.json()) as { ok: false; questions: { field: string; ask: string }[] };
		expect(r.questions[0]!.field).toBe('make');
		expect((await api('/salt-cell')).status).toBe(422);
		const dose = await api('/dose', { method: 'POST', body: { kind: 'salt', water: WATER, gallons: 18000, product: { assayPercent: 99 }, cell: { make: 'Sample', model: 'Model X' } } });
		expect(dose.status).toBe(422);
	});

	it('uses the manufacturer’s figure for a cell on file, and names the document', async () => {
		const res = await api('/salt-cell?make=hayward&model=t%20cell%2015');
		expect(res.status).toBe(200);
		const r = (await res.json()) as { ok: true; value: { targetPpm: number; minPpm: number; maxPpm: number; source: string; url: string } };
		expect(r.value).toMatchObject({ minPpm: 2700, maxPpm: 3400, targetPpm: 3200 });
		expect(r.value.source).toContain('Hayward');
		expect(r.value.url).toMatch(/^https:\/\/hayward\.com\//);
		// The dose aims at that figure, whatever target the request carries.
		const dose = await api('/dose', { method: 'POST', body: { kind: 'salt', water: { ...WATER, salt: 2500 }, target: 9999, gallons: 18000, product: { assayPercent: 99 }, cell: { make: 'Hayward', model: 'T-CELL-15' } } });
		expect(dose.status).toBe(200);
		const d = (await dose.json()) as { value: { after: { salt: number }; pounds: number } };
		expect(Math.abs(d.value.after.salt - 3200)).toBeLessThan(1);
		// 700 ppm in 18,000 gal: 0.7 g/L x 68,137 L / 0.99 purity = 48.2 kg
		expect(d.value.pounds).toBeCloseTo((0.7 * 18000 * 3.785411784) / 0.99 / 453.59237, 1);
	});
});
