/**
 * GET /api/weather?lat=..&lon=..  Today's weather for the route, from
 * Open-Meteo (free, no key), falling back to the US National Weather Service
 * (free, no key, US only) when Open-Meteo refuses or times out. Coordinates
 * are rounded to about 1 km before they leave the Worker, and answers are
 * cached for 15 minutes per spot.
 */
const CACHE_SECONDS = 900;
/** Which NWS forecast grid a spot falls in barely ever changes. */
const POINTS_CACHE_SECONDS = 7 * 24 * 3600;
/** Per upstream call, and for the whole answer, so a phone never waits much past this. */
const TIMEOUT_MS = 8000;
const BUDGET_MS = 15000;
const NWS_HEADERS = { 'User-Agent': '(poolos.pathofphi.com, poolos-weather)', Accept: 'application/geo+json' };

export interface Weather {
	tempF: number;
	/** WMO weather code; null when the source gave none. */
	code: number | null;
	windMph: number | null;
	/** Null when the source has no UV (the NWS has none). */
	uv: number | null;
	highF: number;
	lowF: number;
	rainChance: number;
	uvMax: number | null;
	/** Rain chance per hour from 6 am to 8 pm, local time. */
	hourlyRain: { hour: number; chance: number }[];
	source: 'open-meteo' | 'nws';
}

type Spot = { lat: number; lon: number };

const fail = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

const DECIMAL = /^-?\d{1,3}(\.\d{1,8})?$/;

