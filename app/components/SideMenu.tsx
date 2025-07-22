import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

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
    width: width * 0.8,
    maxWidth: 320,
    backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
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
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
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
    paddingTop: Theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...Theme.typography.headline,
    color: colors.text,
    marginBottom: 2,
  },
  itemDescription: {
    ...Theme.typography.footnote,
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
        
        <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.menuContainer}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>{t('side_menu.title')}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <IconSymbol size={24} name="xmark" color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.menuContent}>
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
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                    <IconSymbol size={24} name={item.icon as any} color={item.color} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                  <IconSymbol size={16} name="chevron.right" color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>

      
          </SafeAreaView>
        </BlurView>
      </View>
    </Modal>
  );
}

