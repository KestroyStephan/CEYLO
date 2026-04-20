# CHAPTER 5: SYSTEM DEVELOPMENT

This chapter presents the implementation of **CEYLO: An AI-Powered Smart Guide for Sustainable Eco and Cultural Tourism in Sri Lanka**. It details the navigation and modular structure, the development environment, technologies used, deployment architecture, and key code segments. The system is designed with a focus on seamless AI integration, role-based accessibility, and safety.

---

## 5.1 Navigation / Module Structure

The CEYLO system is implemented as two core platforms:

### 1. Mobile Application (Tourist, Driver, Guide)
Designed as the primary tool for travelers and local service providers. It uses a conditional navigation stack managed in `App.js`:
- **Unauthenticated Users**: Access Welcome, Login, and Registration flows.
- **Authenticated Tourists**: Directed to a **Main Tab-Based Interface**:
    - **Home**: Dashboard with trending spots and quick AI access.
    - **Map**: Google Maps integration with route directions and destination search.
    - **Itinerary**: AI Concierge interface for conversational trip planning.
    - **SOS**: Emergency pulse button for instant safety alerts.
    - **Profile**: User settings and history.
- **Authenticated Service Providers**: Redirected to dedicated **Dashboards**:
    - **Driver Dashboard**: Manage ride requests and availability.
    - **Guide Dashboard**: Manage booking schedules and traveler interactions.

### 2. Web Application (Admin & Multi-Provider Portal)
A comprehensive management system built with Vite and MUI (Material UI):
- **Admin Dashboard**: Core monitor for system overview, user management, and SOS alerts.
- **Accommodation Dashboard**: Specifically for hotel/homestay owners to manage listings.
- **Vendor Dashboard**: For local product sellers and equipment rentals.
- **Tour Provider Dashboard**: For companies providing organized travel packages.

---

## 5.2 Development Environment

The development process utilized modern cross-platform frameworks to ensure scalability and ease of deployment.

- **Frontend (Mobile)**: React Native with **Expo SDK 54**, utilizing `react-navigation` for complex routing and `react-native-paper` for a premium Material Design UI.
- **Frontend (Web)**: **Vite + React**, providing a high-performance environment for the management portals.
- **Backend**: **Firebase (Version 12.9)**, serving as a Backend-as-a-Service (BaaS) for:
    - **Authentication**: Email/Password and session management with `AsyncStorage`.
    - **Cloud Firestore**: Real-time NoSQL database for trip profiles and vendor data.
    - **Storage**: Media handling for SOS evidence and listing images.
- **AI Infrastructure**: **Ollama (Llama 3.2)**, integrated locally for conversational AI, providing natural language processing and structured data extraction.

---

## 5.3 Functional Modules & Core Features

### 5.3.1 AI Travel Concierge (Native AI Integration)
Instead of static forms, CEYLO uses a **Conversational NLP Module**. 
- It extracts user preferences (Destination, Budget, Group Type, Interests) using a sophisticated system prompt.
- **Dynamic Trip Profile**: A real-time HUD (Heads-Up Display) summarizes the extracted state as the user talks.
- **Itinerary Generation**: Produces professional JSON-formatted plans including coordinates and "Hidden Gems."

### 5.3.2 Smart Maps & Safety (SOS)
- **Navigation**: Integrates `MapViewDirections` for optimal route plotting in Sri Lanka.
- **SOS Pulse**: A high-priority module that captures location coordinates and initializes emergency protocols with a visual "Pulse" effect.

### 5.3.3 Role-Based Data Flow
The system utilizes a centralized `AuthContext` on Web and session checks on Mobile to ensure data isolation. Providers only see their relevant bookings, while Admins have an "Absolute View" of the ecosystem.

---

## 5.5 Major Code Segments

This section explains the most important code parts used to implement the core features of our project. These examples show how the system moves from design to a working application.

### 5.5.1 Role-Based Navigation (Mobile Application)

After a user logs in, the system checks the user’s role from Firestore and routes them to the correct interface. This ensures that tourists, guides, and drivers each see only the features relevant to them.

**Code Snippet 5.1: Role-Based Navigation Logic (Mobile App)**
```javascript
// App.js - Conditional Rendering based on Firestore Role
{user ? (
  <Stack.Group>
    {userRole === 'driver' ? (
      <Stack.Screen name="DriverDashboard" component={DriverDashboard} />
    ) : userRole === 'guide' ? (
      <Stack.Screen name="GuideDashboard" component={GuideDashboard} />
    ) : (
      <Stack.Screen name="Main" component={MainTabNavigator} />
    )}
    <Stack.Screen name="Chatbot" component={ChatbotScreen} />
  </Stack.Group>
) : (
  <Stack.Group>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Group>
)}
```

**Explanation:**
When the app starts, it checks if the user is authenticated. If logged in, it fetches the `userRole` from the `users` collection. Based on that role, the `Stack.Navigator` loads a different set of screens, keeping the interface simple and secure.

### 5.5.2 AI Assistant and Trip Planning Logic

The AI assistant handles the natural language interaction with the user and extracts structured data for the trip profile.

