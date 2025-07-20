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
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  onMenuToggle: () => void;
  onNavigate?: (screen: string) => void;
}

const menuItems = [
  {
    id: 'mapa',
    title: 'Trabajo',
    icon: 'map.fill',
    description: 'Ubicación actual',
    color: Theme.colors.primary,
  },
  {
    id: 'timer',
    title: 'Timer',
    icon: 'clock.fill',
    description: 'Control de tiempo',
    color: Theme.colors.success,
  },
  {
    id: 'reports',
    title: 'Reportes',
    icon: 'chart.bar.fill',
    description: 'Estadísticas',
    color: Theme.colors.warning,
  },
  {
    id: 'calendar',
    title: 'Calendario',
    icon: 'calendar',
    description: 'Días trabajados',
    color: Theme.colors.primary,
  },
  {
    id: 'settings',
    title: 'Configuración',
    icon: 'gear',
    description: 'Preferencias',
    color: Theme.colors.textSecondary,
  },
];

export default function SideMenu({ visible, onClose, onNavigate }: SideMenuProps) {
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
        
        <BlurView intensity={95} tint="light" style={styles.menuContainer}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Navegación</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <IconSymbol size={24} name="xmark" color={Theme.colors.text} />
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
                  <IconSymbol size={16} name="chevron.right" color={Theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>

      
          </SafeAreaView>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    borderBottomColor: Theme.colors.separator,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Theme.typography.title2,
    color: Theme.colors.text,
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
    borderBottomColor: Theme.colors.separator,
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
    color: Theme.colors.text,
    marginBottom: 2,
  },
  itemDescription: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
  },
  footer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.separator,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: 2,
  },
  userEmail: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
  },
});