# CEYLO — Project Structure & Codebase Reference

> **AI Context Document** — Last updated 2026-06-30. This file is the authoritative reference for AI-assisted development on the CEYLO platform. Read this before making changes or adding new features.

---

## 1. Project Overview

**App Name:** CEYLO
**Full Title:** CEYLO: An AI-Powered Smart Guide for Sustainable Eco and Cultural Tourism in Sri Lanka
**Purpose:** A comprehensive tourism and safety platform for Sri Lanka. Connects tourists with eco-friendly destinations, local vendors, transport drivers, and tour guides, while providing AI-powered trip planning and an emergency SOS system.

**Target Users:**
- **Tourists** — Primary users; browse destinations, plan trips with AI, book vendors, use SOS
- **Drivers** — Manage ride requests and availability
- **Guides** — Manage tour assignments and guest interactions
- **Vendors** — Manage service listings, orders, and revenue (Homestays, Food, Tours, etc.)
- **Admins** — Manage the full ecosystem via the web portal

**Platform:** React Native (Expo SDK 54, React Native 0.81.5) — Android + iOS
**App ID (Android):** `com.ceylo.mobile`
**App Version:** 1.0.0 (displayed in UI as `v1.0.4 Premium`)
**Architecture:** Monorepo with two sub-projects: `/mobile` and `/web`

**Backend Services:**
- **Firebase Authentication** — Email/Password login, session persistence via AsyncStorage
- **Cloud Firestore** — Real-time NoSQL database for all app data
- **Firebase Storage** — Images for vendor services, proof of service, NIC documents
- **Expo Push Notifications** — Booking confirmations, chat messages, vendor approvals

**AI Services:**
- **Multi-Model Chatbot Waterfall** (ChatbotScreen): Groq Llama 3.3-70b (primary) → Gemini 1.5 Flash → OpenAI GPT-4o-mini
- **AI-Powered Marketplace** (MarketplaceScreen): Groq Llama 3-8b-8192 with JSON mode generates live Sri Lankan product/experience listings
- **AI Destination Insights** (DestinationDetailScreen): Groq Llama 3.3-70b generates history, practical info, opening hours, and nearby attractions per place
- **AI Picks / Nearby** (HomeScreen): Google Places Text Search API fetches real nearby attractions based on user GPS
- **Local ML Models** (ai_models/): Trained Python models for offline/edge use — Eco Scorer (Random Forest), Destination Recommender (Two-Tower NCF Neural Net), Demand Forecaster (LSTM)
- **Expo Speech (TTS)** — Text-to-speech for AI responses in chatbot

**Current Status:**
- ✅ Authentication flows (Splash, Language Select, Welcome, Login, Register, Onboarding)
- ✅ Tourist tab navigation (Home, Map, AI Chatbot, SOS, Profile) + common stack screens
- ✅ MoodSelectScreen now wired as first tourist screen after login (if not onboarded)
- ✅ AI Concierge with multi-model waterfall (Groq→Gemini→OpenAI); HUD overlay, TTS, itinerary save
- ✅ AI-powered MarketplaceScreen (Groq generates product listings on demand)
- ✅ AI-powered DestinationDetailScreen (per-place insights from Groq)
- ✅ Google Maps (MapScreen.native.js) with real Google Places Text Search for nearby places
- ✅ HiddenGemsListScreen — live GPS tracking, distance sort, loads from ai_destinations.json
- ✅ CulturalEventsScreen — live Firestore query on cultural_events, type filter, calendar view
- ✅ Full Vendor portal (Dashboard, Orders, Services, Revenue, Chat)
- ✅ Driver Dashboard (platform-split: native with live maps, web with earnings summary)
- ✅ TransportScreen (platform-split: native with MapView, web with placeholder)
- ✅ MapScreen (platform-split: native with Google Maps API, web with placeholder)
- ✅ SOS screen with emergency call shortcuts and embassy directory
- ✅ Offline queue for data persistence during connectivity loss
- ✅ Push notification service with deep-link routing
- ✅ Geofence service for location-based event notifications
- ✅ Multilingual support (English, Sinhala, Tamil) via i18next
- ✅ Web admin portal (Dashboard, Users, Vendors, SOS Monitor, Events, Destinations)
- ✅ Local ML model pipeline: trained eco_scorer_model.pkl; training scripts for recommender + demand forecaster
- ✅ AI datasets generated: destinations.csv (35k), users.csv (54k), interactions.csv (1.5MB), time_series_demand.csv (7.4MB)
- ✅ Firestore security rules updated: users, bookings, vendors, sos_alerts, destinations, cultural_events all have explicit rules
- 🚧 Recommender model (recommender_model.keras) and demand forecaster (demand_lstm_model.keras) — training scripts exist, not yet trained/exported
- 🚧 Itinerary save/load from Firestore (UI exists, persistence partial)
- 🚧 SOS camera capture + upload (scaffolding exists, not fully wired)
- 🚧 Transport booking has no Firestore write (simulated)
- 🚧 AR Guide feature (button exists in EventDetailScreen, not implemented)
- 🚧 OfflineMapSettings (lists AsyncStorage regions, tile download not implemented)

---

## 2. Tech Stack

### Mobile (`/mobile`)

| Category | Technology | Version |
|---|---|---|
| Framework | React Native | 0.81.5 |
| Build Tool | Expo SDK | ~54.0.33 |
| Language | JavaScript (ES2022) | — |
| UI Library | react-native-paper (MD3) | ^5.15.1 |
| Navigation | @react-navigation/native | ^7.2.2 |
| Navigation — Stack | @react-navigation/native-stack | ^7.14.11 |
| Navigation — Tabs | @react-navigation/bottom-tabs | ^7.15.9 |
| Navigation — Drawer | @react-navigation/drawer | ^7.9.8 |
| State Management | Local React state (useState/useEffect) + Firebase real-time listeners | — |
| Backend | Firebase JS SDK | ^12.9.0 |
| Maps | react-native-maps | 1.20.1 |
| Map Directions | react-native-maps-directions | ^1.9.0 |
| Places Search | Google Places Text Search REST API (fetch) | — |
| Location | expo-location | ~19.0.8 |
| Camera | expo-camera | ~17.0.10 |
| Push Notifications | expo-notifications (via NotificationService.js) | — |
| Fonts | @expo-google-fonts/outfit | ^0.4.3 |
| Icons | @expo/vector-icons (MaterialCommunityIcons, Feather) | ^15.0.3 |
| Gradients | expo-linear-gradient | ~15.0.8 |
| Async Storage | @react-native-async-storage/async-storage | ^2.2.0 |
| Safe Area | react-native-safe-area-context | — |
| Google Sign-In | @react-native-google-signin/google-signin | ^16.1.2 |
| i18n | i18next + react-i18next | ^26.0.6 / ^17.0.4 |
| Text-to-Speech | expo-speech | ~14.0.8 |
| Drag and Drop | react-native-draggable-flatlist | ^4.0.3 |
| PDF Export | expo-print + expo-sharing | ~15.0.8 / ~14.0.8 |
| SMS | expo-sms | ~14.0.8 |
| Animations | react-native-reanimated | ~4.1.1 |
| Gestures | react-native-gesture-handler | ~2.28.0 |
| Audio | expo-av | ^16.0.8 |
| Haptics | expo-haptics | — |
| AI Primary (Chatbot) | Groq Llama 3.3-70b (REST API) | — |
| AI Fallback 1 (Chatbot) | Gemini 1.5 Flash (Google AI REST) | — |
| AI Fallback 2 (Chatbot) | OpenAI GPT-4o-mini (REST API) | — |
| AI (Marketplace/Insights) | Groq Llama 3-8b / 3.3-70b (REST API) | — |
| AI (Home/Map) | Google Places Text Search REST API | — |

