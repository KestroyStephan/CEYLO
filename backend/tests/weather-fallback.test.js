const weather = require('../ai/weather');

const met = {
    properties: {
        timeseries: [
            { time: '2026-10-05T06:00:00Z', data: { instant: { details: { air_temperature: 29, wind_speed: 4 } }, next_1_hours: { summary: { symbol_code: 'rain' }, details: { precipitation_amount: 2 } }, next_6_hours: { summary: { symbol_code: 'rain' }, details: { precipitation_amount: 6 } } } },
            { time: '2026-10-06T06:00:00Z', data: { instant: { details: { air_temperature: 31, wind_speed: 2 } }, next_6_hours: { summary: { symbol_code: 'fair_day' }, details: { precipitation_amount: 0 } } } },
        ],
    },
};

beforeEach(() => {
    weather._cache.clear();
    global.fetch = jest.fn();
});

describe('weather fallback', () => {
    it('maps MET Norway symbols to weather codes', () => {
        expect(weather.metCode('heavyrain')).toBe(65);
        expect(weather.metCode('rainshowers_day')).toBe(80);
        expect(weather.metCode('fair_night')).toBe(1);
        expect(weather.metCode('lightrainandthunder')).toBe(95);
    });

    it('uses MET Norway when Open-Meteo refuses the request', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => met });
        const w = await weather.getWeather(6.93, 79.85);
        expect(w.source).toBe('met.no');
        expect(w.current.label).toBe('Rain');
        expect(w.daily).toHaveLength(2);
        expect(w.daily[0].rainy).toBe(true);
        expect(w.daily[1].rainy).toBe(false);
        expect(global.fetch.mock.calls[1][0]).toContain('api.met.no');
        expect(global.fetch.mock.calls[1][1].headers['User-Agent']).toMatch(/CEYLO/);
    });

    it('returns null when both services fail and nothing is cached', async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
        expect(await weather.getWeather(7.29, 80.63)).toBeNull();
    });
});
