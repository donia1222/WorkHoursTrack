import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import Animated, { 
  FadeIn,
  SlideInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import SafeInteractiveChart, { ChartDataPoint } from '../components/SafeInteractiveChart';
import GoalProgressCircle, { GoalData } from '../components/GoalProgressCircle';
import { Job, WorkDay } from '../types/WorkTypes';
import { JobService } from '../services/JobService';
import { PDFExportService } from '../services/PDFExportService';
import { useBackNavigation } from '../context/NavigationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface EnhancedReportsScreenProps {
  onNavigate: (screen: string, options?: any) => void;
}

interface PeriodStats {
  totalHours: number;
  totalDays: number;
  overtimeHours: number;
  avgHoursPerDay: number;
  jobBreakdown: {
    job: Job;
    hours: number;
    days: number;
    percentage: number;
  }[];
}

interface ComparisonData {
  previousPeriod: string;
  previousTotalHours: number;
  hoursDifference: number;
  percentageChange: number;
}

export default function EnhancedReportsScreen({ onNavigate }: EnhancedReportsScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { triggerHaptic } = useHapticFeedback();
  const { handleBack } = useBackNavigation();
  
  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  const styles = getStyles(colors, isDark);

  useEffect(() => {
    loadData();
    setupGoals();
  }, []);

  useEffect(() => {
    if (workDays.length > 0 && jobs.length > 0) {
      calculatePeriodStats();
      calculateComparison();
    }
  }, [workDays, jobs, selectedPeriod]);

  const loadData = async () => {
    try {
      const [loadedJobs, loadedWorkDays] = await Promise.all([
        JobService.getJobs(),
        JobService.getWorkDays(),
      ]);
      setJobs(loadedJobs);
      setWorkDays(loadedWorkDays);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const setupGoals = () => {
    // Configurar metas ejemplo (en un caso real, estas vendrían de la base de datos)
    const sampleGoals: GoalData[] = [
      {
        id: '1',
        title: 'Horas Semanales',
        current: 38,
        target: 40,
        unit: 'hrs',
        color: colors.primary,
        icon: 'clock',
        period: 'weekly',
      },
      {
        id: '2',
        title: 'Días Activos',
        current: 4,
        target: 5,
        unit: 'días',
        color: colors.success,
        icon: 'calendar',
        period: 'weekly',
      },
      {
        id: '3',
        title: 'Meta Mensual',
        current: 152,
        target: 160,
        unit: 'hrs',
        color: colors.warning,
        icon: 'target',
        period: 'monthly',
      },
    ];
    setGoals(sampleGoals);
  };

  const calculatePeriodStats = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    const periodWorkDays = workDays.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= startDate && dayDate <= now;
    });

    const totalHours = periodWorkDays.reduce((sum, day) => sum + day.hoursWorked, 0);
    const totalDays = periodWorkDays.length;
    const overtimeHours = periodWorkDays.reduce((sum, day) => {
      const job = jobs.find(j => j.id === day.jobId);
      return sum + Math.max(0, day.hoursWorked - (job?.defaultHours || 8));
    }, 0);

    // Job breakdown
    const jobStats = new Map();
    periodWorkDays.forEach(day => {
      const existing = jobStats.get(day.jobId) || { hours: 0, days: 0 };
      jobStats.set(day.jobId, {
        hours: existing.hours + day.hoursWorked,
        days: existing.days + 1,
      });
    });

    const jobBreakdown = Array.from(jobStats.entries()).map(([jobId, stats]) => {
      const job = jobs.find(j => j.id === jobId)!;
      return {
        job,
        hours: stats.hours,
        days: stats.days,
        percentage: totalHours > 0 ? (stats.hours / totalHours) * 100 : 0,
      };
    }).sort((a, b) => b.hours - a.hours);

    setPeriodStats({
      totalHours,
      totalDays,
      overtimeHours,
      avgHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0,
      jobBreakdown,
    });
  };

  const calculateComparison = () => {
    if (!periodStats) return;

    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;
    
    switch (selectedPeriod) {
      case 'week':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setDate(currentStart.getDate() - 7);
        break;
      case 'month':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setMonth(now.getMonth() - 1);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setMonth(currentStart.getMonth() - 1);
        break;
      case 'quarter':
        currentEnd = new Date(now);
        currentStart = new Date(now);
        currentStart.setMonth(now.getMonth() - 3);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart);
        previousStart.setMonth(currentStart.getMonth() - 3);
        break;
    }

    const previousWorkDays = workDays.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= previousStart && dayDate <= previousEnd;
    });

    const previousTotalHours = previousWorkDays.reduce((sum, day) => sum + day.hoursWorked, 0);
    const hoursDifference = periodStats.totalHours - previousTotalHours;
    const percentageChange = previousTotalHours > 0 
      ? (hoursDifference / previousTotalHours) * 100 
      : 0;

    const periodLabels = {
      week: 'Semana Anterior',
      month: 'Mes Anterior', 
      quarter: 'Trimestre Anterior',
    };

    setComparisonData({
      previousPeriod: periodLabels[selectedPeriod],
      previousTotalHours,
      hoursDifference,
      percentageChange,
    });
  };

  const handleExportPDF = async () => {
    if (!periodStats) return;
    
    setIsExporting(true);
    triggerHaptic('medium');

    try {
      const reportData = {
        title: `Reporte de Trabajo - ${selectedPeriod === 'week' ? 'Semanal' : selectedPeriod === 'month' ? 'Mensual' : 'Trimestral'}`,
        period: `${getPeriodLabel()} (${new Date().toLocaleDateString()})`,
        jobs,
        workDays,
        ...periodStats,
        comparison: comparisonData,
      };

      await PDFExportService.shareReportPDF(reportData);
      triggerHaptic('success');
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      triggerHaptic('error');
      Alert.alert('Error', 'No se pudo exportar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  const getPeriodLabel = () => {
    const labels = {
      week: 'Última Semana',
      month: 'Último Mes',
      quarter: 'Último Trimestre',
    };
    return labels[selectedPeriod];
  };

  const getChartData = (): ChartDataPoint[] => {
    if (!periodStats || !periodStats.jobBreakdown) return [];
    
    return periodStats.jobBreakdown
      .filter(item => item && item.job && typeof item.hours === 'number')
      .map(item => ({
        value: Number(item.hours) || 0,
        label: (item.job.name || 'Sin nombre').substring(0, 8),
        color: item.job.color || '#007AFF',
      }));
  };

  const getComparisonChartData = (): ChartDataPoint[] => {
    if (!comparisonData) return [];
    
    // Para comparación, creamos datos ficticios basados en los datos reales
    const currentData = getChartData();
    return currentData.map(item => ({
      ...item,
      value: item.value * 0.8, // Simulamos datos anteriores
    }));
  };

  const getTrendData = (): ChartDataPoint[] => {
    // Generar datos de tendencia de los últimos 7 días
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      
      const dayWorkDays = workDays.filter(wd => {
        try {
          const wdDate = new Date(wd.date);
          return wdDate.toDateString() === date.toDateString();
        } catch {
          return false;
        }
      });
      
      const totalHours = dayWorkDays.reduce((sum, wd) => {
        const hours = Number(wd.hoursWorked) || 0;
        return sum + hours;
      }, 0);
      
      return {
        value: totalHours,
        label: date.toLocaleDateString('es', { weekday: 'short' }),
        date: date.toISOString(),
      };
    });

    return last7Days.filter(day => day.value >= 0);
  };

  const handleGoalPress = (goal: GoalData) => {
    triggerHaptic('selection');
    Alert.alert(
      `Meta: ${goal.title}`,
      `Progreso: ${goal.current}/${goal.target} ${goal.unit}\n${((goal.current / goal.target) * 100).toFixed(1)}% completado`,
      [{ text: 'OK', onPress: () => triggerHaptic('light') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => { triggerHaptic('light'); handleBack(); }}
            style={styles.backButton}
          >
            <IconSymbol size={24} name="arrow.left" color={colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>📊 Reportes Avanzados</Text>
            <Text style={styles.headerSubtitle}>{getPeriodLabel()}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleExportPDF}
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            disabled={isExporting}
          >
            <IconSymbol 
              size={20} 
              name={isExporting ? "hourglass" : "square.and.arrow.up"} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <Animated.View entering={SlideInUp.delay(200)} style={styles.periodSelector}>
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => { triggerHaptic('selection'); setSelectedPeriod(period); }}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}>
                {period === 'week' ? '7 días' : period === 'month' ? '30 días' : '90 días'}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Stats Summary */}
        {periodStats && (
          <Animated.View entering={SlideInUp.delay(400)} style={styles.statsGrid}>
            <View style={styles.statCard}>
              <IconSymbol size={24} name="clock" color={colors.primary} />
              <Text style={styles.statValue}>{periodStats.totalHours.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Horas</Text>
            </View>
            <View style={styles.statCard}>
              <IconSymbol size={24} name="calendar" color={colors.success} />
              <Text style={styles.statValue}>{periodStats.totalDays}</Text>
              <Text style={styles.statLabel}>Días Trabajados</Text>
            </View>
            <View style={styles.statCard}>
              <IconSymbol size={24} name="plus.circle" color={colors.warning} />
              <Text style={styles.statValue}>{periodStats.overtimeHours.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Horas Extra</Text>
            </View>
            <View style={styles.statCard}>
              <IconSymbol size={24} name="chart.bar" color={colors.error} />
              <Text style={styles.statValue}>{periodStats.avgHoursPerDay.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Promedio/Día</Text>
            </View>
          </Animated.View>
        )}

        {/* Comparison Card */}
        {comparisonData && (
          <Animated.View entering={SlideInRight.delay(600)} style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <IconSymbol size={20} name="chart.line.uptrend.xyaxis" color={colors.primary} />
              <Text style={styles.comparisonTitle}>📈 Comparativa vs {comparisonData.previousPeriod}</Text>
            </View>
            <View style={styles.comparisonStats}>
              <View style={styles.comparisonStat}>
                <Text style={styles.comparisonValue}>
                  {comparisonData.hoursDifference >= 0 ? '+' : ''}{comparisonData.hoursDifference.toFixed(1)}h
                </Text>
                <Text style={styles.comparisonLabel}>Diferencia</Text>
              </View>
              <View style={styles.comparisonStat}>
                <Text style={[
                  styles.comparisonPercentage,
                  { color: comparisonData.percentageChange >= 0 ? colors.success : colors.error }
                ]}>
                  {comparisonData.percentageChange >= 0 ? '+' : ''}{comparisonData.percentageChange.toFixed(1)}%
                </Text>
                <Text style={styles.comparisonLabel}>Cambio</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Interactive Charts */}
        <Animated.View entering={SlideInUp.delay(800)}>
          <SafeInteractiveChart
            title="📊 Tendencia Diaria"
            data={getTrendData()}
            type="line"
            height={220}
            onDataPointPress={(dataPoint, index) => {
              Alert.alert(
                'Detalle del día',
                `${dataPoint.label}: ${dataPoint.value} horas trabajadas`,
                [{ text: 'OK' }]
              );
            }}
          />
        </Animated.View>

        <Animated.View entering={SlideInUp.delay(1000)}>
          <SafeInteractiveChart
            title="💼 Distribución por Trabajo"
            data={getChartData()}
            type="pie"
            height={250}
            onDataPointPress={(dataPoint, index) => {
              const jobBreakdown = periodStats?.jobBreakdown[index];
              if (jobBreakdown) {
                Alert.alert(
                  jobBreakdown.job.name,
                  `Horas: ${jobBreakdown.hours.toFixed(1)}h\nDías: ${jobBreakdown.days}\nPorcentaje: ${jobBreakdown.percentage.toFixed(1)}%`,
                  [{ text: 'OK' }]
                );
              }
            }}
          />
        </Animated.View>

        {/* Goals Section */}
        <Animated.View entering={SlideInUp.delay(1200)} style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>🎯 Metas y Objetivos</Text>
          <FlatList
            data={goals}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.goalsList}
            renderItem={({ item, index }) => (
              <Animated.View entering={SlideInRight.delay(1400 + index * 200)}>
                <GoalProgressCircle
                  goal={item}
                  onPress={handleGoalPress}
                  animated={true}
                />
              </Animated.View>
            )}
          />
        </Animated.View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  exportButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  exportButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 25,
    padding: 4,
    marginVertical: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  comparisonStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  comparisonStat: {
    alignItems: 'center',
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  comparisonPercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  comparisonLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  goalsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  goalsList: {
    paddingHorizontal: 4,
    gap: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});