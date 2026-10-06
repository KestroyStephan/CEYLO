/**
 * Seeds a dummy rider and a dummy driver into the LOCAL Firebase emulators for an end-to-end
 * ride test. It refuses to run against anything but localhost.
 *
 *   firebase emulators:start --only auth,firestore --project ceylo-app
 *   node seedLocalRide.js
 *   EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost npx expo start --port 8092
 */
const HOST = 'localhost';
const PROJECT = 'ceylo-app';
const AUTH = `http://${HOST}:9099/identitytoolkit.googleapis.com/v1`;
const FS = `http://${HOST}:8085/v1/projects/${PROJECT}/databases/(default)/documents`;

// Test-only accounts that exist only inside the emulator
const PASSWORD = 'ceylo-test-123';
const ACCOUNTS = {
  rider: { email: 'rider@ceylo.test', name: 'Test Rider' },
  driver: { email: 'driver@ceylo.test', name: 'Test Driver' },
};

// Firestore REST value encoding
function enc(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
  return { stringValue: String(v) };
}

async function signUp({ email, name }) {
  // Re-runs reuse the account
  let res = await fetch(`${AUTH}/accounts:signInWithPassword?key=test`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (!res.ok) {
    res = await fetch(`${AUTH}/accounts:signUp?key=test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, displayName: name, returnSecureToken: true }),
    });
  }
  const body = await res.json();
  if (!body.localId) throw new Error(`Could not create ${email}: ${JSON.stringify(body)}`);
  return body.localId;
}

async function put(path, data) {
  const res = await fetch(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }),
  });
  if (!res.ok) throw new Error(`${path}: ${await res.text()}`);
}

(async () => {
  const riderId = await signUp(ACCOUNTS.rider);
  const driverId = await signUp(ACCOUNTS.driver);
  const now = new Date();

  await put(`users/${riderId}`, {
    name: ACCOUNTS.rider.name, email: ACCOUNTS.rider.email, role: 'tourist',
    onboardingCompleted: true, consent: { research: true, analytics: false, at: now }, createdAt: now,
  });
  await put(`users/${driverId}`, {
    name: ACCOUNTS.driver.name, email: ACCOUNTS.driver.email, role: 'driver_active', status: 'approved', createdAt: now,
  });
  await put(`drivers/${driverId}`, {
    name: ACCOUNTS.driver.name, vehicleType: 'Tuk', licensePlate: 'WP ABC-1234', status: 'approved',
    isOnline: false, isBusy: false, rating: 4.8, createdAt: now,
  });
  console.log(`Seeded rider ${riderId} (${ACCOUNTS.rider.email}) and driver ${driverId} (${ACCOUNTS.driver.email}).`);
})().catch((e) => { console.error(e.message); process.exit(1); });
