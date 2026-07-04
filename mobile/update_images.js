const fs = require('fs');
const path = require('path');

const DEST_FILE = path.join(__dirname, 'assets', 'data', 'ai_destinations.json');
const EVENTS_FILE = path.join(__dirname, 'assets', 'data', 'ai_events.json');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getWikipediaImage(query) {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=800`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'CEYLO-Tourism-App/1.0 (test@example.com)'
            }
        });
        const data = await res.json();
        
        if (data.query && data.query.pages) {
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pageId !== '-1' && pages[pageId].thumbnail) {
                return pages[pageId].thumbnail.source;
            }
        }
        return null;
    } catch (e) {
        console.error(`Error fetching image for ${query}:`, e);
        return null;
    }
}

// Some fallback images just in case Wikipedia doesn't have an image
const fallbacks = {
    'Beach': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Sri_Lanka_Unawatuna.jpg/800px-Sri_Lanka_Unawatuna.jpg',
    'Wildlife': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Elephant_in_Yala_National_Park%2C_Sri_Lanka.jpg/800px-Elephant_in_Yala_National_Park%2C_Sri_Lanka.jpg',
    'Heritage & Culture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Sigiriya_rock_from_the_south_side.jpg/800px-Sigiriya_rock_from_the_south_side.jpg',
    'Nature & Viewpoint': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Ella_Rock_Sri_Lanka.jpg/800px-Ella_Rock_Sri_Lanka.jpg',
    'Waterfall': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Bambarakanda_Falls.jpg/800px-Bambarakanda_Falls.jpg',
    'Festival': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Kandy_Esala_Perahera.jpg/800px-Kandy_Esala_Perahera.jpg'
};

async function processFile(filePath, isEvent) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updatedCount = 0;

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // Skip if already a distinct wikipedia image. Identify placeholders by checking fallbacks or unsplash.
        const isPlaceholder = !item.image || Object.values(fallbacks).includes(item.image) || item.image.includes('unsplash');
        if (isPlaceholder) {
            console.log(`[${i+1}/${data.length}] Fetching image for: ${item.name || item.title}`);
            
            // Search string optimization - remove "Secret", "Hidden", and any trailing numbers
            let searchStr = (item.name || item.title).replace('Secret ', '').replace('Hidden ', '');
            searchStr = searchStr.replace(/\s\d+$/, '');
            
            let imageUrl = await getWikipediaImage(searchStr);
            
            // Try fallback search without Sri Lanka if it doesn't work, or with Sri Lanka
            if (!imageUrl) {
                imageUrl = await getWikipediaImage(searchStr + ' Sri Lanka');
            }

            if (imageUrl) {
                item.image = imageUrl;
                console.log(` -> Found: ${imageUrl}`);
                updatedCount++;
            } else {
                const category = item.category || (isEvent ? 'Festival' : 'Nature & Viewpoint');
                const fallbackImage = fallbacks[category] || fallbacks['Nature & Viewpoint'];
                item.image = fallbackImage;
                console.log(` -> Not found. Using fallback for ${category}`);
                updatedCount++;
            }
            
            // Rate limiting slightly to prevent API block
            await delay(1000);
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Finished ${filePath}! Updated ${updatedCount} items.`);
}

async function main() {
    console.log('Processing Destinations...');
    await processFile(DEST_FILE, false);
    
    console.log('\nProcessing Events...');
    await processFile(EVENTS_FILE, true);
    
    console.log('\nAll done!');
}

main();
