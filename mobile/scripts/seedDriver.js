const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  setDoc,
  serverTimestamp
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Read API Key from .env
let apiKey = "YOUR_FIREBASE_API_KEY";
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_FIREBASE_API_KEY=(.*)/);
    if (match && match[1]) {
      apiKey = match[1].trim();
    }
  }
} catch (e) {
  console.log("Could not read .env file, using default.");
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: "ceylo-app.firebaseapp.com",
  projectId: "ceylo-app",
  storageBucket: "ceylo-app.firebasestorage.app",
  messagingSenderId: "8889588910",
  appId: "1:8889588910:android:ce17460e21616d075ea13f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function seedDriver() {
  try {
    console.log('Creating driver account...');
    
    // Create auth account
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth,
        'driver@gmail.com',
        '123456'
      );
      console.log('Auth account created:', userCredential.user.uid);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log('Account exists, signing in...');
        userCredential = await signInWithEmailAndPassword(
          auth,
          'driver@gmail.com',
          '123456'
        );
      } else {
        throw err;
      }
    }

    const uid = userCredential.user.uid;

    // Write users document
    await setDoc(doc(db, 'users', uid), {
      uid: uid,
      name: 'Test Driver',
      email: 'driver@gmail.com',
      phone: '+94777654321',
      role: 'driver_active',
      status: 'approved',
      isOnboarded: true,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      isOnline: false,
      expoPushToken: '',
    });
    console.log('users document written');

    // Write drivers document
    await setDoc(doc(db, 'drivers', uid), {
      uid: uid,
      name: 'Test Driver',
      email: 'driver@gmail.com',
      phone: '+94777654321',
      vehicleType: 'Car',
      licensePlate: 'WP-CAB-1234',
      licenseNumber: 'D-987654321',
      status: 'approved',
      isOnline: false,
      rejectionReason: '',
      createdAt: serverTimestamp(),
    });
    console.log('drivers document written');

    console.log('');
    console.log('DONE! Driver account ready:');
    console.log('Email:    driver@gmail.com');
    console.log('Password: 123456');
    console.log('Role:     driver_active');
    console.log('UID:      ' + uid);
    console.log('');
    console.log('Login with this account to test');
    console.log('the driver dashboard.');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedDriver();
