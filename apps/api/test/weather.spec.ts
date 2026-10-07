import { describe, expect, it } from 'vitest';
import { handleWeather, spot } from '../src/weather';

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
			hourlyRain: [{ hour: 6, chance: 5 }, { hour: 15, chance: 40 }],
		});
	});

	it('refuses a missing or impossible location', () => {
		expect(spot(new URL('https://x/?lat=40'))).toBeNull();
		expect(spot(new URL('https://x/?lat=91&lon=0'))).toBeNull();
		expect(spot(new URL('https://x/?lat=abc&lon=0'))).toBeNull();
	});

	it('says weather is unavailable when Open-Meteo fails', async () => {
		const down = (async () => new Response('nope', { status: 503 })) as unknown as typeof fetch;
		const res = await handleWeather(new Request('https://x/api/weather?lat=1&lon=1'), down);
		expect(res.status).toBe(502);
	});
});
