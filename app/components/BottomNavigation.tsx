import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
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
import AutoTimerService, { AutoTimerStatus } from '../services/AutoTimerService';

type TabItem = {
  id: ScreenName | 'subscription';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
};

export default function BottomNavigation() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { currentScreen, navigateTo } = useNavigation();
  const insets = useSafeAreaInsets();
  const [autoTimerStatus, setAutoTimerStatus] = useState<AutoTimerStatus | null>(null);
  const [autoTimerService] = useState(() => AutoTimerService.getInstance());
  
  // Animation values for the red dot
  const dotPulseAnimation = useSharedValue(1);
  const dotOpacityAnimation = useSharedValue(1);
  
  // Listen to AutoTimer status changes
  useEffect(() => {
    const handleAutoTimerStatusChange = (status: AutoTimerStatus) => {
      setAutoTimerStatus(status);
    };
    
    // Add listener
    autoTimerService.addStatusListener(handleAutoTimerStatusChange);
    
    // Get current status
    const currentStatus = autoTimerService.getStatus();
    setAutoTimerStatus(currentStatus);
    
    // Cleanup
    return () => {
      autoTimerService.removeStatusListener(handleAutoTimerStatusChange);
    };
  }, []);
  
  // Animate when AutoTimer is active
  useEffect(() => {
    if (autoTimerStatus?.state === 'active') {
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
  }, [autoTimerStatus?.state]);
  
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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <BlurView 
        intensity={85} 
        tint={isDark ? "dark" : "light"} 
        style={[
          styles.blurContainer,
          { borderTopColor: isDark ? 'rgba(255, 255, 255, 0)' : 'rgba(26, 23, 23, 0)' }
        ]}
      >
        <View style={[styles.tabsContainer, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)' }]}>
          {tabs.map((tab) => {
            const isActive = currentScreen === tab.id;
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
                    backgroundColor: tab.color + '15',
                    borderWidth: 2,
                    borderColor: tab.color + '40'
                  }
                ]}>
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={23}
                    color={isActive ? tab.color : colors.textSecondary}
                  />
                  {/* Animated red dot for timer when AutoTimer is active */}
                  {tab.id === 'timer' && autoTimerStatus?.state === 'active' && (
                    <Animated.View style={[
                      {
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#FF3B30',
                        borderWidth: 2,
                        borderColor: 'white',
                        shadowColor: '#FF3B30',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 4,
                        elevation: 5,
                      },
                      animatedDotStyle
                    ]} />
                  )}
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
    bottom: -3,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 3,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 50,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconContainer: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  activeLabel: {
    fontWeight: '700',
  },
});