### Web (`/web`)

| Category | Technology | Version |
|---|---|---|
| Build Tool | Vite | ^7.2.4 |
| Framework | React | ^19.2.0 |
| Language | JavaScript (JSX) | — |
| UI Library | Material UI (MUI) | ^7.3.10 |
| Data Grid | @mui/x-data-grid | ^8.27.0 |
| Charts | Recharts | ^3.8.1 |
| Routing | react-router-dom | ^7.13.0 |
| Backend | Firebase JS SDK | ^12.9.0 |
| Icons | @mui/icons-material + lucide-react | ^7.3.10 / ^1.8.0 |
| PDF Export | jspdf + jspdf-autotable | ^4.2.1 / ^5.0.7 |
| i18n | i18next + react-i18next | ^26.0.6 / ^17.0.4 |

### ML / AI Pipeline (Python — offline training only)

| Category | Technology | Notes |
|---|---|---|
| Data Science | pandas, numpy | Dataset generation and manipulation |
| ML Framework | scikit-learn | Eco Scorer (RandomForestRegressor) |
| DL Framework | TensorFlow / Keras | Recommender (Two-Tower NCF), Demand Forecaster (LSTM) |
| Model Export | pickle (.pkl), Keras (.keras) | Trained models saved to ai_models/ |

---

## 3. Full Directory Structure

