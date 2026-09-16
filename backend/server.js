const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
app.use(cors());
app.use(express.json());

const destinations = [];
const events = [];
const activities = [];

console.log('Loading datasets into memory...');

const loadCSV = (filePath, array) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            resolve();
            return;
        }
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => array.push(data))
            .on('end', resolve)
            .on('error', reject);
    });
};

Promise.all([
    loadCSV('datasets/sri_lanka_destinations_catalog.csv', destinations),
    loadCSV('datasets/sri_lanka_event_location_accuracy_dataset.csv', events),
    loadCSV('datasets/sri_lanka_tourism_activities_dataset.csv', activities)
]).then(() => {
    console.log(`Loaded ${destinations.length} destinations, ${events.length} events, ${activities.length} activities.`);
}).catch(console.error);

// RAG Recommendation endpoint
app.post('/api/recommend', (req, res) => {
    const { startDate, endDate, budget, interests, days, mood } = req.body;
    
    console.log(`RAG Query: Dates ${startDate} to ${endDate}, Budget ${budget}, Mood ${mood}`);
    const startMs = performance.now();
    
    // 1. Filter Events by Date Range
    let matchingEvents = [];
    if (startDate && endDate && events.length > 0) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        matchingEvents = events.filter(e => {
            if (!e.event_date) return false;
            const ed = new Date(e.event_date);
            return ed >= start && ed <= end;
        }).slice(0, 10);
    }
    
    // 2. Filter Destinations based on Interests / Mood
    let matchingDestinations = destinations;
    if (interests && interests.length > 0 && destinations.length > 0) {
        const lowerInterests = interests.toLowerCase();
        matchingDestinations = destinations.filter(d => {
            const act = d.activities ? d.activities.toLowerCase() : '';
            const cat = d.category ? d.category.toLowerCase() : '';
            return act.includes(lowerInterests) || cat.includes(lowerInterests) || lowerInterests.includes(cat);
        });
    } else if (mood) {
         let target = "";
         if (mood.includes('Eco') || mood.includes('Nature')) target = 'Eco';
         else if (mood.includes('Culture')) target = 'Heritage';
         else if (mood.includes('Adventure')) target = 'Adventure';
         
         if (target) {
            matchingDestinations = destinations.filter(d => {
                const act = d.activities ? d.activities.toLowerCase() : '';
                const cat = d.category ? d.category.toLowerCase() : '';
                return act.includes(target.toLowerCase()) || cat.includes(target.toLowerCase());
            });
         }
    }
    
    // Ensure we have a mix of popular and hidden gems
    const popular = matchingDestinations.filter(d => d.category && d.category.includes('Popular')).slice(0, 5);
    const hiddenGems = matchingDestinations.filter(d => d.category && d.category.includes('Hidden')).slice(0, 5);
    
    // If not enough matched, just grab some
    if (popular.length === 0 && hiddenGems.length === 0) {
        popular.push(...destinations.slice(0, 5));
        hiddenGems.push(...destinations.slice(5, 10));
    }
    
    const endMs = performance.now();
    console.log(`RAG Retrieval completed in ${(endMs - startMs).toFixed(2)}ms`);

    res.json({
        success: true,
        context: {
            events: matchingEvents.map(e => ({ name: e.event_name, location: e.nearest_known_destination, date: e.event_date, district: e.district })),
            destinations: [...popular, ...hiddenGems].map(d => ({ name: d.destination_name, category: d.category, district: d.district, province: d.province, activities: d.activities }))
        }
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`CEYLO AI RAG Backend running on http://localhost:${PORT}`);
});
