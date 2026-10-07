/**
 * The two order forms as a page-flow model: the same paragraphs, spacers,
 * tables, column widths and table styles that the Python builders
 * (services/order_form.py, services/liner_order_form.py) handed to ReportLab.
 * render.ts draws a flow to PDF; the goldens hold the flow to the original.
 */
import { reconstructJob } from './abMath'
import { pyTitle } from './fixtures'
import { segmentDevelopedLengthFt } from './linerMath'
import { requiresAbPlot, type PoolJob } from './models'
import { decimalFixed, decimalSub, decTruthy, pyFixed, pyRound } from './pynum'
import { linerOrderForm, roundedPool } from './service'

export type Cell = [number, number]
export type StyleCmd = [string, Cell, Cell, ...(string | number)[]]
export type Block =
  | { t: 'p'; style: 'Heading1' | 'Heading2' | 'BodyText' | 'small'; text: string }
  | { t: 'sp'; h: number }
  | { t: 'pb' }
  | { t: 'tbl'; rows: string[][]; colWidths: number[]; repeatRows: number; style: StyleCmd[] }
export interface Flow {
  title: string
  flow: Block[]
}

const INCH = 72
const w = (...inches: number[]) => inches.map((i) => pyRound(i * INCH, 6))
const sp = (inches: number): Block => ({ t: 'sp', h: pyRound(inches * INCH, 6) })
const p = (style: Extract<Block, { t: 'p' }>['style'], text: string): Block => ({ t: 'p', style, text })
const tbl = (rows: string[][], colWidths: number[], style: StyleCmd[], repeatRows = 0): Block => ({ t: 'tbl', rows, colWidths, repeatRows, style })

const GREY = '#808080'
const LIGHTGREY = '#d3d3d3'
const grid = (size: number): StyleCmd[] => [
  ['FONT', [0, 0], [-1, -1], 'Helvetica', size],
  ['FONT', [0, 0], [0, -1], 'Helvetica-Bold', size],
  ['FONT', [2, 0], [2, -1], 'Helvetica-Bold', size],
  ['BOX', [0, 0], [-1, -1], 0.5, GREY],
  ['INNERGRID', [0, 0], [-1, -1], 0.25, LIGHTGREY],
]
const listGrid = (size: number): StyleCmd[] => [
  ['FONT', [0, 0], [-1, -1], 'Helvetica', size],
  ['FONT', [0, 0], [-1, 0], 'Helvetica-Bold', size],
  ['BOX', [0, 0], [-1, -1], 0.5, GREY],
  ['INNERGRID', [0, 0], [-1, -1], 0.25, LIGHTGREY],
]
const COL4 = w(1.5, 1.8, 1.7, 1.8)
const TOTAL_ROW: StyleCmd[] = [
  ['FONT', [0, -1], [-1, -1], 'Helvetica-Bold', 8],
  ['LINEABOVE', [0, -1], [-1, -1], 0.5, GREY],
]

/** Python str() of an optional value inside an f-string. */
const pyStr = (v: unknown) => (v === null || v === undefined ? 'None' : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v))

function header(job: PoolJob): Block[] {
  const m = job.meta
  return [
    tbl(
      [
        ['Customer:', m.customer_name, 'Dealer:', m.dealer_name],
        ['Address:', m.customer_address || '', 'Date:', m.date.slice(0, 10)],
        ['Phone:', m.customer_phone || '', 'Job ID:', job.id.slice(0, 8)],
        ['Email:', m.customer_email || '', 'Photos:', m.photos_attached ? 'Yes' : 'No'],
      ],
      w(0.9, 2.6, 0.9, 2.6),
      [
        ['FONT', [0, 0], [-1, -1], 'Helvetica', 9],
        ['FONT', [0, 0], [0, -1], 'Helvetica-Bold', 9],
        ['FONT', [2, 0], [2, -1], 'Helvetica-Bold', 9],
        ['VALIGN', [0, 0], [-1, -1], 'TOP'],
      ],
    ),
    sp(0.15),
  ]
}

