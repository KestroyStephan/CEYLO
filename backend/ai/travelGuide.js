/**
 * Travel assistant answers for the concierge: where to stay, where and what to eat, what things
 * cost, and how to get between places. Prices are typical 2026 ranges in Sri Lankan rupees (LKR)
 * and are given as guidance, not quotes. Live hotels and restaurants come from Google Places in the
 * app: answers here return a `places` request the app fills in with real, rated nearby results.
 */
const { findPlace, distanceKm } = require('./places');

const fmt = (n) => `LKR ${Math.round(n).toLocaleString('en-US')}`;

// Where to base yourself and what the area is known for eating
const AREAS = {
    colombo: { stay: 'Colombo 3 (Kollupitiya) or Colombo 7 for central hotels, Mount Lavinia for the beach', eat: 'kottu roti on Galle Road, seafood at Ministry of Crab, lamprais and hoppers in Pettah' },
    negombo: { stay: 'Lewis Place and Porutota Road along the beach, 20 minutes from the airport', eat: 'fresh lagoon prawns and crab, the morning fish market' },
    kandy: { stay: 'around Kandy Lake for walks to the Temple of the Tooth, or the quieter hills above the town', eat: 'rice and curry buffets, kiri bath, sweets from the old town bakeries' },
    'nuwara eliya': { stay: 'near Gregory Lake or a colonial bungalow on a tea estate', eat: 'fresh vegetables and strawberries, high tea at the Grand Hotel' },
    ella: { stay: 'Ella town for cafés and walks, or Ella Gap / Passara Road for valley views', eat: 'roti and curry in Ella town, hoppers, Sri Lankan coffee with a view' },
    galle: { stay: 'inside Galle Fort for heritage villas, or Unawatuna for the beach', eat: 'fish ambul thiyal (sour fish curry), cafés inside the Fort' },
    mirissa: { stay: 'the main beach strip, or Secret Beach side for quiet', eat: 'beach seafood barbecues at night, fresh king coconut' },
    unawatuna: { stay: 'beach-front guest houses on Unawatuna Bay', eat: 'seafood on the bay, devilled prawns' },
    hikkaduwa: { stay: 'Narigama and Hikkaduwa beach road', eat: 'grilled fish, Sri Lankan breakfast with string hoppers' },
    bentota: { stay: 'river-side resorts on the Bentota river or the beach', eat: 'seafood and river prawns' },
    sigiriya: { stay: 'eco lodges around Sigiriya village, or Habarana for safaris', eat: 'village rice and curry cooked on firewood' },
    dambulla: { stay: 'near the Cave Temple or between Dambulla and Sigiriya', eat: 'the Dambulla vegetable market and local curd and treacle' },
    anuradhapura: { stay: 'near the sacred city or Tissa Wewa lake', eat: 'vegetarian rice and curry near the temples' },
    polonnaruwa: { stay: 'beside Parakrama Samudra lake', eat: 'freshwater fish curry, village meals' },
    trincomalee: { stay: 'Uppuveli or Nilaveli beach', eat: 'Tamil-style crab and fish curries' },
    'arugam bay': { stay: 'the main bay road near the surf point', eat: 'surf cafés, fresh tuna and rotti' },
    jaffna: { stay: 'Jaffna town near the Fort or Nallur Kovil', eat: 'Jaffna crab curry, odiyal kool, thosai and vadai' },
    yala: { stay: 'Tissamaharama or Kirinda for early safaris', eat: 'curd and treacle, lake fish curry' },
    udawalawe: { stay: 'lodges near the park entrance', eat: 'village rice and curry' },
    haputale: { stay: 'tea-estate bungalows on the ridge', eat: 'plantation-style meals and Ceylon tea' },
    kitulgala: { stay: 'river-side camps for rafting', eat: 'kithul treacle desserts' },
    trinco: { stay: 'Uppuveli or Nilaveli beach', eat: 'Tamil-style crab and fish curries' },
};

const STAY_PRICE = {
    Economy: [4000, 10000, 'guest houses and homestays'],
    Standard: [12000, 30000, 'boutique hotels and 3-star stays'],
    Luxury: [45000, 120000, 'resorts and 5-star hotels'],
};

