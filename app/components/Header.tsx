import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BlurView } from 'expo-blur';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface HeaderProps {
  title: string | React.ReactNode;
  onProfilePress: () => void;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  showBackButton?: boolean;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },
  blurContainer: {
    elevation: 3,
    
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  menuButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warning,
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
  },
  spacer: {
    width: 48,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 30,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  profileButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default function Header({ title, onProfilePress, onMenuPress, onBackPress, showBackButton }: HeaderProps) {
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const styles = getStyles(colors, isDark);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <BlurView intensity={95} tint={isDark ? "dark" : "extraLight"} style={styles.blurContainer}>
        <View style={styles.container}>
          {showBackButton && onBackPress ? (
            <TouchableOpacity onPress={() => { triggerHaptic('light'); onBackPress(); }} style={styles.backButton}>
              <View style={styles.backButtonInner}>
                <IconSymbol size={20} name="chevron.left" color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : onMenuPress ? (
            <TouchableOpacity onPress={() => { triggerHaptic('light'); onMenuPress(); }} style={styles.profileButton}>
     
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
            <View style={styles.titleUnderline} />
          </View>
          
          <TouchableOpacity onPress={() => { triggerHaptic('light'); onMenuPress?.(); }} style={styles.profileButton}>
             <View style={styles.menuButtonInner}>
               <IconSymbol size={20} name="line.3.horizontal" color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </BlurView>
    </SafeAreaView>
  );
}

