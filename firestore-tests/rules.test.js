/**
 * Firestore security rules tests. Run with `npm test` in this folder
 * (starts the Firestore emulator, needs Java 11+ and the Firebase CLI).
 * If an emulator is already running on port 8085, run `npm run test:only` instead.
 */
const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, addDoc, collection, deleteDoc } = require('firebase/firestore');

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ceylo',
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8085,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

// Seed documents without rules
async function seed(docs) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [p, data] of Object.entries(docs)) {
      await setDoc(doc(db, p), data);
    }
  });
}

const as = (uid, token) => env.authenticatedContext(uid, token).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('users', () => {
  test('a new user can sign up with a self-service role', async () => {
    for (const role of ['tourist', 'guide_pending', 'driver_pending', 'vendor_onboarding']) {
      await assertSucceeds(setDoc(doc(as(`u_${role}`), 'users', `u_${role}`), { name: 'A', role }));
    }
  });

  test('a guest can create a profile with no role (mood onboarding)', async () => {
    await assertSucceeds(setDoc(doc(as('guest'), 'users', 'guest'), { mood: 'eco', onboardingCompleted: true }, { merge: true }));
  });

  test('nobody can sign up as admin or as an approved provider', async () => {
    for (const role of ['admin', 'super_admin', 'manager', 'guide', 'driver_active', 'vendor_active', 'vendor']) {
      await assertFails(setDoc(doc(as('bad'), 'users', 'bad'), { name: 'B', role }));
    }
  });

  test('a user cannot create someone else\'s profile', async () => {
    await assertFails(setDoc(doc(as('alice'), 'users', 'bob'), { name: 'Bob', role: 'tourist' }));
  });

  test('a tourist cannot promote themselves to admin', async () => {
    await seed({ 'users/alice': { role: 'tourist', name: 'Alice' } });
    await assertFails(updateDoc(doc(as('alice'), 'users', 'alice'), { role: 'admin' }));
  });

  test('a user can edit their own profile fields', async () => {
    await seed({ 'users/alice': { role: 'tourist', name: 'Alice' } });
    await assertSucceeds(updateDoc(doc(as('alice'), 'users', 'alice'), { name: 'Alice P', mood: 'culture', expoPushToken: 'ExponentPushToken[x]' }));
  });

  test('a banned user cannot unban themselves', async () => {
    await seed({ 'users/alice': { role: 'tourist', isBanned: true } });
    await assertFails(updateDoc(doc(as('alice'), 'users', 'alice'), { isBanned: false }));
  });

  test('a vendor can submit their application but not approve it', async () => {
    await seed({ 'users/v1': { role: 'vendor_onboarding' } });
    await assertSucceeds(updateDoc(doc(as('v1'), 'users', 'v1'), { role: 'vendor_pending', status: 'pending_verification' }));
    await assertFails(updateDoc(doc(as('v1'), 'users', 'v1'), { role: 'vendor_active' }));
  });

  test('a rejected guide can re-apply but not approve themselves', async () => {
    await seed({ 'users/g1': { role: 'guide_rejected' } });
    await assertSucceeds(updateDoc(doc(as('g1'), 'users', 'g1'), { role: 'guide_pending' }));
    await seed({ 'users/g2': { role: 'guide_pending' } });
    await assertFails(updateDoc(doc(as('g2'), 'users', 'g2'), { role: 'guide' }));
  });

  test('staff can approve a guide and ban a user', async () => {
    await seed({
      'users/staff': { role: 'manager' },
      'users/g1': { role: 'guide_pending' },
      'users/t1': { role: 'tourist' },
    });
    await assertSucceeds(updateDoc(doc(as('staff'), 'users', 'g1'), { role: 'guide', status: 'approved' }));
    await assertSucceeds(updateDoc(doc(as('staff'), 'users', 't1'), { isBanned: true }));
  });

  test('signed-out visitors cannot read profiles', async () => {
    await seed({ 'users/alice': { role: 'tourist' } });
    await assertFails(getDoc(doc(anon(), 'users', 'alice')));
  });
});

