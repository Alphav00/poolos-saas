import { describe, expect, it } from 'vitest';
import { handleWeather, nwsCode, shape, shapeNws, spot } from '../src/weather';

const upstream = {
	current: { temperature_2m: 84.4, weather_code: 1, wind_speed_10m: 7.6, uv_index: 6.2 },
	daily: { temperature_2m_max: [91.2], temperature_2m_min: [70.1], precipitation_probability_max: [40], uv_index_max: [9.1] },
	hourly: {
		time: ['2026-10-07T05:00', '2026-10-07T06:00', '2026-10-07T15:00', '2026-10-07T21:00'],
		precipitation_probability: [0, 5, 40, 10],
	},
};

describe('weather', () => {
	it('rounds the location to about 1 km before asking Open-Meteo', async () => {
		let asked = '';
		const fake = (async (u: string) => {
			asked = u;
			return Response.json(upstream);
		}) as unknown as typeof fetch;
		const res = await handleWeather(new Request('https://x/api/weather?lat=40.712776&lon=-74.005974'), fake);
		expect(res.status).toBe(200);
		expect(asked).toContain('latitude=40.71&longitude=-74.01');
		expect(await res.json()).toEqual({
			tempF: 84, code: 1, windMph: 8, uv: 6, highF: 91, lowF: 70, rainChance: 40, uvMax: 9,
			hourlyRain: [{ hour: 6, chance: 5 }, { hour: 15, chance: 40 }], source: 'open-meteo',
		});
	});

	it('refuses a missing or impossible location', () => {
		expect(spot(new URL('https://x/?lat=40'))).toBeNull();
		expect(spot(new URL('https://x/?lat=91&lon=0'))).toBeNull();
		expect(spot(new URL('https://x/?lat=abc&lon=0'))).toBeNull();
		expect(spot(new URL('https://x/?lat=%20&lon=0'))).toBeNull();
		expect(spot(new URL('https://x/?lat=0x10&lon=0'))).toBeNull();
	});

	it('says weather is unavailable when Open-Meteo fails', async () => {
		const down = (async () => new Response('nope', { status: 503 })) as unknown as typeof fetch;
		const res = await handleWeather(new Request('https://x/api/weather?lat=1&lon=1'), down);
		expect(res.status).toBe(502);
		const junk = (async () => new Response('<html>busy</html>', { status: 200 })) as unknown as typeof fetch;
		expect((await handleWeather(new Request('https://x/api/weather?lat=1&lon=1'), junk)).status).toBe(502);
		const partial = (async () => Response.json({ current: {} })) as unknown as typeof fetch;
		expect((await handleWeather(new Request('https://x/api/weather?lat=1&lon=1'), partial)).status).toBe(502);
	});

	it('answers repeat asks for the same spot from the edge cache', async () => {
		let calls = 0;
		const counted = (async () => {
			calls++;
			return Response.json(upstream);
		}) as unknown as typeof fetch;
		const cache = await caches.open('weather-test');
		const pending: Promise<unknown>[] = [];
		const ask = () => handleWeather(new Request('https://x/api/weather?lat=10.001&lon=20.004'), counted, cache, (p) => pending.push(p));
		const first = await ask();
		await Promise.all(pending);
		const second = await ask();
		expect(calls).toBe(1);
		expect(await second.json()).toEqual(await first.json());
		expect(second.headers.get('Cache-Control')).toContain('private');
	});

	it('turns missing Open-Meteo values into nulls, not "Partly cloudy" or 0', () => {
		const w = shape({
			current: { temperature_2m: 80, weather_code: null, wind_speed_10m: null, uv_index: null },
			daily: { temperature_2m_max: [null], temperature_2m_min: [], precipitation_probability_max: [null], uv_index_max: [null] },
			hourly: { time: ['2026-10-07T09:00', '2026-10-07T10:00'], precipitation_probability: [null, 30] },
		});
		expect(w).toMatchObject({ tempF: 80, code: null, windMph: null, uv: null, uvMax: null, highF: 80, lowF: 80, rainChance: 30 });
		expect(w.hourlyRain).toEqual([{ hour: 10, chance: 30 }]);
		expect(() => shape({ current: { temperature_2m: null }, daily: {}, hourly: { time: [] } })).toThrow();
	});

	it('maps NWS words to the app weather codes', () => {
		expect(nwsCode('Sunny')).toBe(0);
		expect(nwsCode('Mostly Sunny')).toBe(2);
		expect(nwsCode('Mostly Cloudy')).toBe(3);
		expect(nwsCode('Chance Rain Showers')).toBe(80);
		expect(nwsCode('Slight Chance Showers And Thunderstorms')).toBe(95);
		expect(nwsCode('Areas Of Fog')).toBe(45);
		expect(nwsCode('Something new')).toBeNull();
	});

	describe('National Weather Service fallback', () => {
		const period = (h: number, temp: number, rain: number | null, words = 'Partly Sunny') => ({
			startTime: `2026-10-07T${String(h).padStart(2, '0')}:00:00-04:00`,
			temperature: temp,
			temperatureUnit: 'F',
			windSpeed: '5 to 10 mph',
			shortForecast: words,
			probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: rain },
		});
		const hourly = {
			properties: {
				periods: [period(14, 78, 10, 'Chance Rain Showers'), period(15, 80, 60), period(20, 70, null), period(21, 66, 5), {
					...period(9, 99, 90),
					startTime: '2026-10-08T09:00:00-04:00',
				}],
			},
		};
		const asked: { url: string; headers: Headers }[] = [];
		const nws = (openMeteo: () => Promise<Response>) =>
			(async (u: string, init?: RequestInit) => {
				asked.push({ url: u, headers: new Headers(init?.headers) });
				if (u.startsWith('https://api.open-meteo.com/')) return openMeteo();
				if (u === 'https://api.weather.gov/points/39.93,-75.03')
					return Response.json({ properties: { forecastHourly: 'https://api.weather.gov/gridpoints/PHI/50,80/forecast/hourly' } });
				if (u === 'https://api.weather.gov/gridpoints/PHI/50,80/forecast/hourly') return Response.json(hourly);
				return new Response('not found', { status: 404 });
			}) as unknown as typeof fetch;
		const here = 'https://app.example/api/weather?lat=39.93&lon=-75.03';
		const expected = {
			tempF: 78, code: 80, windMph: 8, uv: null, uvMax: null, highF: 80, lowF: 66, rainChance: 60,
			hourlyRain: [{ hour: 14, chance: 10 }, { hour: 15, chance: 60 }], source: 'nws',
		};

		it('skips hours that have ended and takes the high and low from the 12-hour forecast', () => {
			const late = {
				properties: {
					periods: [
						{ ...period(13, 90, 0), endTime: '2026-10-07T14:00:00-04:00' },
						{ ...period(14, 84, 20), endTime: '2026-10-07T15:00:00-04:00' },
						{ ...period(15, 82, 30), endTime: '2026-10-07T16:00:00-04:00' },
					],
				},
			};
			const halves = {
				properties: {
					periods: [
						{ startTime: '2026-10-07T06:00:00-04:00', isDaytime: true, temperature: 91, temperatureUnit: 'F' },
						{ startTime: '2026-10-07T18:00:00-04:00', isDaytime: false, temperature: 68, temperatureUnit: 'F' },
						{ startTime: '2026-10-08T06:00:00-04:00', isDaytime: true, temperature: 99, temperatureUnit: 'F' },
					],
				},
			};
			const w = shapeNws(late, halves, Date.parse('2026-10-07T14:20:00-04:00'));
			expect(w).toMatchObject({ tempF: 84, highF: 91, lowF: 68, rainChance: 30 });
			expect(w.hourlyRain).toEqual([{ hour: 14, chance: 20 }, { hour: 15, chance: 30 }]);
		});

		it('is used when Open-Meteo answers 429', async () => {
			asked.length = 0;
			const res = await handleWeather(new Request(here), nws(async () => new Response('Too many requests', { status: 429 })));
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual(expected);
			const points = asked.find((a) => a.url.startsWith('https://api.weather.gov/points/'))!;
			expect(points.headers.get('User-Agent')).toBe('(poolos.pathofphi.com, poolos-weather)');
			expect(points.headers.get('Accept')).toBe('application/geo+json');
		});

		it('is used when Open-Meteo times out', async () => {
			const slow = async () => {
				throw new DOMException('The operation timed out.', 'TimeoutError');
			};
			const res = await handleWeather(new Request(here), nws(slow));
			expect(res.status).toBe(200);
			expect(((await res.json()) as { source: string }).source).toBe('nws');
		});

		it('gives up with 502 when both fail', async () => {
			const bothDown = (async () => new Response('busy', { status: 503 })) as unknown as typeof fetch;
			const res = await handleWeather(new Request(here), bothDown);
			expect(res.status).toBe(502);
			const nwsJunk = (async (u: string) =>
				u.startsWith('https://api.weather.gov/points/')
					? Response.json({ properties: { forecastHourly: 'https://elsewhere.example/x' } })
					: new Response('busy', { status: 429 })) as unknown as typeof fetch;
			expect((await handleWeather(new Request(here), nwsJunk)).status).toBe(502);
		});

		it('is not tried outside the US', async () => {
			asked.length = 0;
			const res = await handleWeather(
				new Request('https://app.example/api/weather?lat=51.5&lon=-0.12'),
				nws(async () => new Response('busy', { status: 429 })),
			);
			expect(res.status).toBe(502);
			expect(asked.some((a) => a.url.includes('weather.gov'))).toBe(false);
		});
	});

	it('keys the edge cache on our own host, not the upstream one', async () => {
		const keys: string[] = [];
		const fakeCache = {
			match: async (k: Request) => (keys.push(k.url), undefined),
			put: async (k: Request) => void keys.push(k.url),
		} as unknown as Cache;
		const pending: Promise<unknown>[] = [];
		const ok = (async () => Response.json(upstream)) as unknown as typeof fetch;
		await handleWeather(new Request('https://app.example/api/weather?lat=40.712776&lon=-74.005974'), ok, fakeCache, (p) => pending.push(p));
		await Promise.all(pending);
		expect(keys).toEqual(['https://app.example/__weather?lat=40.71&lon=-74.01', 'https://app.example/__weather?lat=40.71&lon=-74.01']);
	});
});