const COSTS = [
    ['Rice and curry at a local restaurant', '600 – 1,200'],
    ['Kottu or hoppers', '400 – 900'],
    ['Meal in a tourist café', '1,800 – 4,000'],
    ['Tuk-tuk (metered)', 'about 100 – 150 per km'],
    ['Intercity bus', '150 – 1,200 per trip'],
    ['Train Colombo – Kandy', '200 (3rd class) – 2,500 (reserved observation)'],
    ['Private car with driver', '12,000 – 18,000 per day'],
    ['Sigiriya Rock entry (foreign adult)', 'about USD 36'],
    ['Temple of the Tooth entry', 'about 2,000'],
    ['Yala or Udawalawe safari jeep (half day)', '12,000 – 18,000 plus park tickets'],
    ['Litre of bottled water', '120 – 200'],
];

const DAILY = { Economy: [9000, 15000], Standard: [25000, 45000], Luxury: [70000, 150000] };

const TOPICS = {
    stay: /\b(hotel|hotels|stay|staying|accommodation|accomodation|guest ?house|hostel|resort|villa|homestay|lodge|lodging|airbnb|room|rooms|sleep|bungalow)\b/,
    eat: /\b(eat|eating|food|restaurant|restaurants|cafe|café|dinner|lunch|breakfast|dish|dishes|cuisine|street food|vegetarian|vegan|seafood)\b/,
    price: /\b(price|prices|cost|costs|how much|expensive|cheap|budget for|fee|fees|ticket|tickets|fare|fares|money do i need|spend)\b/,
    route: /\b(how (do|can) i get|how to (get|go|reach|travel)|route|routes|directions|way to|distance|how far|how long (does it take|to)|travel from|from .+ to )\b/,
};

function areaFor(name) {
    if (!name) return null;
    const key = name.toLowerCase();
    return AREAS[key] || AREAS[Object.keys(AREAS).find(k => key.includes(k) || k.includes(key))] || null;
}

// "from Kandy to Ella", "Colombo to Galle", "how do I get to Sigiriya"
function routeEnds(text) {
    const m = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\?|$|\s+by\s|\s+and\s)/) || text.match(/^(?:.*?\b)?([a-z' ]+?)\s+to\s+([a-z' ]+?)(?:\?|$)/);
    if (m) {
        const a = findPlace(m[1]); const b = findPlace(m[2]);
        if (a?.lat && b?.lat && a.name !== b.name) return { from: a, to: b };
    }
    const to = text.match(/\b(?:get|go|reach|travel|way|route|directions)\s+to\s+(.+?)(?:\?|$|\s+from\s)/);
    if (to) {
        const b = findPlace(to[1]);
        if (b?.lat) {
            const f = text.match(/from\s+(.+?)(?:\?|$)/);
            const a = f ? findPlace(f[1]) : null;
            return { from: a && a.name !== b.name ? a : null, to: b };
        }
    }
    return null;
}

