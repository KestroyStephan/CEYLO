# CEYLO device smoke test (Phase 0)

Run on a mid-range Android phone with the **EAS development build** (not Expo Go).
Tick each line; write the failure and a screenshot path next to anything that fails.

Tester: ______________ Device / Android version: ______________ Date: __________

## Before you start
- [ ] Firestore rules and indexes deployed: `firebase deploy --only firestore`
- [ ] Render backend has `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` and `/api/health` shows them as `true`
- [ ] `mobile/.env` has `EXPO_PUBLIC_BACKEND_URL` (or uses the Render URL) and `EXPO_PUBLIC_SOS_SMS_NUMBER`
- [ ] `web/.env` has `VITE_BACKEND_URL`
- [ ] App SHA-1 added in Firebase console (needed for Google sign-in)

## Accounts and onboarding
- [ ] Register as **tourist** → mood screen → home
- [ ] **Continue as guest** → mood screen → home (must not get stuck)
- [ ] **Google sign-in** creates a tourist account
- [ ] Register as **guide** → onboarding form → "pending" screen
- [ ] Register as **driver** → "pending" screen
- [ ] Register as **vendor** → registration wizard with documents → "pending" screen, **no bypass button**
- [ ] Forgot password email arrives (mobile and web)
- [ ] A user banned in the admin portal is signed out with "Account Suspended"

## Tourist features
- [ ] Home: eco points show a real number (0 for a new user), "Plan Trip" opens the form
- [ ] Plan Trip → itinerary with 5–10 stops, distance and travel time per leg
- [ ] Turn on airplane mode → Plan Trip still works ("Offline Mode")
- [ ] Itinerary: drag to reorder and swap a stop, reopen → changes kept
- [ ] Itinerary: "Start Multi-Stop Route" opens Google Maps with all stops; Export PDF works
- [ ] Chatbot answers and remembers the destination from an earlier message
- [ ] Chatbot shows destination cards (e.g. type "Kandy") without crashing
- [ ] Explore map opens without a crash; region chips move the map and load places
- [ ] Offline Maps: download "Colombo & Western", turn on airplane mode → the map still shows that area
- [ ] Cultural events: list loads, filters show results, "Near Me" works, tapping opens the event
- [ ] Event: "Remind Me" schedules a notification; bell icon asks for background location
- [ ] Eco Passport shows real stats; certificate PDF opens
- [ ] Profile → Language switches to Sinhala and Tamil
- [ ] Book a guide → guide sees it → accept → chat works both ways

## SOS
- [ ] SOS → 3-second countdown → alert appears in admin SOS monitor within a few seconds
- [ ] Back arrow on SOS screen does not crash
- [ ] Nearest hospital / police / pharmacy show real places with call buttons
- [ ] Attach video evidence (asks for microphone) → appears in admin
- [ ] Airplane mode + SOS → SMS app opens to the desk number; after reconnecting the alert appears in admin with channel `sms`

## Providers
- [ ] Admin approves vendor → vendor app switches to the vendor portal
- [ ] Admin approves driver from **Drivers** page → driver dashboard opens
- [ ] Tourist requests a ride → online driver accepts → tracking works → complete → rating
- [ ] Vendor revenue screen loads with completed orders (no crash)

## Admin portal (web)
- [ ] A tourist account cannot open the admin dashboard (shows 403)
- [ ] Staff login lands on the dashboard; Drivers, Notifications, Marketing, Analytics in the menu
- [ ] Broadcast notification reaches a phone
- [ ] System Health shows measured response time and availability (no random numbers)
- [ ] Reports shows real totals (0 when there are no paid bookings)
- [ ] Delete a destination works
