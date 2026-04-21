
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBzhHU5-0OmW-d71uHL2rujPO-RhS3xGsE",
    authDomain: "ceylo-app.firebaseapp.com",
    projectId: "ceylo-app",
    storageBucket: "ceylo-app.firebasestorage.app",
    messagingSenderId: "8889588910",
    appId: "1:8889588910:web:5a237fa4a7ad14a55ea13f",
    measurementId: "G-98ZQ99H118"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const destinations = [
    {
        name: "Kandy",
        description: "The cultural capital of Sri Lanka, home to the Temple of the Sacred Tooth Relic.",
        imageUrl: "https://images.unsplash.com/photo-1588598116174-279585913220",
        ecoScore: 85,
        category: "Cultural Hub",
        isHiddenGem: false,
        isEco: true
    },
    {
        name: "Sigiriya",
        description: "An ancient rock fortress known as the Eighth Wonder of the World.",
        imageUrl: "https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a",
        ecoScore: 92,
        category: "Heritage",
        isHiddenGem: false,
        isEco: true
    },
    {
        name: "Galle",
        description: "A historic city known for its Dutch Fort and beautiful coastal views.",
        imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        ecoScore: 78,
        category: "Coastal",
        isHiddenGem: false,
        isEco: false
    },
    {
        name: "Ella",
        description: "A mountain town famous for the Nine Arch Bridge and stunning hiking trails.",
        imageUrl: "https://images.unsplash.com/photo-1589923188900-85dae523342b",
        ecoScore: 95,
        category: "Eco Spot",
        isHiddenGem: true,
        isEco: true
    },
    {
        name: "Jaffna",
        description: "The northern capital, rich in Tamil culture and unique cuisine.",
        imageUrl: "https://images.unsplash.com/photo-1578328819058-b69f3a709475",
        ecoScore: 70,
        category: "Cultural Hub",
        isHiddenGem: true,
        isEco: false
    }
];

const events = [
    {
        title: "Kandy Esala Perahera",
        date: "2026-08-18",
        endDate: "2026-08-28",
        location: "Kandy",
        description: "The grandest Buddhist festival in Sri Lanka featuring dancers, drummers and elephants.",
        type: "Cultural",
        category: "Festival",
        imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2"
    },
    {
        title: "Vesak Festival",
        date: "2026-05-01",
        endDate: "2026-05-02",
        location: "Colombo",
        description: "Commemorating the birth, enlightenment, and passing of Lord Buddha with lanterns and thoranas.",
        type: "Religious",
        category: "Festival",
        imageUrl: "https://images.unsplash.com/photo-1588598116174-279585913220"
    },
    {
        title: "Sinhala and Tamil New Year",
        date: "2026-04-13",
        endDate: "2026-04-14",
        location: "Island-wide",
        description: "Traditional games and rituals celebrating the Aluth Avurudda.",
        type: "Cultural",
        category: "Festival",
        imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa"
    },
    {
        title: "Poson Poya",
        date: "2026-06-29",
        endDate: "2026-06-29",
        location: "Anuradhapura",
        description: "Celebrating the arrival of Buddhism in Sri Lanka.",
        type: "Religious",
        category: "Festival",
        imageUrl: "https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a"
    },
    {
        title: "Nallur Festival",
        date: "2026-08-15",
        endDate: "2026-09-10",
        location: "Jaffna",
        description: "A major Hindu festival at the Nallur Kandaswamy Kovil.",
        type: "Religious",
        category: "Festival",
        imageUrl: "https://images.unsplash.com/photo-1578328819058-b69f3a709475"
    },
    {
        title: "Galle Literary Festival",
        date: "2026-01-20",
        endDate: "2026-01-25",
        location: "Galle",
        description: "A gathering of writers and thinkers from around the world.",
        type: "Heritage",
        category: "Event",
        imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2"
    }
];

async function seed() {
    console.log("Seeding started...");
    
    // Seed Destinations
    const destCol = collection(db, "destinations");
    for (const dest of destinations) {
        await addDoc(destCol, dest);
        console.log(`Added destination: ${dest.name}`);
    }

    // Seed Events
    const eventCol = collection(db, "cultural_events");
    for (const event of events) {
        await addDoc(eventCol, event);
        console.log(`Added event: ${event.title}`);
    }

    console.log("Seeding completed!");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