function routeAnswer(ends) {
    const { from, to } = ends;
    const out = { action: 'route', route: { to: { name: to.name, lat: to.lat, lon: to.lon }, from: from ? { name: from.name, lat: from.lat, lon: from.lon } : null } };
    if (!from) {
        return { text: `I'll find the shortest road route to ${to.name} from where you are now, with alternatives and live traffic.`, ...out };
    }
    // Hill roads wind a lot, so this is only a first estimate; the app shows Google's exact route
    const straight = distanceKm(from.lat, from.lon, to.lat, to.lon);
    const hills = [from, to].filter(p => /Central|Uva|Sabaragamuwa/.test(p.province || '')).length;
    const road = Math.round(straight * [1.2, 1.25, 1.9][hills]);
    const car = road / [50, 38, 32][hills]; // expressways on the coast, slow winding roads in the hills
    const hrs = (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min`);
    const lines = [
        `${from.name} to ${to.name}: roughly ${road} km by road.`,
        `• Car or taxi: around ${hrs(car)}, about ${fmt(road * 110)} – ${fmt(road * 150)} for a private car`,
        `• Bus: around ${hrs(car * 1.4)}, usually under LKR 1,200`,
    ];
    const rail = [['colombo', 'kandy'], ['kandy', 'ella'], ['kandy', 'nuwara eliya'], ['colombo', 'galle'], ['colombo', 'ella'], ['colombo', 'jaffna'], ['colombo', 'trincomalee'], ['galle', 'matara'], ['colombo', 'anuradhapura']];
    const pair = [from.name.toLowerCase(), to.name.toLowerCase()];
    if (rail.some(([a, b]) => (pair.includes(a) && pair.includes(b)))) {
        lines.push(`• Train: a good option on this line${pair.includes('ella') ? ' and one of the most scenic rides in the world' : ''}; book reserved seats early`);
    }
    lines.push('Checking the exact shortest road route with live traffic now…');
    return { text: lines.join('\n'), ...out };
}

function stayAnswer(place, budget) {
    const name = place?.name;
    const area = areaFor(name);
    const lines = [];
    lines.push(name ? `Where to stay in ${name}: ${area ? area.stay : 'pick somewhere close to the places you want to visit to save travel time'}.` : 'Here is what stays cost in Sri Lanka:');
    const order = budget && STAY_PRICE[budget] ? [budget] : ['Economy', 'Standard', 'Luxury'];
    for (const b of order) {
        const [lo, hi, kind] = STAY_PRICE[b];
        lines.push(`• ${b}: ${fmt(lo)} – ${fmt(hi)} a night (${kind})`);
    }
    lines.push('Prices rise 20–40% in December–April on the south and west coasts and in August in Kandy (Perahera).');
    lines.push(place?.lat ? 'Here are the best-rated places to stay nearby:' : 'Tell me the town and I will show the best-rated places to stay there.');
    return lines.join('\n');
}

function eatAnswer(place) {
    const name = place?.name;
    const area = areaFor(name);
    const lines = [];
    if (name) lines.push(`Eating in ${name}: try ${area ? area.eat : 'the local rice and curry, hoppers and kottu'}.`);
    else lines.push('Must-try Sri Lankan food: rice and curry, hoppers (appa), string hoppers, kottu roti, lamprais, fish ambul thiyal, pol sambol and curd with kithul treacle.');
    lines.push('A local meal costs about LKR 600 – 1,200; tourist cafés LKR 1,800 – 4,000. Ask for "less spicy" (sir kara adu karanna) if needed.');
    lines.push(place?.lat ? 'Here are well-rated restaurants nearby:' : 'Tell me the town and I will show well-rated restaurants there.');
    return lines.join('\n');
}

function priceAnswer(place, budget) {
    const lines = ['Typical costs in Sri Lanka (LKR):'];
    COSTS.forEach(([what, cost]) => lines.push(`• ${what}: ${cost}`));
    const b = budget && DAILY[budget] ? budget : null;
    const days = Object.entries(DAILY).filter(([k]) => !b || k === b)
        .map(([k, [lo, hi]]) => `${k} ${fmt(lo)} – ${fmt(hi)}`).join(', ');
    lines.push(`Daily budget per person, with stay, food and transport: ${days}.`);
    if (place) lines.push(`Ask me "where to stay in ${place.name}" or "best food in ${place.name}" for more.`);
    return lines.join('\n');
}

/**
 * Answers a travel question, or returns null when the message is not one of these topics.
 * @param {string} text - lower-cased message
 * @param {object} state - trip profile (destination, budget, ...)
 */
function travelAnswer(text, state = {}) {
    let topic = Object.keys(TOPICS).find(k => TOPICS[k].test(text));
    // "Kandy to Ella" on its own is a route question too
    if (!topic && /^[a-z' ]+\s+to\s+[a-z' ]+\??$/.test(text.trim()) && routeEnds(text.trim())?.from) topic = 'route';
    if (!topic) return null;
    const place = findPlace(text) || (state.destination ? findPlace(state.destination.toLowerCase()) : null);
    const budget = state.budget || null;
    const near = place?.lat ? { name: place.name, lat: place.lat, lon: place.lon } : null;

    if (topic === 'route') {
        const ends = routeEnds(text);
        if (ends) return { ...routeAnswer(ends), topic, options: ['Book a ride', 'Where to stay', 'Create my plan'] };
        if (!/from|to\b/.test(text)) return null;
        return { text: 'Which places? For example "Kandy to Ella" or "how do I get to Sigiriya".', topic, options: ['Colombo to Kandy', 'Kandy to Ella', 'Galle to Mirissa'] };
    }
    if (topic === 'stay') {
        return { text: stayAnswer(place, budget), topic, places: near ? { type: 'lodging', near } : null, options: ['Best food nearby', 'What does it cost?', 'Create my plan'] };
    }
    if (topic === 'eat') {
        return { text: eatAnswer(place), topic, places: near ? { type: 'restaurant', near } : null, options: ['Where to stay', 'What does it cost?', 'Create my plan'] };
    }
    return { text: priceAnswer(place, budget), topic, options: ['Where to stay', 'Best food nearby', 'Create my plan'] };
}

module.exports = { travelAnswer, routeEnds, TOPICS };
