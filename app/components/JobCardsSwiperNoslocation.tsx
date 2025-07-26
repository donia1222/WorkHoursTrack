import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  t: (key: string) => string;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 60; // 30px margin on each side
const CARD_HEIGHT = 160;

export const JobCardsSwiper: React.FC<JobCardsSwiperProps> = ({
  jobs,
  onJobPress,
  isJobCurrentlyActive,
  onTimerToggle,
  getJobStatistics,
  t,
}) => {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const handleScroll = (_event: any) => {
    // Handle scroll events if needed
  };

  if (jobs.length === 0) return null;

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 20}
        snapToAlignment="start"
      >
        {jobs.map((job, index) => {
          const isActive = isJobCurrentlyActive(job);
          const jobStats = getJobStatistics ? getJobStatistics(job) : null;
          
          return (
            <TouchableOpacity
              key={job.id}
              style={[
                styles.card,
                isActive && styles.cardActive,
                index === 0 && styles.firstCard,
              ]}
              onPress={() => {
                console.log('🟢 JobCardsSwiper: TouchableOpacity pressed for job:', job.name);
                onJobPress(job);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isActive 
                  ? isDark 
                    ? ['rgba(52, 199, 89, 0.25)', 'rgba(40, 40, 40, 0.9)', 'rgba(20, 20, 20, 0.95)']
                    : ['rgba(52, 199, 89, 0.15)', 'rgba(255, 255, 255, 0.95)', 'rgba(248, 250, 252, 0.9)']
                  : isDark 
                    ? ['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.8)', 'rgba(20, 20, 20, 0.9)']
                    : ['rgba(255, 255, 255, 0.95)', 'rgba(250, 252, 255, 0.9)', 'rgba(245, 248, 250, 0.85)']
                }
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <BlurView 
                  intensity={isDark ? 80 : 90} 
                  tint={isDark ? "dark" : "light"} 
                  style={styles.cardInner}
                >
                {/* Enhanced color indicator with gradient */}
                <LinearGradient
                  colors={[job.color, job.color + 'AA', job.color + '60']}
                  style={styles.colorBar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                
                {/* Card content */}
                <View style={styles.cardContent}>
                  {/* Header with job name and enhanced status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.jobNameContainer}>
                      <Text style={[styles.jobName, isActive && styles.jobNameActive]} numberOfLines={1}>
                        {job.name}
                      </Text>
                      {isActive && (
                        <View style={styles.activeIndicator}>
                          <LinearGradient
                            colors={['#34C759', '#30D158']}
                            style={styles.activeIndicatorGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.activeText}>ACTIVO</Text>
                          </LinearGradient>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Company name with enhanced styling */}
                  {job.company && (
                    <View style={styles.companyContainer}>
                      <View style={styles.companyIconContainer}>
                        <IconSymbol size={14} name="building.2" color={job.color} />
                      </View>
                      <Text style={styles.companyName} numberOfLines={1}>
                        {job.company}
                      </Text>
                    </View>
                  )}

             

                  {/* Enhanced Statistics Display */}
                  {jobStats && (
                    <View style={styles.centeredStats}>
                      <Text style={styles.statsTitle}>{t('job_statistics.this_month')}</Text>
                      <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                          <LinearGradient
                            colors={[job.color + '20', job.color + '10']}
                            style={styles.statCardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <View style={[styles.statIconContainer, { backgroundColor: job.color + '30' }]}>
                              <IconSymbol size={16} name="clock.fill" color={job.color} />
                            </View>
                            <Text style={[styles.statValue, { color: job.color }]}>
                              {Math.floor(jobStats.thisMonthHours)}h {Math.round((jobStats.thisMonthHours - Math.floor(jobStats.thisMonthHours)) * 60)}m
                            </Text>
                            <Text style={styles.statLabel} numberOfLines={2}>{t('job_statistics.hours_worked')}</Text>
                          </LinearGradient>
                        </View>
                        <View style={styles.statCard}>
                          <LinearGradient
                            colors={[job.color + '20', job.color + '10']}
                            style={styles.statCardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <View style={[styles.statIconContainer, { backgroundColor: job.color + '30' }]}>
                              <IconSymbol size={16} name="calendar" color={job.color} />
                            </View>
                            <Text style={[styles.statValue, { color: job.color }]}>{jobStats.thisMonthDays}</Text>
                            <Text style={styles.statLabel} numberOfLines={2}>{t('job_statistics.days_worked')}</Text>
                          </LinearGradient>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Timer switch or action indicator */}
                  {onTimerToggle ? (
                    <View style={styles.timerControls}>
                      <Text style={styles.timerLabel}>
                        {isActive ? t('maps.timer_running') : t('maps.start_timer')}
                      </Text>
                      <Switch
                        value={isActive}
                        onValueChange={() => onTimerToggle(job)}
                        trackColor={{ 
                          false: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', 
                          true: job.color + '60' 
                        }}
                        thumbColor={isActive ? job.color : (isDark ? '#f4f3f4' : '#f4f3f4')}
                        ios_backgroundColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                      />
                    </View>
                  ) : (
                    <View style={styles.actionHint}>
            
                    
                    </View>
                  )}
                </View>

                {/* Enhanced Visual Elements */}
                <View style={styles.cardDecoration}>
                  <LinearGradient
                    colors={[job.color, job.color + 'DD']}
                    style={styles.decorationDot}
                  />
                  <LinearGradient
                    colors={[job.color + '80', job.color + '40', job.color + '20']}
                    style={styles.decorationLine}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                </View>
              </BlurView>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: CARD_HEIGHT + 60,
    zIndex: 10,
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
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
  },
  cardGradient: {
    flex: 1,
    borderRadius: 28,
  },
  cardActive: {
    transform: [{ scale: 1.03 }],
    elevation: 18,
    shadowOpacity: 0.35,
    shadowRadius: 25,
    borderColor: '#34C759',
    borderWidth: 2,
  },
  cardInner: {
    flex: 1,
    position: 'relative',
  },
  colorBar: {
    height: 6,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  cardHeader: {
    marginBottom: 10,
  },
  jobNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 12,
    textShadowColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.3,
  },
  jobNameActive: {
    color: colors.success,
  },
  activeIndicator: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  activeIndicatorGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  companyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    color: isDark ? colors.text : colors.textSecondary,
    fontWeight: '600',
    flex: 1,
    textShadowColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  scheduleStatus: {
    fontSize: 12,
    color: isDark ? colors.text : colors.text,
    fontStyle: 'italic',
    marginBottom: 12,
    fontWeight: '600',
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    paddingTop: 4,
  },
  actionHintText: {
    fontSize: 14,
    color: isDark ? colors.textSecondary : colors.textSecondary,
    marginRight: 6,
    fontWeight: '700',
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 8,
  },
  timerLabel: {
    fontSize: 11,
    color: isDark ? colors.text : colors.text,
    fontWeight: '700',
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
    marginRight: 8,
  },
  centeredStats: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  statCard: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 55,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
  },
  statCardGradient: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
    textShadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 10,
    letterSpacing: 0.1,
  },
  cardDecoration: {
    position: 'absolute',
    right: 10,
    top: 20,
    alignItems: 'center',
  },
  decorationDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  decorationLine: {
    width: 4,
    height: 55,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    height: 20,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  indicatorActive: {
    backgroundColor: colors.primary,
    width: 24,
    height: 10,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});