/**
 * Shared types for @diving-board/measure-core.
 *
 * ## Units
 *
 * Everything is **decimal feet** (lengths) and **square feet** (areas), the
 * same internal unit as the liner-measure-pro backend (`ab_math.py`,
 * `liner_math.py`) and its JS ports. The one exception is closure tolerances
 * and closure differences, which are **inches** because that is how the field
 * forms state them (`*_IN` constants, `differenceIn`, `toleranceIn`).
 *
 * Note: `docs/LINER-MEASURE-SPEC.md` (an earlier, historical PWA spec) states
 * A/B distances in inches. The implementation that shipped, and therefore this
 * package, uses decimal feet throughout. Use `parseDistance` / `formatDistance`
 * (distance.ts) to convert to and from the trade's feet-and-inches notation.
 *
 * ## Naming
 *
 * - Job / measurement **input** shapes are snake_case, mirroring the backend's
 *   pydantic models and the JSON the API serves (`a_distance_ft`, ...).
 * - Values computed by the pure math (reconstruction, closure checks, takeoff)
 *   are camelCase, mirroring the frontend JS ports (`perimeterFt`, ...).
 * - The API-layer results from `liner_takeoff.py` (`buildLinerTakeoff`) are
 *   snake_case and rounded exactly like the backend's response models.
 *
 * Decimal fields arrive from the API as strings, so numeric inputs accept
 * `number | string` (`Numeric`) and are coerced with `Number()`.
 */

/** A number, or a decimal string as the API serializes `Decimal`. */
export type Numeric = number | string;

// ---------- enums (string unions, values match the backend) ----------

export type PointQuality = 'good' | 'marginal' | 'invalid';
export type ClosureStatus = 'pass' | 'warn' | 'fail';
export type HydrostaticSeverity = 'low' | 'medium' | 'high';

export type ShapeType = 'rectangular' | 'kidney' | 'freeform';
export type ProductType = 'cover' | 'liner' | 'both';

export const LINER_SHAPES = [
  'rectangle', 'rectangle_grecian_shallow', 'rectangle_grecian_deep', 'grecian',
  'offset_grecian_left', 'offset_grecian_right', 'summerville_grecian_left',
  'summerville_grecian_right', 'roman_end', 'double_roman', 'patrician_shallow',
  'patrician_deep', 'true_l_left', 'true_l_right', 'lazy_l_left', 'lazy_l_right',
  'oval', 'oval_jewel', 'round', 'octagon', 'kite', 'kidney', 'figure_8',
  'mountain_lake_left', 'mountain_lake_right', 'odessy_left', 'odessy_right', 'freeform',
] as const;
export type LinerShape = (typeof LINER_SHAPES)[number];

export type StepConstruction =
  | 'none' | 'fiberglass_standard' | 'vinyl_over_standard' | 'vinyl_over_complex';
export type StepCornerType = 'ninety_degree' | 'radius' | 'diagonal';
export type ProfileSegmentKind = 'shallow_floor' | 'slope' | 'hopper_slope' | 'deep_floor' | 'break';
export type FittingKind =
  | 'skimmer' | 'return' | 'main_drain' | 'light' | 'step_jet' | 'vacuum_port'
  | 'auto_fill' | 'wall_fitting';
export type DrainageSystem = 'none' | 'french_drain' | 'dewatering_well' | 'unknown';
export type CopingType = 'concrete' | 'aluminum' | 'plastic' | 'stone' | 'cantilever';
export type BeadType = 'standard_bead' | 'j_hook' | 'overlap' | 'ez_track';
export type FloorType = 'vermiculite' | 'concrete' | 'sand' | 'grout';
export type CoveType = string;
export type FloorRepair = string;
export type LinerThicknessMil = 20 | 27 | 28 | 30;
export type ObstacleKind =
  | 'handrail' | 'grabrail' | 'ladder' | 'slide_leg' | 'rock' | 'waterfall'
  | 'raised_wall' | 'spa_wall' | 'fill_spout' | 'dive_stand' | 'planter';

// ---------- A/B input ----------

export interface PerimeterPoint {
  number: number;
  a_distance_ft: Numeric;
  b_distance_ft: Numeric;
  notes?: string | null;
  is_obstacle?: boolean;
  obstacle_kind?: ObstacleKind | null;
}

