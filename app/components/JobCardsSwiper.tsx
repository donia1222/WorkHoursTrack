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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { Job } from '../types/WorkTypes';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useSubscription } from '../hooks/useSubscription';


interface JobCardsSwiperProps {
  jobs: Job[];

  isJobCurrentlyActive: (job: Job) => boolean;
  getJobScheduleStatus: (job: Job) => string | null;
  onTimerToggle?: (job: Job) => void;
  getJobStatistics?: (job: Job) => { thisMonthHours: number; thisMonthDays: number } | null;
  onAction?: (action: string, job: Job) => void;
  showAutoTimer?: boolean;
  autoTimerEnabled?: boolean;
  onAutoTimerToggle?: (job: Job, value: boolean) => void;
  onNavigateToSubscription?: () => void;
  t: (key: string) => string;
}

const EXPANDED_CARD_HEIGHT = 370;

export const JobCardsSwiper: React.FC<JobCardsSwiperProps> = ({
  jobs,

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
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const badgeNumberAnim = useRef(new Animated.Value(1)).current;

  // Load minimize state from AsyncStorage on component mount
  useEffect(() => {
    const loadMinimizeState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('jobCardsSwiperMinimized');
        if (savedState !== null) {
          const saved = JSON.parse(savedState);
          setIsMinimized(saved);
          
          // Initialize animation values based on saved state
          if (!saved) {
            // If expanded, set animation to expanded state
            scaleAnim.setValue(1);
            opacityAnim.setValue(1);
            translateYAnim.setValue(0);
            rotateAnim.setValue(1);
            badgeNumberAnim.setValue(1);
          } else {
            // If minimized, set animation to minimized state
            scaleAnim.setValue(1);
            opacityAnim.setValue(1);
            translateYAnim.setValue(0);
            rotateAnim.setValue(0);
            badgeNumberAnim.setValue(1);
          }
        } else {
          // Default state is minimized
          scaleAnim.setValue(1);
          opacityAnim.setValue(1);
          translateYAnim.setValue(0);
          rotateAnim.setValue(0);
          badgeNumberAnim.setValue(1);
        }
      } catch (error) {
        console.error('Error loading minimize state:', error);
      }
    };
    loadMinimizeState();
  }, []);

  // Subtle pulse animation when jobs change (but don't auto-reopen)
  useEffect(() => {
    if (jobs.length > 0 && isMinimized) {
      // Only add a subtle pulse animation to indicate activity
      const pulseAnimation = Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]);
      
      // Start the pulse animation only once
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }
  }, [jobs.length, isMinimized, scaleAnim]); // Trigger when jobs array changes

  // Modern animation function for minimize/expand
  const animateTransition = (toMinimized: boolean) => {
    if (toMinimized) {
      // Minimizing animation - smooth and slower
      return Animated.sequence([
        // First phase: slight scale up
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        // Second phase: scale down and fade out
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.3,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 50,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      ]);
    } else {
      // Expanding animation - modern pop-in effect
      return Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]);
    }
  };

  // Save minimize state to AsyncStorage when it changes
  const toggleMinimized = async (newState: boolean) => {
    try {
      if (!newState) {
        // Expanding - Update state first, then animate
        setIsMinimized(newState);
        
        // Reset animation values for expansion
        scaleAnim.setValue(0.8);
        opacityAnim.setValue(0);
        translateYAnim.setValue(30);
        rotateAnim.setValue(0);
        
        // Start expansion animation
        setTimeout(() => {
          const animation = animateTransition(newState);
          animation.start();
        }, 50);
      } else {
        // Minimizing - Start animation first, then update state
        const animation = animateTransition(newState);
        animation.start(() => {
          // Update state after animation completes
          setIsMinimized(newState);
        });
      }
      
      await AsyncStorage.setItem('jobCardsSwiperMinimized', JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving minimize state:', error);
    }
  };



  if (jobs.length === 0) return null;

  const styles = createStyles(colors, isDark);

  // Vista minimizada
  if (isMinimized) {
    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={[
          styles.minimizedButton,
          {
            transform: [
              { scale: scaleAnim },
              { rotateZ: rotateInterpolate },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.minimizedButtonTouchable}
          onPress={() => {
            triggerHaptic('medium');
            toggleMinimized(false);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.minimizedButtonInner}>
            <IconSymbol size={32} name="briefcase.fill" color={colors.primary} />
            {jobs.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{jobs.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.fixedContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal={false}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContainer}
          style={styles.scrollView}
          bounces={true}
        >
          {jobs.slice().reverse().map((job, index) => {
            const isActive = isJobCurrentlyActive(job);
            const jobStats = getJobStatistics ? getJobStatistics(job) : null;

            return (
              <View
                key={job.id}
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                  { 
                    height: EXPANDED_CARD_HEIGHT, 
                    justifyContent: 'flex-end',
                    marginTop: index === 0 ? 0 : 0,
                    marginRight: 0,
                    width: '100%'
                  },
                ]}
              >
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🟢 JobCardsSwiper: TouchableOpacity pressed for job:', job.name);
                   
                    }}
                    activeOpacity={0.9}
                    style={{ flex: 1 }}
                  >
                    <BlurView 
                      intensity={isDark ? 90 : 98} 
                      tint={isDark ? "dark" : "light"} 
                      style={styles.cardInner}
                    >
                      <LinearGradient
                        colors={isDark 
                          ? [`${job.color}15`, `${job.color}05`, 'transparent'] 
                          : [`${job.color}10`, `${job.color}03`, 'transparent']
                        }
                        style={styles.gradientOverlay}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      
                      <View style={[styles.colorAccent, { backgroundColor: job.color }]} />
                      
                      <View style={styles.cardContent}>
                            
                          {/* Header with job info */}
                          <View style={styles.cardHeader}>
                            <View style={styles.jobInfo}>
                              <View style={[styles.jobNameChip, { backgroundColor: `${job.color}20`, borderColor: `${job.color}40` }]}>
                                <Text style={[styles.jobName, isActive && styles.jobNameActive, { color: job.color }]} numberOfLines={1}>
                                  {job.name}
                                </Text>
                              </View>
                              {job.company && (
                                <Text style={styles.companyName} numberOfLines={1}>
                                  {job.company}
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Botón cerrar solo en la primera tarjeta */}
                          {index === 0 && (
                            <TouchableOpacity 
                              style={styles.minimizeButton}
                              onPress={() => {
                                triggerHaptic('light');
                                toggleMinimized(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <IconSymbol size={16} name="xmark" color={isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'} />
                            </TouchableOpacity>
                          )}

                          {showAutoTimer && onAutoTimerToggle && (
                            <View style={styles.autoTimerContainer}>
                              <Text style={styles.autoTimerLabel}>
                                {t('maps.auto_timer')}
                              </Text>
                              <Switch
                                value={job.autoTimer?.enabled || false}
                                onValueChange={(value) => {
                                  // Verificar suscripción primero
                                  if (value && !isSubscribed) {
                                    // Mostrar modal de suscripción
                                    setShowPremiumModal(true);
                                    return;
                                  }
                                  
                                  // Verificar si tiene dirección
                                  const hasAddress = job.address?.trim() || job.street?.trim() || job.city?.trim() || job.postalCode?.trim();
                                  // Verificar si tiene ubicación/coordenadas
                                  const hasLocation = job.location?.latitude && job.location?.longitude;
                                  
                                  if (!hasAddress && value) {
                                    if (hasLocation) {
                                      // Si no tiene dirección pero sí coordenadas, navegar al mapa y centrar en el trabajo
                                      if (onAction) {
                                        onAction('map', job);
                                      }
                                    } else {
                                      // Si no tiene dirección ni coordenadas, abrir modal en pestaña auto
                                      if (onAction) {
                                        onAction('edit-auto', job);
                                      }
                                    }
                                  } else {
                                    // Si tiene dirección o quiere desactivar, cambiar estado normal
                                    onAutoTimerToggle(job, value);
                                  }
                                }}
                                trackColor={{ 
                                  false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', 
                                  true: colors.success + '40' 
                                }}
                                thumbColor={job.autoTimer?.enabled ? colors.success : (isDark ? '#f4f3f4' : '#f4f3f4')}
                                style={styles.autoTimerSwitch}
                              />
                            </View>
                          )}

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
                                <IconSymbol size={28} name="clock.fill" color="#00C851" />
                              </TouchableOpacity>

                              {/* Calendar Button */}
                              <TouchableOpacity 
                                style={[styles.gridButton, styles.calendarGridButton]}
                                onPress={() => onAction && onAction('calendar', job)}
                              >
                                <IconSymbol size={26} name="calendar" color="#007AFF" />
                              </TouchableOpacity>
           
                              {/* Stats Button */}
                              <TouchableOpacity 
                                style={[styles.gridButton, styles.statsGridButton]}
                                onPress={() => onAction && onAction('statistics', job)}
                              >
                                <IconSymbol size={26} name="chart.bar.fill" color="#FF9500" />
                              </TouchableOpacity>
                                               
                              {/* Edit Button */}
                              <TouchableOpacity 
                                style={[styles.gridButton, styles.editGridButton]}
                                onPress={() => onAction && onAction('edit', job)}
                              >
                                <View style={styles.gridButtonContent}>
                                  <IconSymbol size={26} name="gearshape.fill" color="#8E8E93" />
                                </View>
                              </TouchableOpacity>
                            </View>
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
                    </BlurView>
                  </TouchableOpacity>
                </View>
            );
          })}
        </ScrollView>
      </View>
      
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
    </Animated.View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: -50,
    left: 0,
    right: 0,
    maxHeight: '60%', // Máximo 60% de la pantalla

  },
  scrollView: {
    maxHeight: '100%',
  },
  fixedContainer: {
    maxHeight: '100%',
  },
  scrollContainer: {
    paddingVertical: 20,
    paddingBottom: 40, // Espacio extra abajo
    justifyContent: 'flex-end',
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
    marginRight: 12,
    alignItems: 'flex-start',
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
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 0,
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
    height: 50,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gridButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timerGridButton: {
    backgroundColor: isDark ? 'rgba(0,200,81,0.15)' : 'rgba(0,200,81,0.1)',
    borderColor: isDark ? 'rgba(0,200,81,0.3)' : 'rgba(0,200,81,0.2)',
  },
  calendarGridButton: {
    backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)',
    borderColor: isDark ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.2)',
  },
  editGridButton: {
    backgroundColor: isDark ? 'rgba(142,142,147,0.15)' : 'rgba(142,142,147,0.1)',
    borderColor: isDark ? 'rgba(142,142,147,0.3)' : 'rgba(142,142,147,0.2)',
  },
  statsGridButton: {
    backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.1)',
    borderColor: isDark ? 'rgba(255,149,0,0.3)' : 'rgba(255,149,0,0.2)',
  },
  autoTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 16,
    width: '100%',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    shadowRadius: 4,
    elevation: 2,
  },
  autoTimerLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '400',
    flex: 1,
    marginLeft: 6,
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
  minimizedButton: {
    position: 'absolute',
    bottom: 50,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 12,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  minimizedButtonTouchable: {
    flex: 1,
    borderRadius: 30,
  },
  minimizedButtonInner: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)',
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', // Fondo azulado suave
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? '#000' : '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  minimizeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
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
});