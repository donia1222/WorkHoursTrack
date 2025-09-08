# Geolocation & Work Time Tracking App

This is a mobile application built with [Expo](https://expo.dev) that combines geolocation functionality with work time tracking, designed to help workers efficiently manage and record their working hours.

## What does the app do?

### Main Features:

**🕒 Work Time Management:**
- Real-time timer to record working hours
- Ability to pause, resume, and finish work sessions
- Automatic calculation of worked hours (rounded to 0.5h)
- Automatic overtime detection (more than 8 hours)
- Session notes recording for each work period

**🗺️ Geolocation:**
- Real-time map integration for location tracking
- Geofencing functionality to define work areas
- Foreground and background location permissions
- Support for jobs with specific locations

**💼 Job Management:**
- Create and manage multiple jobs/projects
- Configure hourly rates, schedules, and work days
- Assign colors and descriptions to each job
- Contact information for each client/company
- Billing configuration and tax notes

**📊 Tracking & Reports:**
- Calendar to visualize worked days
- Different day types: work, free, vacation, sick
- Statistics and worked hours reports
- Complete work session history

**⚙️ Additional Features:**
- Multi-language interface (i18n)
- Automatic theme (light/dark)
- Push notifications
- Onboarding for new users
- Customizable settings

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# WorkHoursTrack
