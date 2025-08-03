import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation, ScreenName } from '../context/NavigationContext';

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
        intensity={95} 
        tint={isDark ? "dark" : "light"} 
        style={styles.blurContainer}
      >
        <View style={[styles.tabsContainer, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.23)' }]}>
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
                  isActive && { backgroundColor: tab.color + '15' }
                ]}>
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={23}
                    color={isActive ? tab.color : colors.textSecondary}
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
    bottom: -25,
    left: 0,
    right: 0,
  
  },
  blurContainer: {
    backgroundColor: 'transparent',
    
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 14,
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