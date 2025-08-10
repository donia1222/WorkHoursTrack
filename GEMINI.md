# GEMINI.md

## Project Overview

This is a comprehensive mobile application for geolocation and work time tracking, built with React Native and Expo. It is designed to help users efficiently manage their work hours, track their location, and generate detailed reports. The app is feature-rich and includes functionalities like geofencing, a multi-language interface, and an AI-powered chatbot for analyzing work schedules.

### Key Features:

*   **Time Management:** A real-time timer to record work sessions, with automatic overtime calculation and session notes.
*   **Geolocation:** Real-time map integration, geofencing to define work areas, and automatic timer activation based on location.
*   **Job Management:** Create and manage multiple jobs with custom hourly rates, schedules, and billing configurations.
*   **Reporting:** A calendar to visualize workdays, detailed statistics, and the ability to export reports in PDF format.
*   **AI Chatbot:** An AI-powered chatbot that can analyze images and PDFs of work plans to extract work schedules and sync them with the calendar. It is powered by Gemini 1.5 Pro.
*   **Onboarding:** A comprehensive onboarding process to guide new users through the app's features.
*   **Monetization:** A premium subscription model that unlocks advanced features.
*   **Privacy:** A strong focus on user privacy, with all data stored locally on the device.

## Building and Running

To build and run the project, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npx expo start
    ```

    This will open the Expo developer tools in your browser. You can then run the app on an Android emulator, iOS simulator, or on your own device using the Expo Go app.

### Other available scripts:

*   `npm run android`: Run the app on an Android device or emulator.
*   `npm run ios`: Run the app on an iOS device or simulator.
*   `npm run web`: Run the app in a web browser.
*   `npm run lint`: Lint the code.
*   `npm run test`: Run tests.

## Development Conventions

*   **File-based routing:** The project uses file-based routing with Expo Router. The `app` directory contains all the routes and screens of the application.
*   **Component-based architecture:** The UI is built with a component-based architecture. Reusable components are located in the `app/components` directory.
*   **Services for business logic:** The core business logic is encapsulated in services, which are located in the `app/services` directory.
*   **Context for state management:** The application uses React Context for state management. The contexts are located in the `app/contexts` directory.
*   **TypeScript:** The project is written in TypeScript, which provides static typing and improves code quality.
*   **Internationalization:** The app supports multiple languages using the `i18n-js` library. The translation files are located in the `app/locales` directory.
