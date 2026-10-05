/**
 * Destination insights built from the CEYLO dataset and the trained eco score model
 * (replaces the text the app used to request from an external LLM).
 */
const { predictEcoScore, ecoFeatures, ecoImportances } = require('./models');
const { destinations, distanceKm, nearestTown } = require('./places');

const FEATURE_LABEL = {
    carbon_footprint_index: 'carbon footprint',
    wildlife_disturbance_risk: 'wildlife disturbance',
    plastic_pollution_risk: 'plastic pollution risk',
    community_benefit_score: 'community benefit',
    carrying_capacity_adherence: 'visitor carrying capacity',
};

const CATEGORY_TIPS = {
    'Heritage & Culture': {
        tips: ['Cover shoulders and knees', 'Remove shoes and hats at shrines', 'Never pose with your back to a Buddha statue', 'Hire a licensed guide at the entrance'],
        bestTime: 'Early morning, before the midday heat and tour groups',
    },
    Wildlife: {
        tips: ['Book a licensed jeep and guide', 'Keep your voice low and stay in the vehicle', 'Never feed animals', 'Bring binoculars and neutral-coloured clothing'],
        bestTime: 'Early morning (6:00 to 9:00) or late afternoon, when animals are most active',
    },
    Beach: {
        tips: ['Swim only where locals swim and watch for warning flags', 'Use reef-safe sunscreen', 'Do not touch or stand on coral', 'Take all litter with you'],
        bestTime: 'Morning or late afternoon; avoid the strongest sun from 11:00 to 15:00',
    },
    Waterfall: {
        tips: ['Rocks are slippery, so wear shoes with grip', 'Do not swim after heavy rain', 'Leeches are common in the wet season', 'Stay on the marked path'],
        bestTime: 'Morning, when paths are dry and the light is soft',
    },
    'Nature & Viewpoint': {
        tips: ['Start early for clear views before the mist', 'Carry water and a light rain jacket', 'Stay on marked trails', 'Bring a refillable bottle'],
        bestTime: 'Sunrise to mid-morning, before clouds roll in',
    },
};

const SEASON_TEXT = {
    'Year-Round': 'Open to visit all year',
    'Nov-April': 'Best from November to April',
    'May-Oct': 'Best from May to October',
};

function findDestination({ id, name }) {
    if (id) {
        const byId = destinations.find(d => d.destination_id === id);
        if (byId) return byId;
    }
    const n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    return destinations.find(d => d.name.toLowerCase() === n) ||
        destinations.find(d => d.name.toLowerCase().includes(n) || n.includes(d.name.toLowerCase())) || null;
}

/** Sustainability breakdown: each feature with how strongly the eco model weighs it. */
function ecoBreakdown(d) {
    const score = predictEcoScore(d);
    if (score === null) return null;
    const factors = ecoFeatures.map((f, i) => ({
        feature: f,
        label: FEATURE_LABEL[f],
        value: f === 'carrying_capacity_adherence'
            ? (d[f] === true || d[f] === 'True' ? 'Respected' : 'Often exceeded')
            : Number(d[f]),
        importance: ecoImportances[i],
    })).sort((a, b) => b.importance - a.importance);
    return { predictedScore: Math.round(score * 10) / 10, factors };
}

function insightsFor({ id, name, lat, lon, category, province }) {
    const d = findDestination({ id, name });
    const cat = d?.category || category;
    const prov = d?.province || province;
    const pLat = d?.lat ?? (lat != null ? Number(lat) : null);
    const pLon = d?.lon ?? (lon != null ? Number(lon) : null);
    const tips = CATEGORY_TIPS[cat] || CATEGORY_TIPS['Nature & Viewpoint'];
    const eco = d ? ecoBreakdown(d) : null;

    const sentences = [];
    if (d) {
        sentences.push(Number(d.avg_rating)
            ? `${d.name} is a ${d.category.toLowerCase()} destination in ${d.province}, rated ${d.avg_rating}/5 on Google.`
            : `${d.name} is a ${d.category.toLowerCase()} destination in ${d.province}.`);
        if (d.hidden_gem) sentences.push('It is one of CEYLO\'s hidden gems, away from the busiest tourist routes.');
        if (eco) {
            const strongest = eco.factors[0];
            sentences.push(`Our eco model scores it ${Math.round(eco.predictedScore)}/100; ${strongest.label} weighs most in that score.`);
        }
    } else {
        sentences.push(`${name || 'This place'}${prov ? ` in ${prov}` : ''} is not in the CEYLO destination dataset yet, so we only have general guidance for it.`);
    }

    let hub = null;
    if (Number.isFinite(pLat) && Number.isFinite(pLon)) {
        const town = nearestTown(pLat, pLon);
        // Roads in Sri Lanka average about 35 km/h door to door
        hub = `${Math.round(town.km)} km from ${town.name} • about ${Math.max(5, Math.round((town.km / 35) * 60))} mins`;
    }

    const nearby = Number.isFinite(pLat) && Number.isFinite(pLon)
        ? destinations
            .filter(x => !d || x.destination_id !== d.destination_id)
            .map(x => ({ x, km: distanceKm(pLat, pLon, x.lat, x.lon) }))
            .sort((a, b) => a.km - b.km)
            .slice(0, 3)
            .map(({ x, km }) => ({ id: x.destination_id, name: x.name, image: x.image, category: x.category, km: Math.round(km), ecoScore: Math.round(x.eco_score) }))
        : [];

    const ecoLines = eco
        ? eco.factors.map(f => `• ${f.label[0].toUpperCase()}${f.label.slice(1)}: ${typeof f.value === 'number' ? `${f.value}/100` : f.value} (model weight ${Math.round(f.importance * 100)}%)`)
        : [];

    return {
        found: Boolean(d),
        ai_insight: sentences.join(' '),
        sustainability: eco
            ? `Eco score ${Math.round(eco.predictedScore)}/100 from the CEYLO random forest model.\n${ecoLines.join('\n')}\nLower carbon, disturbance and plastic values are better; higher community benefit is better.`
            : 'No sustainability data for this place yet.',
        practical_info: tips.tips.map(t => `• ${t}`).join('\n'),
        best_time: `${tips.bestTime}. ${SEASON_TEXT[d?.seasonal_availability] || SEASON_TEXT['Year-Round']}.`,
        season: d?.seasonal_availability || null,
        distance_from_hub: hub,
        explore_nearby: nearby,
        eco,
    };
}

module.exports = { insightsFor };