describe('bookings', () => {
  test('a tourist can book for themselves only', async () => {
    await seed({ 'users/t1': { role: 'tourist' } });
    await assertSucceeds(addDoc(collection(as('t1'), 'bookings'), { userId: 't1', touristId: 't1', status: 'pending' }));
    await assertFails(addDoc(collection(as('t1'), 'bookings'), { userId: 't2', status: 'pending' }));
  });

  test('a stranger cannot read or change another person\'s booking', async () => {
    await seed({ 'users/t2': { role: 'tourist' }, 'bookings/b1': { userId: 't1', guideId: 'g1', status: 'pending' } });
    await assertFails(getDoc(doc(as('t2'), 'bookings', 'b1')));
    await assertFails(updateDoc(doc(as('t2'), 'bookings', 'b1'), { status: 'cancelled' }));
  });

  test('the guide on a booking can accept it', async () => {
    await seed({ 'users/g1': { role: 'guide' }, 'bookings/b1': { userId: 't1', guideId: 'g1', status: 'pending' } });
    await assertSucceeds(updateDoc(doc(as('g1'), 'bookings', 'b1'), { status: 'accepted' }));
  });

  test('a driver can claim an open ride for themselves but not for another driver', async () => {
    await seed({
      'users/d1': { role: 'driver_active' },
      'bookings/r1': { userId: 't1', driverId: null, status: 'pending' },
      'bookings/r2': { userId: 't1', driverId: null, status: 'pending' },
    });
    await assertSucceeds(getDoc(doc(as('d1'), 'bookings', 'r1')));
    await assertSucceeds(updateDoc(doc(as('d1'), 'bookings', 'r1'), { driverId: 'd1', status: 'Confirmed' }));
    await assertFails(updateDoc(doc(as('d1'), 'bookings', 'r2'), { driverId: 'd9', status: 'Confirmed' }));
  });

  test('a driver cannot take over a ride already confirmed by another driver', async () => {
    await seed({ 'users/d1': { role: 'driver_active' }, 'bookings/r1': { userId: 't1', driverId: 'd2', status: 'Confirmed' } });
    await assertFails(updateDoc(doc(as('d1'), 'bookings', 'r1'), { driverId: 'd1' }));
  });
});

describe('vendors and drivers', () => {
  test('a vendor registers as pending and cannot approve themselves', async () => {
    await assertSucceeds(setDoc(doc(as('v1'), 'vendors', 'v1'), { businessName: 'Spice Hut', status: 'pending_verification' }));
    await assertFails(updateDoc(doc(as('v1'), 'vendors', 'v1'), { status: 'approved' }));
    await assertSucceeds(updateDoc(doc(as('v1'), 'vendors', 'v1'), { isAcceptingOrders: true }));
  });

  test('a vendor cannot register as already approved', async () => {
    await assertFails(setDoc(doc(as('v1'), 'vendors', 'v1'), { businessName: 'X', status: 'approved' }));
  });

  test('staff can approve a vendor', async () => {
    await seed({ 'users/staff': { role: 'admin' }, 'vendors/v1': { status: 'pending_verification' } });
    await assertSucceeds(updateDoc(doc(as('staff'), 'vendors', 'v1'), { status: 'approved' }));
  });

  test('a driver can go online but cannot approve themselves', async () => {
    await seed({ 'drivers/d1': { status: 'pending_verification', isOnline: false } });
    await assertSucceeds(updateDoc(doc(as('d1'), 'drivers', 'd1'), { isOnline: true }));
    await assertFails(updateDoc(doc(as('d1'), 'drivers', 'd1'), { status: 'approved' }));
  });

  test('vendor services are public, but only the owner can edit them', async () => {
    await seed({ 'vendors/v1/services/s1': { name: 'Cooking class' } });
    await assertSucceeds(getDoc(doc(anon(), 'vendors/v1/services/s1')));
    await assertFails(updateDoc(doc(as('v2'), 'vendors/v1/services/s1'), { name: 'Hacked' }));
    await assertSucceeds(updateDoc(doc(as('v1'), 'vendors/v1/services/s1'), { price: 2500 }));
  });
});

