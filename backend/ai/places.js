/**
 * Destination and event datasets plus a gazetteer of towns and regions, used by the
 * recommender, the concierge and the destination insights.
 */
const fs = require('fs');
const path = require('path');

const loadData = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf-8'));

const destinations = loadData('destinations.json').map(d => ({
    ...d,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
    avg_rating: parseFloat(d.avg_rating),
    popularity_rank: parseInt(d.popularity_rank, 10),
    hidden_gem: d.hidden_gem === true || d.hidden_gem === 'True' || d.hidden_gem === 'true',
}));
const events = loadData('events.json');

// Towns and regions travellers mention, with the province the dataset files them under
const TOWNS = [
    ['Colombo', 6.9271, 79.8612, 'Western Province'], ['Negombo', 7.2083, 79.8358, 'Western Province'],
    ['Kandy', 7.2906, 80.6337, 'Central Province'], ['Nuwara Eliya', 6.9497, 80.7891, 'Central Province'],
    ['Horton Plains', 6.8020, 80.8060, 'Central Province'], ['Knuckles', 7.4500, 80.8000, 'Central Province'],
    ['Dambulla', 7.8742, 80.6511, 'Central Province'], ['Ella', 6.8667, 81.0466, 'Uva Province'],
    ['Badulla', 6.9934, 81.0550, 'Uva Province'], ['Haputale', 6.7656, 80.9510, 'Uva Province'],
    ['Kataragama', 6.4134, 81.3346, 'Uva Province'], ['Galle', 6.0535, 80.2210, 'Southern Province'],
    ['Mirissa', 5.9483, 80.4716, 'Southern Province'], ['Unawatuna', 6.0097, 80.2486, 'Southern Province'],
    ['Hikkaduwa', 6.1395, 80.1063, 'Southern Province'], ['Bentota', 6.4210, 80.0000, 'Southern Province'],
    ['Weligama', 5.9667, 80.4167, 'Southern Province'], ['Matara', 5.9549, 80.5550, 'Southern Province'],
    ['Tangalle', 6.0240, 80.7946, 'Southern Province'], ['Hambantota', 6.1241, 81.1185, 'Southern Province'],
    ['Yala', 6.3728, 81.5016, 'Southern Province'], ['Sigiriya', 7.9570, 80.7603, 'North Central Province'],
    ['Habarana', 8.0350, 80.7490, 'North Central Province'], ['Minneriya', 8.0360, 80.9000, 'North Central Province'],
    ['Anuradhapura', 8.3114, 80.4037, 'North Central Province'], ['Polonnaruwa', 7.9403, 81.0188, 'North Central Province'],
    ['Trincomalee', 8.5874, 81.2152, 'Eastern Province'], ['Pasikudah', 7.9290, 81.5610, 'Eastern Province'],
    ['Batticaloa', 7.7310, 81.6747, 'Eastern Province'], ['Arugam Bay', 6.8400, 81.8360, 'Eastern Province'],
    ['Jaffna', 9.6615, 80.0255, 'Northern Province'], ['Mannar', 8.9770, 79.9040, 'Northern Province'],
    ['Kalpitiya', 8.2333, 79.7667, 'North Western Province'], ['Kurunegala', 7.4863, 80.3647, 'North Western Province'],
    ['Wilpattu', 8.4560, 80.0130, 'North Western Province'], ['Ratnapura', 6.6828, 80.3992, 'Sabaragamuwa Province'],
    ['Sinharaja', 6.4000, 80.5000, 'Sabaragamuwa Province'], ['Udawalawe', 6.4740, 80.8880, 'Sabaragamuwa Province'],
    ['Kitulgala', 6.9890, 80.4170, 'Sabaragamuwa Province'], ["Adam's Peak", 6.8096, 80.4994, 'Sabaragamuwa Province'],
].map(([name, lat, lon, province]) => ({ name, lat, lon, province }));

const PROVINCES = [...new Set(destinations.map(d => d.province))];

const REGION_ALIASES = {
    'the south': 'Southern Province', 'south coast': 'Southern Province', 'southern': 'Southern Province',
    'hill country': 'Central Province', 'the hills': 'Central Province', 'central': 'Central Province',
    'east coast': 'Eastern Province', 'the east': 'Eastern Province', 'eastern': 'Eastern Province',
    'the north': 'Northern Province', 'northern': 'Northern Province',
    'cultural triangle': 'North Central Province', 'north central': 'North Central Province',
    'west coast': 'Western Province', 'western': 'Western Province',
    'north western': 'North Western Province', 'uva': 'Uva Province', 'sabaragamuwa': 'Sabaragamuwa Province',
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordMatch = (text, phrase) => new RegExp(`(^|[^a-z])${escape(phrase.toLowerCase())}([^a-z]|$)`).test(text);

/**
 * Find the place a message talks about.
 * @returns {{ name: string, kind: 'destination'|'town'|'province', lat?: number, lon?: number, province: string } | null}
 */
function findPlace(message) {
    const text = String(message || '').toLowerCase();
    // Longest names first so "Nuwara Eliya" wins over "Ella"-style partial matches
    const dest = [...destinations].sort((a, b) => b.name.length - a.name.length).find(d => wordMatch(text, d.name));
    if (dest) return { name: dest.name, kind: 'destination', lat: dest.lat, lon: dest.lon, province: dest.province };
    const town = [...TOWNS].sort((a, b) => b.name.length - a.name.length).find(t => wordMatch(text, t.name));
    if (town) return { ...town, kind: 'town' };
    const province = PROVINCES.find(p => wordMatch(text, p) || wordMatch(text, p.replace(' Province', ' province')));
    if (province) return { name: province, kind: 'province', province };
    const alias = Object.keys(REGION_ALIASES).sort((a, b) => b.length - a.length).find(a => wordMatch(text, a));
    if (alias) return { name: REGION_ALIASES[alias], kind: 'province', province: REGION_ALIASES[alias] };
    return null;
}

/** Resolve a stored destination string (from the app) back to a place. */
function resolvePlace(name) {
    if (!name) return null;
    return findPlace(name) || null;
}

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestTown(lat, lon) {
    return TOWNS.map(t => ({ ...t, km: distanceKm(lat, lon, t.lat, t.lon) })).sort((a, b) => a.km - b.km)[0];
}

// Seasonal availability values in the dataset: "Year-Round", "Nov-April", "May-Oct"
function inSeason(availability, month = new Date().getMonth()) {
    if (!availability || availability === 'Year-Round') return true;
    if (availability.startsWith('Nov')) return month >= 10 || month <= 3;
    if (availability.startsWith('May')) return month >= 4 && month <= 9;
    return true;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

module.exports = { destinations, events, TOWNS, findPlace, resolvePlace, distanceKm, nearestTown, inSeason, MONTHS };