**Code Snippet 5.2: AI Request and Response Handling**
```javascript
// ChatbotScreen.js - Communicating with Ollama
const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    body: JSON.stringify({
        model: "llama3.2",
        prompt: `${SYSTEM_PROMPT}\n\nPROFILE: ${currentProfile}\nUser: ${messageToSend}`,
        stream: false,
        format: "json"
    }),
});

const data = await response.json();
const botJson = JSON.parse(data.response);

if (botJson.extractedState) {
    setTripState(prev => ({ ...prev, ...botJson.extractedState }));
}
```

**Explanation:**
The AI module takes the user’s message and converts it into structured information (e.g., budget, destination). This structured data is then used to update the "Trip Profile" in real-time, making the recommendations context-aware.

### 5.5.3 SOS Feature with Camera Access and Offline Support

The SOS feature ensures user safety by capturing evidence and location immediately upon trigger.

**Code Snippet 5.3: SOS Trigger and Camera Capture Logic**
```javascript
// SOSScreen.js - Triggering safety protocols
const handleSOS = async () => {
  setAlertActive(true);
  const location = await Location.getCurrentPositionAsync({});
  const { status } = await Camera.requestCameraPermissionsAsync();
  
  if (status === 'granted') {
    // Logic to capture images from front and back cameras
    const photo = await cameraRef.current.takePictureAsync();
    await uploadEmergencyData(location, photo.uri);
  }
};
```

**Explanation:**
When activated, the app captures the user's GPS coordinates and requests camera access to take visual evidence. The data is either uploaded immediately or queued for offline synchronization.

### 5.5.4 Booking and Vendor Management Logic

This connects tourists with service providers by managing booking records in real-time.

**Code Snippet 5.4: Booking Creation and Status Update Logic**
```javascript
// AccommodationDashboard.jsx - Updating Booking Status
const handleAction = async (bookingId, action) => {
    let newStatus = '';
    if (action === 'confirm') newStatus = 'Confirmed';
    if (action === 'check-in') newStatus = 'Checked In';
    if (action === 'check-out') newStatus = 'Completed';

    await updateDoc(doc(db, "bookings", bookingId), { status: newStatus });
};
```

**Explanation:**
When a status change is triggered by a vendor (confirming a booking or checking out a guest), the Firestore document is updated, which synchronizes the state across both the vendor's and the tourist's apps.

### 5.5.5 Vendor Verification and Local Empowerment Features

To ensure trust, vendors must undergo a verification process during registration.

**Code Snippet 5.5: Vendor Verification Status Handling**
```javascript
// ProviderRegister.jsx - Setting Initial Status
const userData = {
    uid: user.uid,
    role: role,
    businessName: formData.businessName,
    status: 'pending_verification' // Initial state requiring admin review
};
await setDoc(doc(db, "users", user.uid), userData);
```

**Explanation:**
Upon registration, vendors are assigned a `pending_verification` status. The admin portal monitors these registrations, allowing for manual document review before the vendor is visible in the tourist application.

### 5.5.6 Offline Synchronization Logic

Ensures data integrity even when moving through rural areas with poor connectivity.

**Code Snippet 5.6: Offline Queue and Sync Logic**
```javascript
// Conceptual Offline Sync Pattern
const syncOfflineData = async () => {
  const offlineQueue = await AsyncStorage.getItem('sos_queue');
  if (networkStatus.isConnected && offlineQueue) {
    const data = JSON.parse(offlineQueue);
    await Promise.all(data.map(item => uploadToServer(item)));
    await AsyncStorage.removeItem('sos_queue');
  }
};
```

**Explanation:**
Data like SOS alerts or booking updates are saved locally using `AsyncStorage` when offline. The app's background listener detects restored connectivity and automatically flushes the queue to the cloud database.

### 5.5.7 Multilingual Support and Accessibility Logic

The app supports dynamic language switching to cater to diverse tourist and local groups.

**Code Snippet 5.7: Language Switching Logic**
```javascript
// Navigation and Localized Strings logic
const [language, setLanguage] = useState('en');
const strings = language === 'si' ? sinhalaStrings : englishStrings;

return (
  <Text>{strings.welcome_message}</Text>
);
```

**Explanation:**
This logic allows users to switch between English, Sinhala, and Tamil dynamically. By mapping UI labels to localized objects, the entire interface updates instantly without requiring an app restart.

### 5.5.8 Security and Permissions Handling

The app enforces robust permission checks before accessing sensitive device features like the camera or location.

**Code Snippet 5.8: Permission Handling Logic**
```javascript
// PermissionHandler.js - Requesting Device Access
const requestPermissions = async () => {
    const locStatus = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locStatus.status === 'granted');

    const camStatus = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(camStatus.status === 'granted');
};
```

**Explanation:**
The Dedicated `PermissionHandler` component centralizes access requests. If a user denies a permission required for safety (like GPS for SOS), the app provides a clear explanation and a path to re-enable it in system settings.

---

## 5.6 Conclusion

CEYLO transitions from a concept to a functional ecosystem through a modular architecture. By leveraging localized AI (Ollama) and robust cloud services (Firebase), the system provides a scalable, role-based platform that truly empowers sustainable tourism in Sri Lanka.
