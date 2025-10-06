import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation, ScreenName } from '../context/NavigationContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing,
  interpolate 
} from 'react-native-reanimated';
import { useAutoTimer } from '../contexts/AutoTimerContext';

type TabItem = {
  id: ScreenName | 'subscription';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
};

// Helper function to detect device type
const getDeviceType = () => {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = height / width;
  
  if (Platform.OS === 'ios') {
    // iPad detection
    if (Platform.isPad) {
      return 'ipad';
    }
    // iPhone SE detection (smaller screens)
    if (width <= 375 && height <= 667) {
      return 'iphone-se';
    }
    // Regular iPhone
    return 'iphone';
  }
  return 'android';
};

// Get bottom margin based on device type
const getBottomMargin = () => {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case 'iphone-se':
      return -5;  // iPhone SE/8 and older
    case 'iphone':
      return -25; // Regular iPhone (X and newer)
    case 'ipad':
      return -0;   // iPad
    default:
      return -5;  // Android default
  }
};

export default function BottomNavigation() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { currentScreen, navigateTo } = useNavigation();
  const insets = useSafeAreaInsets();
  const autoTimer = useAutoTimer();
  
  // Animation values for the red dot
  const dotPulseAnimation = useSharedValue(1);
  const dotOpacityAnimation = useSharedValue(1);
  
  // Animate when AutoTimer is active
  useEffect(() => {
    if (autoTimer.state.isActive) {
      // Start dot pulse animation
      dotPulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      
      // Start dot opacity animation
      dotOpacityAnimation.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      // Reset animations
      dotPulseAnimation.value = withTiming(1, { duration: 300 });
      dotOpacityAnimation.value = withTiming(1, { duration: 300 });
    }
  }, [autoTimer.state.isActive]);
  
  // Animated styles for red dot
  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dotPulseAnimation.value }],
      opacity: dotOpacityAnimation.value,
    };
  });

  const tabs: TabItem[] = [
    {
      id: 'mapa',
      icon: 'briefcase-outline',
      activeIcon: 'briefcase',
      label: t('side_menu.menu_items.mapa.title'),
      color: '#007AFF',
    },

        {
      id: 'calendar',
      icon: 'calendar-outline',
      activeIcon: 'calendar',
      label: t('side_menu.menu_items.calendar.title'),
      color: '#6366F1',
    },
        {
      id: 'reports',
      icon: 'bar-chart-outline',
      activeIcon: 'bar-chart',
      label: t('side_menu.menu_items.reports.title'),
      color: '#FF9500',
    },
    
    {
      id: 'timer',
      icon: 'time-outline',
      activeIcon: 'time',
      label: t('side_menu.menu_items.timer.title'),
      color: '#34C759',
    },

    {
      id: 'chatbot',
      icon: 'chatbubble-ellipses-outline',
      activeIcon: 'chatbubble-ellipses',
      label: t('side_menu.menu_items.chatbot.title'),
      color: '#FF6B35',
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      activeIcon: 'settings',
      label: t('side_menu.menu_items.settings.title'),
      color: '#8E8E93',
    },
  ];

  const handleTabPress = (screenId: ScreenName | 'subscription') => {
    navigateTo(screenId as ScreenName);
  };

  return (
    <View style={[styles.container, { bottom: getBottomMargin(), paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={isDark ? ['rgba(138, 92, 246, 0)', 'rgba(59, 131, 246, 0)'] : ['rgba(146, 51, 234, 0)', 'rgba(78, 70, 229, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBackground}
      />
      <BlurView 
        intensity={isDark ? 98 : 96} 
        tint={isDark ? "dark" : "light"} 
        style={[
          styles.blurContainer,
          { borderTopColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(99, 102, 241, 0.1)' }
        ]}
      >
        <View style={[styles.tabsContainer, { backgroundColor: 'transparent' }]}>
          {tabs.map((tab) => {
            const isActive = currentScreen === tab.id;
            // Ocultar completamente el botón timer cuando AutoTimer está activo
            if (tab.id === 'timer' && autoTimer.state.isActive) {
              return null;
            }
            
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tab}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  isActive && styles.activeIconContainer,
                  isActive && { 
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                    borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(99, 102, 241, 0.3)'
                  }
                ]}>
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={isActive ? 24 : 22}
                    color={isActive ? (isDark ? '#A78BFA' : '#6366F1') : colors.textSecondary}
                  />
                
                </View>
                {/* Labels removed - icons only navigation */}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 50,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconContainer: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  activeLabel: {
    fontWeight: '700',
  },
});