/**
 * Weather from Open-Meteo (free, no API key), cached for 30 minutes per ~10 km grid cell.
 * Used to down-rank outdoor destinations when rain is forecast and for the weather chips in the app.
 * Open-Meteo limits requests per IP, and cloud hosts share IPs, so MET Norway's free
 * Locationforecast API (no key, needs a User-Agent) is used when Open-Meteo refuses.
 */
const USER_AGENT = 'CEYLO/1.0 (https://github.com/KestroyStephan/CEYLO)';
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map();

// WMO weather codes -> label and icon name (MaterialCommunityIcons)
function describe(code) {
    if (code === 0) return { label: 'Clear', icon: 'weather-sunny' };
    if (code <= 2) return { label: 'Partly cloudy', icon: 'weather-partly-cloudy' };
    if (code === 3) return { label: 'Cloudy', icon: 'weather-cloudy' };
    if (code === 45 || code === 48) return { label: 'Fog', icon: 'weather-fog' };
    if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'weather-rainy' };
    if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'weather-pouring' };
    if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'weather-snowy' };
    if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'weather-rainy' };
    if (code >= 95) return { label: 'Thunderstorm', icon: 'weather-lightning-rainy' };
    return { label: 'Unknown', icon: 'weather-cloudy' };
}

// Rain likely enough to change plans for outdoor sights
const isRainy = (code, rainProbability) => code >= 51 || (rainProbability ?? 0) >= 60;

function parse(data) {
    const c = data.current || {};
    const d = data.daily || {};
    return {
        current: {
            temperatureC: c.temperature_2m,
            precipitationMm: c.precipitation,
            windKmh: c.wind_speed_10m,
            code: c.weather_code,
            ...describe(c.weather_code),
            rainy: isRainy(c.weather_code, 0),
        },
        daily: (d.time || []).map((date, i) => ({
            date,
            code: d.weather_code[i],
            ...describe(d.weather_code[i]),
            maxC: d.temperature_2m_max[i],
            minC: d.temperature_2m_min[i],
            rainProbability: d.precipitation_probability_max[i],
            rainy: isRainy(d.weather_code[i], d.precipitation_probability_max[i]),
        })),
    };
}

/**
 * @returns {Promise<{current: object, daily: object[], cached: boolean} | null>} null when unavailable
 */
async function getWeather(lat, lon, { timeoutMs = 4000 } = {}) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit.value, cached: true };

    const url = 'https://api.open-meteo.com/v1/forecast' +
        `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
        '&current=temperature_2m,precipitation,weather_code,wind_speed_10m' +
        '&daily=weather_code,precipitation_probability_max,temperature_2m_max,temperature_2m_min' +
        '&timezone=Asia%2FColombo&forecast_days=7';
    try {
        let value;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
            if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
            value = { ...parse(await res.json()), source: 'open-meteo' };
        } catch (first) {
            console.warn('Open-Meteo unavailable, trying MET Norway:', first.message);
            value = await fetchMet(lat, lon, timeoutMs);
        }
        cache.set(key, { at: Date.now(), value });
        return { ...value, cached: false };
    } catch (e) {
        console.warn('Weather unavailable:', e.message);
        // A stale forecast is better than none
        return hit ? { ...hit.value, cached: true, stale: true } : null;
    }
}

/** Share (0-1) of the first `days` forecast days with rain likely. */
function rainyShare(weather, days) {
    if (!weather?.daily?.length) return 0;
    const span = weather.daily.slice(0, Math.max(1, Math.min(7, days || 1)));
    return span.filter(d => d.rainy).length / span.length;
}

// MET Norway symbol codes -> WMO weather codes, so both sources share describe() and isRainy()
function metCode(symbol = '') {
    const s = symbol.replace(/_(day|night|polartwilight)$/, '');
    if (s.includes('thunder')) return 95;
    if (s.includes('snow')) return 71;
    if (s.includes('sleet')) return 67;
    if (s.includes('showers')) return 80;
    if (s === 'lightrain') return 61;
    if (s === 'rain') return 63;
    if (s === 'heavyrain') return 65;
    if (s === 'fog') return 45;
    if (s === 'cloudy') return 3;
    if (s === 'partlycloudy') return 2;
    if (s === 'fair') return 1;
    return 0;
}

/** Converts a MET Norway compact forecast to the same shape as parse(). */
function parseMet(data) {
    const series = data?.properties?.timeseries || [];
    if (!series.length) throw new Error('empty MET forecast');
    const now = series[0].data;
    const nowCode = metCode(now.next_1_hours?.summary?.symbol_code || now.next_6_hours?.summary?.symbol_code);
    // Group the hourly / 6-hourly steps into Sri Lanka calendar days (UTC+5:30)
    const days = new Map();
    for (const step of series) {
        const local = new Date(Date.parse(step.time) + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
        const t = step.data.instant.details.air_temperature;
        const next = step.data.next_6_hours || step.data.next_1_hours;
        const day = days.get(local) || { temps: [], rain: 0, codes: [] };
        day.temps.push(t);
        if (next) {
            day.rain = Math.max(day.rain, next.details?.precipitation_amount ?? 0);
            day.codes.push(metCode(next.summary?.symbol_code));
        }
        days.set(local, day);
    }
    const daily = [...days.entries()].slice(0, 7).map(([date, d]) => {
        const code = d.codes.length ? Math.max(...d.codes) : 0;
        // MET's compact forecast has no rain probability; estimate it from the expected amount
        const rainProbability = Math.min(100, Math.round(d.rain * 40));
        return {
            date, code, ...describe(code),
            maxC: Math.max(...d.temps), minC: Math.min(...d.temps),
            rainProbability, rainy: isRainy(code, rainProbability),
        };
    });
    return {
        current: {
            temperatureC: now.instant.details.air_temperature,
            precipitationMm: now.next_1_hours?.details?.precipitation_amount ?? null,
            windKmh: Math.round((now.instant.details.wind_speed || 0) * 3.6 * 10) / 10,
            code: nowCode, ...describe(nowCode), rainy: isRainy(nowCode, 0),
        },
        daily,
        source: 'met.no',
    };
}

async function fetchMet(lat, lon, timeoutMs) {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`MET HTTP ${res.status}`);
    return parseMet(await res.json());
}

module.exports = { getWeather, rainyShare, describe, isRainy, parse, parseMet, metCode, _cache: cache };
