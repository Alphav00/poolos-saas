/**
 * The job models, ported from the backend's pydantic models
 * (liner-measure-pro backend/app/models/__init__.py). Same fields, defaults,
 * constraints and validators; values are held in pydantic's JSON dump form
 * (Decimal fields are decimal strings).
 */
import {
  bool, datetime, decimal, enumOf, field, int, intEnum, INVALID, list, model, optional, str, utcNow,
  type Validator,
} from './schema'

export type Dec = string

export const SHAPE_TYPES = ['rectangular', 'kidney', 'freeform'] as const
export const COVER_TYPES = ['mesh_standard', 'mesh_super', 'mesh_ultra', 'mesh_commercial', 'solid', 'solid_no_drain'] as const
export const COVER_COLORS = ['blue', 'green', 'black', 'gray', 'tan'] as const
export const ANCHOR_SPACINGS = ['5x5', '4x4', '3x3', 'combo'] as const
export const ANCHOR_TYPES = ['concrete', 'wood_deck', 'brass_collar', 'aluminum_pipe', 'lawn_brick'] as const
export const AB_ORIENTATIONS = ['A_left_B_right_facing_pool', 'A_right_B_left_facing_pool'] as const
export const OBSTACLE_KINDS = ['handrail', 'grabrail', 'ladder', 'slide_leg', 'rock', 'waterfall', 'raised_wall', 'spa_wall', 'fill_spout', 'dive_stand', 'planter'] as const
export const PRODUCT_TYPES = ['cover', 'liner', 'both'] as const
export const LINER_THICKNESSES = [20, 27, 28, 30] as const
export const BEAD_TYPES = ['standard_bead', 'j_hook', 'overlap', 'ez_track'] as const
export const COPING_TYPES = ['concrete', 'aluminum', 'plastic', 'stone', 'cantilever'] as const
export const FLOOR_TYPES = ['vermiculite', 'concrete', 'sand', 'grout'] as const
export const COVE_TYPES = ['foam', 'concrete', 'none'] as const
export const FLOOR_REPAIRS = ['none', 'standard_wash', 'minor_patching', 'heavy_resurfacing'] as const
export const STEP_CONSTRUCTIONS = ['none', 'fiberglass_standard', 'vinyl_over_standard', 'vinyl_over_complex'] as const
export const LINER_SHAPES = [
  'rectangle', 'rectangle_grecian_shallow', 'rectangle_grecian_deep', 'grecian', 'offset_grecian_left',
  'offset_grecian_right', 'summerville_grecian_left', 'summerville_grecian_right', 'roman_end', 'double_roman',
  'patrician_shallow', 'patrician_deep', 'true_l_left', 'true_l_right', 'lazy_l_left', 'lazy_l_right', 'oval',
  'oval_jewel', 'round', 'octagon', 'kite', 'kidney', 'figure_8', 'mountain_lake_left', 'mountain_lake_right',
  'odessy_left', 'odessy_right', 'freeform',
] as const
export const STEP_CORNER_TYPES = ['ninety_degree', 'radius', 'diagonal'] as const
export const PROFILE_SEGMENT_KINDS = ['shallow_floor', 'slope', 'hopper_slope', 'deep_floor', 'break'] as const
export const FITTING_KINDS = ['skimmer', 'return', 'main_drain', 'light', 'step_jet', 'vacuum_port', 'auto_fill', 'wall_fitting'] as const
export const DRAINAGE_SYSTEMS = ['none', 'french_drain', 'dewatering_well', 'unknown'] as const

export type LinerShape = (typeof LINER_SHAPES)[number]
export type ProductType = (typeof PRODUCT_TYPES)[number]

/** Organic and multi-lobe shapes: the supplier form is the A/B triangulation sheet. */
const AB_PLOT_SHAPES = new Set<LinerShape>(['kidney', 'figure_8', 'mountain_lake_left', 'mountain_lake_right', 'odessy_left', 'odessy_right', 'freeform'])
export const requiresAbPlot = (shape: LinerShape) => AB_PLOT_SHAPES.has(shape)

// ---------- core measurement ----------

