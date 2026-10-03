/**
 * CEYLO concierge: the trained intent classifier plus slot filling for the trip profile.
 * Returns the same shape the mobile chatbot screen renders:
 * { resp, extractedState, isReady, ui_options, recommendations?, intent, confidence }
 */
const { classifyIntent, chatbotResponses } = require('./models');
const { recommend } = require('./recommender');
const { events, findPlace, MONTHS } = require('./places');

// Below this the classifier is guessing, so rely on the extracted trip details instead
const CONFIDENT = 0.45;

const INFO_INTENTS = new Set(['best_time', 'eco_tips', 'sos', 'currency', 'visa', 'food', 'capabilities']);

const NUMBER_WORDS = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, a: 1, an: 1,
};

function extractDays(text, awaitingDays) {
    if (/\bfortnight\b/.test(text)) return 14;
    if (/\b(long )?weekend\b/.test(text)) return /long weekend/.test(text) ? 3 : 2;
    const m = text.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|a|an)[\s-]*(day|days|night|nights|week|weeks)\b/);
    if (m) {
        const n = NUMBER_WORDS[m[1]] || parseInt(m[1], 10);
        const days = m[2].startsWith('week') ? n * 7 : m[2].startsWith('night') ? n + 1 : n;
        return Math.min(30, Math.max(1, days));
    }
    // A bare number is an answer when we have just asked how many days
    if (awaitingDays) {
        const bare = text.match(/^\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)\s*$/);
        if (bare) return Math.min(30, Math.max(1, NUMBER_WORDS[bare[1]] || parseInt(bare[1], 10)));
    }
    return null;
}

function extractBudget(text) {
    if (/\b(luxury|luxurious|premium|five[- ]star|5[- ]star|high[- ]end|splurge|money is not)/.test(text)) return 'Luxury';
    if (/\b(budget|cheap|economy|economical|backpack\w*|low[- ]cost|affordable|shoestring)\b/.test(text)) return 'Economy';
    if (/\b(standard|mid[- ]?range|moderate|medium|average|comfortable)\b/.test(text)) return 'Standard';
    return null;
}

const MOOD_PATTERNS = [
    ['Spiritual', /\b(spiritual|meditat\w*|pilgrim\w*|religious|sacred|worship)\b/],
    ['Adventurer', /\b(adventur\w*|surf\w*|rafting|climb\w*|thrill\w*|diving|extreme)\b/],
    ['Culture Seeker', /\b(cultur\w*|heritage|temples?|histor\w*|ruins|museums?|ancient)\b/],
    ['Eco Explorer', /\b(eco|eco-friendly|nature|green|hik\w*|trek\w*|wildlife|safari\w*|waterfalls?|birds?|rainforest|sustainab\w*)\b/],
    ['Family', /\b(family|kids|children|relax\w*|beach(es)?|romantic|honeymoon|chill)\b/],
];

