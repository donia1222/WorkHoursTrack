import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigation } from '../context/NavigationContext';

interface HeaderProps {
  title: string | React.ReactNode;
  onProfilePress?: () => void; // Optional - not used anymore
  // Menu button removed - using bottom navigation now
  onBackPress?: () => void;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  onClosePress?: () => void;
  isSettingsActive?: boolean;
  currentScreen?: string;
  onExportPress?: () => void;
  onSyncPress?: () => void;
  onNotesPress?: () => void;
  onInfoPress?: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: {
    marginTop: -20,
    backgroundColor: colors.background,
  },
  blurContainer: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,

    overflow: 'hidden',
    backgroundColor: isDark ? '#000000' : 'transparent',
  },
  blurGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 14,
    position: 'relative',
    zIndex: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 16,
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.warning,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
  },
  backButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  spacer: {
    width: 36,
    height: 36,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 0,
    paddingRight: 0,
    marginLeft: -18,
    marginTop: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.3,
    textShadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  titleUnderline: {
    width: 65,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    marginLeft: 7,
    alignSelf: 'flex-start',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  titleUnderlineGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 2,
  },
  profileButton: {
    padding: 4,
    zIndex: 100,
  },
  profileButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  profileButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },
  // Menu-related styles removed - using bottom navigation
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  subscriptionButton: {
    padding: 4,
  },
  subscriptionButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
  },
  subscriptionButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  exportButton: {
    padding: 4,
  },
  exportButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)',
  },
  syncButton: {
    padding: 4,
  },
  syncButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(167, 139, 250, 0.2)',
  },
  notesButton: {
    padding: 4,
  },
  notesButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)',
  },
  historyButton: {
    padding: 4,
  },
  historyButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
  },
  infoButton: {
    padding: 4,
  },
  infoButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(142, 142, 147, 0.15)' : 'rgba(142, 142, 147, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(142, 142, 147, 0.3)' : 'rgba(142, 142, 147, 0.2)',
  },
});

export default function Header({ title, onProfilePress, onBackPress, showBackButton, showCloseButton, onClosePress, isSettingsActive, currentScreen, onExportPress, onSyncPress, onNotesPress, onInfoPress }: HeaderProps) {
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const { isSubscribed } = useSubscription();
  const { navigateTo } = useNavigation();
  const styles = getStyles(colors, isDark);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <BlurView intensity={isDark ? 0 : 90} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
        <LinearGradient
          colors={isDark 
            ? ['#000000ff', '#000000', '#000000'] 
            : ['rgba(0, 123, 255, 0)', 'rgba(0, 123, 255, 0)', 'transparent']
          }
          style={styles.blurGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.container}>
          {showBackButton && onBackPress ? (
            <TouchableOpacity onPress={() => { triggerHaptic('light'); onBackPress(); }} style={styles.backButton}>
              <View style={styles.backButtonInner}>
                <LinearGradient
                  colors={['#FF9500', '#E6820C', '#CC7300']}
                  style={styles.backButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <IconSymbol size={20} name="chevron.left" color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
          
          <View style={styles.titleContainer}>
            {typeof title === 'string' ? (
              <Text style={styles.title}>{title}</Text>
            ) : (
              title
            )}
            <View style={styles.titleUnderline}>
              <LinearGradient
                colors={['#007AFF', '#0056CC', '#003D99']}
                style={styles.titleUnderlineGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
          
          {showCloseButton && onClosePress ? (
            <TouchableOpacity 
              onPress={() => { triggerHaptic('light'); onClosePress(); }}
              style={styles.closeButton}
            >
              <IconSymbol size={18} name="xmark" color={colors.textSecondary} />
            </TouchableOpacity>
          ) : currentScreen === 'reports' && onExportPress ? (
            <TouchableOpacity 
              onPress={() => { triggerHaptic('light'); onExportPress(); }} 
              style={styles.exportButton}
            >
              <View style={styles.exportButtonInner}>
                <IconSymbol size={18} name="square.and.arrow.up" color={colors.warning} />
              </View>
            </TouchableOpacity>
          ) : currentScreen === 'calendar' && onSyncPress ? (
            <TouchableOpacity 
              onPress={() => { triggerHaptic('light'); onSyncPress(); }} 
              style={styles.syncButton}
            >
              <View style={styles.syncButtonInner}>
                <IconSymbol size={20} name="calendar.badge.plus" color="#A78BFA" />
              </View>
            </TouchableOpacity>
          ) : currentScreen === 'timer' && onNotesPress ? (
            <TouchableOpacity 
              onPress={() => { triggerHaptic('light'); onNotesPress(); }} 
              style={styles.notesButton}
            >
              <View style={styles.notesButtonInner}>
                <IconSymbol size={18} name="pencil" color={colors.success} />
              </View>
            </TouchableOpacity>
          ) : currentScreen === 'chatbot' ? (
            <TouchableOpacity 
              onPress={() => { 
                triggerHaptic('light'); 
                if (globalThis.chatbotScreenHistoryHandler) {
                  globalThis.chatbotScreenHistoryHandler();
                }
              }} 
              style={styles.historyButton}
            >
              <View style={styles.historyButtonInner}>
                <IconSymbol size={18} name="clock.arrow.circlepath" color={colors.primary} />
              </View>
            </TouchableOpacity>
          ) : currentScreen === 'mapa' && onInfoPress ? (
            <TouchableOpacity 
              onPress={() => { 
                triggerHaptic('light'); 
                onInfoPress();
              }} 
              style={styles.infoButton}
            >
              <View style={styles.infoButtonInner}>
                <IconSymbol size={20} name="info.circle.fill" color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ) : !isSubscribed && currentScreen === 'settings' ? (
            <TouchableOpacity 
              onPress={() => { 
                triggerHaptic('light'); 
                navigateTo('subscription');
              }} 
              style={styles.subscriptionButton}
            >
              <View style={styles.subscriptionButtonInner}>
                <LinearGradient
                  colors={['#FFD700', '#FFC107', '#FFB300']}
                  style={styles.subscriptionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <IconSymbol size={18} name="crown.fill" color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      </BlurView>
    </SafeAreaView>
  );
}