export interface PerimeterPoint {
  number: number
  a_distance_ft: Dec
  b_distance_ft: Dec
  notes: string | null
  is_obstacle: boolean
  obstacle_kind: string | null
}
const PerimeterPointV = model<PerimeterPoint>({
  number: field(int({ ge: 1 })),
  a_distance_ft: field(decimal({ ge: 0 })),
  b_distance_ft: field(decimal({ ge: 0 })),
  notes: field(optional(str()), { default: () => null }),
  is_obstacle: field(bool(), { default: () => false }),
  obstacle_kind: field(optional(enumOf(OBSTACLE_KINDS)), { default: () => null }),
})

export interface CrossDimension {
  from_point: number
  to_point: number
  distance_ft: Dec
}
const CrossDimensionV = model<CrossDimension>({
  from_point: field(int({ ge: 1 })),
  to_point: field(int({ ge: 1 })),
  distance_ft: field(decimal({ ge: 0 })),
})

const BreakOffPointV = model({
  side: field(str({ pattern: /^(shallow|deep)$/ })),
  from_point: field(int({ ge: 1 })),
  to_point: field(int({ ge: 1 })),
  distance_ft: field(decimal({ ge: 0 })),
})

export interface ObstacleSpec {
  kind: string
  front_point: number | null
  back_point: number | null
  description: string | null
}
const ObstacleSpecV = model<ObstacleSpec>({
  kind: field(enumOf(OBSTACLE_KINDS)),
  front_point: field(optional(int({ ge: 1 })), { default: () => null }),
  back_point: field(optional(int({ ge: 1 })), { default: () => null }),
  description: field(optional(str()), { default: () => null }),
})

export interface StepSpec {
  location: string
  size_length_ft: Dec
  size_width_ft: Dec
  offset_ft: Dec | null
  notes: string | null
}
const StepSpecV = model<StepSpec>({
  location: field(str({ pattern: /^(center|left|right|offset)$/ })),
  size_length_ft: field(decimal()),
  size_width_ft: field(decimal()),
  offset_ft: field(optional(decimal()), { default: () => null }),
  notes: field(optional(str()), { default: () => null }),
})

export interface SpaSpec {
  flush_with_pool: boolean
  spillover: boolean
  separate_cover: boolean
  from_point: number | null
  to_point: number | null
  notes: string | null
}
const SpaSpecV = model<SpaSpec>({
  flush_with_pool: field(bool()),
  spillover: field(bool()),
  separate_cover: field(bool()),
  from_point: field(optional(int({ ge: 1 })), { default: () => null }),
  to_point: field(optional(int({ ge: 1 })), { default: () => null }),
  notes: field(optional(str()), { default: () => null }),
})

const DeckSpecV = model({
  min_width_ft: field(decimal({ ge: 0 })),
  narrow_sections: field(list(str()), { default: () => [] }),
  deck_type: field(str({ pattern: /^(concrete|wood|other)$/ }), { default: () => 'concrete' }),
  wood_deck_anchors_needed: field(bool(), { default: () => false }),
  wood_deck_length_ft: field(optional(decimal()), { default: () => null }),
  diving_board: field(bool(), { default: () => false }),
  diving_board_distance_ft: field(optional(decimal()), { default: () => null }),
})

const AnchorPointV = model({
  number: field(int({ ge: 1 })),
  a_distance_ft: field(decimal({ ge: 0 })),
  b_distance_ft: field(decimal({ ge: 0 })),
})

// ---------- liner measurement ----------

export interface WallHeight {
  label: string
  at_point: number | null
  height_ft: Dec
  notes: string | null
}
const WallHeightV = model<WallHeight>({
  label: field(str({ min: 1, max: 64 })),
  at_point: field(optional(int({ ge: 1 })), { default: () => null }),
  height_ft: field(decimal({ gt: 0, le: 12 })),
  notes: field(optional(str()), { default: () => null }),
})

export interface ProfileSegment {
  order: number
  kind: (typeof PROFILE_SEGMENT_KINDS)[number]
  horizontal_run_ft: Dec
  depth_start_ft: Dec
  depth_end_ft: Dec
  label: string | null
}
const ProfileSegmentV = model<ProfileSegment>(
  {
    order: field(int({ ge: 1 })),
    kind: field(enumOf(PROFILE_SEGMENT_KINDS)),
    horizontal_run_ft: field(decimal({ ge: 0, le: 200 })),
    depth_start_ft: field(decimal({ ge: 0, le: 20 })),
    depth_end_ft: field(decimal({ ge: 0, le: 20 })),
    label: field(optional(str()), { default: () => null }),
  },
  (s) => (s.kind === 'break' && Number(s.horizontal_run_ft) > 0 ? 'A break segment is a vertical drop; its horizontal run must be 0' : null),
)

