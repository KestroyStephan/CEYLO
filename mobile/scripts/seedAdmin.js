const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  setDoc 
} = require('firebase/firestore');

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

async function seedUser(email, password) {
  console.log(`Setting up account: ${email}...`);
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log(`Created new auth user for ${email} with UID: ${userCredential.user.uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`User ${email} already exists, attempting to sign in...`);
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(`Signed in successfully as ${email} with UID: ${userCredential.user.uid}`);
    } else {
      throw err;
    }
  }

  const uid = userCredential.user.uid;
  await setDoc(doc(db, 'users', uid), {
    uid: uid,
    name: email.split('@')[0],
    email: email,
    role: 'admin',
    status: 'active',
    isOnboarded: true,
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`Successfully set role: 'admin' for ${email} in Firestore.`);
  return uid;
}

async function run() {
  try {
    // Attempt to seed stephankestroy@gmail.com with Crazy_hunter2303
    try {
      await seedUser('stephankestroy@gmail.com', 'Crazy_hunter2303');
    } catch (e) {
      console.log(`Failed for stephankestroy@gmail.com: ${e.message}`);
    }

    console.log('\n----------------------------------------\n');

    // Attempt to seed admin@ceylo.com with Admin@123456
    try {
      await seedUser('admin@ceylo.com', 'Admin@123456');
    } catch (e) {
      console.log(`Failed for admin@ceylo.com: ${e.message}`);
    }

    console.log('\n----------------------------------------\n');

    // Attempt to seed admin@ceylo.com with Crazy_hunter2303 (just in case)
    try {
      await seedUser('admin@ceylo.com', 'Crazy_hunter2303');
    } catch (e) {
      console.log(`Failed for admin@ceylo.com with Crazy_hunter2303: ${e.message}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Fatal error in seeding:', error.message);
    process.exit(1);
  }
}

run();