export function spot(url: URL): Spot | null {
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

/** The edge cache key: on our own host, since caches.default only keeps keys in our zone. */
export function cacheKey(request: Request, at: Spot): Request {
	return new Request(`https://${new URL(request.url).host}/__weather?lat=${at.lat}&lon=${at.lon}`);
}

/** A finite number, or null. */
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (v: number | null) => (v === null ? null : Math.round(v));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

interface Upstream {
	current?: { temperature_2m?: unknown; weather_code?: unknown; wind_speed_10m?: unknown; uv_index?: unknown };
	daily?: { temperature_2m_max?: unknown; temperature_2m_min?: unknown; precipitation_probability_max?: unknown; uv_index_max?: unknown };
	hourly?: { time?: unknown; precipitation_probability?: unknown };
}

/** Throws when Open-Meteo's answer has no current temperature; other missing values become null. */
export function shape(u: Upstream): Weather {
	const temp = num(u?.current?.temperature_2m);
	if (!u?.current || !u.daily || !u.hourly || !Array.isArray(u.hourly.time) || temp === null) {
		throw new Error('unexpected weather response');
	}
	const chances = arr(u.hourly.precipitation_probability);
	const hourlyRain = (u.hourly.time as unknown[]).flatMap((t, i) => {
		const chance = num(chances[i]);
		const hour = typeof t === 'string' ? Number(t.slice(11, 13)) : NaN;
		return chance !== null && hour >= 6 && hour <= 20 ? [{ hour, chance }] : [];
	});
	const uv = round(num(u.current.uv_index));
	const rainMax = num(arr(u.daily.precipitation_probability_max)[0]);
	return {
		tempF: Math.round(temp),
		code: round(num(u.current.weather_code)),
		windMph: round(num(u.current.wind_speed_10m)),
		uv,
		highF: Math.round(num(arr(u.daily.temperature_2m_max)[0]) ?? temp),
		lowF: Math.round(num(arr(u.daily.temperature_2m_min)[0]) ?? temp),
		rainChance: rainMax ?? Math.max(0, ...hourlyRain.map((h) => h.chance)),
		uvMax: round(num(arr(u.daily.uv_index_max)[0])) ?? uv,
		hourlyRain,
		source: 'open-meteo',
	};
}

/** Roughly the area the NWS forecasts: the lower 48, Alaska, Hawaii, Puerto Rico and the USVI, Guam. */
export function inUS({ lat, lon }: Spot): boolean {
	return (
		(lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66) ||
		(lat >= 51 && lat <= 72 && lon >= -180 && lon <= -129) ||
		(lat >= 51 && lat <= 53.5 && lon >= 172 && lon <= 180) ||
		(lat >= 18.5 && lat <= 22.5 && lon >= -161 && lon <= -154) ||
		(lat >= 17.5 && lat <= 18.8 && lon >= -68 && lon <= -64.5) ||
		(lat >= 13 && lat <= 21 && lon >= 144 && lon <= 146.5)
	);
}

/** NWS short forecast words to a WMO-style code bucket the app already describes. */
export function nwsCode(text: string): number | null {
	const t = text.toLowerCase();
	if (/thunder|t-storm/.test(t)) return 95;
	if (/snow show|flurr/.test(t)) return 85;
	if (/snow|sleet|ice|freezing|blizzard|wintry/.test(t)) return 71;
	if (/shower/.test(t)) return 80;
	if (/drizzle/.test(t)) return 53;
	if (/rain/.test(t)) return 63;
	if (/fog|haze|smoke|mist/.test(t)) return 45;
	if (/mostly cloudy|overcast|^cloudy/.test(t)) return 3;
	if (/partly|mostly sunny|mostly clear/.test(t)) return 2;
	if (/sunny|clear|fair/.test(t)) return 0;
	return null;
}

interface NwsPeriod {
	startTime?: unknown;
	endTime?: unknown;
	isDaytime?: unknown;
	temperature?: unknown;
	temperatureUnit?: unknown;
	windSpeed?: unknown;
	shortForecast?: unknown;
	probabilityOfPrecipitation?: { value?: unknown } | null;
}
type NwsForecast = { properties?: { periods?: unknown } };

const tempOf = (p: NwsPeriod) => {
	const t = num(p.temperature);
	return t === null ? null : p.temperatureUnit === 'C' ? (t * 9) / 5 + 32 : t;
};
const temps = (ps: NwsPeriod[]) => ps.map(tempOf).filter((t): t is number => t !== null);

/**
 * Shapes the NWS hourly forecast, plus (when given) the 12-hour one for
 * today's daytime high and overnight low. Throws when there is no usable hour.
 */
export function shapeNws(hourly: NwsForecast, daily?: NwsForecast | null, now = Date.now()): Weather {
	const periods = arr(hourly?.properties?.periods) as NwsPeriod[];
	// The forecast can lag: skip hours that have already ended.
	const first = periods.find((p) => !(typeof p.endTime === 'string' && Date.parse(p.endTime) <= now)) ?? periods[0];
	const temp = first ? tempOf(first) : null;
	if (!first || typeof first.startTime !== 'string' || temp === null) throw new Error('unexpected NWS response');
	// startTime carries the spot's own UTC offset, so its text is local time.
	const today = first.startTime.slice(0, 10);
	const isToday = (p: NwsPeriod) => typeof p.startTime === 'string' && p.startTime.slice(0, 10) === today;
	const rest = periods.slice(periods.indexOf(first)).filter(isToday);
	const halves = (arr(daily?.properties?.periods) as NwsPeriod[]).filter(isToday);
	const dayHigh = temps(halves.filter((p) => p.isDaytime === true));
	const nightLow = temps(halves.filter((p) => p.isDaytime === false));
	const chanceOf = (p: NwsPeriod) => num(p.probabilityOfPrecipitation?.value);
	const hourlyRain = rest.flatMap((p) => {
		const hour = Number((p.startTime as string).slice(11, 13));
		const chance = chanceOf(p);
		return chance !== null && hour >= 6 && hour <= 20 ? [{ hour, chance }] : [];
	});
	// "5 to 10 mph" is a range over the hour; show its middle.
	const winds = typeof first.windSpeed === 'string' ? (first.windSpeed.match(/\d+(\.\d+)?/g) ?? []).map(Number) : [];
	return {
		tempF: Math.round(temp),
		code: typeof first.shortForecast === 'string' ? nwsCode(first.shortForecast) : null,
		windMph: winds.length ? Math.round((Math.min(...winds) + Math.max(...winds)) / 2) : null,
		uv: null,
		highF: Math.round(Math.max(temp, ...temps(rest), ...dayHigh)),
		lowF: Math.round(Math.min(temp, ...temps(rest), ...nightLow)),
		rainChance: Math.max(0, ...rest.map((p) => chanceOf(p) ?? 0)),
		uvMax: null,
		hourlyRain,
		source: 'nws',
	};
}

/** Fetches JSON with a timeout that never runs past the deadline; logs and throws on anything but a 2xx. */
async function getJson(fetcher: typeof fetch, url: string, headers: Record<string, string>, who: string, deadline: number): Promise<unknown> {
	const left = Math.min(TIMEOUT_MS, deadline - Date.now());
	if (left <= 0) throw new DOMException(`${who}: out of time`, 'TimeoutError');
	const res = await fetcher(url, { headers, signal: AbortSignal.timeout(left) });
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error(`weather: ${who} answered ${res.status}: ${body.slice(0, 200)}`);
		throw new Error(`${who} ${res.status}`);
	}
	return res.json();
}

