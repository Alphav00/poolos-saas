export interface Weather {
  tempF: number
  code: number
  windMph: number
  uv: number
  highF: number
  lowF: number
  rainChance: number
  uvMax: number
  hourlyRain: { hour: number; chance: number }[]
}

export interface Spot {
  lat: number
  lon: number
}

const KEY = 'poolos.weatherSpot'

/** WMO weather code (as Open-Meteo reports it) to words and an icon. */
export function describe(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'Clear', icon: '☀️' }
  if (code <= 2) return { text: 'Partly cloudy', icon: '⛅' }
  if (code === 3) return { text: 'Overcast', icon: '☁️' }
  if (code <= 48) return { text: 'Fog', icon: '🌫️' }
  if (code <= 57) return { text: 'Drizzle', icon: '🌦️' }
  if (code <= 67) return { text: 'Rain', icon: '🌧️' }
  if (code <= 77) return { text: 'Snow', icon: '🌨️' }
  if (code <= 82) return { text: 'Showers', icon: '🌦️' }
  if (code <= 86) return { text: 'Snow showers', icon: '🌨️' }
  return { text: 'Thunderstorms', icon: '⛈️' }
}

/** The first hour from now with a rain chance of at least 50%, if any. */
export function rainFrom(w: Weather, nowHour: number): number | null {
  return w.hourlyRain.find((h) => h.hour >= nowHour && h.chance >= 50)?.hour ?? null
}

export const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`

export function savedSpot(): Spot | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Spot | null
    return s && Number.isFinite(s.lat) && Number.isFinite(s.lon) ? s : null
  } catch {
    return null
  }
}

/** Asks the phone for its location once, keeps a rounded copy (about 1 km) for next time. */
export function locate(): Promise<Spot> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This phone cannot share its location.'))
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const s = { lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100 }
        try {
          localStorage.setItem(KEY, JSON.stringify(s))
        } catch {
          /* private mode: just don't remember it */
        }
        resolve(s)
      },
      () => reject(new Error('Location is off. Allow it to see the weather.')),
      { maximumAge: 30 * 60 * 1000, timeout: 15000 },
    )
  })
}

export async function loadWeather(s: Spot): Promise<Weather> {
  const res = await fetch(`/api/weather?lat=${s.lat}&lon=${s.lon}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in again.' : 'Weather is unavailable right now.')
  return (await res.json()) as Weather
}