describe('SOS, itineraries and content', () => {
  test('a tourist can raise an SOS for themselves only', async () => {
    await assertSucceeds(addDoc(collection(as('t1'), 'sos_alerts'), { userId: 't1', status: 'active' }));
    await assertFails(addDoc(collection(as('t1'), 'sos_alerts'), { userId: 't2', status: 'active' }));
    await assertFails(addDoc(collection(anon(), 'sos_alerts'), { userId: 'anonymous', status: 'active' }));
  });

  test('support staff can see and resolve an SOS; other tourists cannot read it', async () => {
    await seed({ 'users/sup': { role: 'support' }, 'users/t2': { role: 'tourist' }, 'sos_alerts/a1': { userId: 't1', status: 'active' } });
    await assertSucceeds(getDoc(doc(as('sup'), 'sos_alerts', 'a1')));
    await assertSucceeds(updateDoc(doc(as('sup'), 'sos_alerts', 'a1'), { status: 'resolved' }));
    await assertFails(getDoc(doc(as('t2'), 'sos_alerts', 'a1')));
  });

  test('itineraries are private to their owner', async () => {
    await assertSucceeds(addDoc(collection(as('t1'), 'itineraries'), { userId: 't1', plan: [] }));
    await assertFails(addDoc(collection(as('t1'), 'itineraries'), { userId: 't2', plan: [] }));
    await seed({ 'itineraries/i1': { userId: 't1', plan: [] } });
    await assertSucceeds(updateDoc(doc(as('t1'), 'itineraries', 'i1'), { plan: [{ day: 1 }] }));
    await assertFails(getDoc(doc(as('t2'), 'itineraries', 'i1')));
  });

  test('destinations and events are public to read and staff-only to write', async () => {
    await seed({ 'users/t1': { role: 'tourist' }, 'users/cm': { role: 'content_manager' }, 'cultural_events/e1': { title: 'Perahera' } });
    await assertSucceeds(getDoc(doc(anon(), 'cultural_events', 'e1')));
    await assertFails(setDoc(doc(as('t1'), 'cultural_events', 'e2'), { title: 'Fake' }));
    await assertSucceeds(setDoc(doc(as('cm'), 'cultural_events', 'e2'), { title: 'Vesak' }));
    await assertFails(setDoc(doc(as('t1'), 'destinations', 'd1'), { name: 'Fake' }));
  });

  test('payouts are staff-only', async () => {
    await seed({ 'users/t1': { role: 'tourist' }, 'users/fin': { role: 'finance' }, 'payouts/p1': { amount: 1000 } });
    await assertFails(getDoc(doc(as('t1'), 'payouts', 'p1')));
    await assertSucceeds(getDoc(doc(as('fin'), 'payouts', 'p1')));
  });

  test('reviews must be written in the reviewer\'s own name', async () => {
    await assertSucceeds(addDoc(collection(as('t1'), 'reviews'), { touristId: 't1', rating: 5 }));
    await assertFails(addDoc(collection(as('t1'), 'reviews'), { touristId: 't2', rating: 1 }));
  });

  test('partners manage only their own rooms', async () => {
    await assertSucceeds(addDoc(collection(as('h1'), 'rooms'), { providerId: 'h1', name: 'Deluxe' }));
    await seed({ 'rooms/r1': { providerId: 'h1' } });
    await assertFails(deleteDoc(doc(as('h2'), 'rooms', 'r1')));
    await assertSucceeds(deleteDoc(doc(as('h1'), 'rooms', 'r1')));
  });
});
