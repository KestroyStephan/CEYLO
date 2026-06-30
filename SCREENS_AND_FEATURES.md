# CEYLO Screen and Feature Inventory

This document provides a comprehensive inventory of all screens and features in the CEYLO project, organized by logical modules.

## Authentication
- **WelcomeScreen** (`mobile/screens/auth/WelcomeScreen.js`)
  - **Route Name:** `Welcome`
  - **User Role:** All
  - **Features:**
    - Navigate to Login screen
    - Navigate to Register screen
    - Proceed as guest without logging in

- **LoginScreen** (`mobile/screens/auth/LoginScreen.js`)
  - **Route Name:** `Login`
  - **User Role:** All
  - **Features:**
    - Authenticate user with Email/Password
    - Trigger password reset email
    - Third-party social login options (Google, Apple)

- **RegisterScreen** (`mobile/screens/auth/RegisterScreen.js`)
  - **Route Name:** `Register`
  - **User Role:** Tourist | Vendor (Driver/Guide)
  - **Features:**
    - Create new user account with Email/Password
    - Set basic profile information (Name, Phone)
    - Role selection (Tourist, Driver, Guide)
    - Capture role-specific data (Vehicle Type, License Plate for Drivers; License No. for Guides)

## Tourist — Discovery & Booking
- **HomeScreen** (`mobile/screens/HomeScreen.js`)
  - **Route Name:** `Home`
  - **User Role:** Tourist
  - **Features:**
    - View top destinations and attractions
    - Access quick action shortcuts (Map, Concierge, SOS, Translator)
    - Browse recommended eco-tours and vendors

- **MapScreen** (`mobile/screens/MapScreen.js`)
  - **Route Name:** `Map`
  - **User Role:** Tourist
  - **Features:**
    - Interactive Google Maps interface
    - Search places via Google Places Autocomplete
    - Render routes and directions
    - Download map regions for offline use (low-connectivity eco-tourism)

- **ChatbotScreen** (`mobile/screens/ChatbotScreen.js`)
  - **Route Name:** `Concierge`
  - **User Role:** Tourist
  - **Features:**
    - Interactive chat with an AI Concierge
    - "Waterfall" AI fallback architecture (Gemini → OpenAI → Groq → GitHub)
    - Generate structured JSON trip plans and itineraries

- **MarketplaceScreen** (`mobile/screens/MarketplaceScreen.js`)
  - **Route Name:** `Marketplace`
  - **User Role:** Tourist
  - **Features:**
    - Browse vendors by category (Stay, Eat, Shop, Tours)
    - View vendor eco-scores, pricing, and ratings
    - Search vendors by name/keyword
    - View shopping cart summary

- **ItineraryScreen** (`mobile/screens/ItineraryScreen.js`)
  - **Route Name:** `Itinerary`
  - **User Role:** Tourist
  - **Features:**
    - Configure trip focus (Nature/Eco vs. Culture/History)
    - Set trip duration in days
    - Select budget tier ($ Standard to $$$ Luxury)
    - Trigger itinerary generation

## Tourist — SOS & Emergency
- **SOSScreen** (`mobile/screens/SOSScreen.js`)
  - **Route Name:** `SOS`
  - **User Role:** Tourist
  - **Features:**
    - Trigger direct emergency calls (Police, Ambulance, Tourist Police)
    - View embassy contact lists
    - Access and share precise current GPS coordinates

## Vendor Portal
- **VendorDashboardScreen** (`mobile/screens/vendor/VendorDashboardScreen.js`)
  - **Route Name:** `VendorHome`
  - **User Role:** Vendor
  - **Features:**
    - Toggle vendor status (Online, Busy, Closed)
    - View daily performance metrics (Received, Completed, Revenue)
    - View and manage real-time pending booking requests with 30s countdowns
    - Receive haptic feedback for new incoming orders

- **VendorServiceListingScreen** (`mobile/screens/vendor/VendorServiceListingScreen.js`)
  - **Route Name:** `VendorServices`
  - **User Role:** Vendor
  - **Features:**
    - View all listed services
    - Create/Edit service details (Name, Price, Duration, Max Capacity)
    - Upload service photos to Firebase Storage
    - Toggle eco-certified status
    - Toggle service availability

