const { reply } = require('../ai/concierge');

const blank = { destination: null, days: null, budget: null, mood: null, eco_interest: 50 };

describe('travel assistant in the concierge', () => {
  test('where to stay asks the app for real lodging near the place, with price bands', () => {
    const r = reply('where should I stay in Kandy?', blank);
    expect(r.places).toEqual({ type: 'lodging', near: { name: 'Kandy', lat: 7.2906, lon: 80.6337 } });
    expect(r.resp).toMatch(/Kandy Lake/);
    expect(r.resp).toMatch(/LKR/);
  });

  test('food questions return local dishes and nearby restaurants', () => {
    const r = reply('best food in Galle', blank);
    expect(r.places.type).toBe('restaurant');
    expect(r.resp).toMatch(/ambul thiyal/);
  });

  test('route questions give both ends so the app can fetch the shortest road route', () => {
    const r = reply('how do I get from Colombo to Kandy', blank);
    expect(r.action).toBe('route');
    expect(r.route.from.name).toBe('Colombo');
    expect(r.route.to.name).toBe('Kandy');
    expect(r.resp).toMatch(/Train/);
    expect(reply('Kandy to Ella', blank).route.to.name).toBe('Ella');
    expect(reply('how do I get to Sigiriya', blank).route.from).toBeNull();
  });

  test('a question does not change the trip being planned', () => {
    const trip = { ...blank, destination: 'Kandy', days: 3 };
    expect(reply('best food in Galle', trip).extractedState.destination).toBe('Kandy');
    expect(reply('Colombo to Galle', trip).extractedState.destination).toBe('Kandy');
  });

  test('"I want to go to Mirissa" still plans a trip, not a route', () => {
    const r = reply('I want to go to Mirissa', blank);
    expect(r.action).toBeUndefined();
    expect(r.extractedState.destination).toBe('Mirissa');
  });

  test('cost questions list typical prices', () => {
    expect(reply('how much does a tuk tuk cost', blank).resp).toMatch(/Tuk-tuk/);
  });

  test('asking for the plan once the trip is complete tells the app to build it', () => {
    const trip = { ...blank, destination: 'Kandy', days: 3, budget: 'Standard' };
    expect(reply('create my plan', trip).action).toBe('generate_itinerary');
    expect(reply('yes', trip).action).toBe('generate_itinerary');
  });
});