/** `[number, a_distance_ft, b_distance_ft]`, the tuple form `ab_math.py` accepts. */
export type PerimeterPointTuple = readonly [number, number, number];

export interface CrossDimension {
  from_point: number;
  to_point: number;
  distance_ft: Numeric;
}

// ---------- A/B results (camelCase) ----------

export interface ReconstructedPoint2D {
  number: number;
  /** ft along A→B, A at the origin. */
  x: number;
  /** ft; negative = the pool side (below the A-B line). */
  y: number;
  quality: PointQuality;
  qualityReason: string | null;
}

export interface ReconstructionResult {
  points: ReconstructedPoint2D[];
  perimeterFt: number;
  areaSqft: number;
  /** Bounding-box x extent. */
  lengthFt: number;
  /** Bounding-box y extent. */
  widthFt: number;
  depthAvgFt: number;
  valid: boolean;
  invalidReasons: string[];
}

export interface SuspectPoint {
  number: number;
  reason: string;
}

// ---------- liner input (snake_case) ----------

export interface WallHeight {
  label: string;
  at_point?: number | null;
  height_ft: Numeric;
  notes?: string | null;
}

export interface ProfileSegment {
  order: number;
  kind: ProfileSegmentKind | string;
  horizontal_run_ft: Numeric;
  depth_start_ft: Numeric;
  depth_end_ft: Numeric;
  label?: string | null;
}

/** `[order, kind, horizontal_run_ft, depth_start_ft, depth_end_ft]`. */
export type ProfileSegmentTuple = readonly [number, string, Numeric, Numeric, Numeric];
export type ProfileSegmentInput = ProfileSegment | ProfileSegmentTuple;

export interface HopperProfile {
  left_slope_width_ft?: Numeric;   // G
  bottom_width_ft?: Numeric;       // H
  right_slope_width_ft?: Numeric;  // I
  bottom_length_ft?: Numeric | null; // M
}

export interface StepRiser {
  index?: number;
  riser_height_ft: Numeric;
  tread_depth_ft?: Numeric | null;
}

export interface LinerStep {
  construction?: StepConstruction;
  location?: string;
  width_ft?: Numeric | null;
  corner_type?: StepCornerType | null;
  foam_thickness_in?: Numeric | null;
  risers?: StepRiser[];
  from_point?: number | null;
  to_point?: number | null;
  notes?: string | null;
}

export interface Fitting {
  kind: FittingKind;
  label?: string | null;
  a_distance_ft?: Numeric | null;
  b_distance_ft?: Numeric | null;
  near_point?: number | null;
  depth_below_bead_ft?: Numeric | null;
  on_floor?: boolean;
  notes?: string | null;
}

/**
 * The liner's vertical capture. Missing fields take the backend's pydantic
 * defaults (`shape: 'freeform'`, `drainage_system: 'unknown'`, ...).
 */
export interface LinerMeasurement {
  shape?: LinerShape;
  wall_heights?: WallHeight[];
  profile_segments?: ProfileSegment[];
  hopper?: HopperProfile | null;
  steps?: LinerStep[];
  fittings?: Fitting[];
  floor_type?: FloorType;
  cove_type?: CoveType;
  floor_repair?: FloorRepair;
  wall_repair_notes?: string | null;
  drainage_system?: DrainageSystem;
  hydrostatic_relief_valve?: boolean;
  recent_rainfall_days?: number;
  water_table_notes?: string | null;
}

export interface LinerSpec {
  thickness_mil?: LinerThicknessMil;
  pattern_name?: string;
  pattern_code?: string | null;
  bead_type?: BeadType;
  coping_type?: CopingType;
  step_construction?: StepConstruction;
  tile_border?: boolean;
  tile_border_pattern?: string | null;
  /** Defaults to true, as on the backend. `false` blocks the order. */
  measured_at_bead_receiver?: boolean;
  waste_factor_pct?: Numeric;
  warranty_years?: number | null;
}

// ---------- job (snake_case, mirrors PoolJob) ----------

export interface ObstacleSpec {
  kind: ObstacleKind;
  front_point?: number | null;
  back_point?: number | null;
  description?: string | null;
}

export interface StepSpec {
  location: string;
  size_length_ft: Numeric;
  size_width_ft: Numeric;
  offset_ft?: Numeric | null;
  notes?: string | null;
}

