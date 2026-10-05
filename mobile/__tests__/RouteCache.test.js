jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///docs/' }));

import { cacheRoute, getCachedRoute, stopsOf, compass, routeBounds } from '../services/RouteCache';
import { corridorTiles } from '../utils/offlineMapUtils';

const plan = [
  { title: 'Galle Fort', lat: 6.0269, lon: 80.217 },
  { title: 'Unawatuna', lat: 6.0106, lon: 80.2489 },
  { title: 'No location' },
];

const osrmReply = {
  code: 'Ok',
  routes: [{
    distance: 5200, duration: 600,
    geometry: { coordinates: [[80.217, 6.0269], [80.23, 6.02], [80.2489, 6.0106]] },
    legs: [{
      distance: 5200, duration: 600,
      steps: [
        { name: 'Church Street', distance: 300, maneuver: { type: 'depart', bearing_after: 90, location: [80.217, 6.0269] } },
        { name: 'Matara Road', distance: 4900, maneuver: { type: 'turn', modifier: 'left', location: [80.22, 6.025] } },
        { name: '', distance: 0, maneuver: { type: 'arrive', location: [80.2489, 6.0106] } },
      ],
    }],
  }],
};

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('offline route cache (FR-021)', () => {
  test('keeps only stops that have a location', () => {
    expect(stopsOf(plan).map(s => s.name)).toEqual(['Galle Fort', 'Unawatuna']);
  });

  test('stores the road route with readable turn instructions', async () => {
    global.fetch.mockResolvedValue({ json: async () => osrmReply });
    const route = await cacheRoute('it1', plan);
    expect(route.straight).toBe(false);
    expect(route.line).toHaveLength(3);
    expect(route.steps.map(s => s.text)).toEqual([
      'Head east on Church Street',
      'Turn left onto Matara Road',
      'Arrive at Unawatuna',
    ]);
    expect(await getCachedRoute('it1')).toEqual(route);
  });

  test('re-uses the stored route without a network call while stops are unchanged', async () => {
    global.fetch.mockResolvedValue({ json: async () => osrmReply });
    await cacheRoute('it2', plan);
    global.fetch.mockClear();
    await cacheRoute('it2', plan);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('falls back to a straight-line guide when offline', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));
    const route = await cacheRoute('it3', plan);
    expect(route.straight).toBe(true);
    expect(route.steps[0].text).toBe('Head to Unawatuna');
  });

  test('compass directions', () => {
    expect(compass(0)).toBe('north');
    expect(compass(95)).toBe('east');
    expect(compass(225)).toBe('south-west');
    expect(compass(-45)).toBe('north-west');
  });

  test('map tiles cover the route corridor without duplicates', () => {
    const line = [{ latitude: 6.0269, longitude: 80.217 }, { latitude: 6.0106, longitude: 80.2489 }];
    const tiles = corridorTiles(line, routeBounds({ line }));
    const keys = tiles.map(t => `${t.z}/${t.x}/${t.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(tiles.some(t => t.z === 14)).toBe(true);
    expect(tiles.length).toBeLessThan(200);
  });
});