```
/CEYLO                                  # Monorepo root
|-- README.md                           # Project overview and setup
|-- SCREENS_AND_FEATURES.md             # Manual screen inventory (pre-existing)
|-- STRUCTURE.md                        # THIS FILE
|-- firestore.rules                     # Firestore security rules (updated: users/bookings/vendors/sos/destinations/events)
|
|-- ai_datasets/                        # Generated training datasets for ML models
|   |-- chatbot_qa.csv                  # Q&A pairs for chatbot fine-tuning
|   |-- destinations.csv                # 35k+ destination records with eco scores, features
|   |-- events.csv                      # Cultural events dataset
|   |-- interactions.csv                # 1.5MB user-destination interaction logs (booked/viewed/bookmarked/reviewed)
|   |-- time_series_demand.csv          # 7.4MB daily booking counts per destination (for LSTM)
|   |-- users.csv                       # 54k synthetic user profiles
|   |-- generate_chatbot_qa.py          # Script to regenerate chatbot_qa.csv
|   |-- generate_destinations.py        # Script to regenerate destinations.csv
|   |-- generate_events.py              # Script to regenerate events.csv
|   `-- generate_users_and_interactions.py  # Script to regenerate users.csv + interactions.csv
|
|-- ai_models/                          # Trained ML model artifacts
|   |-- eco_scorer_model.pkl            # Trained RandomForest eco scorer (1.9MB) — READY
|   |-- training/
|   |   |-- train_eco_scorer.py         # Train RandomForest on destinations.csv → eco_scorer_model.pkl
|   |   |-- train_recommender.py        # Train Two-Tower NCF on interactions.csv → recommender_model.keras
|   |   `-- train_demand_forecast.py    # Train LSTM on time_series_demand.csv → demand_lstm_model.keras
|   |-- recommender_model.keras         # [NOT YET GENERATED — run train_recommender.py]
|   `-- demand_lstm_model.keras         # [NOT YET GENERATED — run train_demand_forecast.py]
|
|-- mobile/                             # React Native / Expo mobile app
|   |-- App.js                          # Root: auth state, role-based navigation, session management, onboarding check
|   |-- Theme.js                        # react-native-paper MD3 theme (colors, Outfit font)
|   |-- app.json                        # Expo config (bundle ID, icons, Google Maps API, EAS ID)
|   |-- eas.json                        # EAS Build profiles (dev/preview/prod)
|   |-- firebaseConfig.js               # Firebase init: Auth (AsyncStorage persistence), Firestore, Storage
|   |-- google-services.json            # Google services for Android Firebase
|   |-- i18n.js                         # i18next setup: loads en/si/ta, persists to AsyncStorage
|   |-- index.js                        # Expo entry point
|   |-- package.json                    # Dependencies
|   |-- .env.example                    # All required environment variable keys
|   |
|   |-- assets/
|   |   |-- adaptive-icon.png           # Android adaptive icon
|   |   |-- favicon.png                 # Web favicon
|   |   |-- icon.png                    # App icon
|   |   |-- splash-icon.png             # Splash screen image
|   |   `-- data/
|   |       |-- ai_destinations.json    # 172KB bundled destinations dataset (loaded by HomeScreen, HiddenGemsListScreen)
|   |       `-- ai_events.json          # 5KB bundled events dataset (loaded by HomeScreen)
|   |
|   |-- components/
|   |   |-- Map.native.js               # Platform shim: re-exports react-native-maps for native
|   |   |-- Map.web.js                  # Platform shim: placeholder View for web builds
|   |   `-- PermissionHandler.js        # Requests Location + Camera permissions on mount
|   |
|   |-- navigation/
|   |   |-- MainTabNavigator.js         # 5-tab bottom bar for tourists (Home/Map/AI/SOS/Profile)
|   |   `-- VendorNavigator.js          # Vendor portal: 4-tab + stack overlay screens
|   |
|   |-- screens/
|   |   |-- ChatbotScreen.js            # AI concierge: waterfall API calls (Groq→Gemini→OpenAI), HUD, TTS, itinerary save
|   |   |-- CulturalEventsScreen.js     # [NEW] Live Firestore events list: type filter chips, list/calendar view
|   |   |-- DestinationDetailScreen.js  # Place detail: AI-powered insights (history, tips, nearby) via Groq, tabbed UI
|   |   |-- DriverDashboard.native.js   # [SPLIT] Native: live map, real-time bookings, online toggle, eco optimizer
|   |   |-- DriverDashboard.web.js      # [SPLIT] Web: earnings summary placeholder, account management info
|   |   |-- EcoPassportScreen.js        # Tourist eco stats: CO2, badges, rank, points (mock data)
|   |   |-- EventDetailScreen.js        # Event detail: AR Guide button (not implemented)
|   |   |-- GuideDashboard.js           # Guide home: active guests, tour assignments from Firestore
|   |   |-- HiddenGemsListScreen.js     # [NEW] Hidden gems list: loads ai_destinations.json, live GPS sort by distance/rating/eco
|   |   |-- HomeScreen.js               # Tourist home: loads ai_destinations.json+ai_events.json, Google Places API nearby, AI picks
|   |   |-- ItineraryDetailScreen.js    # View itinerary: draggable plan, PDF export
|   |   |-- ItineraryScreen.js          # Trip config: focus/days/budget, generate trigger
|   |   |-- MapScreen.native.js         # [SPLIT] Native: Google Maps, real Places Text Search API, distance calc, bottom sheet
|   |   |-- MapScreen.web.js            # [SPLIT] Web: placeholder (react-native-maps not available on web)
|   |   |-- MarketplaceScreen.js        # AI-powered marketplace: Groq generates live product/experience JSON
|   |   |-- OfflineMapSettings.js       # Manage offline regions in AsyncStorage
|   |   |-- ProfileScreen.js            # Profile: avatar, stats (hardcoded), menu, logout
|   |   |-- SOSScreen.js                # Emergency: SOS button, call shortcuts, embassy search
|   |   |-- TransportScreen.native.js   # [SPLIT] Native: MapView, vehicle selector, location-aware booking UI
|   |   |-- TransportScreen.web.js      # [SPLIT] Web: simplified transport info placeholder
|   |   |
|   |   |-- auth/
|   |   |   |-- LoginScreen.js          # Email/password login; password reset
|   |   |   |-- RegisterScreen.js       # Registration: role selection, writes to users collection
|   |   |   |-- SplashScreen.js         # Animated branding on app init
|   |   |   `-- WelcomeScreen.js        # Entry: Login/Register/Guest options
|   |   |
|   |   |-- onboarding/
|   |   |   |-- LanguageSelectScreen.js # Language picker (en/si/ta); wired in unauthenticated stack
|   |   |   `-- MoodSelectScreen.js     # Trip mood selector; NOW wired as first screen for new tourists
|   |   |
|   |   `-- vendor/
|   |       |-- BookingManagementScreen.js      # All bookings: tabbed by status, expandable cards
|   |       |-- ProofOfServiceScreen.js         # Camera + upload proof; marks order complete
|   |       |-- VendorChatScreen.js             # Real-time chat: text/images/quick-replies/receipts
|   |       |-- VendorDashboardScreen.js        # Vendor home: online status, stats, live order feed
|   |       |-- VendorIncomingOrderScreen.js    # Incoming alert: 20s timer, accept/reject
|   |       |-- VendorOrderManagementScreen.js  # Active order stepper + camera + chat nav
|   |       |-- VendorPendingScreen.js          # Approval waiting screen; polls status field
|   |       |-- VendorRegistrationScreen.js     # 3-step wizard: business -> docs -> service
|   |       |-- VendorRevenueScreen.js          # Analytics: charts, Trust Score, reviews
|   |       `-- VendorServiceListingScreen.js   # Service CRUD: create/edit/delete with photo upload
|   |
|   |-- services/
|   |   |-- GeofenceService.js          # Background geofencing via expo-task-manager
|   |   |-- NotificationService.js      # Expo push: permissions, token, deep-link routing
|   |   `-- OfflineQueue.js             # Offline persistence: AsyncStorage queue, flush on reconnect
|   |
|   `-- translations/
|       |-- en.json                     # English strings
|       |-- si.json                     # Sinhala strings
|       `-- ta.json                     # Tamil strings
|
`-- web/                                # Vite + React admin portal
    |-- .env.example                    # Firebase env vars (VITE_ prefix)
    |-- package.json                    # Web dependencies (MUI, Firebase, Recharts)
    |-- vite.config.js                  # Vite build config
    |-- index.html                      # HTML entry
    |
    `-- src/
        |-- App.jsx                     # Router setup, role-based dashboard, PrivateRoute guard
        |-- theme.js                    # MUI theme (teal palette matching mobile)
        |-- i18n.js                     # Web i18next setup
        |
        |-- context/
        |   `-- AuthContext.jsx         # onAuthStateChanged; fetches userRole/status; login/logout
        |
        |-- components/
        |   `-- Layout.jsx              # MUI Drawer sidebar; wraps all protected pages
        |
        `-- pages/
            |-- Analytics.jsx           # Analytics dashboard with Recharts
            |-- Bookings.jsx            # Bookings list for admin
            |-- CulturalEvents.jsx      # CRUD for cultural_events collection
            |-- Dashboard.jsx           # Admin overview: live counts + charts
            |-- Destinations.jsx        # CRUD for destinations collection
            |-- Login.jsx               # Web admin login (MUI form)
            |-- Notifications.jsx       # Push notification management UI
            |-- Placeholders.jsx        # Placeholder components for unbuilt pages
            |-- ProviderRegister.jsx    # Public provider self-registration (3-step MUI Stepper)
            |-- Reports.jsx             # Report generation with jsPDF
            |-- SOSAlerts.jsx           # SOS alert list view
            |-- SOSMonitor.jsx          # Real-time SOS: live alerts, simulated CCTV, AI insights
            |-- SystemHealth.jsx        # System health monitoring
            |-- Users.jsx               # User management (MUI DataGrid)
            |-- Vendors.jsx             # Vendor management (MUI DataGrid: approve/reject/delete)
            `-- dashboards/
                |-- AccommodationDashboard.jsx  # Hotel owner: manage bookings lifecycle
                |-- TourProviderDashboard.jsx   # Tour company: packages and bookings
                `-- VendorDashboard.jsx         # Vendor web view: orders and services