function extractMood(text) {
    const hit = MOOD_PATTERNS.find(([, re]) => re.test(text));
    return hit ? hit[0] : null;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function summary(state) {
    const parts = [];
    if (state.days) parts.push(`${state.days} day${state.days === 1 ? '' : 's'}`);
    if (state.destination) parts.push(`in ${state.destination}`);
    if (state.mood) parts.push(`as ${/^[aeiou]/i.test(state.mood) ? 'an' : 'a'} ${state.mood}`);
    if (state.budget) parts.push(`on ${/^[aeiou]/i.test(state.budget) ? 'an' : 'a'} ${state.budget.toLowerCase()} budget`);
    return parts.join(' ');
}

const isReady = (s) => Boolean((s.destination || s.mood) && s.days);

// The next thing we need to know, with quick-reply chips
function nextQuestion(state) {
    if (!state.destination && !state.mood) {
        return {
            awaiting: 'destination',
            text: 'Where would you like to go, or what kind of trip is it?',
            options: ['Culture & temples', 'Nature & wildlife', 'Beaches & family', 'Adventure'],
        };
    }
    if (!state.days) {
        return { awaiting: 'days', text: 'How many days do you have?', options: ['3 days', '5 days', '7 days', '10 days'] };
    }
    if (!state.budget) {
        return { awaiting: 'budget', text: 'And your budget style?', options: ['Economy', 'Standard', 'Luxury'] };
    }
    return null;
}

function readyReply(state) {
    return {
        text: `Perfect: ${summary(state)}. Tap "Generate Itinerary" and I'll build your day-by-day plan with our recommender.`,
        options: ['Suggest places first', 'Start over'],
    };
}

function toCards(matches) {
    return matches.map(m => ({
        id: m.id, name: m.name, category: m.category, province: m.province,
        ecoScore: m.ecoScore, rating: m.rating, image: m.image, reason: m.reason,
    }));
}

function eventsReply(text, state) {
    const monthIdx = MONTHS.findIndex(m => text.includes(m));
    const place = findPlace(text) || (state.destination ? findPlace(state.destination) : null);
    let list = events;
    let label;
    if (monthIdx >= 0) {
        list = events.filter(e => e.occurrence_month === MONTHS[monthIdx].replace(/^./, c => c.toUpperCase()));
        label = `in ${MONTHS[monthIdx].replace(/^./, c => c.toUpperCase())}`;
    } else if (place) {
        const key = place.name.toLowerCase().replace(' province', '');
        list = events.filter(e => e.location.toLowerCase().includes(key) || e.location.toLowerCase().includes(place.province.toLowerCase().replace(' province', '')));
        label = `around ${place.name}`;
    } else {
        // The next three months
        const now = new Date().getMonth();
        const upcoming = [0, 1, 2].map(i => MONTHS[(now + i) % 12]);
        list = events.filter(e => upcoming.includes(String(e.occurrence_month).toLowerCase()));
        label = 'in the next three months';
    }
    if (list.length === 0) {
        return `I don't have festivals listed ${label}. Open Cultural Events in the app to browse the full calendar.`;
    }
    const lines = list.slice(0, 4).map(e => `• ${e.name}: ${e.occurrence_month}, ${e.location}`);
    return `Cultural events ${label}:\n${lines.join('\n')}\nYou can set reminders from the Cultural Events screen.`;
}

/**
 * One concierge turn.
 * @param {string} message - what the traveller typed
 * @param {object} state - the trip profile so far (destination, days, budget, mood, awaiting)
 */
function reply(message, state = {}) {
    const text = String(message || '').toLowerCase().trim();
    const ranked = classifyIntent(text);
    const { intent, confidence } = ranked[0];
    const prev = {
        destination: state.destination || null,
        days: state.days || null,
        budget: state.budget || null,
        mood: state.mood || null,
        eco_interest: state.eco_interest ?? 50,
    };

    // Trip details in the message
    const found = {};
    const place = findPlace(text);
    if (place) found.destination = place.name;
    const days = extractDays(text, state.awaiting === 'days');
    if (days) found.days = days;
    const budget = extractBudget(text);
    if (budget) found.budget = budget;
    const mood = extractMood(text);
    if (mood) found.mood = mood;

    // A question ("best time for Mirissa?") is answered without changing the trip;
    // a statement with trip details ("Kandy", "5 days") fills the trip profile
    const isQuestion = /\?|^(what|when|where|how|is|are|can|could|do|does|should|which|who|why|tell me)\b/.test(text);
    const confidentInfo = confidence >= CONFIDENT && (intent.startsWith('faq_') || INFO_INTENTS.has(intent)) &&
        (isQuestion || Object.keys(found).length === 0);
    if (confidentInfo) for (const k of Object.keys(found)) delete found[k];
    let next = { ...prev, ...found };
    if (found.mood === 'Eco Explorer') next.eco_interest = Math.max(next.eco_interest, 80);

    const out = (resp, options, extra = {}) => {
        const q = isReady(next) ? null : nextQuestion(next);
        return {
            resp,
            extractedState: { ...next, awaiting: extra.awaiting ?? (q ? q.awaiting : null) },
            isReady: isReady(next),
            ui_options: options || [],
            intent,
            confidence: Math.round(confidence * 1000) / 1000,
            ...(extra.recommendations ? { recommendations: extra.recommendations } : {}),
        };
    };

    // Answer factual questions, then nudge the trip profile forward
    if (confidentInfo) {
        const answer = pick(chatbotResponses[intent]);
        const q = nextQuestion(next);
        const followUp = q && (next.destination || next.mood) ? `\n\n${q.text}` : '';
        return out(answer + followUp, q ? q.options : ['Plan a trip', 'Suggest places']);
    }

    if (confidence >= CONFIDENT && intent === 'reset') {
        next = { destination: null, days: null, budget: null, mood: null, eco_interest: 50 };
        return out(pick(chatbotResponses.reset), nextQuestion(next).options);
    }

    if (confidence >= CONFIDENT && intent === 'events') {
        return out(eventsReply(text, next), ['Plan a trip', 'Suggest places']);
    }

    if (confidence >= CONFIDENT && intent === 'recommend_places' && Object.keys(found).length === 0) {
        const rec = recommend({ mood: next.mood, destination: next.destination, count: 3 });
        const names = rec.top_matches.map(m => m.name).join(', ');
        const q = nextQuestion(next);
        return out(
            `Our recommender's top picks for ${rec.vibe === 'All travellers' ? 'you' : `${rec.vibe} travellers`}${next.destination ? ` around ${next.destination}` : ''}: ${names}.` +
                (q ? `\n\n${q.text}` : ''),
            q ? q.options : ['Generate my itinerary'],
            { recommendations: toCards(rec.top_matches) },
        );
    }

    if (Object.keys(found).length === 0 && confidence >= CONFIDENT && ['greeting', 'thanks', 'goodbye'].includes(intent)) {
        const base = pick(chatbotResponses[intent]);
        const q = nextQuestion(next);
        if (intent === 'greeting' && (next.destination || next.mood)) {
            return out(`Welcome back! We were planning ${summary(next)}.${q ? ` ${q.text}` : ''}`, q ? q.options : readyReply(next).options);
        }
        return out(base, intent === 'goodbye' ? [] : (q ? q.options : readyReply(next).options));
    }

    if (Object.keys(found).length === 0 && confidence >= CONFIDENT && intent === 'generate_itinerary') {
        if (isReady(next)) {
            const r = readyReply(next);
            return out(r.text, r.options);
        }
        const q = nextQuestion(next);
        return out(`Almost there. ${q.text}`, q.options);
    }

    // Trip planning: acknowledge what we learned and ask for what is missing
    if (Object.keys(found).length > 0 || (confidence >= CONFIDENT && intent === 'plan_trip')) {
        const ack = Object.keys(found).length > 0 ? `Lovely, ${summary(next)}.` : pick(chatbotResponses.plan_trip);
        const extra = {};
        let reco = '';
        if (found.destination || (found.mood && !prev.mood)) {
            const rec = recommend({ mood: next.mood, destination: next.destination, count: 3 });
            extra.recommendations = toCards(rec.top_matches);
            reco = ' Here are a few places our recommender likes for you.';
        }
        if (isReady(next)) {
            const q = nextQuestion(next);
            if (q) return out(`${ack}${reco} ${q.text}`, q.options, extra);
            const r = readyReply(next);
            return out(`${r.text}${reco}`, r.options, extra);
        }
        const q = nextQuestion(next);
        return out(`${ack}${reco} ${q.text}`, q.options, extra);
    }

    // Not sure what was meant
    const q = nextQuestion(next);
    return out(
        "I'm not sure I understood that. You can tell me where you'd like to go and for how many days, " +
            'or ask me about transport, safety, weather, money or festivals.',
        q ? q.options : ['Suggest places', 'Festivals this month', 'Is tap water safe?'],
    );
}

module.exports = { reply, extractDays, extractBudget, extractMood };
