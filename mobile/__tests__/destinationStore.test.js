// Admin portal changes to destinations reach the app: edits, removals and new places
const mockDocs = [];
jest.mock('../firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: mockDocs.map(([id, data]) => ({ id, data: () => data })) })),
}));

import bundled from '../assets/data/ai_destinations.json';
import { loadDestinations } from '../utils/destinationStore';

test('applies edits, removals and new places from the portal', async () => {
  const [first, second] = bundled;
  mockDocs.push(
    [first.destination_id, { description: 'Edited by staff', province: 'Central', ecoScore: 91 }],
    [second.destination_id, { removed: true }],
    ['new-place', { name: 'Staff place', latitude: 7.1, longitude: 80.1, category: 'Beach' }],
  );
  const list = await loadDestinations();
  const edited = list.find(d => d.destination_id === first.destination_id);
  expect(edited.description).toBe('Edited by staff');
  expect(edited.province).toBe('Central Province');
  expect(edited.eco_score).toBe(91);
  expect(list.some(d => d.destination_id === second.destination_id)).toBe(false);
  expect(list.find(d => d.destination_id === 'new-place').name).toBe('Staff place');
  expect(list.length).toBe(bundled.length);
});