function measurementTable(job: PoolJob): Block {
  const m = job.measurement
  const rows = [['Pt #', 'A dist (ft)', 'B dist (ft)', 'Notes']]
  for (const pt of m.perimeter_points) {
    const a = m.swap_ab ? pt.b_distance_ft : pt.a_distance_ft
    const b = m.swap_ab ? pt.a_distance_ft : pt.b_distance_ft
    rows.push([String(pt.number), a, b, (pt.notes || '') + (pt.is_obstacle ? ' [obstacle]' : '')])
  }
  return tbl(rows, w(0.5, 1.1, 1.1, 4.0), [...listGrid(8), ['ALIGN', [0, 0], [2, -1], 'RIGHT']], 1)
}

const SWAP_NOTE = ' <b>(A and B are SWAPPED from the recorded values — corrected labeling.)</b>'

/** The cover order form (order_form.build_order_form_pdf). */
export function coverOrderFormFlow(job: PoolJob): Flow {
  const rec = roundedPool(job, reconstructJob(job.measurement))
  const m = job.measurement
  const cs = job.cover_spec
  const hw = job.hardware
  const flow: Block[] = [p('Heading1', 'POOL COVER ORDER &amp; MEASURING FORM'), sp(0.05), ...header(job)]

  flow.push(p('Heading2', 'A-B Reference Line'))
  flow.push(tbl([
    ['A-B distance (ft)', m.ab_distance_ft, 'A-B offset from pool (ft)', m.ab_offset_from_pool_ft],
    ['Orientation', m.ab_orientation, 'Shape', m.shape_type],
    ['A-B note', m.ab_note || '—', '', ''],
  ], COL4, grid(9)), sp(0.15))

  flow.push(p('Heading2', 'Pool Dimensions (Reconstructed from A/B)'))
  flow.push(tbl([
    ['Longest length (ft)', rec.length_ft, 'Perimeter (ft)', rec.perimeter_ft],
    ['Widest width (ft)', rec.width_ft, 'Area (sq ft)', rec.area_sqft],
    ['Shallow depth (ft)', m.shallow_depth_ft, 'Deep depth (ft)', m.deep_depth_ft],
    ['Avg depth (ft)', rec.depth_avg_ft, 'Cross-dims', String(m.cross_dimensions.length)],
  ], COL4, grid(9)), sp(0.15))

  if (m.cross_dimensions.length) {
    flow.push(p('Heading2', 'Cross Dimensions'))
    flow.push(tbl(
      [['From Pt#', 'To Pt#', 'Distance (ft)'], ...m.cross_dimensions.map((c) => [String(c.from_point), String(c.to_point), c.distance_ft])],
      w(1.0, 1.0, 1.5),
      [['FONT', [0, 0], [-1, -1], 'Helvetica', 9], ['FONT', [0, 0], [-1, 0], 'Helvetica-Bold', 9], ['BOX', [0, 0], [-1, -1], 0.5, GREY], ['INNERGRID', [0, 0], [-1, -1], 0.25, LIGHTGREY]],
    ), sp(0.15))
  }

  if (m.obstacles.length) {
    flow.push(p('Heading2', 'Obstacles'))
    flow.push(tbl(
      [['Kind', 'Front Pt#', 'Back Pt#', 'Description'], ...m.obstacles.map((o) => [o.kind, o.front_point ? String(o.front_point) : '', o.back_point ? String(o.back_point) : '', o.description || ''])],
      w(1.4, 0.7, 0.7, 2.2),
      listGrid(8),
    ), sp(0.15))
  }

  if (m.step || m.spa) {
    flow.push(p('Heading2', 'Step &amp; Spa'))
    const rows: string[][] = []
    if (m.step) {
      rows.push(['Step', m.step.location, `${m.step.size_length_ft} x ${m.step.size_width_ft} ft`, decTruthy(m.step.offset_ft) ? `offset ${m.step.offset_ft}` : ''])
    }
    if (m.spa) {
      rows.push(['Spa', `flush: ${pyStr(m.spa.flush_with_pool)}`, `spillover: ${pyStr(m.spa.spillover)}`, `separate cover: ${pyStr(m.spa.separate_cover)}`])
    }
    flow.push(tbl(rows, w(0.8, 1.6, 1.6, 2.0), [
      ['FONT', [0, 0], [-1, -1], 'Helvetica', 8], ['FONT', [0, 0], [0, -1], 'Helvetica-Bold', 8], ['BOX', [0, 0], [-1, -1], 0.5, GREY], ['INNERGRID', [0, 0], [-1, -1], 0.25, LIGHTGREY],
    ]), sp(0.15))
  }

  flow.push(p('Heading2', 'Cover Specification'))
  flow.push(tbl([
    ['Cover type', cs.type, 'Color', cs.color],
    ['Spacing', cs.spacing, 'Anchor type', cs.anchor_type],
    ['Overlap (in)', cs.overlap_standard_in, 'Planter overlap (in)', decTruthy(cs.overlap_planter_in) ? cs.overlap_planter_in! : '—'],
  ], COL4, grid(9)), sp(0.15))

  if (hw.y_straps || hw.wood_deck_anchors || hw.beauty_rings || hw.lawn_stakes || decTruthy(hw.paver_tubes_ft) || hw.perimeter_padding_entire_pool) {
    flow.push(p('Heading2', 'Hardware Add-ons'))
    flow.push(tbl([
      ['Y-straps', String(hw.y_straps), 'Wood deck anchors', String(hw.wood_deck_anchors)],
      ['Beauty rings', hw.beauty_rings_entire_pool ? 'entire pool' : String(hw.beauty_rings), 'Lawn stakes', String(hw.lawn_stakes)],
      ['Paver tubes (ft)', hw.paver_tubes_ft, 'Perimeter padding', hw.perimeter_padding_entire_pool ? 'entire pool' : `pt ${pyStr(hw.perimeter_padding_from_pt)} to ${pyStr(hw.perimeter_padding_to_pt)}`],
    ], COL4, grid(9)), sp(0.15))
  }

  flow.push({ t: 'pb' }, p('Heading1', 'A/B Measurement Table'), sp(0.1))
  flow.push(p('small', `A-B distance: ${m.ab_distance_ft} ft. A is on the left facing the pool.${m.swap_ab ? SWAP_NOTE : ''}`), sp(0.1))
  flow.push(measurementTable(job))
  if (job.notes) flow.push(sp(0.2), p('Heading2', 'Notes'), p('BodyText', job.notes))
  return { title: `Pool Cover Order Form - ${job.meta.customer_name}`, flow }
}

