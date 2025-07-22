import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onMenuToggle: () => void;
  onNavigate?: (screen: string) => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: width * 0.85,
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 0,
    },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 25,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderRightWidth: 1,
    borderRightColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: isSmallScreen ? Theme.spacing.md : Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
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
    paddingHorizontal: isSmallScreen ? Theme.spacing.lg : Theme.spacing.xl,
    paddingVertical: isSmallScreen ? Theme.spacing.md : Theme.spacing.lg,
    marginHorizontal: Theme.spacing.md,
    marginVertical: isSmallScreen ? Theme.spacing.xs : Theme.spacing.xs,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: isSmallScreen ? 44 : 56,
    height: isSmallScreen ? 44 : 56,
    borderRadius: isSmallScreen ? 22 : 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? Theme.spacing.md : Theme.spacing.lg,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...Theme.typography.headline,
    fontSize: isSmallScreen ? 16 : 18,
    color: colors.text,
    marginBottom: isSmallScreen ? 1 : 2,
  },
  itemDescription: {
    ...Theme.typography.footnote,
    fontSize: isSmallScreen ? 12 : 14,
    color: colors.textSecondary,
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
});

export default function SideMenu({ visible, onClose, onNavigate }: SideMenuProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);
  
  const menuItems = [
    {
      id: 'mapa',
      title: t('side_menu.menu_items.mapa.title'),
      icon: 'map.fill',
      description: t('side_menu.menu_items.mapa.description'),
      color: colors.primary,
    },
    {
      id: 'timer',
      title: t('side_menu.menu_items.timer.title'),
      icon: 'clock.fill',
      description: t('side_menu.menu_items.timer.description'),
      color: colors.success,
    },
    {
      id: 'reports',
      title: t('side_menu.menu_items.reports.title'),
      icon: 'chart.bar.fill',
      description: t('side_menu.menu_items.reports.description'),
      color: colors.warning,
    },
    {
      id: 'calendar',
      title: t('side_menu.menu_items.calendar.title'),
      icon: 'calendar',
      description: t('side_menu.menu_items.calendar.description'),
      color: colors.primary,
    },
    {
      id: 'settings',
      title: t('side_menu.menu_items.settings.title'),
      icon: 'gear',
      description: t('side_menu.menu_items.settings.description'),
      color: colors.textSecondary,
    },
  ];
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <BlurView intensity={75} tint={isDark ? "dark" : "extraLight"} style={styles.menuContainer}>
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
                    <IconSymbol size={isSmallScreen ? 24 : 28} name={item.icon as any} color={item.color} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  <IconSymbol size={20} name="chevron.right" color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
              {/* Padding bottom para asegurar que todo sea visible */}
              <View style={{ height: isSmallScreen ? 20 : 40 }} />
            </ScrollView>

      
          </SafeAreaView>
        </BlurView>
      </View>
    </Modal>
  );
}

