import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Switch,
} from 'react-native';
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
              onPress={() => onJobPress(job)}
              activeOpacity={0.9}
            >
              <BlurView 
                intensity={isDark ? 85 : 95} 
                tint={isDark ? "dark" : "light"} 
                style={styles.cardInner}
              >
                {/* Color indicator bar at the top */}
                <View style={[styles.colorBar, { backgroundColor: job.color }]} />
                
                {/* Card content */}
                <View style={styles.cardContent}>
                  {/* Header with job name and status */}
                  <View style={styles.cardHeader}>
                    <Text style={[styles.jobName, isActive && styles.jobNameActive]} numberOfLines={1}>
                      {job.name}
                    </Text>
                    {isActive && (
                      <View style={styles.activeIndicator}>
                        <Text style={styles.activeText}>
                          {t('maps.working_now')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Company name */}
                  {job.company && (
                    <Text style={styles.companyName} numberOfLines={1}>
                      {job.company}
                    </Text>
                  )}

                  {/* Status or schedule */}
                  {!isActive && scheduleStatus && (
                    <Text style={styles.scheduleStatus} numberOfLines={1}>
                      {scheduleStatus}
                    </Text>
                  )}

                  {/* Mini Statistics - centered display */}
                  {jobStats && (jobStats.thisMonthHours > 0 || jobStats.thisMonthDays > 0) && (
                    <View style={styles.centeredStats}>
                      <Text style={styles.statsTitle}>{t('job_statistics.this_month')}</Text>
                      <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                          <View style={styles.statIconContainer}>
                            <IconSymbol size={19} name="clock.fill" color={colors.primary} />
                          </View>
                          <Text style={styles.statValue}>
                            {Math.floor(jobStats.thisMonthHours)}h {Math.round((jobStats.thisMonthHours - Math.floor(jobStats.thisMonthHours)) * 60)}m
                          </Text>
                          <Text style={styles.statLabel} numberOfLines={2}>{t('job_statistics.hours_worked')}</Text>
                        </View>
                        <View style={styles.statCard}>
                          <View style={styles.statIconContainer}>
                            <IconSymbol size={19} name="calendar" color={colors.primary} />
                          </View>
                          <Text style={styles.statValue}>{jobStats.thisMonthDays}</Text>
                          <Text style={styles.statLabel} numberOfLines={2}>{t('job_statistics.days_worked')}</Text>
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
                      <Text style={styles.actionHintText}>Tap to open</Text>
                      <IconSymbol 
                        size={16} 
                        name="arrow.up.circle.fill" 
                        color={colors.text} 
                      />
                    </View>
                  )}
                </View>

                {/* Visual elements */}
                <View style={styles.cardDecoration}>
                  <View style={[styles.decorationDot, { backgroundColor: job.color }]} />
                  <View style={[styles.decorationLine, { backgroundColor: job.color + '60' }]} />
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
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  cardActive: {
    transform: [{ scale: 1.02 }],
    elevation: 12,
    shadowOpacity: 0.25,
  },
  cardInner: {
    flex: 1,
    position: 'relative',
  },
  colorBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 12,
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  jobNameActive: {
    color: colors.success,
  },
  activeIndicator: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
    textTransform: 'uppercase',
  },
  companyName: {
    fontSize: 14,
    color: isDark ? colors.text : colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
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
    marginTop: 4,
    paddingTop: 4,
  },
  actionHintText: {
    fontSize: 11,
    color: isDark ? colors.text : colors.text,
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

    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    padding: 4,
    minWidth: 50,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
  },
  statIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 1,
    textShadowColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    lineHeight: 8,
  },
  cardDecoration: {
    position: 'absolute',
    right: 10,
    top: 20,
    alignItems: 'center',
  },
  decorationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  decorationLine: {
    width: 3,
    height: 50,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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