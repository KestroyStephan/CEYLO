/**
 * Destination recommender. Ranks the CEYLO destinations with the trained content-based model
 * (traveller profile + destination features + month), then applies context: the mood's
 * preferred categories, eco score, rain forecast, crowd levels and the recommendation strategy
 * being tested for RQ3. Every pick carries a plain-language reason.
 */
const contentModel = require('../models/content_recommender.json');
const { profileFromApp, scoreDestinations, moodKeyOf, inSeasonMonth } = require('./recommenderModel');
const { destinations, resolvePlace, distanceKm } = require('./places');
const { rainyShare } = require('./weather');

// Destination categories that suit each mood
const MOOD_CATEGORIES = {
    eco: ['Nature & Viewpoint', 'Waterfall', 'Wildlife'],
    adventurer: ['Nature & Viewpoint', 'Waterfall', 'Wildlife'],
    culture: ['Heritage & Culture'],
    spiritual: ['Heritage & Culture'],
    family: ['Beach', 'Wildlife', 'Nature & Viewpoint'],
    relaxed: ['Beach', 'Nature & Viewpoint'],
    romantic: ['Beach', 'Nature & Viewpoint', 'Waterfall'],
    wildlife: ['Wildlife'],
    nightlife: ['Beach', 'Heritage & Culture'],
};

const MOOD_LABEL = {
    eco: 'Eco Explorer', adventurer: 'Adventurer', culture: 'Culture Seeker', spiritual: 'Spiritual',
    family: 'Family', relaxed: 'Relaxed', romantic: 'Romantic', wildlife: 'Wildlife', nightlife: 'Nightlife',
};

// Weights per strategy (RQ3 compares mood-based, location-based and seasonal recommendations)
const STRATEGIES = {
    balanced: { model: 0.5, category: 0.2, eco: 0.3, near: 0, season: 0 },
    mood: { model: 0.45, category: 0.35, eco: 0.2, near: 0, season: 0 },
    location: { model: 0.4, category: 0.1, eco: 0.15, near: 0.35, season: 0 },
    seasonal: { model: 0.4, category: 0.1, eco: 0.15, near: 0, season: 0.35 },
};

const OUTDOOR = ['Beach', 'Waterfall', 'Nature & Viewpoint'];
const NEAR_KM = 60;

// Destinations staff have paused in the admin portal (AI Model Monitor guardrails)
let blocked = new Set();
function setBlocked(names) {
    blocked = new Set(names.map(n => String(n).trim().toLowerCase()));
}

const pct = (x) => Math.round(x * 100);

/**
 * @param {object} opts
 * @param {string} [opts.mood] @param {number} [opts.days] @param {string} [opts.destination]
 * @param {string} [opts.budget] @param {number} [opts.ecoInterest] @param {number} [opts.month] 1-12
 * @param {'balanced'|'mood'|'location'|'seasonal'} [opts.strategy]
 * @param {{lat: number, lon: number}} [opts.origin] traveller's position (location strategy)
 * @param {object} [opts.weather] from weather.getWeather() for the trip area
 * @param {boolean} [opts.avoidCrowds]
 * @param {number} [opts.count]
 */
function recommend(opts = {}) {
    const { mood, days, destination, budget, ecoInterest, origin, weather, avoidCrowds } = opts;
    const n = opts.count || Math.min(10, Math.max(5, parseInt(days, 10) || 5));
    const month = Math.min(12, Math.max(1, parseInt(opts.month, 10) || new Date().getMonth() + 1));
    const strategy = STRATEGIES[opts.strategy] ? opts.strategy : 'balanced';
    const w = STRATEGIES[strategy];
    const moodKey = moodKeyOf(mood);
    const categories = MOOD_CATEGORIES[moodKey] || [];

    let candidates = destinations.filter(d =>
        inSeasonMonth(d.seasonal_availability, month) && !blocked.has(d.name.toLowerCase()));

    // Keep to the place the traveller asked for when it has enough destinations
    const place = resolvePlace(destination);
    if (place) {
        let nearby;
        if (place.kind === 'province') {
            nearby = candidates.filter(d => d.province === place.province);
        } else {
            const sameProvince = candidates.filter(d => d.province === place.province);
            const close = sameProvince.filter(d => distanceKm(place.lat, place.lon, d.lat, d.lon) <= NEAR_KM);
            nearby = close.length >= n ? close : sameProvince;
            if (nearby.length < 3) nearby = candidates.filter(d => distanceKm(place.lat, place.lon, d.lat, d.lon) <= NEAR_KM);
        }
        if (nearby.length >= Math.min(n, 3)) candidates = nearby;
    }

    const profile = profileFromApp({ mood, budget, days, ecoInterest });
    const raw = scoreDestinations(contentModel, profile, candidates, month);
    const lo = Math.min(...raw);
    const hi = Math.max(...raw);
    const rain = rainyShare(weather, days);
    const anchor = place?.lat != null ? place : (origin && Number.isFinite(origin.lat) ? origin : null);

    const scored = candidates.map((d, i) => {
        const model = hi > lo ? (raw[i] - lo) / (hi - lo) : 0.5;
        const categoryMatch = categories.includes(d.category) ? 1 : 0;
        const eco = d.eco_score / 100;
        const crowd = d.crowd_by_month ? d.crowd_by_month[month - 1] : 0;
        const km = anchor ? distanceKm(anchor.lat, anchor.lon, d.lat, d.lon) : null;
        const near = km == null ? 0 : 1 - Math.min(km, 200) / 200;
        const season = 1 - crowd;

        let score = w.model * model + w.category * categoryMatch + w.eco * eco + w.near * near + w.season * season;
        const notes = [];
        // Rain forecast: outdoor sights drop, heritage sites (mostly sheltered) rise
        if (rain > 0 && OUTDOOR.includes(d.category)) {
            score -= 0.2 * rain;
            notes.push(`rain forecast on ${pct(rain)}% of days`);
        } else if (rain > 0 && d.category === 'Heritage & Culture') {
            score += 0.1 * rain;
            notes.push('good choice for rainy days');
        }
        if (avoidCrowds) {
            score -= 0.15 * crowd;
            if (crowd < 0.3) notes.push('usually quiet this month');
        }
        return { d, raw: raw[i], model, categoryMatch, crowd, km, score, notes };
    });
    scored.sort((a, b) => b.score - a.score);

    return {
        vibe: MOOD_LABEL[moodKey] || 'All travellers',
        strategy,
        month,
        modelVersion: contentModel.version,
        weather: weather ? { rainyShare: rain, today: weather.daily?.[0] || null } : null,
        top_matches: scored.slice(0, n).map(({ d, raw: p, categoryMatch, crowd, km, score, notes }) => ({
            id: d.destination_id,
            name: d.name,
            category: d.category,
            province: d.province,
            lat: d.lat,
            lon: d.lon,
            rating: d.avg_rating,
            ecoScore: Math.round(d.eco_score),
            ecoModelScore: d.eco_model_score,
            hiddenGem: d.hidden_gem,
            image: d.image,
            crowdIndex: crowd,
            predictedEngagement: Math.round(p * 1000) / 1000,
            matchScore: Math.round(score * 100),
            reason: [
                `Model predicts ${pct(p)}% engagement for this traveller in ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]}`,
                `eco score ${Math.round(d.eco_score)}`,
                categoryMatch ? `${d.category} suits this mood` : null,
                km != null && strategy === 'location' ? `${Math.round(km)} km away` : null,
                ...notes,
            ].filter(Boolean).join('; '),
        })),
    };
}

module.exports = { recommend, setBlocked, MOOD_CATEGORIES, STRATEGIES };