export interface DeckSpec {
  min_width_ft: Numeric;
  narrow_sections?: string[];
  deck_type?: string;
  wood_deck_anchors_needed?: boolean;
  wood_deck_length_ft?: Numeric | null;
  diving_board?: boolean;
  diving_board_distance_ft?: Numeric | null;
}

export interface JobMeasurement {
  pool_length?: Numeric | null;
  pool_width?: Numeric | null;
  ab_distance_ft: Numeric;
  ab_orientation?: string;
  ab_offset_from_pool_ft?: Numeric;
  ab_note?: string | null;
  /** Stakes were set on the wrong ends: A and B distances are read swapped. */
  swap_ab?: boolean;
  shape_type: ShapeType;
  perimeter_points: PerimeterPoint[];
  cross_dimensions?: CrossDimension[];
  obstacles?: ObstacleSpec[];
  step?: StepSpec | null;
  spa?: unknown;
  deck: DeckSpec;
  shallow_depth_ft: Numeric;
  deep_depth_ft: Numeric;
  liner?: LinerMeasurement | null;
}

export interface JobMeta {
  customer_name: string;
  customer_address?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  dealer_name: string;
  dealer_location?: string | null;
  /** ISO-8601 timestamp. */
  date?: string;
  photos_attached?: boolean;
}

export interface CoverSpec {
  type?: string;
  color?: string;
  spacing?: string;
  anchor_type?: string;
  overlap_standard_in?: Numeric;
  overlap_planter_in?: Numeric | null;
}

export interface PoolJob {
  id: string;
  meta: JobMeta;
  product_type?: ProductType;
  measurement: JobMeasurement;
  cover_spec?: CoverSpec;
  liner_spec?: LinerSpec;
  hardware?: Record<string, unknown>;
  notes?: string | null;
}

// ---------- liner results (camelCase) ----------

export interface ClosureResult {
  name: string;
  measuredFt: number;
  expectedFt: number;
  /** inches; negative = measured short of expected. */
  differenceIn: number;
  toleranceIn: number;
  status: ClosureStatus;
  message: string;
}

export interface HydrostaticResult {
  severity: HydrostaticSeverity;
  notes: string[];
}

export interface ValidationResult {
  ok: boolean;
  blocking: string[];
  warnings: string[];
  checks: ClosureResult[];
  hydrostatic: HydrostaticResult | null;
}

export interface TakeoffResult {
  perimeterFt: number;
  wallHeightAvgFt: number;
  wallHeightMaxFt: number;
  wallAreaSqft: number;
  floorPlanLengthFt: number;
  floorDevelopedLengthFt: number;
  floorPlanAreaSqft: number;
  floorDevelopedAreaSqft: number;
  stepAreaSqft: number;
  subtotalSqft: number;
  wasteFactorPct: number;
  totalMaterialSqft: number;
}

// ---------- API-layer results (snake_case, rounded like the backend) ----------

export interface ApiReconstructedPoint {
  number: number;
  x_ft: number;
  y_ft: number;
  quality: PointQuality;
  quality_reason: string | null;
}

export interface ApiReconstructedPool {
  ab_distance_ft: number;
  points: ApiReconstructedPoint[];
  perimeter_ft: number;
  area_sqft: number;
  length_ft: number;
  width_ft: number;
  depth_avg_ft: number;
}

export interface ApiClosureCheck {
  name: string;
  measured_ft: number;
  expected_ft: number;
  difference_in: number;
  tolerance_in: number;
  status: ClosureStatus;
  message: string;
}

export interface ApiLinerValidationReport {
  ok: boolean;
  blocking: string[];
  warnings: string[];
  checks: ApiClosureCheck[];
  hydrostatic: HydrostaticResult | null;
}

export interface ApiLinerTakeoff {
  perimeter_ft: number;
  wall_height_avg_ft: number;
  wall_height_max_ft: number;
  wall_area_sqft: number;
  floor_plan_length_ft: number;
  floor_developed_length_ft: number;
  floor_plan_area_sqft: number;
  floor_developed_area_sqft: number;
  step_area_sqft: number;
  subtotal_sqft: number;
  waste_factor_pct: number;
  total_material_sqft: number;
}

export interface ApiLinerTakeoffResult {
  reconstructed: ApiReconstructedPool;
  takeoff: ApiLinerTakeoff | null;
  validation: ApiLinerValidationReport;
}