```

---

## 4. Platform-Split Files

Several screens have `.native.js` / `.web.js` variants resolved automatically by Metro bundler (native) and Vite (web):

| Base Import | Native File | Web File | Notes |
|---|---|---|---|
| `./screens/DriverDashboard` | `DriverDashboard.native.js` | `DriverDashboard.web.js` | Native: live map + real-time bookings; Web: earnings summary placeholder |
| `./screens/MapScreen` | `MapScreen.native.js` | `MapScreen.web.js` | Native: full Google Maps + Places API; Web: placeholder view |
| `./screens/TransportScreen` | `TransportScreen.native.js` | `TransportScreen.web.js` | Native: MapView + vehicle selector + GPS; Web: simplified info |
| `./components/Map` | `Map.native.js` | `Map.web.js` | Native: re-exports react-native-maps; Web: placeholder View |

---

## 5. Screen Inventory

### Auth / Unauthenticated Stack

| Screen | File | Purpose | Firebase |
|---|---|---|---|
| SplashScreen | `screens/auth/SplashScreen.js` | Animated branding; shown only if not previously onboarded | None |
| LanguageSelectScreen | `screens/onboarding/LanguageSelectScreen.js` | First-run en/si/ta picker; now in unauthenticated stack | AsyncStorage only |
| WelcomeScreen | `screens/auth/WelcomeScreen.js` | Branding entry: Login/Register/Guest | None |
| LoginScreen | `screens/auth/LoginScreen.js` | Email/password login; password reset | None (auth only) |
| RegisterScreen | `screens/auth/RegisterScreen.js` | Account creation with role selection | `users` write |

### Tourist Onboarding (shown once after first login)

| Screen | File | Purpose | Notes |
|---|---|---|---|
| MoodSelectScreen | `screens/onboarding/MoodSelectScreen.js` | Trip mood/persona selector; shown if `userData.onboardingCompleted` is falsy | Sets mood in local state; onboarding flag should be written to `users` doc |

### Tourist Screens (MainTabNavigator — 5 tabs)

| Screen | File | Key Elements | Firebase / External API |
|---|---|---|---|
| HomeScreen | `screens/HomeScreen.js` | Greeting, AI Picks (Google Places API nearby + ai_destinations.json fallback), Hidden Gems (ai_destinations.json), Featured Event (ai_events.json random), pull-to-refresh | Google Places Text Search API, local JSON assets |
| MapScreen | `screens/MapScreen.native.js` | Google MapView, real Google Places Text Search (5km radius, up to 15 results), province filter chips, distance calc, bottom sheet | Google Places Text Search REST API |
| ChatbotScreen | `screens/ChatbotScreen.js` | Chat FlatList, HUD overlay (dest/days/eco%/mood), quick reply chips, mic btn (UI only), Generate Itinerary, TTS | Groq→Gemini→OpenAI waterfall; `itineraries` Firestore write |
| SOSScreen | `screens/SOSScreen.js` | Red pulse SOS btn, 3 call cards (119/1990/Tourist Police), searchable embassy list | `Linking.openURL` (calls only); no Firestore |
| ProfileScreen | `screens/ProfileScreen.js` | Avatar, 3 stat cards (hardcoded), menu items, Logout | `auth.currentUser` only |

### Tourist Secondary Screens (Stack, no tab)

| Screen | File | Purpose | Firebase / External API |
|---|---|---|---|
| DestinationDetailScreen | `screens/DestinationDetailScreen.js` | Tabbed (Overview/History/Practical/Nearby): AI-generated content via Groq Llama 3.3-70b per place; user GPS distance | Groq REST API; `expo-location` |
| HiddenGemsListScreen | `screens/HiddenGemsListScreen.js` | Loads `ai_destinations.json` where `hidden_gem=true`; live GPS tracking (10s/50m); sort by distance/rating/eco | `expo-location` live updates; local JSON |
| CulturalEventsScreen | `screens/CulturalEventsScreen.js` | Live Firestore query on `cultural_events` ordered by date; type filter chips (Festival/Religious/Cultural/Heritage/Seasonal); list + calendar view | `cultural_events` (onSnapshot) |
| EcoPassportScreen | `screens/EcoPassportScreen.js` | CO2 saved, badges, rank, points (all mock data) | None |
| ItineraryDetailScreen | `screens/ItineraryDetailScreen.js` | Draggable day plan (MOCK_PLAN), PDF export | None (Firestore load not wired) |
| ItineraryScreen | `screens/ItineraryScreen.js` | Trip config: focus slider/days/budget, generate trigger | None |
| MarketplaceScreen | `screens/MarketplaceScreen.js` | AI generates live JSON listings (Handcrafted/Tea&Spices/Workshops/Art + Experiences) via Groq Llama-3; search + category filter | Groq REST API (`llama3-8b-8192`, JSON mode) |
| TransportScreen | `screens/TransportScreen.native.js` | Vehicle selector (Tuk/Car/Van/Bike), MapView with route to destination, 3-step booking UI (simulated) | `expo-location`; no Firestore write |
| EventDetailScreen | `screens/EventDetailScreen.js` | Event detail, eco score, AR Guide btn (not implemented) | None (route.params) |
| OfflineMapSettings | `screens/OfflineMapSettings.js` | List/delete offline map regions from AsyncStorage | None |

### Driver Screens

| Screen | File | Purpose | Firebase |
|---|---|---|---|
| DriverDashboard (native) | `screens/DriverDashboard.native.js` | Online toggle, live map with current location, real-time pending bookings, eco optimizer card, earnings/trips/eco stats | `bookings` (onSnapshot, status==pending), `users` write isOnline |
| DriverDashboard (web) | `screens/DriverDashboard.web.js` | Desktop earnings summary, mobile usage advisory | None (static) |

### Guide Screens

| Screen | File | Purpose | Firebase |
|---|---|---|---|
| GuideDashboard | `screens/GuideDashboard.js` | Active guests (hardcoded mock), tour assignments (real-time) | `tours` (onSnapshot, guideId==uid) |

### Vendor Screens (VendorNavigator)

| Screen | File | Purpose | Firebase |
|---|---|---|---|
| VendorDashboardScreen | `screens/vendor/VendorDashboardScreen.js` | Online status, daily stats, live pending orders with 30s countdown + haptics | `vendors` (doc listener), `orders` (collection listener) |
| BookingManagementScreen | `screens/vendor/BookingManagementScreen.js` | Tabbed bookings (Pending/Confirmed/Active/Completed/Cancelled) | `vendors/{uid}/orders` (onSnapshot) |
| VendorServiceListingScreen | `screens/vendor/VendorServiceListingScreen.js` | Service CRUD: modal form, photo upload, eco toggle | `vendors/{uid}/services` (onSnapshot), Storage |
| VendorRevenueScreen | `screens/vendor/VendorRevenueScreen.js` | Revenue charts, Trust Score, top services, recent reviews | `vendors/{uid}/orders` (read) |
| VendorIncomingOrderScreen | `screens/vendor/VendorIncomingOrderScreen.js` | 20s accept/reject timer; auto-rejects on timeout | `vendors/{uid}/orders` update, `bookings` update |
| VendorOrderManagementScreen | `screens/vendor/VendorOrderManagementScreen.js` | Status stepper (Accepted→Preparing→Ready→Completed) + camera + chat | `vendors/{uid}/orders` update, `bookings` update |
| ProofOfServiceScreen | `screens/vendor/ProofOfServiceScreen.js` | Camera capture + upload proof photo; marks order complete | Storage upload, `bookings` status update |
| VendorChatScreen | `screens/vendor/VendorChatScreen.js` | Real-time chat: text, images, quick replies, read receipts, typing indicator | `chats/{bookingId}/messages` (onSnapshot) |
| VendorRegistrationScreen | `screens/vendor/VendorRegistrationScreen.js` | 3-step wizard: Business Info (GPS) → NIC/cert upload → First service | `vendors` write, `vendors/{uid}/services` write, Storage |
| VendorPendingScreen | `screens/vendor/VendorPendingScreen.js` | Waiting for admin approval; polls Firestore; auto-redirects on approval | `users` (onSnapshot, status field) |

---

## 6. Firestore Data Models

### `users` Collection
Document ID = Firebase Auth UID

```javascript
{
  uid: string,
  name: string,
  email: string,
  phone: string,                     // +94 format
  role: string,                      // tourist | driver | guide | vendor | vendor_onboarding | vendor_pending | admin | accommodation | tour_provider
  createdAt: string,                 // ISO date string
  isOnboarded: boolean,
  onboardingCompleted: boolean,      // NEW: checked in App.js to show MoodSelectScreen
  isOnline: boolean,                 // drivers: current availability
  expoPushToken: string,             // written by NotificationService on login
  status: string,                    // vendors (web): pending_verification | approved | rejected
  // driver-specific
  vehicleType: string,
  licensePlate: string,
  // guide-specific
  guideLicense: string,
}
```

### `vendors` Collection
Document ID = vendor's Firebase Auth UID

```javascript
{
  uid: string,
  businessName: string,
  businessType: string,              // Homestay | Tour Guide | Transport | Food & Beverage | Artisan | Equipment Rental
  phone: string,
  address: string,
  onlineStatus: string,             // online | busy | closed
  status: string,                   // pending_verification | approved | rejected
  nicFrontUrl: string,
  nicBackUrl: string,
  businessCertUrl: string,
  servicePhotoUrls: string[],
  createdAt: Timestamp,
}
```

Sub-collection `vendors/{uid}/services`:
```javascript
{
  name: string,
  description: string,
  price: number,                     // LKR
  duration: string,
  maxCapacity: number,
  ecoCertified: boolean,
  photoUrl: string,
  isAvailable: boolean,
  createdAt: Timestamp,
}
```

Sub-collection `vendors/{uid}/orders`:
```javascript
{
  bookingId: string,
  touristId: string,
  touristName: string,
  items: array,
  status: string,                   // pending | accepted | preparing | ready | completed | cancelled
  totalAmount: number,
  createdAt: Timestamp,
  notes: string,
}
```

### `bookings` Collection
```javascript
{
  userId: string,                   // tourist UID
  userName: string,
  driverId: string,                 // assigned on acceptance
  status: string,                   // pending | Confirmed | Checked In | Completed | Cancelled
  pickup: string,
  dropoff: string,
  price: number,                    // LKR
  createdAt: Timestamp,
}
```

### `tours` Collection
```javascript
{
  guideId: string,
  title: string,
  description: string,
  date: string,
  groupSize: number,
  imageUrl: string,
  status: string,
}
```

### `destinations` Collection
```javascript
{
  name: string,
  description: string,
  imageUrl: string,
  ecoScore: number,                 // 0-100
  category: string,
  isEco: boolean,
  isHiddenGem: boolean,
  rating: number,
}
```

### `cultural_events` Collection
```javascript
{
  title: string,
  date: string,                     // ISO date string; ordered by this field in CulturalEventsScreen
  location: string,
  description: string,
  type: string,                     // Festival | Religious | Cultural | Heritage | Seasonal
  imageUrl: string,
  ecoScore: number,
}
```

### `itineraries` Collection
```javascript
{
  userId: string,
  title: string,
  createdAt: string,
  plan: [{ day: number, activity: string, eco: number }]
}
```

### `sos_alerts` Collection
```javascript
{
  userId: string,
  timestamp: Timestamp,
  location: { latitude: number, longitude: number },
  status: string,                   // active | resolved
  photoUrl: string,
}
```

### `EmergencyLogs` Collection
Written by OfflineQueue when flushing offline SOS events. Same structure as sos_alerts.

### `chats/{bookingId}/messages` Sub-collection
```javascript
{
  senderId: string,
  senderName: string,
  text: string,
  imageUrl: string,                 // optional
  timestamp: Timestamp,
  read: boolean,
}
```

### `reviews` Collection
Written by OfflineQueue on flush.
```javascript
{
  vendorId: string,
  touristId: string,
  rating: number,                   // 1-5
  comment: string,
  createdAt: Timestamp,
}
```

---

## 7. Navigation Structure

### Mobile Navigation Tree

```
App.js (Root Stack Navigator)
|
|-- [UNAUTHENTICATED]
|   |-- Splash           (SplashScreen)        [only if !isOnboarded]
|   |-- LanguageSelect   (LanguageSelectScreen) [NEW: now in unauthenticated stack]
|   |-- Welcome          (WelcomeScreen)
|   |-- Login            (LoginScreen)
|   `-- Register         (RegisterScreen)
|
`-- [AUTHENTICATED — role + onboarding determines root screen]
    |
    |-- role = tourist + !onboardingCompleted --> MoodSelect (MoodSelectScreen)
    |
    |-- role = tourist + onboardingCompleted  --> Main (MainTabNavigator)
    |   |-- HomeTab     (HomeScreen)
    |   |-- MapTab      (MapScreen)          resolved to MapScreen.native.js
    |   |-- AITab       (ChatbotScreen)      badge: "!"
    |   |-- SOSTab      (SOSScreen)          red icon
    |   `-- ProfileTab  (ProfileScreen)
    |
    |-- role = driver   --> DriverDashboard  resolved to DriverDashboard.native.js
    |
    |-- role = guide    --> GuideDashboard
    |
    |-- role = vendor   --> VendorPortal (VendorNavigator)
    |   |-- VendorTabs (Bottom Tab)
    |   |   |-- VendorDashboard   (VendorDashboardScreen)
    |   |   |-- VendorOrders      (BookingManagementScreen)
    |   |   |-- VendorServices    (VendorServiceListingScreen)
    |   |   `-- VendorRevenue     (VendorRevenueScreen)
    |   `-- [Stack overlays]
    |       |-- VendorIncomingOrder
    |       |-- VendorChat
    |       |-- ProofOfService
    |       `-- VendorOrderManagement
    |
    |-- role = vendor_onboarding --> VendorRegistration
    |-- role = vendor_pending    --> VendorPending
    |
    `-- [All roles — shared stack screens]
        |-- Chatbot
        |-- MapScreen            (MapScreen.native.js / MapScreen.web.js)
        |-- HiddenGemsList       (HiddenGemsListScreen)        [NEW]
        |-- DestinationDetail    (DestinationDetailScreen)
        |-- ItineraryDetail      (ItineraryDetailScreen)
        |-- Transport            (TransportScreen.native.js / .web.js)
        |-- Marketplace          (MarketplaceScreen)
        |-- EcoPassport          (EcoPassportScreen)
        |-- CulturalEvents       (CulturalEventsScreen)        [NEW]
        |-- VendorRegistration
        |-- OfflineMapSettings
        `-- EventDetail