export interface HopperProfile {
  left_slope_width_ft: Dec
  bottom_width_ft: Dec
  right_slope_width_ft: Dec
  bottom_length_ft: Dec | null
}
const HopperProfileV = model<HopperProfile>({
  left_slope_width_ft: field(decimal({ ge: 0, le: 100 })),
  bottom_width_ft: field(decimal({ ge: 0, le: 100 })),
  right_slope_width_ft: field(decimal({ ge: 0, le: 100 })),
  bottom_length_ft: field(optional(decimal({ ge: 0, le: 100 })), { default: () => null }),
})

export interface StepRiser {
  index: number
  riser_height_ft: Dec
  tread_depth_ft: Dec | null
}
const StepRiserV = model<StepRiser>({
  index: field(int({ ge: 1 })),
  riser_height_ft: field(decimal({ gt: 0, le: 3 })),
  tread_depth_ft: field(optional(decimal({ gt: 0, le: 6 })), { default: () => null }),
})

const contiguous = (nums: number[], what: string): string | null => {
  if (new Set(nums).size !== nums.length) return `${what} must be unique`
  const sorted = [...nums].sort((a, b) => a - b)
  if (nums.length && sorted.some((n, i) => n !== i + 1)) return `${what} must be 1..N contiguous`
  return null
}

export interface LinerStep {
  construction: (typeof STEP_CONSTRUCTIONS)[number]
  location: string
  width_ft: Dec | null
  corner_type: string | null
  foam_thickness_in: Dec | null
  risers: StepRiser[]
  from_point: number | null
  to_point: number | null
  notes: string | null
}
const LinerStepV = model<LinerStep>({
  construction: field(enumOf(STEP_CONSTRUCTIONS), { default: () => 'none' }),
  location: field(str({ pattern: /^(center|left|right|offset|swimout|spa)$/ }), { default: () => 'center' }),
  width_ft: field(optional(decimal({ gt: 0, le: 40 })), { default: () => null }),
  corner_type: field(optional(enumOf(STEP_CORNER_TYPES)), { default: () => null }),
  foam_thickness_in: field(optional(decimal({ ge: 0, le: 4 })), { default: () => null }),
  risers: field(list(StepRiserV), {
    default: () => [],
    check: (rs) => {
      const idx = rs.map((r) => r.index)
      if (new Set(idx).size !== idx.length) return 'Step riser indexes must be unique'
      return contiguous(idx, 'Step riser indexes')
    },
  }),
  from_point: field(optional(int({ ge: 1 })), { default: () => null }),
  to_point: field(optional(int({ ge: 1 })), { default: () => null }),
  notes: field(optional(str()), { default: () => null }),
})
export const isVinylOver = (s: { construction: string }) =>
  s.construction === 'vinyl_over_standard' || s.construction === 'vinyl_over_complex'

export interface Fitting {
  kind: (typeof FITTING_KINDS)[number]
  label: string | null
  a_distance_ft: Dec | null
  b_distance_ft: Dec | null
  near_point: number | null
  depth_below_bead_ft: Dec | null
  on_floor: boolean
  notes: string | null
}
const FittingV = model<Fitting>(
  {
    kind: field(enumOf(FITTING_KINDS)),
    label: field(optional(str()), { default: () => null }),
    a_distance_ft: field(optional(decimal({ ge: 0 })), { default: () => null }),
    b_distance_ft: field(optional(decimal({ ge: 0 })), { default: () => null }),
    near_point: field(optional(int({ ge: 1 })), { default: () => null }),
    depth_below_bead_ft: field(optional(decimal({ ge: 0, le: 20 })), { default: () => null }),
    on_floor: field(bool(), { default: () => false }),
    notes: field(optional(str()), { default: () => null }),
  },
  (f) =>
    f.a_distance_ft !== null && f.b_distance_ft !== null || f.near_point !== null
      ? null
      : 'Fitting must be locatable: give both A and B distances, or a near_point',
)

