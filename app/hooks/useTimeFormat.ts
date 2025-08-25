import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

export const useTimeFormat = () => {
  const [useTimeFormat, setUseTimeFormat] = useState(true);

  useEffect(() => {
    loadTimeFormatPreference();
    
    // Refresh preferences every 2 seconds to catch changes
    const interval = setInterval(() => {
      loadTimeFormatPreference();
    }, 2000);
    
    // Listen for app state changes to refresh preferences
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        loadTimeFormatPreference();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, []);

  const loadTimeFormatPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('@time_format_preference');
      console.log('🕐 Loading time format preference:', saved);
      if (saved !== null) {
        const newValue = saved === 'true';
        console.log('🕐 Setting useTimeFormat to:', newValue);
        setUseTimeFormat(newValue);
      }
    } catch (error) {
      console.error('Error loading time format preference:', error);
    }
  };

  const formatTime = (hours: number): string => {
    console.log('🕐 Formatting time:', hours, 'useTimeFormat:', useTimeFormat);
    if (useTimeFormat) {
      // HH:MM:SS format
      const totalSeconds = Math.round(hours * 3600);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const result = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      console.log('🕐 HH:MM:SS result:', result);
      return result;
    } else {
      // Decimal hours format
      const result = `${hours.toFixed(2)}h`;
      console.log('🕐 Decimal result:', result);
      return result;
    }
  };

  return {
    useTimeFormat,
    formatTime,
    refreshPreference: loadTimeFormatPreference,
  };
};