```

**Auth + Onboarding Flow:**
1. App starts → check `AsyncStorage.getItem('userOnboarded')` → sets `isOnboarded`
2. No user → show unauthenticated stack (Splash if not onboarded → LanguageSelect → Welcome)
3. User found → fetch `users/{uid}` from Firestore → read `role` + `onboardingCompleted`
4. Check `lastLoginDate` in AsyncStorage; if > 7 days → auto `signOut`
5. `tourist` role + `!onboardingCompleted` → MoodSelectScreen first
6. Role determines root screen after onboarding

### Web Navigation (React Router v7)

```
/ (App.jsx)
|-- /login                  (Login)             — public
|-- /register-provider      (ProviderRegister)  — public
|
`-- / (Layout sidebar) — PrivateRoute: requires Firebase auth
    |-- /               RoleBasedDashboard → AdminDashboard | AccommodationDashboard | VendorDashboard | TourProviderDashboard
    |-- /users          (Users)
    |-- /vendors        (Vendors)
    |-- /bookings       (Bookings)
    |-- /sos            (SOSMonitor)
    |-- /destinations   (Destinations)
    |-- /events         (CulturalEvents)
    |-- /analytics      (Analytics)
    |-- /notifications  (Notifications)
    |-- /health         (SystemHealth)
    `-- /reports        (Reports)
