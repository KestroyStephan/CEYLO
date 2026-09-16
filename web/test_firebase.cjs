const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function test() {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'guide'));
    const snap = await getDocs(q);
    const guides = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Found ${guides.length} guides`);
    guides.forEach(g => {
      console.log(`- ${g.name}: specializations = ${JSON.stringify(g.specializations)}, serviceAreas = ${JSON.stringify(g.serviceAreas)}, unavailableDates = ${JSON.stringify(g.unavailableDates)}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
