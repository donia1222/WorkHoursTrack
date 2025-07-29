import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const HAPTIC_ENABLED_KEY = 'hapticFeedbackEnabled';

export const useHapticFeedback = () => {
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Load haptic preference from storage
  useEffect(() => {
    const loadHapticPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(HAPTIC_ENABLED_KEY);
        if (stored !== null) {
          setHapticEnabled(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading haptic preference:', error);
      }
    };
    loadHapticPreference();
  }, []);

  const triggerHaptic = (type: HapticType = 'light') => {
    if (Platform.OS !== 'ios' || !hapticEnabled) return;

    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateHapticEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(HAPTIC_ENABLED_KEY, JSON.stringify(enabled));
      setHapticEnabled(enabled);
    } catch (error) {
      console.error('Error saving haptic preference:', error);
    }
  };

  return { triggerHaptic, hapticEnabled, updateHapticEnabled };
};