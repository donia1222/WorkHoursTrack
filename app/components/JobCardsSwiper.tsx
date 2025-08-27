import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Animated,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import ReanimatedAnimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  withSpring, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { Job } from '../types/WorkTypes';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useSubscription } from '../hooks/useSubscription';
import AutoTimerService from '../services/AutoTimerService';


// JobCardsSwiper Props Interface
export interface JobCardsSwiperProps {
  jobs: Job[];
  visible: boolean;
  onClose: () => void;
  isJobCurrentlyActive: (job: Job) => boolean;
  getJobScheduleStatus: (job: Job) => string | null;
  onTimerToggle?: (job: Job) => void;
  getJobStatistics?: (job: Job) => { thisMonthHours: number; thisMonthDays: number } | null;
  onAction?: (action: string, job: Job) => void;
  showAutoTimer?: boolean;
  autoTimerEnabled?: boolean;
  onAutoTimerToggle?: (job: Job, value: boolean) => void | Promise<void>;
  onNavigateToSubscription?: () => void;
  t: (key: string, options?: any) => string;
}

const EXPANDED_CARD_HEIGHT = 320;

interface GestureContext extends Record<string, unknown> {
  startY: number;
}

// Función para calcular distancia entre dos coordenadas
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const JobCardsSwiper: React.FC<JobCardsSwiperProps> = ({
  jobs,
  visible,
  onClose,
  isJobCurrentlyActive,
  getJobScheduleStatus,
  onTimerToggle,
  getJobStatistics,
  onAction,
  showAutoTimer = false,
  autoTimerEnabled = false,
  onAutoTimerToggle,
  onNavigateToSubscription,
  t,
}) => {
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const { isSubscribed } = useSubscription();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Modal animation values
  const translateY = useSharedValue(screenHeight * 0.6); // Start from bottom
  const opacity = useSharedValue(0);
  
  // Gesture handler for drag to close
  const gestureHandler = useAnimatedGestureHandler<any, GestureContext>({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      const newTranslateY = context.startY + event.translationY;
      if (newTranslateY >= 0) {
        translateY.value = newTranslateY;
      }
    },
    onEnd: (event) => {
      const shouldClose = event.translationY > 100 || event.velocityY > 500;
      
      if (shouldClose) {
        translateY.value = withTiming(screenHeight * 0.6, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    },
  });
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Modal visibility effect
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(screenHeight * 0.6, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);




  if (jobs.length === 0) return null;

  const styles = createStyles(colors, isDark);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <ReanimatedAnimated.View style={[styles.modalContainer, animatedStyle]}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />
             <ScrollView
                ref={scrollViewRef}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                style={styles.scrollView}
                bounces={true}
                pagingEnabled={true}
                snapToInterval={screenWidth}
                decelerationRate="fast"
                onScroll={(event) => {
                  const contentOffsetX = event.nativeEvent.contentOffset.x;
                  const index = Math.round(contentOffsetX / screenWidth);
                  const validIndex = Math.max(0, Math.min(index, jobs.length - 1));
                  setCurrentIndex(validIndex);
                }}
                scrollEventThrottle={16}
              >
                {jobs.slice()
                  .sort((a, b) => {
                    // First sort by AutoTimer enabled (enabled first)
                    if (a.autoTimer?.enabled && !b.autoTimer?.enabled) return -1;
                    if (!a.autoTimer?.enabled && b.autoTimer?.enabled) return 1;
                    // If both have same AutoTimer status, maintain original order
                    return 0;
                  })
                  .map((job, index) => {
                  const isActive = isJobCurrentlyActive(job);
                  const jobStats = getJobStatistics ? getJobStatistics(job) : null;

                  return (
                    <View
                      key={job.id}
                      style={[
                        styles.jobContainer,
                        { width: screenWidth }
                      ]}
                    >

                      <View style={styles.jobContent}>
                  

                           <View style={styles.jobHeader}>
                          <View style={[styles.jobColorDot, { backgroundColor: job.color }]} />
                   
                            <Text style={[styles.jobName, { color: job.color }]} numberOfLines={1}>
                              {job.name}
                            </Text>
                            {job.company && (
                              <Text style={styles.companyName} numberOfLines={1}>
                                {job.company}
                              </Text>
                            )}
                
                          {isActive && (
                            <View style={styles.activeIndicator}>
                              <IconSymbol size={12} name="circle.fill" color={colors.success} />
                            </View>
                          )}
                        </View>
                       

                          {/* Statistics */}
                          {jobStats && (
                            <View style={styles.statsContainer}>
                              <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                  <View style={styles.statTopRow}>
                                    <View style={[styles.statIcon, { backgroundColor: `${job.color}20` }]}>
                                      <IconSymbol size={14} name="clock.fill" color={job.color} />
                                    </View>
                                    <Text style={[styles.statValue, { color: job.color }]}>
                                      {Math.floor(jobStats.thisMonthHours)}h {Math.round((jobStats.thisMonthHours - Math.floor(jobStats.thisMonthHours)) * 60)}m
                                    </Text>
                                  </View>
                                  <Text style={styles.statLabel}>{t('reports.this_month')}</Text>
                                </View>
                                <View style={styles.statItem}>
                                  <View style={styles.statTopRow}>
                                    <View style={[styles.statIcon, { backgroundColor: `${job.color}20` }]}>
                                      <IconSymbol size={14} name="calendar" color={job.color} />
                                    </View>
                                    <Text style={[styles.statValue, { color: job.color }]}>{jobStats.thisMonthDays}</Text>
                                  </View>
                                  <Text style={styles.statLabel}>{t('calendar.worked_days')}</Text>
                                </View>
                              </View>
                            </View>
                          )}

                          {/* Expanded content */}
                          <View style={styles.expandedContent}>
                            <View style={styles.expandedGrid}>
                              {/* Timer Button */}
                              <TouchableOpacity 
                                style={[styles.gridButton, styles.timerGridButton]}
                                onPress={() => {
                                  console.log('🟡 Timer button pressed', { job: job.name, hasOnAction: !!onAction });
                                  if (onAction) {
                                    onAction('timer', job);
                                  } else if (onTimerToggle) {
                                    onTimerToggle(job);
                                  }
                                }}
                              >
                                <View style={styles.gridButtonContent}>
                                  <IconSymbol size={24} name="clock.fill" color="#00C851" />
                                  <Text style={[styles.gridButtonText, { color: '#00C851' }]}>
                                    {t('job_cards.buttons.timer')}
                                  </Text>
                                </View>
                              </TouchableOpacity>

                              {/* Calendar Button */}
                              <TouchableOpacity 
                                style={[styles.gridButton, styles.calendarGridButton]}
                                onPress={() => onAction && onAction('calendar', job)}
                              >
                                <View style={styles.gridButtonContent}>
                                  <IconSymbol size={24} name="calendar" color="#007AFF" />
                                  <Text style={[styles.gridButtonText, { color: '#007AFF' }]}>
                                    {t('job_cards.buttons.calendar')}
                                  </Text>
                                </View>
                              </TouchableOpacity>
           
                              {/* Stats Button */}
                              <TouchableOpacity 
                                style={[styles.gridButton, styles.statsGridButton]}
                                onPress={() => onAction && onAction('statistics', job)}
                              >
                                <View style={styles.gridButtonContent}>
                                  <IconSymbol size={24} name="chart.bar.fill" color="#FF9500" />
                                  <Text style={[styles.gridButtonText, { color: '#FF9500' }]}>
                                    {t('job_cards.buttons.statistics')}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                                               
                              {/* Edit Button */}
                              <TouchableOpacity 
                                style={[styles.gridButton, styles.editGridButton]}
                                onPress={() => {
                                  console.log('🔧 JobCardsSwiper: Settings button pressed for job:', job.name);
                                  onAction && onAction('edit', job);
                                }}
                              >
                                <View style={styles.gridButtonContent}>
                                  <IconSymbol size={24} name="gearshape.fill" color="#8E8E93" />
                                  <Text style={[styles.gridButtonText, { color: '#8E8E93' }]}>
                                    {t('job_cards.buttons.settings')}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                          </View>
          {/* Dots indicator for horizontal scroll */}
          <View style={styles.dotsContainer}>
            {jobs.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive
                ]}
              />
            ))}
          </View>
                          {/* Footer - solo mostrar si hay onTimerToggle */}
                          {onTimerToggle && (
                            <View style={styles.footer}>
                              <View style={styles.timerButton}>
                                <IconSymbol 
                                  size={14} 
                                  name={isActive ? "pause.fill" : "play.fill"} 
                                  color={isActive ? "#FFFFFF" : job.color} 
                                />
                                <Text style={[
                                  styles.timerButtonText, 
                                  { color: isActive ? "#FFFFFF" : job.color }
                                ]}>
                                  {isActive ? t('timer.pause') : t('timer.start')}
                                </Text>
                              </View>
                              <Switch
                                value={isActive}
                                onValueChange={() => onTimerToggle && onTimerToggle(job)}
                                trackColor={{ 
                                  false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', 
                                  true: job.color + '40' 
                                }}
                                thumbColor={isActive ? job.color : (isDark ? '#f4f3f4' : '#f4f3f4')}
                                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}
                                style={styles.timerSwitch}
                              />
                            </View>
                          )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
  
            
            {/* Premium Modal */}
            <Modal
              visible={showPremiumModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowPremiumModal(false)}
            >
              <View style={styles.premiumModalOverlay}>
                <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.premiumModalContainer}>
                  <View style={styles.premiumModalHeader}>
                    <View style={styles.premiumIcon}>
                      <IconSymbol size={40} name="crown.fill" color="#000" />
                    </View>
                    <Text style={styles.premiumModalTitle}>
                      {t('job_form.premium.title')}
                    </Text>
                    <Text style={styles.premiumModalSubtitle}>
                      {t('job_form.premium.message')}
                    </Text>
                  </View>

                  <View style={styles.premiumModalContent}>
                    <View style={styles.premiumFeaturesList}>
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumFeatureIcon}>
                          <IconSymbol size={18} name="location.fill" color={colors.primary} />
                        </View>
                        <Text style={styles.premiumFeatureText}>
                          {t('job_form.premium.features.auto')}
                        </Text>
                      </View>
                      
                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumFeatureIcon}>
                          <IconSymbol size={18} name="clock.fill" color={colors.primary} />
                        </View>
                        <Text style={styles.premiumFeatureText}>
                          {t('job_form.premium.features.schedule')}
                        </Text>
                      </View>

                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumFeatureIcon}>
                          <IconSymbol size={18} name="dollarsign.circle.fill" color={colors.primary} />
                        </View>
                        <Text style={styles.premiumFeatureText}>
                          {t('job_form.premium.features.financial')}
                        </Text>
                      </View>

                      <View style={styles.premiumFeatureItem}>
                        <View style={styles.premiumFeatureIcon}>
                          <IconSymbol size={18} name="chart.bar.fill" color={colors.primary} />
                        </View>
                        <Text style={styles.premiumFeatureText}>
                          {t('job_form.premium.features.billing')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.premiumModalActions}>
                      <TouchableOpacity 
                        style={styles.premiumCancelButton}
                        onPress={() => setShowPremiumModal(false)}
                      >
                        <Text style={styles.premiumCancelButtonText}>
                          {t('job_form.premium.cancel')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.premiumSubscribeButton}
                        onPress={() => {
                          setShowPremiumModal(false);
                          if (onNavigateToSubscription) {
                            onNavigateToSubscription();
                          }
                        }}
                      >
                        <Text style={styles.premiumSubscribeButtonText}>
                          {t('job_form.premium.subscribe')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </BlurView>
              </View>
            </Modal>
          </ReanimatedAnimated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, isDark: boolean) => {
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  
  return StyleSheet.create({
  modalOverlay: {
    flex: 1,
  
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.surfaces,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 380,
    paddingTop: 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: isDark ? 0.4 : 0.15,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalContent: {
    paddingHorizontal: 0,
  },
  scrollView: {
    flex: 1,
  },
  fixedContainer: {
    // No height constraint, let it size to content
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  jobContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'flex-start',
  },
  jobContent: {
    flex: 1,
    paddingTop: 20,
    
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  jobColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.6 : 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    

  },
  cardActive: {
    transform: [{ scale: 1.03 }],
    elevation: 12,
    shadowOpacity: isDark ? 0.8 : 0.25,
    shadowRadius: 16,
  },
  cardInner: {
    flex: 1,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  colorAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  jobInfo: {
    flex: 1,
  },
  jobNameChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobName: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
  },
  jobNameActive: {
    color: colors.success,
  },
  companyName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    opacity: 0.8,
    textAlign: 'left',
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  statsContainer: {
    marginVertical: 8,
    marginHorizontal: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    gap: 2,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  expandedContent: {
    marginTop: 0,
    paddingHorizontal: 8,
    paddingBottom: 12,
    paddingTop: 8,
    position: 'relative',
  },
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  gridButton: {
    width: '48%',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)',
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 6,
    backdropFilter: 'blur(20px)',
  },
  gridButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  gridButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerGridButton: {
    backgroundColor: isDark ? 'rgba(0,200,81,0.2)' : 'rgba(0,200,81,0.15)',
    borderColor: isDark ? 'rgba(0,200,81,0.4)' : 'rgba(0,200,81,0.3)',
    shadowColor: '#00C851',
    shadowOpacity: isDark ? 0.2 : 0.1,
  },
  calendarGridButton: {
    backgroundColor: isDark ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.15)',
    borderColor: isDark ? 'rgba(0,122,255,0.4)' : 'rgba(0,122,255,0.3)',
    shadowColor: '#007AFF',
    shadowOpacity: isDark ? 0.2 : 0.1,
  },
  editGridButton: {
    backgroundColor: isDark ? 'rgba(142,142,147,0.2)' : 'rgba(142,142,147,0.15)',
    borderColor: isDark ? 'rgba(142,142,147,0.4)' : 'rgba(142,142,147,0.3)',
    shadowColor: '#8E8E93',
    shadowOpacity: isDark ? 0.2 : 0.1,
  },
  statsGridButton: {
    backgroundColor: isDark ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.15)',
    borderColor: isDark ? 'rgba(255,149,0,0.4)' : 'rgba(255,149,0,0.3)',
    shadowColor: '#FF9500',
    shadowOpacity: isDark ? 0.2 : 0.1,
  },
  autoTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '95%',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    alignSelf: 'center',
  },
  autoTimerLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  autoTimerSwitch: {
    transform: [{ scale: 0.7 }],
    marginRight: -6,
  },
  collapseIndicator: {
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: -9,
    paddingBottom: 4,
    zIndex: 10,
  },
  collapseBar: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  timerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timerSwitch: {
    transform: [{ scale: 0.9 }],
  },
  footerExpandIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  expandIndicatorBar: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    borderRadius: 2,
  },
  collapsedLayout: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    position: 'relative',
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flex: 1,
  },
  collapsedJobChip: {
    marginBottom: 0,
    shadowOpacity: isDark ? 0.4 : 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  collapsedJobChipContainer: {
    flex: 1,
    minWidth: 0,
    maxWidth: '70%',
  },
  collapsedJobName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  collapsedExpandIndicator: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 0,
  },
  collapsedRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoTimerIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  autoTimerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  autoTimerMiniText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#34C759',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collapsedSettingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
  closeButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },

  // Premium Modal Styles
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  premiumModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  premiumModalHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  premiumModalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumModalContent: {
    padding: 24,
  },
  premiumFeaturesList: {
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  premiumModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  premiumCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  premiumCancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  premiumSubscribeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    elevation: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  premiumSubscribeButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  // Dots Indicator Styles
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    opacity: 0.5,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.primary,
    opacity: 1,
  },
});
};