- **VendorRevenueScreen** (`mobile/screens/vendor/VendorRevenueScreen.js`)
  - **Route Name:** `VendorRevenue`
  - **User Role:** Vendor
  - **Features:**
    - View revenue and rating analytics (BarChart and LineChart)
    - Filter data by date range (Week, Month)
    - View calculated Trust Score (based on completion, ratings, tenure)
    - View top-performing services and recent customer reviews

- **BookingManagementScreen** (`mobile/screens/vendor/BookingManagementScreen.js`)
  - **Route Name:** `VendorOrders`
  - **User Role:** Vendor
  - **Features:**
    - Filter bookings by status tabs (Pending, Confirmed, Active, Completed, Cancelled)
    - Expand booking cards to view itemized order details and customer notes
    - Advance booking status through lifecycle (Accepted → Preparing → Ready → Completed)
    - Navigate to Vendor Chat

- **VendorOrderManagementScreen** (`mobile/screens/vendor/VendorOrderManagementScreen.js`)
  - **Route Name:** `VendorOrderManagement`
  - **User Role:** Vendor
  - **Features:**
    - View all active/ongoing orders
    - Advance order status using a visual stepper
    - Open integrated camera to capture Proof of Service
    - Navigate to Vendor Chat

- **VendorIncomingOrderScreen** (`mobile/screens/vendor/VendorIncomingOrderScreen.js`)
  - **Route Name:** `VendorIncomingOrder`
  - **User Role:** Vendor
  - **Features:**
    - Receive active incoming order prompts with a 20-second timer
    - Accept incoming order
    - Reject order with a provided reason (auto-rejects upon timeout)

- **ProofOfServiceScreen** (`mobile/screens/vendor/ProofOfServiceScreen.js`)
  - **Route Name:** `ProofOfService`
  - **User Role:** Vendor
  - **Features:**
    - Capture photo using device camera for proof of service
    - Upload proof image to Firebase Storage
    - Mark order as fully completed

- **VendorChatScreen** (`mobile/screens/vendor/VendorChatScreen.js`)
  - **Route Name:** `VendorChat`
  - **User Role:** Vendor
  - **Features:**
    - Real-time text messaging with tourist
    - Send and view images
    - Send predefined quick replies
    - Real-time read receipts and typing indicators

- **VendorRegistrationScreen** (`mobile/screens/vendor/VendorRegistrationScreen.js`)
  - **Route Name:** `VendorRegistration`
  - **User Role:** Vendor (Pending)
  - **Features:**
    - Multi-step registration wizard
    - Auto-fill business location using device GPS
    - Upload identity and business verification documents (NIC, Certificate)
    - Create the initial vendor service listing

- **VendorPendingScreen** (`mobile/screens/vendor/VendorPendingScreen.js`)
  - **Route Name:** `VendorPending`
  - **User Role:** Vendor (Pending)
  - **Features:**
    - Display current application status (Pending, Approved, Rejected)
    - Automatically redirect to vendor portal upon approval
    - Sign out

## Shared / Common
- **ProfileScreen** (`mobile/screens/ProfileScreen.js`)
  - **Route Name:** `Profile`
  - **User Role:** All
  - **Features:**
    - View user profile details and settings
    - Navigate to Offline Map Settings
    - Logout

- **OfflineMapSettings** (`mobile/screens/OfflineMapSettings.js`)
  - **Route Name:** `OfflineMapSettings`
  - **User Role:** All
  - **Features:**
    - View downloaded offline map regions and their storage sizes
    - Delete specific saved map regions from local storage

- **LanguageSelectScreen** (`mobile/screens/onboarding/LanguageSelectScreen.js`)
  - **Route Name:** `LanguageSelect`
  - **User Role:** All
  - **Features:**
    - `[Needs Review]` (Likely handles app language selection during onboarding)

- **MoodSelectScreen** (`mobile/screens/onboarding/MoodSelectScreen.js`)
  - **Route Name:** `MoodSelect`
  - **User Role:** Tourist
  - **Features:**
    - `[Needs Review]` (Likely allows tourists to select trip focus or mood during onboarding)

## Admin Panel
*No dedicated admin panel screens were found in the `mobile/screens` directory during this review. Admin features may be managed via a separate web dashboard or Firebase Console.*
