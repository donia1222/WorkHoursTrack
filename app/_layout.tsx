import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AutoBackupService } from './services/AutoBackupService';

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

    if (loaded) {
      checkAutoBackup();
    }

    // Listen for app state changes
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        try {
          await AutoBackupService.checkAndCreateBackupIfNeeded();
        } catch (error) {
          console.error('Error checking auto backup on app resume:', error);
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
            <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <AppWithStatusBar />
            </NavigationThemeProvider>
          </NotificationProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