```

---

## 8. Firebase Services In Use

### Authentication
- Method: Email/Password (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`)
- Persistence: `getReactNativePersistence(AsyncStorage)` on native; `getAuth` on web
- Password Reset: `sendPasswordResetEmail` (in LoginScreen)
- Google Sign-In: Package installed (`@react-native-google-signin/google-signin`) but **NOT wired**
- Token: Expo push token saved to `users/{uid}.expoPushToken` by NotificationService

### Firestore Collection Map

| Collection | Used By | Purpose |
|---|---|---|
| `users` | All screens | User profiles and role data |
| `vendors` | VendorPortal, web Vendors.jsx | Vendor business data |
| `vendors/{uid}/services` | VendorServiceListingScreen | Service catalog |
| `vendors/{uid}/orders` | VendorDashboard, BookingManagement | Vendor order queue |
| `bookings` | DriverDashboard, OfflineQueue | Ride/transport bookings |
| `tours` | GuideDashboard | Tour assignments for guides |
| `destinations` | web Destinations.jsx | Destination admin CRUD (mobile reads local JSON instead) |
| `cultural_events` | CulturalEventsScreen (mobile, onSnapshot), web CulturalEvents.jsx, GeofenceService | Events |
| `itineraries` | ChatbotScreen (write) | Saved AI trip plans |
| `sos_alerts` | web SOSMonitor.jsx, OfflineQueue | Emergency alert records |
| `EmergencyLogs` | OfflineQueue | Offline SOS flush target |
| `chats/{id}/messages` | VendorChatScreen | Real-time messaging |
| `reviews` | OfflineQueue | Customer reviews |

### Firestore Security Rules (Current State)

```
users         — read/write: own uid or admin; list: admin only
bookings      — create: tourist; read/update: booking owner + driver
vendors       — read: public (true); write: vendor role + own uid
sos_alerts    — create: public (unauthenticated allowed); read: own user / admin / guide / driver
destinations  — read/write: public (true) — NOTE: no auth required
cultural_events — read/write: public (true) — NOTE: no auth required
```

Missing rules (blocked by default deny): `tours`, `itineraries`, `chats`, `reviews`, `EmergencyLogs`

### Firebase Storage Paths
- Vendor documents: `vendors/{uid}/nic_front`, `nic_back`, `business_cert`
- Service photos: `vendors/{uid}/services/{filename}`
- Proof of service: uploaded from ProofOfServiceScreen
- Chat images: uploaded from VendorChatScreen

### Firebase Functions
None deployed. All logic is client-side. Push notifications sent via Expo Push API directly.

---

## 9. AI Architecture Detail

### 9.1 AI Travel Chatbot (ChatbotScreen.js)

**Waterfall model order (updated):**
```
[0] Groq Llama 3.3-70b    (Primary — fastest, free tier)
[1] Gemini 1.5 Flash      (Fallback 1 — Google AI REST)
[2] OpenAI GPT-4o-mini    (Fallback 2 — OpenAI REST)
```
**Note:** Order changed since v1 — Groq is now primary (was Gemini).

**Timeout:** 8000ms per model
**Response format:** Strict JSON (`extractedState` schema with `resp`, `extractedState`, `isReady`, `ui_options`)
**TTS:** `expo-speech` reads `resp` field aloud using detected i18n language
**Itinerary save:** `addDoc` to `itineraries` collection on "Generate Itinerary" tap

### 9.2 AI Destination Insights (DestinationDetailScreen.js)

**Model:** Groq Llama 3.3-70b-versatile (JSON mode)
**Trigger:** On screen mount, fetches insights for `place.name` + `place.province` + `place.category`
**JSON fields returned:** `translation`, `ai_insight`, `history`, `practical_info`, `opening_hours`, `best_time`, `distance_from_hub`, `explore_nearby` (3 items with Unsplash images)
**Display:** 4 tabs — Overview (AI insight + distance + eco score), History, Practical (tips + hours), Nearby

### 9.3 AI Marketplace (MarketplaceScreen.js)

**Model:** Groq `llama3-8b-8192` (JSON mode, response_format: json_object)
**Trigger:** On screen mount via `fetchMarketplaceData()`
**JSON fields returned:** `handcrafted[]`, `flavors[]`, `experiences[]` — each with name/price/image/description
**Fallback:** If API fails → hardcoded static product arrays displayed

### 9.4 AI Nearby Picks (HomeScreen.js)

**API:** Google Places Text Search REST API (not Places SDK)
**Queries:**
- AI Picks: `popular tourist attraction OR heritage site OR famous landmark` within 20km of user
- Hidden Gems: loads `ai_destinations.json` locally; `hidden_gem == true` filtered
- Featured Event: random selection from `ai_events.json`
**Fallback:** `ai_destinations.json` used when location denied or API fails

### 9.5 Local ML Models (ai_models/)

| Model | File | Algorithm | Input Features | Output | Status |
|---|---|---|---|---|---|
| Eco Scorer | `eco_scorer_model.pkl` | RandomForestRegressor (100 trees) | carbon_footprint_index, wildlife_disturbance_risk, plastic_pollution_risk, community_benefit_score, carrying_capacity_adherence | eco_score (0-100) | ✅ Trained |
| Destination Recommender | `recommender_model.keras` | Two-Tower NCF (Embeddings + MLP) | user_id, destination_id → engagement_score | Ranked destination list | 🚧 Not trained |
| Demand Forecaster | `demand_lstm_model.keras` | LSTM (2 layers, 30-day lookback) | daily_bookings time series | Next-day booking demand | 🚧 Not trained |

**To train pending models:**
```bash
cd ai_models/training
pip install tensorflow pandas scikit-learn numpy
python train_recommender.py     # requires GPU or Colab for speed
python train_demand_forecast.py # requires GPU or Colab for speed
```

---

## 10. Key Components & Services Reference

### Mobile Components

**PermissionHandler** (`components/PermissionHandler.js`)
- No props; self-contained. Requests Location + Camera permissions on mount.
- NOT embedded in main screens (permissions requested inline in each screen). Utility only.

**Map.native.js / Map.web.js** (`components/`)
- Platform shims resolved by Metro bundler automatically.
- `.native.js` re-exports `react-native-maps`; `.web.js` renders a placeholder `<View>`.

**MainTabNavigator** (`navigation/MainTabNavigator.js`)
- 5-tab bottom bar: Home, Map, AI (green badge "!"), SOS (red tint), Profile.

**VendorNavigator** (`navigation/VendorNavigator.js`)
- Stack navigator containing 4-tab bottom bar + overlay stack screens.

### Mobile Services (Singleton Pattern)

| Service | File | What it does |
|---|---|---|
| OfflineQueue | `services/OfflineQueue.js` | Queue Firebase writes to AsyncStorage; flush on reconnect (priority: SOS > booking > review) |
| NotificationService | `services/NotificationService.js` | Request push permissions, register Expo token to Firestore, handle deep-link routing on notification tap |
| GeofenceService | `services/GeofenceService.js` | Start/stop background geofencing via expo-task-manager; fire local notifications on region entry (200m default) |

### Web Components

