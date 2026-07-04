const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Load 100,000 destinations into memory for blazing fast RAG retrieval
console.log('Loading 100,000 dataset into memory...');
const destinations = JSON.parse(fs.readFileSync('destinations.json', 'utf-8'));
console.log('Dataset loaded successfully.');

// Simulated machine learning recommendation endpoint
app.post('/api/recommend', (req, res) => {
    const { mood } = req.body;
    
    console.log(`Received recommendation request for mood: ${mood}`);
    
    // Map user's mood to internal category vibes
    let targetVibe = "Adventurer";
    if (mood === 'Relaxed' || mood === 'Romantic') targetVibe = "Family Trip"; // Using Beach/Resort vibes
    else if (mood === 'Cultural') targetVibe = "Culture Seeker";
    else if (mood === 'Eco-Friendly' || mood === 'Nature') targetVibe = "Eco Explorer";

    // Filtering algorithm to find the best 5 out of 100,000 instantly
    // We prioritize ecoScore and popularity, matching the vibe.
    
    // In a real RAG with Pinecone, this would be a cosine similarity vector search.
    // For local memory, Array.filter is O(N) which on 100k items takes ~2 milliseconds in Node.js!
    
    const start = performance.now();
    
    // Filter
    let candidates = destinations.filter(d => d.vibe === targetVibe);
    
    // Sort by a combination of ecoScore and popularity to find the "best"
    candidates.sort((a, b) => {
        const scoreA = (a.ecoScore * 0.7) + ((10000 - a.popularity) * 0.003); // higher is better
        const scoreB = (b.ecoScore * 0.7) + ((10000 - b.popularity) * 0.003);
        return scoreB - scoreA;
    });
    
    const top5 = candidates.slice(0, 5);
    
    const end = performance.now();
    console.log(`Recommendation completed in ${(end - start).toFixed(2)}ms`);

    res.json({
        success: true,
        mood: mood,
        top_matches: top5
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`CEYLO AI RAG Backend running on http://localhost:${PORT}`);
});
