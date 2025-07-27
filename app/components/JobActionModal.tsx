import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Switch,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Job } from '../types/WorkTypes';

const { height: screenHeight } = Dimensions.get('window');

interface JobActionModalProps {
  visible: boolean;
  job: Job | null;
  onClose: () => void;
  onAction: (action: string) => void;
  showAutoTimer?: boolean;
  autoTimerEnabled?: boolean;
  onAutoTimerToggle?: (value: boolean) => void;
}

export default function JobActionModal({
  visible,
  job,
  onClose,
  onAction,
  showAutoTimer = false,
  autoTimerEnabled = false,
  onAutoTimerToggle,
}: JobActionModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  // Animation values for bottom sheet
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);

  // Gesture handler for dragging
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      console.log('🟡 Gesture started');
    },
    onActive: (event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    },
    onEnd: (event) => {
      const threshold = 150; // Threshold for closing
      
      if (event.translationY > threshold || event.velocityY > 500) {
        // Close modal
        translateY.value = withTiming(screenHeight, { duration: 300 });
        backdropOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(onClose)();
      } else {
        // Snap back to open position
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
      }
    },
  });

  // Animated styles
  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  React.useEffect(() => {
    console.log('🟡 JobActionModal: visibility changed to:', visible, 'job:', job?.name);
    if (visible) {
      // Open modal with bottom sheet animation
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      backdropOpacity.value = withTiming(0.5, {
        duration: 300,
      });
    } else {
      // Close modal
      translateY.value = withTiming(screenHeight, {
        duration: 300,
      });
      backdropOpacity.value = withTiming(0, {
        duration: 300,
      });
    }
  }, [visible]);

  const styles = getStyles(colors, isDark);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.actionModal}>
        {/* Backdrop with animated opacity */}
        <Animated.View style={[styles.actionModalBackdrop, animatedBackdropStyle]}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Bottom Sheet */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.bottomSheet, animatedSheetStyle]}>
            <BlurView 
              intensity={isDark ? 90 : 98} 
              tint={isDark ? "dark" : "light"} 
              style={styles.bottomSheetContent}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandle} />
              
              {job && (
                <>
                  <View style={styles.actionModalHeader}>
                    <View style={[styles.actionModalColorDot, { backgroundColor: job.color }]} />
                    <View style={styles.actionModalInfo}>
                      <Text style={styles.actionModalTitle}>{job.name}</Text>
                      {job.company && (
                        <Text style={styles.actionModalSubtitle}>{job.company}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.actionModalButtons}>
                    <TouchableOpacity
                      style={[styles.actionModalButton, styles.secondaryButtonBg]}
                      onPress={() => onAction('edit')}
                    >
                      <IconSymbol size={24} name="gear" color={colors.textSecondary} />
                      <View style={styles.actionModalButtonTextContainer}>
                        <Text style={styles.actionModalButtonText}>
                          {t('maps.edit_job')}
                        </Text>
                        {showAutoTimer && (
                          <View style={styles.autoTimerSwitchContainer}>
                            <Text style={styles.autoTimerSwitchLabel}>
                              {t('maps.auto_timer')}
                            </Text>
                            <Switch
                              value={autoTimerEnabled}
                              onValueChange={onAutoTimerToggle}
                              trackColor={{ false: colors.separator, true: colors.success + '40' }}
                              thumbColor={autoTimerEnabled ? colors.success : colors.textTertiary}
                              style={styles.autoTimerSwitch}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionModalButton, styles.successButtonBg]}
                      onPress={() => onAction('timer')}
                    >
                      <IconSymbol size={24} name="clock.fill" color={colors.success} />
                      <Text style={styles.actionModalButtonText}>
                        {t('maps.start_timer')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionModalButton, styles.primaryButtonBg]}
                      onPress={() => onAction('calendar')}
                    >
                      <IconSymbol size={24} name="calendar" color={colors.primary} />
                      <Text style={styles.actionModalButtonText}>
                        {t('maps.view_calendar')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionModalButton, styles.warningButtonBg]}
                      onPress={() => onAction('statistics')}
                    >
                      <IconSymbol size={24} name="chart.bar.fill" color={colors.warning} />
                      <Text style={styles.actionModalButtonText}>
                        {t('maps.view_statistics')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionModalButton, styles.errorButtonBg]}
                      onPress={() => onAction('delete')}
                    >
                      <IconSymbol size={24} name="trash.fill" color={colors.error} />
                      <Text style={styles.actionModalButtonText}>
                        {t('maps.delete_job')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.actionModalCancelButton}
                    onPress={onClose}
                  >
                    <Text style={styles.actionModalCancelText}>{t('maps.cancel')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </BlurView>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  actionModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  bottomSheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 400,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionModalColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  actionModalInfo: {
    flex: 1,
  },
  actionModalTitle: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionModalButtons: {
    gap: 12,
    marginBottom: 16,
  },
  actionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  actionModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  actionModalButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  autoTimerSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  autoTimerSwitchLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  autoTimerSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  actionModalCancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  actionModalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Button background colors
  secondaryButtonBg: {
    backgroundColor: isDark ? 'rgba(142, 142, 147, 0.25)' : 'rgba(142, 142, 147, 0.15)',
  },
  successButtonBg: {
    backgroundColor: isDark ? 'rgba(52, 199, 89, 0.25)' : 'rgba(52, 199, 89, 0.15)',
  },
  primaryButtonBg: {
    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)',
  },
  warningButtonBg: {
    backgroundColor: isDark ? 'rgba(255, 149, 0, 0.25)' : 'rgba(255, 149, 0, 0.15)',
  },
  errorButtonBg: {
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.25)' : 'rgba(255, 59, 48, 0.15)',
  },
});