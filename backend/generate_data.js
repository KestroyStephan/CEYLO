const fs = require('fs');

const REGIONS = {
    "Western Province": { cities: ["Colombo", "Negombo", "Kalutara", "Mount Lavinia"], lat_range: [6.5, 7.3], lon_range: [79.8, 80.2] },
    "Central Province": { cities: ["Kandy", "Nuwara Eliya", "Matale", "Hatton", "Ella"], lat_range: [6.8, 7.5], lon_range: [80.5, 80.9] },
    "Southern Province": { cities: ["Galle", "Mirissa", "Matara", "Hikkaduwa", "Unawatuna", "Tangalle"], lat_range: [5.9, 6.4], lon_range: [80.0, 81.0] },
    "Northern Province": { cities: ["Jaffna", "Mannar", "Vavuniya", "Mullaitivu"], lat_range: [8.6, 9.8], lon_range: [79.8, 80.6] },
    "Eastern Province": { cities: ["Trincomalee", "Batticaloa", "Arugam Bay", "Nilaveli"], lat_range: [6.9, 8.8], lon_range: [81.1, 81.8] },
    "North Central Province": { cities: ["Anuradhapura", "Polonnaruwa", "Habarana", "Sigiriya"], lat_range: [7.8, 8.5], lon_range: [80.0, 81.0] },
    "North Western Province": { cities: ["Kurunegala", "Puttalam", "Kalpitiya"], lat_range: [7.4, 8.1], lon_range: [79.7, 80.4] },
    "Uva Province": { cities: ["Badulla", "Monaragala", "Haputale", "Bandarawela"], lat_range: [6.7, 7.1], lon_range: [80.9, 81.5] },
    "Sabaragamuwa Province": { cities: ["Ratnapura", "Kegalle", "Kitulgala"], lat_range: [6.3, 7.1], lon_range: [80.2, 80.6] },
};

const ATTRACTION_TYPES = [
    { cat: "Beach", suffixes: ["Beach", "Cove", "Bay", "Sands"] },
    { cat: "Waterfall", suffixes: ["Falls", "Ella", "Cascade"] },
    { cat: "Heritage & Culture", suffixes: ["Temple", "Ruins", "Stupa", "Fortress", "Kovil", "Viharaya"] },
    { cat: "Nature & Viewpoint", suffixes: ["Rock", "Peak", "Viewpoint", "Gap", "Estate", "Sanctuary"] },
    { cat: "Wildlife", suffixes: ["National Park", "Safari", "Reserve", "Bird Sanctuary"] }
];

function getRandom(min, max) { return Math.random() * (max - min) + min; }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function createRecord(did, name, category, province, lat, lon, hidden, popRank) {
    let avgRating = (Math.random() * (4.9 - 3.8) + 3.8).toFixed(1);
    if (popRank < 20) avgRating = (Math.random() * (5.0 - 4.5) + 4.5).toFixed(1);

    let seasonal = "Year-Round";
    if (category === "Beach" && province === "Southern Province") seasonal = "Nov-April";
    else if (category === "Beach" && province === "Eastern Province") seasonal = "May-Oct";

    const carbon = getRandomInt(5, 60);
    const wildlife = category === "Wildlife" ? getRandomInt(0, 40) : getRandomInt(0, 20);
    const plastic = getRandomInt(10, 80);
    const community = getRandomInt(30, 90);
    const carrying = Math.random() > 0.25;

    let ecoScore = ((100 - carbon) * 0.25) + ((100 - wildlife) * 0.20) + ((100 - plastic) * 0.15) + (community * 0.20) + (carrying ? 10 : 0) + 10;
    ecoScore = Math.min(100, Math.max(0, Math.round(ecoScore)));

    // For fast backend filtering, we'll assign a 'vibe' derived from category
    let vibe = "Adventurer";
    if (category === "Heritage & Culture") vibe = "Culture Seeker";
    if (category === "Nature & Viewpoint" || category === "Waterfall") vibe = "Eco Explorer";
    if (category === "Beach" || category === "Wildlife") vibe = "Family Trip";

    return {
        id: `DEST_${did.toString().padStart(5, '0')}`,
        name, category, province,
        lat: lat.toFixed(6), lon: lon.toFixed(6),
        hiddenGem: hidden,
        rating: avgRating,
        popularity: popRank,
        ecoScore: ecoScore,
        vibe: vibe
    };
}

const TOTAL_RECORDS = 100000;
console.log(`Generating ${TOTAL_RECORDS} destinations...`);
const destinations = [];

const regionKeys = Object.keys(REGIONS);

for (let i = 1; i <= TOTAL_RECORDS; i++) {
    const province = pickRandom(regionKeys);
    const pData = REGIONS[province];
    const city = pickRandom(pData.cities);
    const typeObj = pickRandom(ATTRACTION_TYPES);
    
    let name = `${city} ${pickRandom(typeObj.suffixes)}`;
    // Add unique string for large scale
    if (i > 100) name += ` ${getRandomInt(1000, 999999)}`;

    const lat = getRandom(pData.lat_range[0], pData.lat_range[1]);
    const lon = getRandom(pData.lon_range[0], pData.lon_range[1]);
    const hidden = Math.random() > 0.7;
    const popRank = getRandomInt(1, 10000);

    destinations.push(createRecord(i, name, typeObj.cat, province, lat, lon, hidden, popRank));
    
    if (i % 10000 === 0) console.log(`Generated ${i} / ${TOTAL_RECORDS}`);
}

fs.writeFileSync('destinations.json', JSON.stringify(destinations, null, 2));
console.log('Successfully saved to destinations.json');
