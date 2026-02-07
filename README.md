# CEYLO: Tourism & Safety Platform

CEYLO is a comprehensive platform designed to enhance the travel experience in Sri Lanka, offering AI-powered trip planning, integrated mapping, vendor management, and advanced SOS safety features.

## 📁 Project Structure

This repository is organized as a monorepo containing both the user-facing mobile application and the administrative web portal.

-   **`mobile/`**: React Native application built with Expo. Features include AI Chatbot (Ollama), Google Maps integration, and SOS emergency system.
-   **`web/`**: React administrative dashboard built with Vite. Features include user/vendor management and system analytics.
-   **`WORK_DIVISION.md`**: Detailed breakdown of team roles and responsibilities.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher)
-   [npm](https://www.npmjs.com/)
-   [Expo Go](https://expo.dev/expo-go) (for mobile testing)

### Installation

1.  Clone the repository:
    ```bash
    git clone [your-repository-url]
    cd CEYLO
    ```

2.  Install dependencies for both projects:
    ```bash
    # Install mobile dependencies
    cd mobile
    npm install

    # Install web dependencies
    cd ../web
    npm install
    ```

### Running the Apps

-   **Mobile App**: `cd mobile && npx expo start`
-   **Web Admin**: `cd web && npm run dev`

## 👥 Team
This project is developed by a team of 3 members. See [WORK_DIVISION.md](./WORK_DIVISION.md) for individual task assignments.

## 📜 License
Distributed under the MIT License.
