const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyACNB5L3HjIjZIwuYA4T-f6cUFt-G4NOk8",
  authDomain: "ceylo-app.firebaseapp.com",
  projectId: "ceylo-app",
  storageBucket: "ceylo-app.firebasestorage.app",
  messagingSenderId: "8889588910",
  appId: "1:8889588910:android:ce17460e21616d075ea13f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fixUser(email, password) {
  try {
    console.log(`Logging in as ${email}...`);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    console.log(`Logged in! UID: ${uid}`);
    
    await setDoc(doc(db, 'users', uid), {
      uid: uid,
      name: email.split('@')[0],
      email: email,
      role: 'admin',
      status: 'active',
      isOnboarded: true,
      onboardingCompleted: true,
      createdAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`Successfully updated Firestore document for ${email} as admin.`);
  } catch (err) {
    console.error(`Failed for ${email}: ${err.message}`);
  }
}

async function main() {
  await fixUser('stephankestroy@gmail.com', 'Crazy_hunter2303');
  await fixUser('admin@ceylo.com', 'Admin@Ceylo123');
  process.exit(0);
}

main();
