/**
 * Firebase Storage rules tests (storage.rules). Run with `npm test` in this folder, which starts the
 * Firestore and Storage emulators.
 */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');
const { ref, uploadBytes, getBytes } = require('firebase/storage');

let env;
const bytes = (n = 10) => new Uint8Array(n).fill(7);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ceylo',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8085 },
    storage: { rules: fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
});

async function seed(docs) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [p, data] of Object.entries(docs)) await setDoc(doc(ctx.firestore(), p), data);
  });
}
async function seedFile(p) {
  await env.withSecurityRulesDisabled(async (ctx) => { await uploadBytes(ref(ctx.storage(), p), bytes()); });
}
const st = (uid) => env.authenticatedContext(uid).storage();
const anon = () => env.unauthenticatedContext().storage();

describe('SOS files', () => {
  beforeEach(() => seed({
    'sos_alerts/a1': { userId: 't1', status: 'active' },
    'users/desk': { role: 'admin' },
    'users/t2': { role: 'tourist' },
  }));

  test('the traveller who raised the alert can upload evidence and live frames', async () => {
    await assertSucceeds(uploadBytes(ref(st('t1'), 'sos_alerts/a1_live.jpg'), bytes()));
    await assertSucceeds(uploadBytes(ref(st('t1'), 'sos_alerts/a1_evidence_123.jpg'), bytes()));
  });

  test('another traveller cannot upload to or read someone else\'s alert', async () => {
    await assertFails(uploadBytes(ref(st('t2'), 'sos_alerts/a1_live.jpg'), bytes()));
    await seedFile('sos_alerts/a1_live.jpg');
    await assertFails(getBytes(ref(st('t2'), 'sos_alerts/a1_live.jpg')));
    await assertFails(getBytes(ref(anon(), 'sos_alerts/a1_live.jpg')));
  });

  test('the emergency desk can read frames and send a voice note', async () => {
    await seedFile('sos_alerts/a1_live.jpg');
    await assertSucceeds(getBytes(ref(st('desk'), 'sos_alerts/a1_live.jpg')));
    await assertSucceeds(uploadBytes(ref(st('desk'), 'sos_alerts/a1_admin_audio_1.webm'), bytes()));
  });

  test('phone uploads under their own folder need no alert lookup', async () => {
    await assertSucceeds(uploadBytes(ref(st('t1'), 'sos_media/t1/a1_live.jpg'), bytes()));
    await assertFails(uploadBytes(ref(st('t2'), 'sos_media/t1/a1_live.jpg'), bytes()));
    await seedFile('sos_media/t1/a1_live.jpg');
    await assertSucceeds(getBytes(ref(st('desk'), 'sos_media/t1/a1_live.jpg')));
    await assertFails(getBytes(ref(st('t2'), 'sos_media/t1/a1_live.jpg')));
  });

  test('files over 25 MB are refused', async () => {
    await assertFails(uploadBytes(ref(st('t1'), 'sos_alerts/a1_evidence_9.mp4'), bytes(26 * 1024 * 1024)));
  });
});

describe('profiles, partners and orders', () => {
  test('profile photos are public but only the owner can replace theirs', async () => {
    await assertSucceeds(uploadBytes(ref(st('u1'), 'profile_photos/u1.jpg'), bytes()));
    await assertFails(uploadBytes(ref(st('u2'), 'profile_photos/u1.jpg'), bytes()));
    await assertSucceeds(getBytes(ref(anon(), 'profile_photos/u1.jpg')));
  });

  test('vendor ID documents are private, product photos are public', async () => {
    await seed({ 'users/desk': { role: 'admin' } });
    await assertSucceeds(uploadBytes(ref(st('v1'), 'vendors/v1/nic_front.jpg'), bytes()));
    await assertSucceeds(uploadBytes(ref(st('v1'), 'vendors/v1/products/p1/image_0.jpg'), bytes()));
    await assertFails(uploadBytes(ref(st('v2'), 'vendors/v1/nic_front.jpg'), bytes()));
    await assertFails(getBytes(ref(st('t1'), 'vendors/v1/nic_front.jpg')));
    await assertSucceeds(getBytes(ref(st('desk'), 'vendors/v1/nic_front.jpg')));
    await assertSucceeds(getBytes(ref(anon(), 'vendors/v1/products/p1/image_0.jpg')));
  });

  test('guide documents are visible only to the guide and the admin team', async () => {
    await seed({ 'users/desk': { role: 'guide_manager' } });
    await assertSucceeds(uploadBytes(ref(st('g1'), 'guide_documents/g1/licence_1.jpg'), bytes()));
    await assertFails(getBytes(ref(st('t1'), 'guide_documents/g1/licence_1.jpg')));
    await assertSucceeds(getBytes(ref(st('desk'), 'guide_documents/g1/licence_1.jpg')));
  });

  test('only the order\'s vendor uploads proof; the traveller can see it', async () => {
    await seed({ 'orders/o1': { vendorId: 'v1', touristId: 't1', status: 'ready' } });
    await assertSucceeds(uploadBytes(ref(st('v1'), 'orders/o1/proof.jpg'), bytes()));
    await assertFails(uploadBytes(ref(st('t1'), 'orders/o1/proof.jpg'), bytes()));
    await assertSucceeds(getBytes(ref(st('t1'), 'orders/o1/proof.jpg')));
    await assertFails(getBytes(ref(st('t2'), 'orders/o1/proof.jpg')));
  });

  test('driver documents are visible only to the driver and the admin team', async () => {
    await seed({ 'users/staff': { role: 'admin' }, 'users/t2': { role: 'tourist' } });
    await assertSucceeds(uploadBytes(ref(st('d1'), 'driver_documents/d1/licence_front.jpg'), bytes()));
    await assertFails(uploadBytes(ref(st('t2'), 'driver_documents/d1/licence_front.jpg'), bytes()));
    await seedFile('driver_documents/d1/vehicle_cr.pdf');
    await assertSucceeds(getBytes(ref(st('staff'), 'driver_documents/d1/vehicle_cr.pdf')));
    await assertFails(getBytes(ref(st('t2'), 'driver_documents/d1/vehicle_cr.pdf')));
    await assertFails(uploadBytes(ref(st('d1'), 'driver_documents/d1/big.pdf'), bytes(11 * 1024 * 1024)));
  });

  test('unknown paths are closed', async () => {
    await assertFails(uploadBytes(ref(st('u1'), 'random/file.jpg'), bytes()));
  });
});
