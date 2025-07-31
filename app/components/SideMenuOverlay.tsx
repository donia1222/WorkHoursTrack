import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const MENU_WIDTH = Math.min(width * 0.75, 320); // Máximo 320px o 75% del ancho

interface SideMenuOverlayProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    right: 0,
    top: '8%',
    bottom: '8%',
    width: MENU_WIDTH,
    backgroundColor: colors.background,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  menuContent: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.12)',
  },
  menuItemPressed: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.20)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  subscriptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 10,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 215, 0, 0.6)',
    backgroundColor: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.15)',
  },
  chipIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  chipContent: {
    flex: 1,
  },
  chipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

export default function SideMenuOverlay({ visible, onClose, onNavigate }: SideMenuOverlayProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { isSubscribed } = useSubscription();
  const styles = getStyles(colors, isDark);
  
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: MENU_WIDTH,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
      ]).start();
    }
  }, [visible]);
  
  const menuItems = [
    {
      id: 'mapa',
      title: t('side_menu.menu_items.mapa.title'),
      icon: 'map.fill',
      description: t('side_menu.menu_items.mapa.description'),
      color: colors.primary,
    },
    {
      id: 'calendar',
      title: t('side_menu.menu_items.calendar.title'),
      icon: 'calendar',
      description: t('side_menu.menu_items.calendar.description'),
      color: '#AF52DE',
    },
    {
      id: 'timer',
      title: t('side_menu.menu_items.timer.title'),
      icon: 'clock.fill',
      description: t('side_menu.menu_items.timer.description'),
      color: colors.success,
    },
    {
      id: 'chatbot',
      title: t('side_menu.menu_items.chatbot.title'),
      icon: 'brain.head.profile',
      description: t('side_menu.menu_items.chatbot.description'),
      color: '#FF6B35',
    },
    {
      id: 'reports',
      title: t('side_menu.menu_items.reports.title'),
      icon: 'chart.bar.fill',
      description: t('side_menu.menu_items.reports.description'),
      color: colors.warning,
    },
    {
      id: 'settings',
      title: t('side_menu.menu_items.settings.title'),
      icon: 'gear',
      description: t('side_menu.menu_items.settings.description'),
      color: colors.textSecondary,
    },
  ];

  const subscriptionItem = !isSubscribed ? {
    id: 'subscription',
    title: t('side_menu.menu_items.subscription.title'),
    icon: 'crown.fill',
    description: t('side_menu.menu_items.subscription.description'),
    color: '#FFD700',
  } : {
    id: 'subscription',
    title: t('side_menu.menu_items.subscription.premium_title'),
    icon: 'crown.fill',
    description: t('side_menu.menu_items.subscription.premium_description'),
    color: '#28a745',
  };

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View 
          style={[
            styles.overlay,
            { opacity: fadeAnim }
          ]} 
        />
      </TouchableWithoutFeedback>
      
      <Animated.View 
        style={[
          styles.menuContainer,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <BlurView intensity={95} tint={isDark ? "dark" : "extraLight"} style={{ flex: 1 }}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <LinearGradient
                colors={isDark ? ['rgba(0, 122, 255, 0.12)', 'rgba(0, 122, 255, 0.04)'] : ['rgba(0, 122, 255, 0.08)', 'rgba(0, 122, 255, 0.02)']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>{t('side_menu.title')}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <IconSymbol size={28} name="xmark" color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              style={styles.menuContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => {
                    if (onNavigate) {
                      onNavigate(item.id);
                    }
                    // Cerrar el menú después de un pequeño delay para que se vea la animación
                    setTimeout(() => {
                      onClose();
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}25` }]}>
                    <IconSymbol size={18} name={item.icon as any} color={item.color} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.subscriptionChip}
                onPress={() => {
                  if (onNavigate) {
                    onNavigate(subscriptionItem.id);
                  }
                  setTimeout(() => {
                    onClose();
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.chipIconContainer, { backgroundColor: `${subscriptionItem.color}25` }]}>
                  <IconSymbol size={12} name={subscriptionItem.icon as any} color={subscriptionItem.color} />
                </View>
                <View style={styles.chipContent}>
                  <Text style={styles.chipTitle}>{subscriptionItem.title}</Text>
                  <Text style={styles.chipDescription}>{subscriptionItem.description}</Text>
                </View>
              </TouchableOpacity>
              
              <View style={{ height: 10 }} />
            </ScrollView>
          </SafeAreaView>
        </BlurView>
      </Animated.View>
    </View>
  );
}