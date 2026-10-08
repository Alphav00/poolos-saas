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

export interface Pool {
  id: string
  name: string
  tags: string[]
  forecast: Partial<Record<Param, Forecast>>
  ideal: Partial<Record<Param, [number, number]>>
  visits: Visit[]
  decay: DecayRow[]
  /** Volume, US gallons. Doses need it; without it the screen says so. */
  gallons?: number
  /** Last TDS reading, ppm. Stands in for salt on pools with no chlorine generator. */
  tds?: number
  /** The chlorine generator cell, when the pool has one. Salt targets are looked up by it. */
  cell?: { make: string; model: string }
  equipment: string[]
  note?: string
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

export interface CrewMember {
  name: string
  initials: string
  role: string
  status: string
  state: 'working' | 'break' | 'off'
}
