import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Switch,
  Alert,
  Animated,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';
import { Job } from '../types/WorkTypes';

interface JobCardsSwiperProps {
  jobs: Job[];
  onJobPress: (job: Job) => void;
  isJobCurrentlyActive: (job: Job) => boolean;
  getJobScheduleStatus: (job: Job) => string | null;
  onTimerToggle?: (job: Job) => void;
  getJobStatistics?: (job: Job) => { thisMonthHours: number; thisMonthDays: number } | null;
  onAction?: (action: string, job: Job) => void;
  showAutoTimer?: boolean;
  autoTimerEnabled?: boolean;
  onAutoTimerToggle?: (job: Job, value: boolean) => void;
  t: (key: string) => string;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 60; // 30px margin on each side
const CARD_HEIGHT = 190;
const EXPANDED_CARD_HEIGHT = 410;

export const JobCardsSwiper: React.FC<JobCardsSwiperProps> = ({
  jobs,
  onJobPress,
  isJobCurrentlyActive,
  getJobScheduleStatus,
  onTimerToggle,
  getJobStatistics,
  onAction,
  showAutoTimer = false,
  autoTimerEnabled = false,
  onAutoTimerToggle,
  t,
}) => {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  
  // Create individual animated values for each job
  const jobAnimations = useRef(new Map()).current;
  
  const getJobAnimation = (jobId: string) => {
    if (!jobAnimations.has(jobId)) {
      jobAnimations.set(jobId, {
        height: new Animated.Value(CARD_HEIGHT),
        opacity: new Animated.Value(0),
        dragY: new Animated.Value(0),
      });
    }
    return jobAnimations.get(jobId);
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + 20)); // 20px gap between cards
    setCurrentIndex(index);
  };

  const scrollTo = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + 20),
      animated: true,
    });
  };

  const handleExpandCard = (jobId: string) => {
    const isCurrentlyExpanded = expandedJobId === jobId;
    const animations = getJobAnimation(jobId);
    
    if (isCurrentlyExpanded) {
      // Collapse - cambiar estado inmediatamente para evitar flicker
      setExpandedJobId(null);
      Animated.parallel([
        Animated.spring(animations.height, {
          toValue: CARD_HEIGHT,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(animations.opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Expand
      setExpandedJobId(jobId);
      Animated.parallel([
        Animated.spring(animations.height, {
          toValue: EXPANDED_CARD_HEIGHT,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(animations.opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  // Crear el gesto animado que sigue el dedo
  const createGestureHandler = (jobId: string) => {
    const animations = getJobAnimation(jobId);
    
    return Animated.event(
      [{ nativeEvent: { translationY: animations.dragY } }],
      { 
        useNativeDriver: false,
        listener: (event: any) => {
          const { translationY } = event.nativeEvent;
          const isCurrentlyExpanded = expandedJobId === jobId;
          const maxDrag = 180;
          
          let progress = 0;
          let newHeight = CARD_HEIGHT;
          
          if (!isCurrentlyExpanded) {
            // Expandiendo hacia abajo
            if (translationY > 0) {
              progress = Math.max(0, Math.min(1, translationY / maxDrag));
              newHeight = CARD_HEIGHT + (EXPANDED_CARD_HEIGHT - CARD_HEIGHT) * progress;
            } else {
              newHeight = CARD_HEIGHT;
              progress = 0;
            }
          } else {
            // Colapsando hacia arriba
            if (translationY < 0) {
              progress = Math.max(0, Math.min(1, -translationY / maxDrag));
              newHeight = EXPANDED_CARD_HEIGHT - (EXPANDED_CARD_HEIGHT - CARD_HEIGHT) * progress;
            } else {
              newHeight = EXPANDED_CARD_HEIGHT;
              progress = 0;
            }
          }
          
          animations.height.setValue(newHeight);
          animations.opacity.setValue(isCurrentlyExpanded ? 1 - progress : progress);
        }
      }
    );
  };

  const onHandlerStateChange = (event: any, jobId: string) => {
    const { state, translationY, velocityY } = event.nativeEvent;
    const isCurrentlyExpanded = expandedJobId === jobId;
    const animations = getJobAnimation(jobId);
    
    if (state === 5) { // END
      const threshold = 60; // píxeles de umbral
      const velocityThreshold = 500;
      
      if (!isCurrentlyExpanded) {
        // Intentando expandir
        if (translationY > threshold || velocityY > velocityThreshold) {
          // Expandir
          setExpandedJobId(jobId);
          Animated.parallel([
            Animated.spring(animations.height, {
              toValue: EXPANDED_CARD_HEIGHT,
              useNativeDriver: false,
              tension: 80,
              friction: 8,
            }),
            Animated.timing(animations.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start();
        } else {
          // Volver al estado colapsado
          Animated.parallel([
            Animated.spring(animations.height, {
              toValue: CARD_HEIGHT,
              useNativeDriver: false,
              tension: 80,
              friction: 8,
            }),
            Animated.timing(animations.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start();
        }
      } else {
        // Intentando colapsar
        if (translationY < -threshold || velocityY < -velocityThreshold) {
          // Colapsar
          setExpandedJobId(null);
          Animated.parallel([
            Animated.spring(animations.height, {
              toValue: CARD_HEIGHT,
              useNativeDriver: false,
              tension: 80,
              friction: 8,
            }),
            Animated.timing(animations.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start();
        } else {
          // Volver al estado expandido
          Animated.parallel([
            Animated.spring(animations.height, {
              toValue: EXPANDED_CARD_HEIGHT,
              useNativeDriver: false,
              tension: 80,
              friction: 8,
            }),
            Animated.timing(animations.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start();
        }
      }
      
      // Reset del valor de arrastre
      animations.dragY.setValue(0);
    }
  };

  if (jobs.length === 0) return null;

  const styles = createStyles(colors, isDark);
  
  // Calculate dynamic container height based on expanded state
  const containerHeight = expandedJobId ? EXPANDED_CARD_HEIGHT + 80 : CARD_HEIGHT + 60;
  const scrollViewHeight = expandedJobId ? EXPANDED_CARD_HEIGHT + 20 : CARD_HEIGHT;

  return (
    <GestureHandlerRootView style={[styles.container, { height: containerHeight }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContainer}
        style={[styles.scrollView, { height: scrollViewHeight }]}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 20}
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {jobs.map((job, index) => {
          const isActive = isJobCurrentlyActive(job);
          const scheduleStatus = getJobScheduleStatus(job);
          const jobStats = getJobStatistics ? getJobStatistics(job) : null;
          const isExpanded = expandedJobId === job.id;
          const animations = getJobAnimation(job.id);
          
          return (
            <PanGestureHandler
              key={job.id}
              onGestureEvent={createGestureHandler(job.id)}
              onHandlerStateChange={(event) => onHandlerStateChange(event, job.id)}
              activeOffsetY={[-10, 10]}
              failOffsetX={[-20, 20]}
            >
              <Animated.View
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                  index === 0 && styles.firstCard,
                  { height: isExpanded ? animations.height : CARD_HEIGHT },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    console.log('🟢 JobCardsSwiper: TouchableOpacity pressed for job:', job.name);
                    onJobPress(job);
                  }}
                  activeOpacity={0.9}
                  style={{ flex: 1 }}
                >
                  <BlurView 
                    intensity={isDark ? 90 : 98} 
                    tint={isDark ? "dark" : "light"} 
                    style={styles.cardInner}
                  >
                    {/* Gradient overlay */}
                    <LinearGradient
                      colors={isDark 
                        ? [`${job.color}15`, `${job.color}05`, 'transparent'] 
                        : [`${job.color}10`, `${job.color}03`, 'transparent']
                      }
                      style={styles.gradientOverlay}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    
                    {/* Color accent */}
                    <View style={[styles.colorAccent, { backgroundColor: job.color }]} />
                    
                    {/* Card content */}
                    <View style={styles.cardContent}>
                      {/* Header with job info */}
                      <View style={styles.cardHeader}>
                        <View style={styles.jobInfo}>
                          <Text style={[styles.jobName, isActive && styles.jobNameActive]} numberOfLines={1}>
                            {job.name}
                          </Text>
                          {job.company && (
                            <Text style={styles.companyName} numberOfLines={1}>
                              {job.company}
                            </Text>
                          )}
                        </View>
                   
                      </View>
       {showAutoTimer && onAutoTimerToggle && (job.address?.trim() || job.street?.trim() || job.city?.trim() || job.postalCode?.trim()) && (
                                  <View style={styles.autoTimerContainer}>
              
                        
                                    <Text style={styles.autoTimerLabel}>
                                      {t('maps.auto_timer')}
                                    </Text>
                                    <Switch
                                      value={job.autoTimer?.enabled || false}
                                      onValueChange={(value) => onAutoTimerToggle(job, value)}
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
                              <View style={[styles.statIcon, { backgroundColor: `${job.color}20` }]}>
                                <IconSymbol size={16} name="clock.fill" color={job.color} />
                              </View>
                              <View style={styles.statText}>
                                <Text style={[styles.statValue, { color: job.color }]}>
                                  {Math.floor(jobStats.thisMonthHours)}h {Math.round((jobStats.thisMonthHours - Math.floor(jobStats.thisMonthHours)) * 60)}m
                                </Text>
                                <Text style={styles.statLabel}>{t('reports.this_month')}</Text>
                              </View>
                            </View>
                            <View style={styles.statItem}>
                              <View style={[styles.statIcon, { backgroundColor: `${job.color}20` }]}>
                                <IconSymbol size={16} name="calendar" color={job.color} />
                              </View>
                              <View style={styles.statText}>
                                <Text style={[styles.statValue, { color: job.color }]}>{jobStats.thisMonthDays}</Text>
                                <Text style={styles.statLabel}>{t('calendar.worked_days')}</Text>
                              </View>
                            </View>
                          </View>
                          
                        </View>
                      )}

                      {/* Expanded content */}
                      {isExpanded && (
                        <Animated.View style={[styles.expandedContent, { opacity: animations.opacity }]}>
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
                              <IconSymbol size={32} name="clock.fill" color="#00C851" />
                         
                            </TouchableOpacity>

                  
                            
                            {/* Calendar Button */}
                            <TouchableOpacity 
                              style={[styles.gridButton, styles.calendarGridButton]}
                              onPress={() => onAction && onAction('calendar', job)}
                            >
                              <IconSymbol size={32} name="calendar" color="#007AFF" />
                
                            </TouchableOpacity>
           
                            {/* Stats Button */}
                            <TouchableOpacity 
                              style={[styles.gridButton, styles.statsGridButton]}
                              onPress={() => onAction && onAction('statistics', job)}
                            >
                              <IconSymbol size={32} name="chart.bar.fill" color="#FF9500" />
                         
                            </TouchableOpacity>
                                             
                            {/* Edit Button */}
                            <TouchableOpacity 
                              style={[styles.gridButton, styles.editGridButton]}
                              onPress={() => onAction && onAction('edit', job)}
                            >
                              <View style={styles.gridButtonContent}>
                                <IconSymbol size={32} name="gearshape.fill" color="#8E8E93" />
                    
                              </View>
                            </TouchableOpacity>

                            
                          </View>
                          
                          {/* Collapse indicator */}
                          <View style={styles.collapseIndicator}>
                            <View style={styles.collapseBar} />
                          </View>
                        </Animated.View>
                      )}

                      {/* Footer */}
                      {onTimerToggle && !isExpanded ? (
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
                            onValueChange={() => onTimerToggle(job)}
                            trackColor={{ 
                              false: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', 
                              true: job.color + '40' 
                            }}
                            thumbColor={isActive ? job.color : (isDark ? '#f4f3f4' : '#f4f3f4')}
                            ios_backgroundColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}
                            style={styles.timerSwitch}
                          />
                        </View>
                      ) : !isExpanded ? (
                        <View style={styles.footerExpandIndicator}>
                          <View style={styles.expandIndicatorBar} />
                        </View>
                      ) : null}
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            </PanGestureHandler>
          );
        })}
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: CARD_HEIGHT + 60,
  },
  scrollView: {
    height: CARD_HEIGHT,
  },
  scrollContainer: {
    paddingHorizontal: 30,
    paddingRight: 50,
  },
  firstCard: {
    marginLeft: 0,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: 20,
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
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  jobNameActive: {
    color: colors.success,
  },
  companyName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    opacity: 0.8,
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
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 12,
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
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
    gridButtonMap: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(52,199,89,0.3)' : 'rgba(52,199,89,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapButtonText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
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
  mapGridButton: {
    backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.1)',
    borderColor: isDark ? 'rgba(52,199,89,0.3)' : 'rgba(52,199,89,0.2)',
  },
  gridButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  gridButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  editButtonExpanded: {
    height: 110,
  },
  autoTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 8,
    width: '100%',
    gap: 12,
  },
  autoTimerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  autoTimerSwitch: {
    transform: [{ scale: 0.8 }],
  },
  collapseIndicator: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 16,
  },
  collapseBar: {
    width: 36,
    height: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
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
  },
  expandIndicatorBar: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    borderRadius: 2,
  },
});