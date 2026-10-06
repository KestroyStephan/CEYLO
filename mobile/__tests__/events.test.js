// Date-aware events: a festival is only matched to a trip it actually falls in
jest.mock('../firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), getDocs: jest.fn(() => Promise.reject(new Error('offline'))) }));
jest.mock('../services/ItineraryService', () => ({ distanceKm: () => 0 }));

import calendar from '../assets/data/sri_lanka_calendar.json';
import { eventOverlaps, eventsDuring, loadEvents } from '../utils/events';

const byId = (id) => calendar.events.find(e => e.id === id);
const ev = (e) => ({ ...e, date: e.date ? `${e.date}T00:00:00` : null, endDate: e.endDate ? `${e.endDate}T00:00:00` : null, months: e.dateConfirmed === false ? e.months : null });

describe('calendar data', () => {
  test('every dated entry has a valid date, a source and a category', () => {
    for (const e of calendar.events) {
      expect(e.title).toBeTruthy();
      expect(e.category).toBeTruthy();
      expect(e.source).toBeTruthy();
      if (e.dateConfirmed !== false) expect(Number.isNaN(Date.parse(e.date))).toBe(false);
      else expect(e.months.length).toBeGreaterThan(0);
    }
  });

  test('uses the gazetted dates', () => {
    expect(byId('lk-2026-deepavali').date).toBe('2026-11-08');
    expect(byId('lk-2027-deepavali').date).toBe('2027-10-28');
    expect(byId('lk-2027-poya-vesak').date).toBe('2027-05-19');
    expect(byId('lk-2026-kandy-esala-perahera').endDate).toBe('2026-08-28');
  });
});

describe('eventOverlaps', () => {
  const deepavali = ev(byId('lk-2026-deepavali'));
  const perahera = ev(byId('lk-2026-kandy-esala-perahera'));
  const whales = ev(byId('lk-season-whale-mirissa'));

  test('Deepavali (8 Nov) is not suggested for an August trip', () => {
    expect(eventOverlaps(deepavali, new Date(2026, 7, 10), new Date(2026, 7, 20))).toBe(false);
  });

  test('Deepavali is suggested for a trip that includes 8 November', () => {
    expect(eventOverlaps(deepavali, new Date(2026, 10, 5), new Date(2026, 10, 9))).toBe(true);
  });

  test('a multi-day festival matches a trip that touches any of its days', () => {
    expect(eventOverlaps(perahera, new Date(2026, 7, 27), new Date(2026, 8, 3))).toBe(true);
    expect(eventOverlaps(perahera, new Date(2026, 7, 29), new Date(2026, 8, 3))).toBe(false);
  });

  test('a season matches by month only', () => {
    expect(eventOverlaps(whales, new Date(2026, 11, 20), new Date(2026, 11, 27))).toBe(true);
    expect(eventOverlaps(whales, new Date(2026, 6, 1), new Date(2026, 6, 10))).toBe(false);
  });

  test('eventsDuring keeps only matching events', () => {
    const list = eventsDuring([deepavali, perahera, whales], new Date(2026, 10, 1), new Date(2026, 10, 10));
    expect(list.map(e => e.title)).toEqual([deepavali.title, whales.title]);
  });
});

test('offline, the bundled calendar is used and past events are dropped', async () => {
  const events = await loadEvents();
  expect(events.length).toBeGreaterThan(0);
  const cutoff = Date.now() - 86400000;
  events.filter(e => !e.months).forEach(e => expect(new Date(e.endDate || e.date).getTime()).toBeGreaterThanOrEqual(cutoff));
});
