// SAMPLE DATA. Made-up pools for showing the field screens. Forecasts, decay
// rates and bands here are illustrative; real ones come from the forecasting
// engine (DESIGN.md, chem_path) once it is connected. Volumes, TDS and the
// cell are made up too; doses and the saturation index come from the
// chemistry engine (chem.ts) using them.
import type { CrewMember, Pool, Stop } from './types'

const base = {
  tags: [] as string[],
  ideal: { ph: [7.4, 7.6] as [number, number] },
  visits: [],
  decay: [],
  equipment: [],
}

export const POOLS: Pool[] = [
  {
    ...base,
    id: 'maple-court',
    name: 'Maple Court',
    tags: ['18,000 gal · measured', 'Vinyl', 'Salt · Model X', 'Full sun', 'No screen', 'Filter 14 psi (base 10)', 'Weekly · last Tue'],
    forecast: {
      fc: { value: 2.2, band: 0.5 },
      ph: { value: 7.7, band: 0.2 },
      ta: { value: 92, band: 10 },
      cya: { value: 40, band: 10 },
      ch: { value: 250, band: 50 },
      salt: { value: 3150, band: 200 },
      temp: { value: 81, band: 3 },
    },
    visits: [
      { date: '2026-08-18', before: 3.2, after: 5.0 },
      { date: '2026-08-25', before: 3.1, after: 5.0 },
      { date: '2026-09-01', before: 2.9, after: 5.0 },
      { date: '2026-09-08', before: 2.7, after: 5.0 },
      { date: '2026-09-15', before: 2.5, after: 5.0 },
      { date: '2026-09-22', before: 2.1, after: 5.0 },
      { date: '2026-09-29', before: 1.6, after: 5.0 },
    ],
    decay: [
      { label: 'FC loss', detail: '0.55 ppm/day · was 0.38 in Aug · ±0.08', trend: '↑ 45%', alert: true },
      { label: 'pH drift', detail: '+0.04 / day · typical for salt pools', trend: 'steady' },
      { label: 'Salt', detail: '−50 ppm / week · splash-out + backwash', trend: 'steady' },
      { label: 'CYA', detail: '+0 / month · no trichlor used', trend: 'steady' },
    ],
    gallons: 18000,
    cell: { make: 'Sample', model: 'Model X' },
    equipment: ['Liner · fair', 'Cover · n/a', 'Pump 2019', 'Cell 2021 · 3,200 hrs', 'Filter clean due (+4 psi)'],
    note: 'Chlorine was low today, so we added a top-up and checked your salt cell.',
  },
  { ...base, id: 'birch-lane', gallons: 22000, tds: 1100, name: 'Birch Lane', tags: ['22,000 gal', 'Plaster', 'Liquid chlorine'], forecast: { fc: { value: 3.1, band: 0.5 }, ph: { value: 7.5, band: 0.2 } } },
  { ...base, id: 'cedar-ridge', gallons: 16000, name: 'Cedar Ridge', tags: ['16,000 gal', 'Vinyl', 'Salt'], forecast: { fc: { value: 2.6, band: 0.5 }, ph: { value: 7.9, band: 0.2 } } },
  { ...base, id: 'oak-hollow', gallons: 30000, tds: 900, name: 'Oak Hollow', tags: ['30,000 gal', 'Plaster', 'Liquid chlorine'], forecast: { fc: { value: 4.0, band: 0.5 }, ph: { value: 7.4, band: 0.2 } } },
  { ...base, id: 'pine-court', gallons: 14000, tds: 1300, name: 'Pine Court', tags: ['14,000 gal', 'Vinyl', 'Liquid chlorine'], forecast: { fc: { value: 0.9, band: 0.5 }, ph: { value: 7.6, band: 0.2 } } },
  { ...base, id: 'willow-bend', gallons: 20000, tds: 1500, name: 'Willow Bend', tags: ['20,000 gal', 'Fiberglass', 'Trichlor', 'Screened'], forecast: { fc: { value: 0.4, band: 0.5 }, cya: { value: 85, band: 10 } } },
  { ...base, id: 'spruce-way', gallons: 18000, tds: 1000, name: 'Spruce Way', tags: ['18,000 gal', 'Vinyl', 'Liquid chlorine'], forecast: { fc: { value: 3.4, band: 0.5 }, ph: { value: 7.5, band: 0.2 } } },
  { ...base, id: 'aspen-drive', gallons: 25000, name: 'Aspen Drive', tags: ['25,000 gal', 'Plaster', 'Salt'], forecast: { fc: { value: 1.8, band: 0.5 }, salt: { value: 2850, band: 200 } } },
  { ...base, id: 'elm-terrace', gallons: 15000, tds: 1200, name: 'Elm Terrace', tags: ['15,000 gal', 'Plaster', 'Liquid chlorine'], forecast: { fc: { value: 3.0, band: 0.5 }, ph: { value: 7.6, band: 0.2 } } },
]

