import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface HeaderProps {
  title: string | React.ReactNode;
  onProfilePress: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  onClosePress?: () => void;
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
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 24,
    position: 'relative',
    zIndex: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 16,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
   
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    textShadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'left',
  },
  titleUnderline: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
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
    padding: 6,
    zIndex: 100,
  },
  profileButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.12)',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.25)',
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
  modernMenuIcon: {
    width: 24,
    height: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuShape: {
    width: 18,
    height: 3,
    borderRadius: 4,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuShape1: {
    top: 2,
    left: 3,
    backgroundColor: '#007AFF',
  },
  menuShape2: {
    top: 7,
    left: 3,
    backgroundColor: '#007AFF',
  },
  menuShape3: {
    top: 12,
    left: 3,
    backgroundColor: '#007AFF',
  },
  menuShape4: {
    top: 17,
    left: 3,
    backgroundColor: '#007AFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
});

export default function Header({ title, onProfilePress, onMenuPress, onBackPress, showBackButton, showCloseButton, onClosePress }: HeaderProps) {
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const styles = getStyles(colors, isDark);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <BlurView intensity={isDark ? 0 : 90} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
        <LinearGradient
          colors={isDark 
            ? ['#000000', '#000000', '#000000'] 
            : ['rgba(0, 122, 255, 0.06)', 'rgba(0, 122, 255, 0.02)', 'transparent']
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
              <IconSymbol size={24} name="xmark" color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { triggerHaptic('light'); onMenuPress?.(); }} style={styles.profileButton}>
              <View style={styles.profileButtonInner}>
                <LinearGradient
                  colors={isDark ? ['rgba(0, 122, 255, 0.25)', 'rgba(0, 122, 255, 0.08)'] : ['rgba(0, 122, 255, 0.18)', 'rgba(0, 122, 255, 0.06)']}
                  style={styles.profileButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.modernMenuIcon}>
                  <View style={[styles.menuShape, styles.menuShape1]} />
                  <View style={[styles.menuShape, styles.menuShape2]} />
                  <View style={[styles.menuShape, styles.menuShape3]} />
                  <View style={[styles.menuShape, styles.menuShape4]} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </SafeAreaView>
  );
}

