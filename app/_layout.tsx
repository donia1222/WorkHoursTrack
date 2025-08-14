import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AutoBackupService } from './services/AutoBackupService';
import WidgetCalendarService from './services/WidgetCalendarService';
import WidgetSyncService from './services/WidgetSyncService';
import { forceWidgetSync } from './services/ManualWidgetSync';
import { verifyLiveActivityModule } from './services/VerifyNativeModule';
// Importar BackgroundGeofenceTask para registrar la tarea
import './services/BackgroundGeofenceTask';


// Configure notifications to show when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AppWithStatusBar() {
  const { isDark, colors } = useTheme();
  
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar 
        style={isDark ? "light" : "dark"} 
        backgroundColor="transparent"
        translucent={true}
      />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      // Verify native module on app start
      verifyLiveActivityModule();
    }
  }, [loaded]);

  // Auto backup check on app start and when app becomes active
  useEffect(() => {
    // Check on initial load
    const checkAutoBackup = async () => {
      try {
        await AutoBackupService.checkAndCreateBackupIfNeeded();
      } catch (error) {
        console.error('Error checking auto backup on app start:', error);
      }
    };

    // Sync widget data on app start
    const syncWidgetData = async () => {
      try {
        await WidgetCalendarService.syncCalendarData();
        await WidgetSyncService.syncAllToWidget();
        // Force sync with sample data if needed
        await forceWidgetSync();
      } catch (error) {
        console.error('Error syncing widget data on app start:', error);
      }
    };

    if (loaded) {
      checkAutoBackup();
      syncWidgetData();
    }

    // Listen for app state changes
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        try {
          await AutoBackupService.checkAndCreateBackupIfNeeded();
          await WidgetCalendarService.syncCalendarData();
          // Always sync widget when app becomes active to catch any changes
          await WidgetSyncService.syncAllToWidget();
          console.log('📱 Widget synced on app resume');
        } catch (error) {
          console.error('Error checking auto backup/widget sync on app resume:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <ThemeProvider>
          <NotificationProvider>
            <NavigationThemeProvider value={DefaultTheme}>
              <AppWithStatusBar />
            </NavigationThemeProvider>
          </NotificationProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
