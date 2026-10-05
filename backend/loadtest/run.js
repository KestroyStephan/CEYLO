/**
 * NFR-005 load test: 500 concurrent users against the recommendation and chatbot APIs.
 * Usage (from backend/):  node loadtest/run.js [baseUrl] [seconds] [pauseSeconds]
 * Start the server first with rate limits off:  DISABLE_RATE_LIMIT=1 node server.js
 * Writes the results to loadtest/results.json.
 */
const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://localhost:5000';
const duration = Number(process.argv[3] || 30);
// Windows keeps closed client ports in TIME_WAIT; pausing between scenarios stops the
// load generator itself from running out of ports (which shows up as client-side errors).
const pauseSeconds = Number(process.argv[4] || 60);
const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));
const moods = ['Eco Explorer', 'Culture Seeker', 'Adventurer', 'Family Trip', 'Spiritual'];

function run(title, opts) {
  return new Promise((resolve, reject) => {
    const inst = autocannon({ connections: 500, duration, ...opts }, (err, r) => (err ? reject(err) : resolve({ title, r })));
    autocannon.track(inst, { renderProgressBar: false, renderResultsTable: false });
  });
}

(async () => {
  let i = 0;
  const scenarios = [
    ['POST /api/recommend', {
      url: `${base}/api/recommend`, method: 'POST', headers: { 'content-type': 'application/json' },
      setupClient: (client) => client.setBody(JSON.stringify({ mood: moods[i++ % moods.length], days: 5, budget: 'Standard', ecoInterest: 70, month: 10 })),
    }],
    ['POST /api/chat', {
      url: `${base}/api/chat`, method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'I want a 4 day eco trip to Ella', state: {} }),
    }],
    ['GET /api/health', { url: `${base}/api/health` }],
  ];
  const results = [];
  for (const [n, [title, opts]] of scenarios.entries()) {
    if (n > 0) await sleep(pauseSeconds);
    const { r } = await run(title, opts);
    const row = {
      endpoint: title, connections: 500, seconds: duration,
      requests: r.requests.total, perSecond: Math.round(r.requests.average),
      latencyMsMean: r.latency.average, latencyMsP50: r.latency.p50, latencyMsP97_5: r.latency.p97_5, latencyMsP99: r.latency.p99,
      errors: r.errors, timeouts: r.timeouts, non2xx: r.non2xx,
    };
    results.push(row);
    console.log(JSON.stringify(row));
  }
  const out = { date: new Date().toISOString(), base, node: process.version, results };
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(out, null, 2));
})();
