import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface TimerSuccessModalProps {
  visible: boolean;
  hours: number;
  totalHours?: number;
  isUpdate?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TimerSuccessModal({
  visible,
  hours,
  totalHours,
  isUpdate = false,
  onConfirm,
  onClose,
}: TimerSuccessModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  
  const scaleAnimation = useSharedValue(0);
  const checkmarkAnimation = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      triggerHaptic('success');
      scaleAnimation.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      checkmarkAnimation.value = withDelay(200, withSpring(1));
      contentOpacity.value = withDelay(300, withSpring(1));
    } else {
      scaleAnimation.value = 0;
      checkmarkAnimation.value = 0;
      contentOpacity.value = 0;
    }
  }, [visible]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
    opacity: scaleAnimation.value,
  }));

  const animatedCheckmarkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkmarkAnimation.value },
      { rotate: `${interpolate(checkmarkAnimation.value, [0, 1], [-180, 0])}deg` },
    ],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleConfirm = () => {
    triggerHaptic('light');
    
    // Animate out
    scaleAnimation.value = withSpring(0, { damping: 15 }, () => {
      runOnJS(onConfirm)();
    });
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
          <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={styles.modal}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']
                : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']
              }
              style={styles.gradientBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            
            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)' 
              }]}
              onPress={onClose}
            >
              <IconSymbol
                name="xmark"
                size={16}
                color={isDark ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
            
            {/* Success Icon */}
            <Animated.View style={[styles.iconContainer, animatedCheckmarkStyle]}>
              <LinearGradient
                colors={['#34C759', '#30B852']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconSymbol
                  name="checkmark"
                  size={40}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </Animated.View>
            
            {/* Content */}
            <Animated.View style={[styles.content, animatedContentStyle]}>
              <View style={styles.hoursContainer}>
                <View style={[styles.hourBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                  <Text style={[styles.hoursLabel, { color: isDark ? '#FFFFFF' : '#000000', opacity: 0.7 }]}>
                    {isUpdate ? t('timer.session_hours') : t('timer.hours_worked')}
                  </Text>
                  <Text style={[styles.hoursValue, { color: '#007AFF' }]}>
                    {hours.toFixed(2)}h
                  </Text>
                </View>
                
                {isUpdate && totalHours && (
                  <>
                    <View style={[styles.plusSign, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                      <Text style={[styles.plusText, { color: isDark ? '#FFFFFF' : '#000000', opacity: 0.7 }]}>+</Text>
                    </View>
                    <View style={[styles.hourBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                      <Text style={[styles.hoursLabel, { color: isDark ? '#FFFFFF' : '#000000', opacity: 0.7 }]}>
                        {t('timer.total_hours')}
                      </Text>
                      <Text style={[styles.hoursValue, { color: '#34C759' }]}>
                        {totalHours.toFixed(2)}h
                      </Text>
                    </View>
                  </>
                )}
              </View>
              
              <Text style={[styles.message, { color: isDark ? '#FFFFFF' : '#000000', opacity: 0.8 }]}>
                {isUpdate 
                  ? t('timer.session_added_successfully')
                  : t('timer.session_saved_successfully')
                }
              </Text>
            </Animated.View>
            
            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleConfirm}
              >
                <LinearGradient
                  colors={['#007AFF', '#0051D5']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconSymbol
                    name="chart.bar.fill"
                    size={28}
                    color="#FFFFFF"
                  />
   
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  hourBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  hoursLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  hoursValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  plusSign: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  plusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  primaryButton: {
    overflow: 'hidden',
    maxWidth: '50%',
    alignSelf: 'center',
  },
  buttonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});