export interface LinerMeasurement {
  shape: LinerShape
  wall_heights: WallHeight[]
  profile_segments: ProfileSegment[]
  hopper: HopperProfile | null
  steps: LinerStep[]
  fittings: Fitting[]
  floor_type: string
  cove_type: string
  floor_repair: string
  wall_repair_notes: string | null
  drainage_system: string
  hydrostatic_relief_valve: boolean
  recent_rainfall_days: number
  water_table_notes: string | null
}
const LinerMeasurementV = model<LinerMeasurement>({
  shape: field(enumOf(LINER_SHAPES), { default: () => 'freeform' }),
  wall_heights: field(list(WallHeightV), {
    default: () => [],
    check: (ws) => {
      const labels = ws.map((w) => w.label.trim().toLowerCase())
      return new Set(labels).size !== labels.length ? 'Wall height labels must be unique' : null
    },
  }),
  profile_segments: field(list(ProfileSegmentV), {
    default: () => [],
    check: (segs) => {
      const orders = segs.map((s) => s.order)
      if (new Set(orders).size !== orders.length) return 'Profile segment orders must be unique'
      return contiguous(orders, 'Profile segment orders')
    },
  }),
  hopper: field(optional(HopperProfileV), { default: () => null }),
  steps: field(list(LinerStepV), { default: () => [] }),
  fittings: field(list(FittingV), { default: () => [] }),
  floor_type: field(enumOf(FLOOR_TYPES), { default: () => 'vermiculite' }),
  cove_type: field(enumOf(COVE_TYPES), { default: () => 'foam' }),
  floor_repair: field(enumOf(FLOOR_REPAIRS), { default: () => 'none' }),
  wall_repair_notes: field(optional(str()), { default: () => null }),
  drainage_system: field(enumOf(DRAINAGE_SYSTEMS), { default: () => 'unknown' }),
  hydrostatic_relief_valve: field(bool(), { default: () => false }),
  recent_rainfall_days: field(int({ ge: 0, le: 30 }), { default: () => 0 }),
  water_table_notes: field(optional(str()), { default: () => null }),
})

// ---------- the job ----------

export interface DeckSpec {
  min_width_ft: Dec
  narrow_sections: string[]
  deck_type: string
  wood_deck_anchors_needed: boolean
  wood_deck_length_ft: Dec | null
  diving_board: boolean
  diving_board_distance_ft: Dec | null
}

export interface JobMeasurement {
  pool_length: Dec | null
  pool_width: Dec | null
  ab_distance_ft: Dec
  ab_orientation: (typeof AB_ORIENTATIONS)[number]
  ab_offset_from_pool_ft: Dec
  ab_note: string | null
  swap_ab: boolean
  shape_type: (typeof SHAPE_TYPES)[number]
  perimeter_points: PerimeterPoint[]
  cross_dimensions: CrossDimension[]
  break_off_points: unknown[]
  obstacles: ObstacleSpec[]
  step: StepSpec | null
  spa: SpaSpec | null
  deck: DeckSpec
  anchors: unknown[] | null
  shallow_depth_ft: Dec
  deep_depth_ft: Dec
  liner: LinerMeasurement | null
}
const JobMeasurementV = model<JobMeasurement>({
  pool_length: field(optional(decimal({ ge: 0, le: 200 })), { default: () => null }),
  pool_width: field(optional(decimal({ ge: 0, le: 200 })), { default: () => null }),
  ab_distance_ft: field(decimal({ ge: 10, le: 100 })),
  ab_orientation: field(enumOf(AB_ORIENTATIONS), { default: () => 'A_left_B_right_facing_pool' }),
  ab_offset_from_pool_ft: field(decimal({ ge: 0, le: 20 }), { default: () => '3' }),
  ab_note: field(optional(str()), { default: () => null }),
  swap_ab: field(bool(), { default: () => false }),
  shape_type: field(enumOf(SHAPE_TYPES)),
  perimeter_points: field(list(PerimeterPointV, { min: 4 }), {
    check: (pts) => {
      const nums = pts.map((p) => p.number)
      if (new Set(nums).size !== nums.length) return 'Perimeter point numbers must be unique'
      const sorted = [...nums].sort((a, b) => a - b)
      return sorted.some((n, i) => n !== i + 1) ? 'Perimeter point numbers must be 1..N contiguous' : null
    },
  }),
  cross_dimensions: field(list(CrossDimensionV), {
    default: () => [],
    check: (cs) => (cs.some((c) => c.from_point === c.to_point) ? 'Cross dimension endpoints must differ' : null),
  }),
  break_off_points: field(list(BreakOffPointV), { default: () => [] }),
  obstacles: field(list(ObstacleSpecV), { default: () => [] }),
  step: field(optional(StepSpecV), { default: () => null }),
  spa: field(optional(SpaSpecV), { default: () => null }),
  deck: field(DeckSpecV as Validator<DeckSpec>),
  anchors: field(optional(list(AnchorPointV)), { default: () => null }),
  shallow_depth_ft: field(decimal({ ge: 0, le: 20 })),
  deep_depth_ft: field(decimal({ ge: 0, le: 20 })),
  liner: field(optional(LinerMeasurementV), { default: () => null }),
})

