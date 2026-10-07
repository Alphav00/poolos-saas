/**
 * GET /api/weather?lat=..&lon=..  Today's weather for the route, from
 * Open-Meteo (free, no key). Coordinates are rounded to about 1 km before
 * they leave the Worker, and answers are cached for 15 minutes per spot.
 */
const CACHE_SECONDS = 900;

export interface Weather {
	tempF: number;
	code: number;
	windMph: number;
	uv: number;
	highF: number;
	lowF: number;
	rainChance: number;
	uvMax: number;
	/** Rain chance per hour from 6 am to 8 pm, local time. */
	hourlyRain: { hour: number; chance: number }[];
}

const fail = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

const DECIMAL = /^-?\d{1,3}(\.\d{1,8})?$/;

export function spot(url: URL): { lat: number; lon: number } | null {
	const rawLat = url.searchParams.get('lat') ?? '';
	const rawLon = url.searchParams.get('lon') ?? '';
	if (!DECIMAL.test(rawLat) || !DECIMAL.test(rawLon)) return null;
	const lat = Number(rawLat);
	const lon = Number(rawLon);
	if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
	return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

export function upstreamUrl(lat: number, lon: number): string {
	const q = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lon),
		current: 'temperature_2m,weather_code,wind_speed_10m,uv_index',
		daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
		hourly: 'precipitation_probability',
		temperature_unit: 'fahrenheit',
		wind_speed_unit: 'mph',
		timezone: 'auto',
		forecast_days: '1',
	});
	return `https://api.open-meteo.com/v1/forecast?${q}`;
}

interface Upstream {
	current: { temperature_2m: number; weather_code: number; wind_speed_10m: number; uv_index: number };
	daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; uv_index_max: number[] };
	hourly: { time: string[]; precipitation_probability: number[] };
}

/** Throws when Open-Meteo's answer is not the shape asked for. */
export function shape(u: Upstream): Weather {
	if (!u?.current || !u.daily || !u.hourly || !Array.isArray(u.hourly.time) || typeof u.current.temperature_2m !== 'number') {
		throw new Error('unexpected weather response');
	}
	return {
		tempF: Math.round(u.current.temperature_2m),
		code: u.current.weather_code,
		windMph: Math.round(u.current.wind_speed_10m),
		uv: Math.round(u.current.uv_index),
		highF: Math.round(u.daily.temperature_2m_max[0] ?? u.current.temperature_2m),
		lowF: Math.round(u.daily.temperature_2m_min[0] ?? u.current.temperature_2m),
		rainChance: u.daily.precipitation_probability_max[0] ?? 0,
		uvMax: Math.round(u.daily.uv_index_max[0] ?? u.current.uv_index),
		hourlyRain: u.hourly.time
			.map((t, i) => ({ hour: Number(t.slice(11, 13)), chance: u.hourly.precipitation_probability[i] ?? 0 }))
			.filter((h) => h.hour >= 6 && h.hour <= 20),
	};
}

const forBrowser = (body: Weather) =>
	Response.json(body, { headers: { 'Cache-Control': `private, max-age=${CACHE_SECONDS}` } });

export async function handleWeather(
	request: Request,
	fetcher: typeof fetch = fetch,
	cache?: Cache,
	waitUntil: (p: Promise<unknown>) => void = () => {},
): Promise<Response> {
	if (request.method !== 'GET') return fail(405, 'method_not_allowed', 'Use GET');
	const at = spot(new URL(request.url));
	if (!at) return fail(400, 'bad_request', 'lat and lon are required');
	const key = new Request(upstreamUrl(at.lat, at.lon));
	const hit = await cache?.match(key);
	if (hit) return forBrowser((await hit.json()) as Weather);
	let weather: Weather;
	try {
		const upstream = await fetcher(key.url, { headers: { Accept: 'application/json' } });
		if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
		weather = shape((await upstream.json()) as Upstream);
	} catch {
		return fail(502, 'weather_unavailable', 'Weather is unavailable right now');
	}
	// The edge cache refuses `private` responses, so it keeps its own public copy;
	// the browser gets the private one.
	if (cache) {
		const stored = Response.json(weather, { headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}` } });
		waitUntil(cache.put(key, stored).catch(() => {}));
	}
	return forBrowser(weather);
}
