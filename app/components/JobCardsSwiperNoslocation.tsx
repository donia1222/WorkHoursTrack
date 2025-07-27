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
} from 'react-native';
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
  t: (key: string) => string;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 60; // 30px margin on each side
const CARD_HEIGHT = 160;

export const JobCardsSwiper: React.FC<JobCardsSwiperProps> = ({
  jobs,
  onJobPress,
  isJobCurrentlyActive,
  getJobScheduleStatus,
  onTimerToggle,
  getJobStatistics,
  t,
}) => {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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
          const scheduleStatus = getJobScheduleStatus(job);
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
              activeOpacity={0.9}
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
                    {isActive && (
                      <View style={[styles.activeIndicator, { backgroundColor: job.color }]}>
                        <IconSymbol size={12} name="play.fill" color="#FFFFFF" />
                      </View>
                    )}
                  </View>

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

                  {/* Footer */}
                  {onTimerToggle ? (
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
                  ) : (
                    <View style={styles.footer}>
                      <View style={styles.actionButton}>
                        <IconSymbol 
                          size={16} 
                          name="chevron.up.circle.fill" 
                          color={job.color} 
                        />
                        <Text style={[styles.actionButtonText, { color: job.color }]}>
                          {t('maps.view_options')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </BlurView>
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
});