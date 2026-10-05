/**
 * Weather from Open-Meteo (free, no API key), cached for 30 minutes per ~10 km grid cell.
 * Used to down-rank outdoor destinations when rain is forecast and for the weather chips in the app.
 */
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
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const value = parse(await res.json());
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

module.exports = { getWeather, rainyShare, describe, isRainy, parse, _cache: cache };
