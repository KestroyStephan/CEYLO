/**
 * Destination recommender. Ranks the CEYLO destinations with the trained two-tower NCF model
 * (predicted engagement for travellers with the same mood), the eco score and the mood's
 * preferred categories, and explains each pick.
 */
const { cohortFor, predictEngagement } = require('./models');
const { destinations, resolvePlace, distanceKm, inSeason } = require('./places');

// Destination categories that suit each mood cohort
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
    all: [],
};

const COHORT_LABEL = {
    eco: 'Eco Explorer', adventurer: 'Adventurer', culture: 'Culture Seeker', spiritual: 'Spiritual',
    family: 'Family', relaxed: 'Relaxed', romantic: 'Romantic', wildlife: 'Wildlife', nightlife: 'Nightlife', all: 'All travellers',
};

const WEIGHTS = { model: 0.5, eco: 0.3, category: 0.2 };
const NEAR_KM = 60;

// Destinations staff have paused in the admin portal (AI Model Monitor guardrails)
let blocked = new Set();
function setBlocked(names) {
    blocked = new Set(names.map(n => String(n).trim().toLowerCase()));
}

/**
 * @param {{ mood?: string, days?: number, destination?: string, count?: number }} opts
 * @returns {{ vibe: string, cohort: string, top_matches: object[] }}
 */
function recommend({ mood, days, destination, count } = {}) {
    const n = count || Math.min(10, Math.max(5, parseInt(days, 10) || 5));
    const cohort = cohortFor(mood);
    const categories = MOOD_CATEGORIES[cohort.key] || [];

    let candidates = destinations.filter(d => inSeason(d.seasonal_availability) && !blocked.has(d.name.toLowerCase()));

    // Keep to the place the traveller asked for when it has enough destinations
    const place = resolvePlace(destination);
    let nearby = null;
    if (place) {
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

    const scored = candidates.map(d => {
        const engagement = predictEngagement(cohort.vector, d.destination_id);
        return { d, engagement, categoryMatch: categories.includes(d.category) ? 1 : 0 };
    }).filter(s => s.engagement !== null);

    // Model scores are relative, so scale them to 0-1 across the candidates
    const values = scored.map(s => s.engagement);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    for (const s of scored) {
        s.modelScore = hi > lo ? (s.engagement - lo) / (hi - lo) : 0.5;
        s.score = WEIGHTS.model * s.modelScore + WEIGHTS.eco * (s.d.eco_score / 100) + WEIGHTS.category * s.categoryMatch;
    }
    scored.sort((a, b) => b.score - a.score);

    return {
        vibe: COHORT_LABEL[cohort.key],
        cohort: cohort.key,
        top_matches: scored.slice(0, n).map(({ d, engagement, modelScore, categoryMatch, score }) => ({
            id: d.destination_id,
            name: d.name,
            category: d.category,
            province: d.province,
            lat: d.lat,
            lon: d.lon,
            rating: d.avg_rating,
            ecoScore: Math.round(d.eco_score),
            hiddenGem: d.hidden_gem,
            image: d.image,
            predictedEngagement: Math.round(engagement * 100) / 100,
            matchScore: Math.round(score * 100),
            reason: [
                `Model predicts ${engagement.toFixed(2)}/5 engagement for ${COHORT_LABEL[cohort.key]} travellers`,
                `eco score ${Math.round(d.eco_score)}`,
                categoryMatch ? `${d.category} suits this mood` : null,
            ].filter(Boolean).join('; '),
        })),
    };
}

module.exports = { recommend, setBlocked, MOOD_CATEGORIES, COHORT_LABEL };
