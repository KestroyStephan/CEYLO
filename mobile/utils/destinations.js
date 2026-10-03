/**
 * destinations.js
 * Lookups against the bundled CEYLO destination dataset, so screens show real eco scores
 * instead of fixed or random numbers.
 */
import destinationsData from '../assets/data/ai_destinations.json';

/** Eco score of a dataset destination whose name matches, or null when the place is not in the dataset. */
export function ecoScoreFor(name) {
  const n = String(name || '').trim().toLowerCase();
  if (n.length < 3) return null;
  const match = destinationsData.find(d => {
    const dn = d.name.toLowerCase();
    return n.includes(dn) || dn.includes(n);
  });
  return match ? Math.round(match.eco_score) : null;
}

/** Average eco score of the best destinations in a province (what a curated route through it visits). */
export function provinceEcoScore(province, top = 5) {
  const scores = destinationsData
    .filter(d => d.province === province)
    .map(d => d.eco_score)
    .sort((a, b) => b - a)
    .slice(0, top);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Curated low-carbon routes; each covers one province so its itinerary is built from real stops
const ROUTES = [
  {
    id: 'route_1',
    province: 'Central Province',
    title: 'Central Eco-Trail',
    subtitle: 'Knuckles & Horton Plains',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Knuckles_mountain_range_Sri_Lanka.jpg/800px-Knuckles_mountain_range_Sri_Lanka.jpg',
    duration: '3 Days',
    cost: 'LKR 15k',
    type: 'Nature',
  },
  {
    id: 'route_2',
    province: 'Southern Province',
    title: 'Southern Heritage',
    subtitle: 'Galle Fort & Marine Life',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Galle_Fort_Lighthouse_Sri_Lanka.jpg/800px-Galle_Fort_Lighthouse_Sri_Lanka.jpg',
    duration: '2 Days',
    cost: 'LKR 12k',
    type: 'Culture',
  },
  {
    id: 'route_3',
    province: 'Northern Province',
    title: 'Northern Peninsula',
    subtitle: 'Jaffna & Delft Island',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Nallur_Kandaswamy_Temple_Jaffna.jpg/800px-Nallur_Kandaswamy_Temple_Jaffna.jpg',
    duration: '4 Days',
    cost: 'LKR 20k',
    type: 'Untouched',
  },
  {
    id: 'route_4',
    province: 'Eastern Province',
    title: 'Eastern Safari',
    subtitle: 'Arugam Bay & Kumana',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Elephant_at_Yala_National_Park_Sri_Lanka.jpg/800px-Elephant_at_Yala_National_Park_Sri_Lanka.jpg',
    duration: '3 Days',
    cost: 'LKR 18k',
    type: 'Wildlife',
  },
  {
    id: 'route_5',
    province: 'North Central Province',
    title: 'Cultural Triangle',
    subtitle: 'Sigiriya to Polonnaruwa',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Sigiriya_rock_fortress.jpg/800px-Sigiriya_rock_fortress.jpg',
    duration: '3 Days',
    cost: 'LKR 25k',
    type: 'Heritage',
  },
  {
    id: 'route_6',
    province: 'Uva Province',
    title: 'Tea Country Train',
    subtitle: 'Kandy to Ella Scenic',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Nine_Arch_Bridge%2C_Demodara.jpg/800px-Nine_Arch_Bridge%2C_Demodara.jpg',
    duration: '1 Day',
    cost: 'LKR 5k',
    type: 'Scenic',
  },
];

export const SUSTAINABLE_ROUTES = ROUTES.map(r => ({ ...r, ecoScore: provinceEcoScore(r.province) }));
