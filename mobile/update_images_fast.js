const fs = require('fs');
const path = require('path');

const DEST_FILE = path.join(__dirname, 'assets', 'data', 'ai_destinations.json');
const EVENTS_FILE = path.join(__dirname, 'assets', 'data', 'ai_events.json');

const fallbacks = {
    'Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Sri_Lanka_Unawatuna.jpg/800px-Sri_Lanka_Unawatuna.jpg',
    'Wildlife': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Elephant_in_Yala_National_Park%2C_Sri_Lanka.jpg/800px-Elephant_in_Yala_National_Park%2C_Sri_Lanka.jpg',
    'Heritage & Culture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Sigiriya_rock_from_the_south_side.jpg/800px-Sigiriya_rock_from_the_south_side.jpg',
    'Nature & Viewpoint': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Ella_Rock_Sri_Lanka.jpg/800px-Ella_Rock_Sri_Lanka.jpg',
    'Waterfall': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Bambarakanda_Falls.jpg/800px-Bambarakanda_Falls.jpg',
    'Festival': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Kandy_Esala_Perahera.jpg/800px-Kandy_Esala_Perahera.jpg'
};

function processFileFast(filePath, isEvent) {
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updatedCount = 0;

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // If it's a generic placeholder or an old Unsplash image
        if (item.image && item.image.includes('unsplash')) {
            const category = item.category || (isEvent ? 'Festival' : 'Nature & Viewpoint');
            item.image = fallbacks[category] || fallbacks['Nature & Viewpoint'];
            updatedCount++;
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${updatedCount} items in ${filePath} with relevant category images.`);
}

console.log('Processing Destinations...');
processFileFast(DEST_FILE, false);
console.log('Processing Events...');
processFileFast(EVENTS_FILE, true);
console.log('Done!');