export interface CoverSpec {
  type: (typeof COVER_TYPES)[number]
  color: (typeof COVER_COLORS)[number]
  spacing: (typeof ANCHOR_SPACINGS)[number]
  anchor_type: (typeof ANCHOR_TYPES)[number]
  overlap_standard_in: Dec
  overlap_planter_in: Dec | null
}
const coverSpecDefault = (): CoverSpec => ({
  type: 'mesh_standard', color: 'blue', spacing: '5x5', anchor_type: 'concrete', overlap_standard_in: '12', overlap_planter_in: null,
})
const CoverSpecV = model<CoverSpec>({
  type: field(enumOf(COVER_TYPES), { default: () => 'mesh_standard' }),
  color: field(enumOf(COVER_COLORS), { default: () => 'blue' }),
  spacing: field(enumOf(ANCHOR_SPACINGS), { default: () => '5x5' }),
  anchor_type: field(enumOf(ANCHOR_TYPES), { default: () => 'concrete' }),
  overlap_standard_in: field(decimal({ ge: 0, le: 24 }), { default: () => '12' }),
  overlap_planter_in: field(optional(decimal({ ge: 0, le: 36 })), { default: () => null }),
})

export interface LinerSpec {
  thickness_mil: (typeof LINER_THICKNESSES)[number]
  pattern_name: string
  pattern_code: string | null
  bead_type: string
  coping_type: string
  step_construction: (typeof STEP_CONSTRUCTIONS)[number]
  tile_border: boolean
  tile_border_pattern: string | null
  measured_at_bead_receiver: boolean
  waste_factor_pct: Dec
  warranty_years: number | null
}
const linerSpecDefault = (): LinerSpec => ({
  thickness_mil: 27, pattern_name: '', pattern_code: null, bead_type: 'standard_bead', coping_type: 'concrete',
  step_construction: 'none', tile_border: false, tile_border_pattern: null, measured_at_bead_receiver: true,
  waste_factor_pct: '10', warranty_years: null,
})
const LinerSpecV = model<LinerSpec>({
  thickness_mil: field(intEnum(LINER_THICKNESSES), { default: () => 27 }),
  pattern_name: field(str({ max: 120 }), { default: () => '' }),
  pattern_code: field(optional(str({ max: 40 })), { default: () => null }),
  bead_type: field(enumOf(BEAD_TYPES), { default: () => 'standard_bead' }),
  coping_type: field(enumOf(COPING_TYPES), { default: () => 'concrete' }),
  step_construction: field(enumOf(STEP_CONSTRUCTIONS), { default: () => 'none' }),
  tile_border: field(bool(), { default: () => false }),
  tile_border_pattern: field(optional(str({ max: 120 })), { default: () => null }),
  measured_at_bead_receiver: field(bool(), { default: () => true }),
  waste_factor_pct: field(decimal({ ge: 0, le: 40 }), { default: () => '10' }),
  warranty_years: field(optional(int({ ge: 0, le: 50 })), { default: () => null }),
})

