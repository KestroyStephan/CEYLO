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

// Copy exact config from mobile/firebaseConfig.js
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

async function seedVendor() {
  try {
    console.log('Creating vendor account...');
    
    // Create auth account
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth,
        'vendor@gmail.com',
        '123456'
      );
      console.log('Auth account created:', 
        userCredential.user.uid);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log('Account exists, signing in...');
        userCredential = await signInWithEmailAndPassword(
          auth,
          'vendor@gmail.com',
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
      name: 'Test Vendor',
      email: 'vendor@gmail.com',
      phone: '+94771234567',
      role: 'vendor_active',
      status: 'approved',
      isOnboarded: true,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      isOnline: false,
      expoPushToken: '',
    });
    console.log('users document written');

    // Write vendors document
    await setDoc(doc(db, 'vendors', uid), {
      uid: uid,
      businessName: 'Ranatunga Arts & Crafts',
      businessType: 'Artisan',
      phone: '+94771234567',
      address: 'No 12, Galle Road, Colombo 03',
      onlineStatus: 'online',
      status: 'approved',
      nicFrontUrl: '',
      nicBackUrl: '',
      businessCertUrl: '',
      servicePhotoUrls: [],
      rejectionReason: '',
      createdAt: new Date(),
    });
    console.log('vendors document written');

    // Write a sample service
    await setDoc(
      doc(db, 'vendors', uid, 'services', 'service_001'),
      {
        name: 'Hand-Carved Wooden Mask',
        description: 'Traditional Sri Lankan Raksha mask, hand-carved from local wood',
        price: 4500,
        duration: '2 days',
        maxCapacity: 10,
        ecoCertified: true,
        photoUrl: '',
        isAvailable: true,
        createdAt: new Date(),
      }
    );
    console.log('sample service written');

    // Write a sample order
    await setDoc(
      doc(db, 'vendors', uid, 'orders', 'order_001'),
      {
        bookingId: 'order_001',
        touristId: 'tourist_test_001',
        touristName: 'John Tourist',
        items: [
          { 
            name: 'Hand-Carved Wooden Mask', 
            quantity: 1, 
            price: 4500 
          }
        ],
        status: 'pending',
        totalAmount: 4500,
        createdAt: new Date(),
        notes: 'Please wrap as gift',
      }
    );
    console.log('sample order written');

    console.log('');
    console.log('DONE! Vendor account ready:');
    console.log('Email:    vendor@gmail.com');
    console.log('Password: 123456');
    console.log('Role:     vendor_active');
    console.log('UID:      ' + uid);
    console.log('');
    console.log('Login with this account to test');
    console.log('the vendor dashboard.');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedVendor();
