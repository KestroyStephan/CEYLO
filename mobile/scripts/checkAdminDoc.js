const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "ceylo-app.firebaseapp.com",
  projectId: "ceylo-app",
  storageBucket: "ceylo-app.firebasestorage.app",
  messagingSenderId: "8889588910",
  appId: "1:8889588910:android:ce17460e21616d075ea13f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkAdminDoc() {
  try {
    console.log('Logging in as stephankestroy@gmail.com...');
    const userCredential = await signInWithEmailAndPassword(auth, 'stephankestroy@gmail.com', 'Crazy_hunter2303');
    const uid = userCredential.user.uid;
    console.log(`Success! UID: ${uid}`);

    console.log('Fetching users document for this UID...');
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data();
      console.log('--- USER DATA ---');
      console.log(`UID: ${doc.id || uid}`);
      console.log(`Name: ${data.name}`);
      console.log(`Email: ${data.email}`);
      console.log(`Role: ${data.role}`);
      console.log(`Status: ${data.status}`);
      console.log('-----------------');
    } else {
      console.log('No document found at users/' + uid);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdminDoc();