const STATUS_COLOR: Record<string, string> = { pass: '#1a7f37', warn: '#9a6700', fail: '#b42318' }

/** _pretty(): enum or snake_case value to Title Case; None as an em dash. */
const pretty = (v: string | number | null | undefined) => (v === null || v === undefined ? '—' : pyTitle(String(v).replace(/_/g, ' ')))

/** The liner order form (liner_order_form.build_liner_order_form_pdf). Throws HttpError 400/422 like the API. */
export function linerOrderFormFlow(job: PoolJob): Flow {
  const form = linerOrderForm(job)
  const m = job.measurement
  const liner = m.liner!
  const spec = job.liner_spec
  const rec = form.reconstructed
  const takeoff = form.takeoff
  const flow: Block[] = [p('Heading1', 'VINYL LINER ORDER &amp; MEASURING FORM'), sp(0.05), ...header(job)]

  flow.push(p('Heading2', 'Pool Shape'))
  flow.push(tbl([
    ['Shape', pretty(liner.shape), 'Ordered from', requiresAbPlot(liner.shape) ? 'A/B triangulation plot' : 'standard shape form + lettered dimensions'],
    ['A-B distance (ft)', m.ab_distance_ft, 'Orientation', pretty(m.ab_orientation)],
    ['Perimeter points', String(m.perimeter_points.length), 'Cross-dims', String(m.cross_dimensions.length)],
  ], COL4, grid(9)), sp(0.15))

  flow.push(p('Heading2', 'Pool Dimensions (Reconstructed from A/B)'))
  flow.push(tbl([
    ['Longest length (ft)', rec.length_ft, 'Perimeter (ft)', rec.perimeter_ft],
    ['Widest width (ft)', rec.width_ft, 'Plan area (sq ft)', rec.area_sqft],
    ['Shallow depth (ft)', m.shallow_depth_ft, 'Deep depth (ft)', m.deep_depth_ft],
  ], COL4, grid(9)), sp(0.15))

  flow.push(p('Heading2', 'Liner Specification'))
  flow.push(tbl([
    ['Pattern', spec.pattern_name || '—', 'Pattern code', spec.pattern_code || '—'],
    ['Thickness (mil)', String(spec.thickness_mil), 'Bead type', pretty(spec.bead_type)],
    ['Coping', pretty(spec.coping_type), 'Steps', pretty(spec.step_construction)],
    ['Floor', pretty(liner.floor_type), 'Cove', pretty(liner.cove_type)],
    ['Floor repair', pretty(liner.floor_repair), 'Tile border', spec.tile_border ? spec.tile_border_pattern || 'Yes' : 'No'],
  ], COL4, grid(9)), sp(0.15))

  if (liner.wall_heights.length) {
    flow.push(p('Heading2', 'Wall Heights (bead receiver to top of cove)'))
    flow.push(tbl(
      [['Wall', 'At point #', 'Height (ft)', 'Notes'], ...liner.wall_heights.map((h) => [h.label, h.at_point ? String(h.at_point) : '—', h.height_ft, h.notes || ''])],
      w(1.8, 0.9, 1.0, 3.3),
      listGrid(8),
    ), sp(0.15))
  }

  if (liner.profile_segments.length) {
    flow.push(p('Heading2', 'Floor Profile (shallow to deep)'))
    const rows = [['#', 'Run', 'Horizontal (ft)', 'Depth start (ft)', 'Depth end (ft)', 'Developed (ft)']]
    for (const seg of [...liner.profile_segments].sort((a, b) => a.order - b.order)) {
      const developed = segmentDevelopedLengthFt(Number(seg.horizontal_run_ft), Number(seg.depth_end_ft) - Number(seg.depth_start_ft))
      rows.push([String(seg.order), pretty(seg.kind), seg.horizontal_run_ft, seg.depth_start_ft, seg.depth_end_ft, pyFixed(developed, 2)])
    }
    rows.push(['', 'TOTAL', takeoff.floor_plan_length_ft, '', '', takeoff.floor_developed_length_ft])
    flow.push(tbl(rows, w(0.4, 1.3, 1.2, 1.3, 1.2, 1.3), [...listGrid(8), ...TOTAL_ROW]))
    flow.push(p('small', 'Developed length is the slant the liner follows; the horizontal column is the plan-view run that has to close on the pool length.'), sp(0.15))
  }

  if (liner.hopper !== null) {
    const hop = liner.hopper
    flow.push(p('Heading2', 'Hopper Cross-Section'))
    flow.push(tbl([
      ['Left slope (G)', `${hop.left_slope_width_ft} ft`, 'Bottom width (H)', `${hop.bottom_width_ft} ft`],
      ['Right slope (I)', `${hop.right_slope_width_ft} ft`, 'Bottom length (M)', hop.bottom_length_ft !== null ? `${hop.bottom_length_ft} ft` : '—'],
    ], COL4, grid(9)), sp(0.15))
  }

  if (liner.steps.length) {
    flow.push(p('Heading2', 'Steps'))
    flow.push(tbl(
      [
        ['#', 'Construction', 'Location', 'Width (ft)', 'Corner', 'Risers', 'Foam (in)'],
        ...liner.steps.map((st, i) => [
          String(i + 1), pretty(st.construction), pretty(st.location), st.width_ft !== null ? st.width_ft : '—', pretty(st.corner_type), String(st.risers.length), st.foam_thickness_in !== null ? st.foam_thickness_in : '—',
        ]),
      ],
      w(0.4, 1.6, 0.9, 0.9, 1.1, 0.7, 0.8),
      listGrid(8),
    ), sp(0.1))
    liner.steps.forEach((st, i) => {
      if (!st.risers.length) return
      const rows = [['Riser #', 'Height (ft)', 'Tread (ft)'], ...[...st.risers].sort((a, b) => a.index - b.index).map((r) => [String(r.index), r.riser_height_ft, r.tread_depth_ft !== null ? r.tread_depth_ft : '—'])]
      const total = st.risers.reduce((a, r) => a + Number(r.riser_height_ft), 0)
      rows.push(['TOTAL', pyFixed(total, 2), ''])
      flow.push(p('small', `Step ${i + 1} riser stack`), tbl(rows, w(0.9, 1.1, 1.1), [...listGrid(8), ...TOTAL_ROW]), sp(0.1))
    })
    flow.push(sp(0.05))
  }

  const checks = form.validation.checks
  if (checks.length) {
    flow.push(p('Heading2', 'Closure Checks'))
    const style = listGrid(8)
    checks.forEach((c, i) => {
      style.push(['TEXTCOLOR', [4, i + 1], [4, i + 1], STATUS_COLOR[c.status] ?? '#000000'], ['FONT', [4, i + 1], [4, i + 1], 'Helvetica-Bold', 8])
    })
    flow.push(tbl(
      [['Check', 'Measured (ft)', 'Must equal (ft)', 'Off by (in)', 'Status'], ...checks.map((c) => [c.name.replace(/_/g, ' ').replace(/:/g, ': '), c.measured_ft, c.expected_ft, c.difference_in, c.status.toUpperCase()])],
      w(2.4, 1.2, 1.3, 1.0, 0.8),
      style,
    ), sp(0.15))
  }

  flow.push(p('Heading2', 'Material Takeoff'))
  flow.push(tbl([
    ['Perimeter (ft)', takeoff.perimeter_ft, 'Avg wall height (ft)', takeoff.wall_height_avg_ft],
    ['Wall area (sq ft)', takeoff.wall_area_sqft, 'Max wall height (ft)', takeoff.wall_height_max_ft],
    ['Floor plan area (sq ft)', takeoff.floor_plan_area_sqft, 'Floor developed (sq ft)', takeoff.floor_developed_area_sqft],
    ['Step area (sq ft)', takeoff.step_area_sqft, 'Subtotal (sq ft)', takeoff.subtotal_sqft],
    [`Waste factor (${takeoff.waste_factor_pct}%)`, decimalFixed(decimalSub(takeoff.total_material_sqft, takeoff.subtotal_sqft), 2), 'TOTAL MATERIAL (sq ft)', takeoff.total_material_sqft],
  ], COL4, [...grid(9), ['FONT', [2, -1], [3, -1], 'Helvetica-Bold', 10], ['BACKGROUND', [2, -1], [3, -1], '#f0f0f0']]), sp(0.15))

  const hydro = form.validation.hydrostatic
  if (hydro !== null) {
    flow.push(p('Heading2', `Hydrostatic Risk: ${hydro.severity.toUpperCase()}`))
    for (const note of hydro.notes) flow.push(p('small', `• ${note}`))
    flow.push(sp(0.1))
  }
  if (form.validation.warnings.length) {
    flow.push(p('Heading2', 'Warnings'))
    for (const wn of form.validation.warnings) flow.push(p('small', `• ${wn}`))
    flow.push(sp(0.1))
  }

  flow.push({ t: 'pb' }, p('Heading1', 'Fitting Cut-Out Schedule'), sp(0.1))
  if (liner.fittings.length) {
    flow.push(tbl(
      [
        ['Kind', 'Label', 'A (ft)', 'B (ft)', 'Near pt#', 'Depth below bead (ft)', 'On floor'],
        ...liner.fittings.map((f) => [
          pretty(f.kind), f.label || '', f.a_distance_ft !== null ? f.a_distance_ft : '—', f.b_distance_ft !== null ? f.b_distance_ft : '—',
          f.near_point ? String(f.near_point) : '—', f.depth_below_bead_ft !== null ? f.depth_below_bead_ft : '—', f.on_floor ? 'Yes' : 'No',
        ]),
      ],
      w(1.1, 1.3, 0.8, 0.8, 0.7, 1.5, 0.7),
      listGrid(8),
      1,
    ))
  } else {
    flow.push(p('small', 'No fittings recorded.'))
  }
  flow.push(sp(0.2))

  flow.push(p('Heading1', 'A/B Measurement Table'), sp(0.1))
  flow.push(p('small', `A-B distance: ${m.ab_distance_ft} ft. Perimeter walked at the bead receiver.${m.swap_ab ? SWAP_NOTE : ''}`), sp(0.1))
  flow.push(measurementTable(job))
  if (job.notes) flow.push(sp(0.2), p('Heading2', 'Notes'), p('BodyText', job.notes))
  return { title: `Vinyl Liner Order Form - ${job.meta.customer_name}`, flow }
}