async function fromOpenMeteo(at: Spot, fetcher: typeof fetch, deadline: number): Promise<Weather> {
	return shape((await getJson(fetcher, upstreamUrl(at.lat, at.lon), { Accept: 'application/json' }, 'open-meteo', deadline)) as Upstream);
}

const nwsUrl = (v: unknown): string | null => (typeof v === 'string' && v.startsWith('https://api.weather.gov/') ? v : null);

interface Edge {
	cache?: Cache;
	waitUntil: (p: Promise<unknown>) => void;
}

/** The spot's NWS forecast URLs, from the edge cache when we have looked them up before. */
async function nwsGrid(at: Spot, fetcher: typeof fetch, deadline: number, key: Request, edge: Edge) {
	const hit = await edge.cache?.match(key);
	if (hit) return (await hit.json()) as { hourly: string; daily: string | null };
	const points = (await getJson(fetcher, `https://api.weather.gov/points/${at.lat},${at.lon}`, NWS_HEADERS, 'nws points', deadline)) as {
		properties?: { forecastHourly?: unknown; forecast?: unknown };
	};
	const hourly = nwsUrl(points?.properties?.forecastHourly);
	if (!hourly) throw new Error('NWS points had no hourly forecast');
	const grid = { hourly, daily: nwsUrl(points?.properties?.forecast) };
	if (edge.cache) {
		const stored = Response.json(grid, { headers: { 'Cache-Control': `public, s-maxage=${POINTS_CACHE_SECONDS}` } });
		edge.waitUntil(edge.cache.put(key, stored).catch(() => {}));
	}
	return grid;
}

async function fromNws(at: Spot, fetcher: typeof fetch, deadline: number, gridKey: Request, edge: Edge): Promise<Weather> {
	const grid = await nwsGrid(at, fetcher, deadline, gridKey, edge);
	const [hourly, daily] = await Promise.all([
		getJson(fetcher, grid.hourly, NWS_HEADERS, 'nws hourly', deadline),
		// The 12-hour forecast only sharpens the high and low; do without it on failure.
		grid.daily ? getJson(fetcher, grid.daily, NWS_HEADERS, 'nws daily', deadline).catch(() => null) : null,
	]);
	return shapeNws(hourly as NwsForecast, daily as NwsForecast | null);
}

const why = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

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
	const key = cacheKey(request, at);
	const hit = await cache?.match(key);
	if (hit) return forBrowser((await hit.json()) as Weather);
	const deadline = Date.now() + BUDGET_MS;
	let weather: Weather;
	try {
		weather = await fromOpenMeteo(at, fetcher, deadline);
	} catch (e) {
		console.error(`weather: open-meteo failed (${why(e)})`);
		if (!inUS(at)) return fail(502, 'weather_unavailable', 'Weather is unavailable right now');
		try {
			const gridKey = new Request(key.url.replace('/__weather?', '/__weather-grid?'));
			weather = await fromNws(at, fetcher, deadline, gridKey, { cache, waitUntil });
		} catch (e2) {
			console.error(`weather: nws failed (${why(e2)})`);
			return fail(502, 'weather_unavailable', 'Weather is unavailable right now');
		}
	}
	// The edge cache refuses `private` responses, so it keeps its own public copy;
	// the browser gets the private one.
	if (cache) {
		const stored = Response.json(weather, { headers: { 'Cache-Control': `public, s-maxage=${CACHE_SECONDS}` } });
		waitUntil(cache.put(key, stored).catch(() => {}));
	}
	return forBrowser(weather);
}
