import type { Forecast } from './types'

export type Agreement = 'ok' | 'off' | 'none'

/**
 * How a measured reading sits against its forecast. Outside the forecast's own
 * band means "retest before dosing"; the band comes with the forecast.
 */
export function compare(measured: number | undefined, forecast: Forecast | undefined): { delta: number; status: Agreement } {
  if (measured === undefined || forecast === undefined) return { delta: 0, status: 'none' }
  const delta = Number((measured - forecast.value).toFixed(2))
  return { delta, status: Math.abs(delta) > forecast.band ? 'off' : 'ok' }
}