export interface HardwareAddOns {
  y_straps: number
  wood_deck_anchors: number
  beauty_rings: number
  beauty_rings_entire_pool: boolean
  lawn_stakes: number
  paver_tubes_ft: Dec
  perimeter_padding_entire_pool: boolean
  perimeter_padding_from_pt: number | null
  perimeter_padding_to_pt: number | null
}
const hardwareDefault = (): HardwareAddOns => ({
  y_straps: 0, wood_deck_anchors: 0, beauty_rings: 0, beauty_rings_entire_pool: false, lawn_stakes: 0,
  paver_tubes_ft: '0', perimeter_padding_entire_pool: false, perimeter_padding_from_pt: null, perimeter_padding_to_pt: null,
})
const HardwareV = model<HardwareAddOns>({
  y_straps: field(int(), { default: () => 0 }),
  wood_deck_anchors: field(int(), { default: () => 0 }),
  beauty_rings: field(int(), { default: () => 0 }),
  beauty_rings_entire_pool: field(bool(), { default: () => false }),
  lawn_stakes: field(int(), { default: () => 0 }),
  paver_tubes_ft: field(decimal(), { default: () => '0' }),
  perimeter_padding_entire_pool: field(bool(), { default: () => false }),
  perimeter_padding_from_pt: field(optional(int()), { default: () => null }),
  perimeter_padding_to_pt: field(optional(int()), { default: () => null }),
})

export interface JobMeta {
  customer_name: string
  customer_address: string | null
  customer_phone: string | null
  customer_email: string | null
  dealer_name: string
  dealer_location: string | null
  date: string
  photos_attached: boolean
}
const JobMetaV = model<JobMeta>({
  customer_name: field(str()),
  customer_address: field(optional(str()), { default: () => null }),
  customer_phone: field(optional(str()), { default: () => null }),
  customer_email: field(optional(str()), { default: () => null }),
  dealer_name: field(str()),
  dealer_location: field(optional(str()), { default: () => null }),
  date: field(datetime(), { default: utcNow }),
  photos_attached: field(bool(), { default: () => false }),
})

export interface PoolJob {
  id: string
  meta: JobMeta
  product_type: ProductType
  measurement: JobMeasurement
  cover_spec: CoverSpec
  liner_spec: LinerSpec
  hardware: HardwareAddOns
  notes: string | null
  created_at: string
  updated_at: string
}

const UUID_RE = /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/
const uuid: Validator<string> = (v, loc, issues) => {
  if (typeof v === 'string' && UUID_RE.test(v.trim())) {
    const h = v.trim().replace(/-/g, '').toLowerCase()
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  issues.push({ loc, type: 'uuid_parsing', msg: 'Input should be a valid UUID' })
  return INVALID as never
}

const specFields = {
  meta: field(JobMetaV),
  product_type: field(enumOf(PRODUCT_TYPES), { default: () => 'cover' as const }),
  measurement: field(JobMeasurementV),
  cover_spec: field(CoverSpecV, { default: coverSpecDefault }),
  liner_spec: field(LinerSpecV, { default: linerSpecDefault }),
  hardware: field(HardwareV, { default: hardwareDefault }),
  notes: field(optional(str()), { default: () => null }),
}

/** A stored job (PoolJob). */
export const PoolJobV = model<PoolJob>({
  id: field(uuid, { default: () => crypto.randomUUID() }),
  ...specFields,
  created_at: field(datetime(), { default: utcNow }),
  updated_at: field(datetime(), { default: utcNow }),
})

export type PoolJobCreate = Omit<PoolJob, 'id' | 'created_at' | 'updated_at'>
/** POST /api/jobs body (PoolJobCreate). */
export const PoolJobCreateV = model<PoolJobCreate>(specFields)

export type PoolJobUpdate = { [K in keyof PoolJobCreate]: PoolJobCreate[K] | null }
/** PUT /api/jobs/{id} body (PoolJobUpdate): every part optional. */
export const PoolJobUpdateV = model<PoolJobUpdate>({
  meta: field(optional(JobMetaV), { default: () => null }),
  product_type: field(optional(enumOf(PRODUCT_TYPES)), { default: () => null }),
  measurement: field(optional(JobMeasurementV), { default: () => null }),
  cover_spec: field(optional(CoverSpecV), { default: () => null }),
  liner_spec: field(optional(LinerSpecV), { default: () => null }),
  hardware: field(optional(HardwareV), { default: () => null }),
  notes: field(optional(str()), { default: () => null }),
})

export const needsCover = (j: { product_type: ProductType }) => j.product_type === 'cover' || j.product_type === 'both'
export const needsLiner = (j: { product_type: ProductType }) => j.product_type === 'liner' || j.product_type === 'both'
