import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SubscriptionProvider } from '@/app/hooks/useSubscription';

import { JobService } from '../services/JobService';
import * as Location from 'expo-location';
import AutoTimerBanner from '../components/AutoTimerBanner';
import { useLanguage } from '../contexts/LanguageContext';   // si tu provider está por encima, ok
import { useTheme } from '../contexts/ThemeContext';          // idem

export default function RootLayout() {
  const [showBanner, setShowBanner] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const { t } = useLanguage?.() ?? { t: (k: string) => k }; // fallback simple si no hay provider arriba
  useTheme?.(); // asegura recalcular si cambia tema (no usamos directamente colores aquí)


  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const checkAutoTimerStatus = async () => {
      try {
        const jobs = await JobService.getJobs();
        const jobWithAutoTimer = jobs.find((j) => j.autoTimer?.enabled);
        if (!jobWithAutoTimer) {
          setShowBanner(false);
          return;
        }

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          // si no hay permisos, no mostramos banner (o podrías decidir mostrarlo)
          setShowBanner(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const user = loc.coords;

        if (jobWithAutoTimer.location?.latitude && jobWithAutoTimer.location?.longitude) {
          const distance = calculateDistance(
            user.latitude,
            user.longitude,
            jobWithAutoTimer.location.latitude,
            jobWithAutoTimer.location.longitude
          );
          const radius = jobWithAutoTimer.autoTimer?.geofenceRadius || 50;
          const isInside = distance <= radius;

          if (!isInside && jobWithAutoTimer.autoTimer?.enabled && !hasShownThisSession) {
            setShowBanner(true);
            setHasShownThisSession(true);
          } else if (isInside && showBanner) {
            setShowBanner(false);
          }
        } else {
          setShowBanner(false);
        }
      } catch {
        // silencioso
      }
    };

    // chequeo inicial + cada 5s
    checkAutoTimerStatus();
    interval = setInterval(checkAutoTimerStatus, 5000);
    return () => interval && clearInterval(interval);
  }, [showBanner, hasShownThisSession]);

  return (
    <SubscriptionProvider>
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>

        {showBanner && (
          <AutoTimerBanner
            message={t('timer.auto_timer.activation_alert')}
            onDismiss={() => setShowBanner(false)}
          />
        )}
      </View>
    </SubscriptionProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
