export type Param = 'fc' | 'ph' | 'ta' | 'cya' | 'ch' | 'salt' | 'temp'

/** Where a reading is expected to be before anyone tests, and how far off still counts as agreeing. */
export interface Forecast {
  value: number
  band: number
}

export interface Visit {
  date: string
  /** FC measured on arrival, before dosing. */
  before: number
  /** FC after dosing, when the tech left. */
  after: number
}

export interface DecayRow {
  label: string
  detail: string
  trend: string
  alert?: boolean
}

/** What a pool is, as kept in D1 at field/pools/<id> (apps/api/src/field.ts checks it). */
export interface Profile {
  id: string
  name: string
  tags: string[]
  /** Volume, US gallons. Doses need it; without it the screen says so. */
  gallons?: number
  /** Last TDS reading, ppm. Stands in for salt on pools with no chlorine generator. */
  tds?: number
  /** The chlorine generator cell, when the pool has one. Salt targets are looked up by it. */
  cell?: { make: string; model: string }
  equipment: string[]
  note?: string
  /** Made-up pool from the demo set; screens mark it DEMO. */
  demo?: boolean
}

/** Engine output for a pool: where its readings are heading. Not part of the profile. */
export interface EngineView {
  forecast: Partial<Record<Param, Forecast>>
  ideal: Partial<Record<Param, [number, number]>>
  visits?: Visit[]
  decay?: DecayRow[]
}

/** A pool as the screens use it: its profile plus the engine's view of it. */
export interface Pool extends Profile {
  forecast: Partial<Record<Param, Forecast>>
  ideal: Partial<Record<Param, [number, number]>>
  visits: Visit[]
  decay: DecayRow[]
}

export interface Stop {
  poolId: string
  /** Position on the sample route map, 0–100 across and down. */
  x: number
  y: number
  eta: string
  done: boolean
  flags: { text: string; level?: 'warn' | 'bad' }[]
  action?: string
}

export type Method = 'strip' | 'drop' | 'meter'

export interface Reading {
  method: Method
  values: Partial<Record<Param, number>>
}

export type Role = 'Technician' | 'Lead' | 'Dispatcher' | 'Operator'

/** A staff member, as kept in D1 at field/staff/<id> (apps/api/src/field.ts checks it). Owners add them. */
export interface StaffMember {
  id: string
  name: string
  /** Sign-in email, lower-case. The Worker matches it to give the viewer their role. */
  email: string
  role: Role
  route?: string
  /** Made-up person from the demo set; screens mark it DEMO. */
  demo?: boolean
  /** When the record was added, and by whom; stamped by the Worker. */
  createdAt?: string
  createdBy?: string
}
