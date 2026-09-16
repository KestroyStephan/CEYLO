const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function check() {
  try {
    console.log("=== BOOKINGS ===");
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    bookingsSnap.forEach(d => {
      const data = d.data();
      console.log(`Booking ID: ${d.id} | Tourist: ${data.touristName} (${data.touristId}) | Guide: ${data.guideName} (${data.guideId}) | Status: ${data.status}`);
    });

    console.log("\n=== CHATS ===");
    const chatsSnap = await getDocs(collection(db, 'chats'));
    for (const chatDoc of chatsSnap.docs) {
      console.log(`Chat Document ID: ${chatDoc.id}`);
      const messagesSnap = await getDocs(collection(db, 'chats', chatDoc.id, 'messages'));
      messagesSnap.forEach(mDoc => {
        const m = mDoc.data();
        console.log(`  - [${m.senderId}] at ${m.createdAt?.toDate?.() || m.createdAt}: ${m.text}`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

check();
