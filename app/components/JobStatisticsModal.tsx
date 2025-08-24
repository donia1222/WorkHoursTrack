import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { useLanguage } from '../contexts/LanguageContext';

interface JobStatisticsModalProps {
  visible: boolean;
  onClose: () => void;
  job: Job | null;
}

interface JobStatistics {
  totalHours: number;
  totalDays: number;
  avgHoursPerDay: number;
  overtimeDays: number;
  totalEarnings: number;
  thisMonthHours: number;
  thisMonthDays: number;
  thisMonthEarnings: number;
  lastWorkDay: string | null;
  workDaysByType: {
    work: number;
    free: number;
    vacation: number;
    sick: number;
  };
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    borderBottomWidth: 0, // Remove border for cleaner look
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
  },
  closeButton: {
    padding: Theme.spacing.sm,
    marginRight: -Theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Theme.typography.headline,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  headerActionButton: {
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,

  },
  jobInfoCard: {

padding:10,
marginBottom: 20,
    ...Theme.shadows.medium,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: Theme.spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    ...Theme.typography.title3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  jobCompany: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
  },
  loadingCard: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  loadingText: {
    ...Theme.typography.callout,
    color: colors.textSecondary,
    marginTop: Theme.spacing.sm,
  },
  statisticsContainer: {
    flex: 1,
  },
  statsSection: {
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.medium,
    borderWidth: 1,
    borderColor: `${colors.textTertiary}10`,
  },
  sectionTitle: {
    ...Theme.typography.title2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: Theme.spacing.lg,
    backgroundColor: `${colors.primary}08`,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}15`,
  },
  statValue: {
    ...Theme.typography.title1,
    color: colors.primary,
    fontWeight: '800',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  infoList: {
    gap: Theme.spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    ...Theme.typography.footnote,
    color: colors.textSecondary,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  emptyCard: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  emptyText: {
    ...Theme.typography.headline,
    color: colors.textSecondary,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    ...Theme.typography.footnote,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default function JobStatisticsModal({ 
  visible, 
  onClose, 
  job 
}: JobStatisticsModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [statistics, setStatistics] = useState<JobStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Animations disabled temporarily
  // const fadeAnim = new Animated.Value(0);
  // const slideAnim = new Animated.Value(50);
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    if (visible && job) {
      loadStatistics();
      // Animations disabled temporarily
    }
  }, [visible, job]);

  const loadStatistics = async () => {
    if (!job) return;
    
    setLoading(true);
    try {
      const workDays = await JobService.getWorkDaysForJob(job.id);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Count unique days (multiple sessions same day = 1 day)
      const uniqueDates = new Set(workDays.map(day => day.date.split('T')[0]));
      const uniqueDaysCount = uniqueDates.size;
      
      // Calculate statistics
      const stats: JobStatistics = {
        totalHours: 0,
        totalDays: uniqueDaysCount, // Use unique days count
        avgHoursPerDay: 0,
        overtimeDays: 0,
        totalEarnings: 0,
        thisMonthHours: 0,
        thisMonthDays: 0,
        thisMonthEarnings: 0,
        lastWorkDay: null,
        workDaysByType: {
          work: 0,
          free: 0,
          vacation: 0,
          sick: 0,
        },
      };

      let lastWorkDate: Date | null = null;
      const uniqueWorkDays = new Set<string>();
      const uniqueMonthDays = new Set<string>();

      workDays.forEach((day: WorkDay) => {
        const dayDate = new Date(day.date);
        const dayKey = day.date.split('T')[0]; // Get just the date part
        
        // Total statistics
        if (day.type === 'work') {
          stats.totalHours += day.hours;
          
          // Count unique work days only
          if (!uniqueWorkDays.has(dayKey)) {
            uniqueWorkDays.add(dayKey);
            stats.workDaysByType.work++;
          }
          
          if (day.overtime) {
            stats.overtimeDays++;
          }

          // Track last work day
          if (!lastWorkDate || dayDate > lastWorkDate) {
            lastWorkDate = dayDate;
          }
        } else {
          // For non-work days, count unique days as well
          if (!uniqueWorkDays.has(dayKey)) {
            uniqueWorkDays.add(dayKey);
            stats.workDaysByType[day.type]++;
          }
        }

        // This month statistics
        if (dayDate.getMonth() + 1 === currentMonth && dayDate.getFullYear() === currentYear) {
          if (day.type === 'work') {
            stats.thisMonthHours += day.hours;
            // Count unique days for this month
            if (!uniqueMonthDays.has(dayKey)) {
              uniqueMonthDays.add(dayKey);
              stats.thisMonthDays++;
            }
          }
        }
      });

      // Calculate averages and earnings
      if (stats.workDaysByType.work > 0) {
        stats.avgHoursPerDay = stats.totalHours / stats.workDaysByType.work;
      }

      // Calculate earnings based on salary info
      if (job.salary && job.salary.amount > 0) {
        switch (job.salary.type) {
          case 'hourly':
            stats.totalEarnings = stats.totalHours * job.salary.amount;
            stats.thisMonthEarnings = stats.thisMonthHours * job.salary.amount;
            break;
          case 'monthly':
            // Estimate based on worked days vs expected work days
            const expectedMonthlyHours = job.defaultHours * 22; // Assuming ~22 work days per month
            stats.totalEarnings = (stats.totalHours / expectedMonthlyHours) * job.salary.amount;
            stats.thisMonthEarnings = (stats.thisMonthHours / expectedMonthlyHours) * job.salary.amount;
            break;
          case 'annual':
            const expectedAnnualHours = job.defaultHours * 22 * 12;
            stats.totalEarnings = (stats.totalHours / expectedAnnualHours) * job.salary.amount;
            stats.thisMonthEarnings = (stats.thisMonthHours / expectedAnnualHours) * job.salary.amount;
            break;
        }
      } else if (job.hourlyRate && job.hourlyRate > 0) {
        // Fallback to hourly rate for billing
        stats.totalEarnings = stats.totalHours * job.hourlyRate;
        stats.thisMonthEarnings = stats.thisMonthHours * job.hourlyRate;
      }

      if (lastWorkDate) {
        stats.lastWorkDay = (lastWorkDate as Date).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      setStatistics(stats);
    } catch (error) {
      console.error('Error loading job statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    const currency = job?.salary?.currency || job?.currency || 'EUR';
    return `${amount.toFixed(2)} ${currency}`;
  };

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours}h`;
    }
    return `${wholeHours}h ${minutes}m`;
  };

  const handleShareText = async () => {
    if (!job || !statistics) return;

    try {
      const shareText = `📊 Estadísticas de ${job.name}

📈 RESUMEN GENERAL:
• Total trabajadas: ${formatHours(statistics.totalHours)}
• Días trabajados: ${statistics.workDaysByType.work}
• Promedio/día: ${formatHours(statistics.avgHoursPerDay)}
${statistics.totalEarnings > 0 ? `• Total ganado: ${formatCurrency(statistics.totalEarnings)}` : ''}

📅 ESTE MES:
• Horas: ${formatHours(statistics.thisMonthHours)}
• Días: ${statistics.thisMonthDays}
${statistics.thisMonthEarnings > 0 ? `• Ganado: ${formatCurrency(statistics.thisMonthEarnings)}` : ''}

ℹ️ INFORMACIÓN ADICIONAL:
${statistics.overtimeDays > 0 ? `• ${statistics.overtimeDays} días con horas extra\n` : ''}${statistics.workDaysByType.vacation > 0 ? `• ${statistics.workDaysByType.vacation} días de vacaciones\n` : ''}${statistics.workDaysByType.sick > 0 ? `• ${statistics.workDaysByType.sick} días de enfermedad\n` : ''}${statistics.workDaysByType.free > 0 ? `• ${statistics.workDaysByType.free} días libres\n` : ''}${statistics.lastWorkDay ? `• Último día trabajado: ${statistics.lastWorkDay}` : ''}

Generado por Mi App de Trabajos`;

      await Share.share({
        message: shareText,
        title: `Estadísticas de ${job.name}`,
      });
    } catch (error) {
      console.error('Error sharing text:', error);
      Alert.alert('Error', t('job_statistics.share_error'));
    }
  };

  const handleExportData = async () => {
    if (!job || !statistics) return;

    setIsExporting(true);
    try {
      // Get work days for detailed export
      const workDays = await JobService.getWorkDaysForJob(job.id);
      
      // Create detailed export text
      let exportText = `📊 ESTADÍSTICAS DETALLADAS - ${job.name}\n`;
      exportText += `${job.company ? `Empresa: ${job.company}\n` : ''}`;
      exportText += `Generado el: ${new Date().toLocaleDateString('es-ES')}\n\n`;
      
      // Summary
      exportText += `📈 RESUMEN GENERAL:\n`;
      exportText += `• Total horas trabajadas: ${formatHours(statistics.totalHours)}\n`;
      exportText += `• Días trabajados: ${statistics.workDaysByType.work}\n`;
      exportText += `• Promedio horas/día: ${formatHours(statistics.avgHoursPerDay)}\n`;
      exportText += `• Días con overtime: ${statistics.overtimeDays}\n`;
      if (statistics.totalEarnings > 0) {
        exportText += `• Total ganado: ${formatCurrency(statistics.totalEarnings)}\n`;
      }
      exportText += `\n`;
      
      // This month
      exportText += `📅 ESTE MES:\n`;
      exportText += `• Horas trabajadas: ${formatHours(statistics.thisMonthHours)}\n`;
      exportText += `• Días trabajados: ${statistics.thisMonthDays}\n`;
      if (statistics.thisMonthEarnings > 0) {
        exportText += `• Ganado este mes: ${formatCurrency(statistics.thisMonthEarnings)}\n`;
      }
      exportText += `\n`;
      
      // Additional info
      exportText += `ℹ️ INFORMACIÓN ADICIONAL:\n`;
      if (statistics.workDaysByType.vacation > 0) {
        exportText += `• Días de vacaciones: ${statistics.workDaysByType.vacation}\n`;
      }
      if (statistics.workDaysByType.sick > 0) {
        exportText += `• Días de enfermedad: ${statistics.workDaysByType.sick}\n`;
      }
      if (statistics.workDaysByType.free > 0) {
        exportText += `• Días libres: ${statistics.workDaysByType.free}\n`;
      }
      if (statistics.lastWorkDay) {
        exportText += `• Último día trabajado: ${statistics.lastWorkDay}\n`;
      }
      exportText += `\n`;
      
      // Detailed work days (last 30 days)
      const recentWorkDays = workDays
        .filter(day => day.type === 'work')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30);
        
      if (recentWorkDays.length > 0) {
        exportText += `📋 DETALLE ÚLTIMOS ${recentWorkDays.length} DÍAS TRABAJADOS:\n`;
        recentWorkDays.forEach(day => {
          const date = new Date(day.date).toLocaleDateString('es-ES');
          exportText += `• ${date}: ${formatHours(day.hours)}${day.overtime ? ' (overtime)' : ''}`;
          if (day.notes) {
            exportText += ` - ${day.notes}`;
          }
          exportText += `\n`;
        });
      }
      
      exportText += `\n📱 Generado por Mi App de Trabajos`;

      await Share.share({
        message: exportText,
        title: `Estadísticas Detalladas - ${job.name}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', t('job_statistics.export_error'));
    } finally {
      setIsExporting(false);
    }
  };

  if (!job) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={handleShareText} 
                style={styles.headerActionButton}
                disabled={!statistics || loading}
              >
                <IconSymbol size={20} name="square.and.arrow.up" color={colors.primary} />
              </TouchableOpacity>
       
            </View>
            <View style={styles.headerText} />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol size={24} name="xmark" color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.jobInfoCard}>
            <View style={styles.jobHeader}>
              <View style={[styles.jobColorDot, { backgroundColor: job.color }]} />
              <View style={styles.jobInfo}>
                <Text style={styles.jobName}>{job.name}</Text>
                {job.company && (
                  <Text style={styles.jobCompany}>{job.company}</Text>
                )}
              </View>
            </View>
          </BlurView>

          {loading ? (
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.loadingCard}>
              <IconSymbol size={32} name="gear" color={colors.textSecondary} />
              <Text style={styles.loadingText}>Loading...</Text>
            </BlurView>
          ) : statistics ? (
            <ScrollView style={styles.statisticsContainer} showsVerticalScrollIndicator={false}>
              {/* Overview Section */}
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.statsSection}>
                <Text style={styles.sectionTitle}>{t('job_statistics.general_summary')}</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={styles.statIconContainer}>
                      <IconSymbol size={24} name="clock.fill" color={colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{formatHours(statistics.totalHours)}</Text>
                    <Text style={styles.statLabel}>{t('job_statistics.total_hours')}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statIconContainer}>
                      <IconSymbol size={24} name="calendar" color={colors.success} />
                    </View>
                    <Text style={styles.statValue}>{statistics.workDaysByType.work}</Text>
                    <Text style={styles.statLabel}>{t('job_statistics.days_worked')}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statIconContainer}>
                      <IconSymbol size={24} name="chart.bar.fill" color={colors.warning} />
                    </View>
                    <Text style={styles.statValue}>{formatHours(statistics.avgHoursPerDay)}</Text>
                    <Text style={styles.statLabel}>{t('job_statistics.average_per_day')}</Text>
                  </View>
                  {statistics.totalEarnings > 0 && (
                    <View style={styles.statItem}>
                      <View style={styles.statIconContainer}>
                        <IconSymbol size={24} name="dollarsign.circle.fill" color={colors.success} />
                      </View>
                      <Text style={styles.statValue}>{formatCurrency(statistics.totalEarnings)}</Text>
                      <Text style={styles.statLabel}>{t('job_statistics.total_earned')}</Text>
                    </View>
                  )}
                </View>
              </BlurView>

              {/* This Month Section */}
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.statsSection}>
                <Text style={styles.sectionTitle}>{t('job_statistics.this_month')}</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={styles.statIconContainer}>
                      <IconSymbol size={24} name="clock.fill" color={colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{formatHours(statistics.thisMonthHours)}</Text>
                    <Text style={styles.statLabel}>{t('job_statistics.hours_worked')}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={styles.statIconContainer}>
                      <IconSymbol size={24} name="calendar" color={colors.success} />
                    </View>
                    <Text style={styles.statValue}>{statistics.thisMonthDays}</Text>
                    <Text style={styles.statLabel}>{t('job_statistics.days_worked')}</Text>
                  </View>
                  {statistics.thisMonthEarnings > 0 && (
                    <View style={styles.statItem}>
                      <IconSymbol size={20} name="dollarsign.circle.fill" color={colors.success} />
                      <Text style={styles.statValue}>{formatCurrency(statistics.thisMonthEarnings)}</Text>
                      <Text style={styles.statLabel}>Ganado este mes</Text>
                    </View>
                  )}
                </View>
              </BlurView>

              {/* Additional Info Section */}
              <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.statsSection}>
                <Text style={styles.sectionTitle}>{t('job_statistics.additional_info')}</Text>
                <View style={styles.infoList}>
                  {statistics.overtimeDays > 0 && (
                    <View style={styles.infoItem}>
                      <IconSymbol size={16} name="exclamationmark.triangle.fill" color={colors.warning} />
                      <Text style={styles.infoText}>{statistics.overtimeDays} días con horas extra</Text>
                    </View>
                  )}
                  
                  {statistics.workDaysByType.vacation > 0 && (
                    <View style={styles.infoItem}>
                      <IconSymbol size={16} name="sun.max.fill" color={colors.warning} />
                      <Text style={styles.infoText}>{statistics.workDaysByType.vacation} días de vacaciones</Text>
                    </View>
                  )}
                  
                  {statistics.workDaysByType.sick > 0 && (
                    <View style={styles.infoItem}>
                      <IconSymbol size={16} name="cross.fill" color={colors.error} />
                      <Text style={styles.infoText}>{statistics.workDaysByType.sick} días de enfermedad</Text>
                    </View>
                  )}
                  
                  {statistics.workDaysByType.free > 0 && (
                    <View style={styles.infoItem}>
                      <IconSymbol size={16} name="calendar" color={colors.primary} />
                      <Text style={styles.infoText}>{statistics.workDaysByType.free} días libres</Text>
                    </View>
                  )}
                  
                  {statistics.lastWorkDay && (
                    <View style={styles.infoItem}>
                      <IconSymbol size={16} name="clock.arrow.circlepath" color={colors.textSecondary} />
                      <Text style={styles.infoText}>Último día trabajado: {statistics.lastWorkDay}</Text>
                    </View>
                  )}
                </View>
              </BlurView>
            </ScrollView>
          ) : (
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={styles.emptyCard}>
              <IconSymbol size={32} name="chart.bar" color={colors.textTertiary} />
              <Text style={styles.emptyText}>No data available</Text>
              <Text style={styles.emptySubtext}>
                Record some work hours to see statistics
              </Text>
            </BlurView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