**Layout** (`web/src/components/Layout.jsx`)
- MUI Drawer sidebar with all protected route links.

**AuthContext** (`web/src/context/AuthContext.jsx`)
- Exports: `AuthProvider`, `useAuth()`
- Provides: `{ currentUser, userRole, userStatus, login, logout }`

---

## 11. Bundled Data Assets

**Location:** `mobile/assets/data/`

| File | Size | Purpose | Used By |
|---|---|---|---|
| `ai_destinations.json` | 172KB | ~500+ Sri Lankan destinations with eco_score, avg_rating, hidden_gem, province, coords, image | HomeScreen (AI Picks + Hidden Gems fallback), HiddenGemsListScreen (full list) |
| `ai_events.json` | 5KB | Cultural events list with title, date, location, type | HomeScreen (featured event random pick) |

**Key fields in `ai_destinations.json`:**
```javascript
{
  id: string,
  name: string,
  province: string,
  category: string,              // Heritage | Nature | Beach | Wildlife | etc.
  eco_score: number,             // 0-100
  avg_rating: number,            // 1.0-5.0
  hidden_gem: boolean | "True",  // note: may be string or boolean
  latitude: number,
  longitude: number,
  image_url: string,
  description: string,
}
```

---

## 12. Constants & Configuration

### Theme Colors (`mobile/Theme.js`)

```javascript
primary:      '#00695C'  // Teal — primary brand color
secondary:    '#558B2F'  // Eco-Green
tertiary:     '#004D40'  // Dark Teal
background:   '#F8F9FA'  // Off-white
surface:      '#FFFFFF'
error:        '#B00020'
roundness:    12
```

Typography: Outfit font family (Bold, SemiBold, Medium, Regular) loaded via `@expo-google-fonts/outfit`.

### App-Wide Constants

```javascript
MAX_LOGIN_DAYS = 7              // App.js session expiry
GEOFENCE_RADIUS = 200           // GeofenceService default 200m radius
OFFLINE_QUEUE_KEY = 'ceylo_offline_queue'
LANGUAGE_KEY = 'user-language'
```

### AI Config

```javascript
// ChatbotScreen.js — Waterfall order:
MODELS = [
  { name: 'Groq Llama 3', url: 'https://api.groq.com/...', type: 'groq', model: 'llama-3.3-70b-versatile' },
  { name: 'Gemini 1.5 Flash', url: 'https://generativelanguage.googleapis.com/...', type: 'gemini' },
  { name: 'OpenAI GPT-4o-mini', url: 'https://api.openai.com/...', type: 'openai', model: 'gpt-4o-mini' },
]
TIMEOUT_PER_MODEL = 8000ms

// MarketplaceScreen.js:
MODEL = 'llama3-8b-8192' (Groq, JSON mode)

// DestinationDetailScreen.js:
MODEL = 'llama-3.3-70b-versatile' (Groq, JSON mode)

// HomeScreen.js / HiddenGemsListScreen.js:
Google Places Text Search REST API (not SDK)
```

---

## 13. Environment Variables

### Mobile (`mobile/.env`)