export const ROUTE = {
  title: 'TUE · ROUTE B · ALEX',
  headline: '3 pools need chlorine',
  load: ['Liquid chlorine 12.5% · 4.5 gal', 'Muriatic 31.45% · 1.2 gal', 'Salt · 2 bags', 'Stabilizer · 0'],
  accuracy: [
    { label: 'FC', value: '±0.3', note: '38 tests', ok: true },
    { label: 'pH', value: '±0.1', note: '38 tests', ok: true },
    { label: 'TA', value: '±9', note: 'reagent old?', ok: false },
  ],
}

export const STOPS: Stop[] = [
  { poolId: 'birch-lane', x: 14, y: 78, eta: '', done: true, flags: [{ text: 'FC 3.1' }, { text: 'pH 7.5' }, { text: 'on target' }] },
  { poolId: 'cedar-ridge', x: 24, y: 62, eta: '', done: true, flags: [{ text: 'FC 2.6' }, { text: 'pH 7.9', level: 'warn' }] },
  { poolId: 'oak-hollow', x: 18, y: 44, eta: '', done: true, flags: [{ text: 'FC 4.0' }, { text: 'pH 7.4' }] },
  { poolId: 'pine-court', x: 34, y: 34, eta: '', done: true, flags: [{ text: 'FC 0.9', level: 'bad' }, { text: 'pH 7.6' }, { text: 'readings off by 0.4' }] },
  { poolId: 'maple-court', x: 48, y: 46, eta: 'next · 9 min', done: false, flags: [{ text: 'FC 2.2', level: 'warn' }, { text: 'pH 7.7' }, { text: 'decay ↑ 45%', level: 'warn' }] },
  { poolId: 'willow-bend', x: 60, y: 30, eta: '', done: false, action: 'shock', flags: [{ text: 'FC 0.4', level: 'bad' }, { text: 'CYA 85', level: 'warn' }, { text: 'screened' }] },
  { poolId: 'spruce-way', x: 72, y: 40, eta: '10:40', done: false, flags: [{ text: 'FC 3.4' }, { text: 'pH 7.5' }] },
  { poolId: 'aspen-drive', x: 80, y: 62, eta: '11:05', done: false, flags: [{ text: 'FC 1.8', level: 'warn' }, { text: 'salt 2,850' }] },
  { poolId: 'elm-terrace', x: 66, y: 76, eta: '11:30', done: false, flags: [{ text: 'FC 3.0' }, { text: 'LSI −0.4', level: 'warn' }] },
]

export const poolById = (id: string) => POOLS.find((p) => p.id === id)

export const CREW: CrewMember[] = [
  { name: 'Alex', initials: 'AL', role: 'Route B', status: '4 of 9 stops', state: 'working' },
  { name: 'Jordan', initials: 'JO', role: 'Route A', status: '6 of 10 stops', state: 'working' },
  { name: 'Riley', initials: 'RI', role: 'Repairs', status: 'Filter swap · Oak Hollow', state: 'working' },
  { name: 'Casey', initials: 'CA', role: 'Route C', status: 'Lunch until 12:30', state: 'break' },
  { name: 'Morgan', initials: 'MO', role: 'Office', status: 'Off today', state: 'off' },
]
