import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const MENU_WIDTH = width * 0.8;
const MENU_HEIGHT = height * 0.9;

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onMenuToggle: () => void;
  onNavigate?: (screen: string) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  menuContainer: {
    position: 'absolute',
    right: 0,
    top: '5%',
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    position: 'relative',
    overflow: 'hidden',
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
    ...Theme.typography.title2,
    color: colors.text,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
  menuContent: {
    flex: 1,
    paddingTop: isSmallScreen ? Theme.spacing.sm : Theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    marginHorizontal: Theme.spacing.sm,
    marginVertical: Theme.spacing.sm,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.12)',
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.2)',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...Theme.typography.headline,
    fontSize: 15,
    color: colors.text,
    marginBottom: 1,
    fontWeight: '600',
  },
  itemDescription: {
    ...Theme.typography.footnote,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  // Estilos para el chip de suscripción
  subscriptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    marginHorizontal: Theme.spacing.sm,
    marginVertical: Theme.spacing.xs / 2,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
  },
  chipIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.xs,
  },
  chipContent: {
    flex: 1,
  },
  chipTitle: {
    ...Theme.typography.callout,
    color: colors.text,
    fontWeight: '600',
  },
  chipDescription: {
    ...Theme.typography.caption1,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

export default function SideMenu({ visible, onClose, onNavigate }: SideMenuProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { isSubscribed } = useSubscription();
  const styles = getStyles(colors, isDark);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(MENU_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: MENU_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsModalVisible(false);
      });
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
      color: '#AF52DE', // Purple color
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
      title: 'Chatbot IA',
      icon: 'brain.head.profile',
      description: 'Analiza imágenes con inteligencia artificial',
      color: '#FF6B35', // Orange color
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

  // Elemento de suscripción separado para estilo diferente
  const subscriptionItem = !isSubscribed ? {
    id: 'subscription',
    title: t('side_menu.menu_items.subscription.title'),
    icon: 'crown.fill',
    description: t('side_menu.menu_items.subscription.description'),
    color: '#FFD700', // Gold color
    isChip: true,
  } : {
    id: 'subscription',
    title: t('side_menu.menu_items.subscription.premium_title'),
    icon: 'crown.fill',
    description: t('side_menu.menu_items.subscription.premium_description'),
    color: '#28a745', // Green color
    isChip: true,
  };
  return (
    <Modal
      visible={isModalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ flex: 1 }}
          >
            <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"} style={{ flex: 1, borderRadius: 20 }}>
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
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.lastMenuItem
                  ]}
                  onPress={() => {
                    if (onNavigate) {
                      onNavigate(item.id);
                    }
                    onClose();
                  }}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}25` }]}>
                    <IconSymbol size={20} name={item.icon as any} color={item.color} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
              
              {/* Botón de suscripción como chip al final */}
              <TouchableOpacity
                style={styles.subscriptionChip}
                onPress={() => {
                  if (onNavigate) {
                    onNavigate(subscriptionItem.id);
                  }
                  onClose();
                }}
              >
                <View style={[styles.chipIconContainer, { backgroundColor: `${subscriptionItem.color}25` }]}>
                  <IconSymbol size={14} name={subscriptionItem.icon as any} color={subscriptionItem.color} />
                </View>
                <View style={styles.chipContent}>
                  <Text style={styles.chipTitle}>{subscriptionItem.title}</Text>
                  <Text style={styles.chipDescription}>{subscriptionItem.description}</Text>
                </View>
              </TouchableOpacity>
              
              <View style={{ height: 20 }} />
            </ScrollView>

      
          </SafeAreaView>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