```bash
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Google Maps & Places (baked into app.json for native SDKs)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=

# AI Models
EXPO_PUBLIC_GROQ_API_KEY=         # Primary AI (Chatbot + Marketplace + DestinationDetail)
EXPO_PUBLIC_GEMINI_API_KEY=       # Chatbot Fallback 1
EXPO_PUBLIC_OPENAI_API_KEY=       # Chatbot Fallback 2

# Google OAuth (partially implemented)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

### Web (`web/.env`)

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

---

## 14. Feature Completion Status

### Mobile — Working

- [x] Language Selection — first-run en/si/ta chooser, in unauthenticated stack
- [x] Welcome / Auth Screens — branding, Login, Register, Guest entry
- [x] Email/Password Auth — login, register, password reset
- [x] Role-Based Navigation — App.js reads users.role and routes accordingly
- [x] Onboarding Gate — MoodSelectScreen shown to new tourists on first login
- [x] Session Management — 7-day auto-logout via lastLoginDate in AsyncStorage
- [x] Offline Queue — SOS/bookings/reviews queued in AsyncStorage; flush on reconnect
- [x] Push Notification Service — Expo push token registered; deep-link routing on tap
- [x] Geofence Service — background task fires local notifications near cultural regions
- [x] Tourist Home Screen — Google Places API nearby (20km), ai_destinations.json fallback, ai_events.json featured event
- [x] AI Concierge — waterfall (Groq→Gemini→OpenAI); HUD; quick replies; TTS; itinerary save
- [x] AI Destination Insights — per-place AI (Groq): history, practical tips, nearby attractions, opening hours
- [x] AI Marketplace — Groq generates live product/experience listings on demand
- [x] Google Maps (native) — real Google Places Text Search, distance calc, province filter, custom markers
- [x] Hidden Gems List — ai_destinations.json filtered, live GPS tracking, sort by distance/rating/eco
- [x] Cultural Events Screen — live Firestore onSnapshot, type filter, list + calendar view
- [x] SOS Screen — animated pulse button, one-tap calls (119/1990/Tourist Police), embassy search
- [x] Profile Screen — avatar, menu, logout
- [x] Eco Passport — badge grid, CO2 display (mock data)
- [x] Itinerary Detail — draggable plan, PDF export
- [x] Multilingual — en/si/ta translations
- [x] Driver Dashboard (native) — real-time bookings, online toggle, live map, eco optimizer
- [x] Driver Dashboard (web) — earnings summary placeholder
- [x] Guide Dashboard — real-time tours, active guests list
- [x] Transport Screen (native) — MapView + GPS + vehicle selector + simulated booking
- [x] Vendor Dashboard — online status, stats, live orders with 30s countdown + haptics
- [x] Vendor Order Management — status stepper (Accepted→Preparing→Ready→Completed)
- [x] Vendor Incoming Order — 20s accept/reject timer, auto-reject on timeout
- [x] Vendor Service Listing — full CRUD with photo upload, eco toggle
- [x] Vendor Revenue — Bar/Line charts, Trust Score, top services, reviews
- [x] Vendor Chat — real-time messaging, images, quick replies, read receipts, typing indicators
- [x] Vendor Registration Wizard — 3-step (Business + GPS, NIC/cert upload, first service)
- [x] Vendor Pending Screen — polls Firestore status, auto-redirects on approval
- [x] Platform-split screens — DriverDashboard, MapScreen, TransportScreen, Map component
- [x] Eco Scorer ML Model — trained (eco_scorer_model.pkl, 1.9MB), ready for inference
- [x] AI Datasets — generated (destinations.csv 35k rows, interactions.csv 1.5MB, time_series_demand.csv 7.4MB)

### Web Admin Portal — Working

- [x] Admin Login (Firebase email/password)
- [x] Role-Based Dashboard (admin/accommodation/vendor/tour_provider views)
- [x] User Management — MUI DataGrid, reads users collection
- [x] Vendor Management — DataGrid, approve/reject/delete, real-time vendors collection
- [x] Destinations CRUD — add/edit/delete from destinations collection
- [x] Cultural Events CRUD — add/edit/delete from cultural_events collection
- [x] SOS Monitor — real-time sos_alerts, simulated CCTV, AI insights placeholder
- [x] Analytics — Recharts eco adoption metrics
- [x] Reports — jsPDF export
- [x] Notifications — push notification management UI
- [x] System Health — monitoring dashboard
- [x] Provider Self-Registration — public 3-step form, writes pending_verification status

---

## 15. In Progress / Planned Features

- [ ] **Recommender & Demand Forecast Models** — train_recommender.py and train_demand_forecast.py complete; need GPU environment (Google Colab / Vertex AI) to produce the .keras files
- [ ] **Recommender Integration in App** — once recommender_model.keras is trained, expose via a Firebase Function or TensorFlow.js in MarketplaceScreen/HomeScreen for personalised suggestions
- [ ] **SOS Full Activation** — SOS button animates but does not upload location/photo or write to `sos_alerts`. Wire: camera capture → Storage upload → `sos_alerts` Firestore write
- [ ] **TransportScreen Booking** — write to `bookings` collection; implement driver matching logic
- [ ] **AR Guide Feature** — button exists on EventDetailScreen; feature not implemented
- [ ] **Google Sign-In** — package installed; OAuth flow not wired
- [ ] **Offline Map Download** — OfflineMapSettings lists/deletes regions but tile download not implemented
- [ ] **Saved Trips on HomeScreen** — empty state shown; needs query on `itineraries` for current user
- [ ] **Profile Stats** — hardcoded values; should read from `users` and `itineraries` collections
- [ ] **Microphone in Chatbot** — UI button exists; no audio recording logic
- [ ] **VendorRevenueScreen Real Data** — shows mock charts; needs to aggregate from `vendors/{uid}/orders`
- [ ] **Firestore Rules — Missing Collections** — `tours`, `itineraries`, `chats`, `reviews`, `EmergencyLogs` have no explicit rules (blocked by default deny)
- [ ] **MoodSelect → ChatbotScreen feed** — mood selected in MoodSelectScreen not yet passed to chatbot `extractedState`
- [ ] **EcoPassport real data** — all stats hardcoded; should read from user's booking history and itineraries

---

## 16. Known Issues & Bugs

| # | Location | Issue | Severity |
|---|---|---|---|
| 1 | `DriverDashboard.native.js` | Imports `Chip` from react-native-paper (present in package.json) — verify no import conflicts | 🟡 Verify |
| 2 | `MapScreen.native.js` | Previously called `navigation.openDrawer()` inside tab navigator — verify this is fixed in new .native.js file | 🟡 Verify |
| 3 | `SOSScreen.js` | SOS button only toggles animation; no actual emergency data upload, camera, or location sharing | 🟡 Incomplete |
| 4 | `ProfileScreen.js` | Stats (12 trips, 94 eco score, 8 badges) are hardcoded values | 🟡 Incomplete |
| 5 | `TransportScreen.native.js` | Booking simulated with step state; no Firestore write or driver matching | 🟡 Incomplete |
| 6 | `ItineraryDetailScreen.js` | Uses MOCK_PLAN constant; does not load from Firestore `itineraries` | 🟡 Incomplete |
| 7 | `VendorDashboardScreen.js` | Tries to import `Circle` from `react-native-svg` (not in package.json) — countdown ring SVG may silently fail | 🟠 Warning |
| 8 | `VendorRegistrationScreen.js` | Imports `Picker` from `@react-native-picker/picker` — verify this package is in package.json or build will fail | 🔴 Verify Build |
| 9 | `OfflineMapSettings.js` | Imports `expo-file-system` — verify this package is in package.json or build will fail | 🔴 Verify Build |
| 10 | `firestore.rules` | `tours`, `itineraries`, `chats`, `reviews`, `EmergencyLogs` have no explicit rules — blocked by default deny | 🔴 Security/Runtime |
| 11 | `firestore.rules` | `destinations` and `cultural_events` allow read/write to everyone without auth — should restrict writes to admin | 🟠 Security |
| 12 | `app.json` | Google Maps API key hardcoded in `app.json` instead of injected via env var | 🟠 Security |
| 13 | `ChatbotScreen.js` | Microphone `IconButton` has no `onPress` handler — voice input is visual placeholder only | 🟡 Incomplete |
| 14 | `HomeScreen.js` | "See All" for hidden gems navigates to `HiddenGemsList` — verify navigation name matches App.js registration | 🟡 Verify |
| 15 | `HiddenGemsListScreen.js` | `hidden_gem` field is inconsistently typed (`boolean` vs `"True"` string) in JSON data — filter handles both but inconsistency should be fixed in dataset | 🟡 Data Quality |
| 16 | `MarketplaceScreen.js` | If Groq API key is missing/invalid, falls back to hardcoded data silently — no user-visible error | 🟡 UX |
| 17 | `ai_models/recommender_model.keras` | File does not exist — training script requires TensorFlow (not installed in standard node env) | 🟠 Missing Artifact |
| 18 | `ai_models/demand_lstm_model.keras` | File does not exist — same as above | 🟠 Missing Artifact |

---

## 17. Changelog from Previous STRUCTURE.md Version

| Change | Details |
|---|---|
| Vendor Module Rebuild | Fully rebuilt 11 screens + `VendorNavigator.js` matching CEYLO design system, added `AddNewProductScreen.js` and wired roles (`vendor_active`, `vendor_rejected`) |
| Package Installations | Added `@react-native-community/datetimepicker` package to support scheduling and availability controls |
| Environment Loader Fix | Split packaging host parameters to `.env.local` to prevent local development environment collisions |
| New screens added | `CulturalEventsScreen.js`, `HiddenGemsListScreen.js` |
| Platform-split screens | `DriverDashboard`, `MapScreen`, `TransportScreen` split into `.native.js` / `.web.js` |
| ChatbotScreen AI waterfall | Order changed: **Groq is now primary** (was Gemini); Groq→Gemini→OpenAI |
| MarketplaceScreen | **No longer hardcoded** — now calls Groq API to generate live Sri Lankan product listings |
| DestinationDetailScreen | **Fully revamped** — now calls Groq for AI-powered tabbed insights (history/practical/nearby) |
| HomeScreen | Now uses **Google Places Text Search REST API** for nearby AI Picks; loads **bundled JSON assets** |
| Navigation — MoodSelectScreen | **Now wired** as first screen for new tourists (`!onboardingCompleted`) |
| Navigation — LanguageSelectScreen | **Moved** to unauthenticated stack (was not in any navigator before) |
| New top-level directories | `ai_datasets/` (CSV training data) and `ai_models/` (trained model artifacts + training scripts) |
| Bundled data assets | `mobile/assets/data/ai_destinations.json` (172KB) and `ai_events.json` (5KB) added |
| Firestore rules | Updated: explicit rules for users, bookings, vendors, sos_alerts, destinations, cultural_events |
| Eco Scorer ML | `eco_scorer_model.pkl` trained and saved (RandomForest, 1.9MB) |

---

*Last updated: 2026-06-30 by Antigravity AI. Source: full codebase re-read of `c:\Krishna\FNP\CEYLO`*
