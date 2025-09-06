import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { JobService } from '../services/JobService';
import { Job } from '../types/WorkTypes';
import { PDFExportService } from '../services/PDFExportService';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

const { width: screenWidth } = Dimensions.get('window');

interface OvertimeStatsModalProps {
  visible: boolean;
  onClose: () => void;
  onEditSalary: () => void;
  job: Job;
  monthlyOvertime: number;
}

export const OvertimeStatsModal: React.FC<OvertimeStatsModalProps> = ({
  visible,
  onClose,
  onEditSalary,
  job,
  monthlyOvertime,
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [weeklyOvertimeData, setWeeklyOvertimeData] = useState<number[]>([]);
  const [monthlyOvertimeComparison, setMonthlyOvertimeComparison] = useState<number[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<any[]>([]);

  useEffect(() => {
    if (visible && job) {
      loadOvertimeStatistics();
    }
  }, [visible, job]);

  const handleExportReport = async () => {
    try {
      const allWorkDays = await JobService.getWorkDays();
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Filter work days for current job and month with overtime
      const overtimeWorkDays = allWorkDays.filter((day: any) => {
        const dayDate = new Date(day.date);
        return dayDate.getMonth() + 1 === currentMonth && 
               dayDate.getFullYear() === currentYear && 
               (day.type === 'work' || !day.type) &&
               day.jobId === job.id &&
               day.overtime;
      });

      // Calculate overtime breakdown
      const totalOvertimeHours = overtimeWorkDays.reduce((sum: number, day: any) => {
        return sum + Math.max(0, (day.hours || 0) - 8); // Hours over 8 = overtime
      }, 0);
      
      const reportData = {
        title: t('reports.overtime'),
        period: `${now.toLocaleDateString(t('locale_code') || 'es-ES', { month: 'long', year: 'numeric' })}`,
        jobs: [job],
        workDays: overtimeWorkDays,
        totalHours: totalOvertimeHours,
        totalDays: overtimeWorkDays.length,
        overtimeHours: monthlyOvertime,
        jobBreakdown: [{
          job: job,
          hours: totalOvertimeHours,
          days: overtimeWorkDays.length,
          percentage: 100
        }]
      };

      // Generate and share PDF
      const htmlContent = generateOvertimeReportHTML(reportData);
      const fileName = `${t('reports.overtime')}_${job.name}_${now.getFullYear()}_${String(currentMonth).padStart(2, '0')}.pdf`;
      
      await generateAndSharePDF(htmlContent, fileName);
    } catch (error) {
      console.error('Error exporting overtime report:', error);
    }
  };

  const generateOvertimeReportHTML = (data: any): string => {
    const currencySymbol = getCurrencySymbol();
    const overtimeEarnings = calculateOvertimeEarnings();
    
    return `
      <!DOCTYPE html>
      <html lang="${t('locale_code')}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; color: #1e3a8a; padding: 40px; background: #fff;
          }
          .header {
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 20px; margin-bottom: 30px; text-align: center;
          }
          .logo {
            color: #1e3a8a; font-size: 2.5rem; font-weight: 700; margin-bottom: 10px;
          }
          .title {
            color: #1e3a8a; font-size: 2rem; font-weight: 600; margin-bottom: 5px;
          }
          .period {
            color: #1e3a8a; font-size: 1.2rem; font-weight: 400;
          }
          .summary-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px; margin: 30px 0;
          }
          .summary-card {
            background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px;
            padding: 20px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .summary-card h3 {
            color: #1e3a8a; font-size: 0.9rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
          }
          .summary-card .value {
            color: #1e3a8a; font-size: 2rem; font-weight: 700; margin-bottom: 5px;
          }
          .summary-card .unit {
            color: #1e3a8a; font-size: 0.9rem;
          }
          .footer {
            margin-top: 50px; padding-top: 20px; border-top: 1px solid #e9ecef;
            text-align: center; color: #1e3a8a; font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${data.title}</div>
          <h1 class="title">${job.name}</h1>
          <p class="period">${data.period}</p>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h3>${t('reports.overtime')} ${t('reports.monthly_earnings')}</h3>
            <div class="value">${currencySymbol}${overtimeEarnings.toFixed(2)}</div>
            <div class="unit">${t('reports.extra_earnings')}</div>
          </div>
          
          <div class="summary-card">
            <h3>${t('reports.overtime')} ${t('reports.total_hours')}</h3>
            <div class="value">${data.overtimeHours.toFixed(1)}</div>
            <div class="unit">${t('reports.extra_hours')}</div>
          </div>
          
          <div class="summary-card">
            <h3>${t('reports.overtime')} ${t('reports.work_days')}</h3>
            <div class="value">${data.totalDays}</div>
            <div class="unit">${t('reports.days_with_overtime')}</div>
          </div>
          
          <div class="summary-card">
            <h3>${t('reports.average_daily')}</h3>
            <div class="value">${data.totalDays > 0 ? (data.overtimeHours / data.totalDays).toFixed(1) : '0.0'}</div>
            <div class="unit">${t('reports.overtime')} ${t('reports.per_day')}</div>
          </div>
        </div>
        
        <div class="footer">
          <div>${t('reports.generated_on')} ${new Date().toLocaleDateString(t('locale_code') || 'es-ES')}</div>
          <div style="color: #1e3a8a; font-weight: 500; margin-top: 5px;">VixTime</div>
        </div>
      </body>
      </html>
    `;
  };

  const generateAndSharePDF = async (htmlContent: string, fileName: string) => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: newUri });

      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: t('reports.share_report'),
      });
    } catch (error) {
      console.error('Error generating/sharing PDF:', error);
      throw error;
    }
  };

  const loadOvertimeStatistics = async () => {
    try {
      // Get work days for overtime calculations
      const allWorkDays = await JobService.getWorkDays();
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Weekly overtime data for current month (last 4 weeks)
      const weeklyOvertimeHours: number[] = [0, 0, 0, 0];
      const monthlyOvertimeData: number[] = [];

      // Calculate weekly overtime hours for current month
      allWorkDays.forEach((day: any) => {
        const dayDate = new Date(day.date);
        if (dayDate.getMonth() + 1 === currentMonth && 
            dayDate.getFullYear() === currentYear && 
            (day.type === 'work' || !day.type) &&
            day.jobId === job.id &&
            day.overtime) {
          const weekNumber = Math.floor(dayDate.getDate() / 7);
          const overtimeHours = Math.max(0, (day.hours || 0) - 8); // Hours over 8 = overtime
          weeklyOvertimeHours[Math.min(weekNumber, 3)] += overtimeHours;
        }
      });

      // Monthly overtime comparison (last 6 months)
      for (let i = 5; i >= 0; i--) {
        const targetMonth = new Date(currentYear, currentMonth - 1 - i, 1);
        let monthOvertimeHours = 0;
        
        allWorkDays.forEach((day: any) => {
          const dayDate = new Date(day.date);
          if (dayDate.getMonth() === targetMonth.getMonth() && 
              dayDate.getFullYear() === targetMonth.getFullYear() &&
              (day.type === 'work' || !day.type) &&
              day.jobId === job.id &&
              day.overtime) {
            const overtimeHours = Math.max(0, (day.hours || 0) - 8);
            monthOvertimeHours += overtimeHours;
          }
        });
        
        monthlyOvertimeData.push(monthOvertimeHours);
      }

      setWeeklyOvertimeData(weeklyOvertimeHours);
      setMonthlyOvertimeComparison(monthlyOvertimeData);

      // Overtime breakdown (regular vs overtime earnings)
      const regularHours = Math.max(0, 160 - monthlyOvertime); // Assume 160 standard monthly hours
      const overtimeHours = monthlyOvertime;
      const regularRate = job.salary?.amount || job.hourlyRate || 0;
      const overtimeRate = regularRate * 1.5; // Overtime typically 1.5x

      setEarningsBreakdown([
        {
          name: `${t('reports.regular_hours')}: ${regularHours.toFixed(1)}h`,
          population: regularHours,
          color: isDark ? '#4ade80' : '#16a34a',
          legendFontColor: isDark ? '#ffffff' : '#000000',
          legendFontSize: 11,
        },
        {
          name: `${t('reports.overtime')}: ${overtimeHours.toFixed(1)}h`,
          population: overtimeHours,
          color: isDark ? '#fbbf24' : '#f59e0b',
          legendFontColor: isDark ? '#ffffff' : '#000000',
          legendFontSize: 11,
        },
      ]);
    } catch (error) {
      console.error('Error loading overtime statistics:', error);
    }
  };

  const calculateOvertimeEarnings = () => {
    const regularRate = job.salary?.amount || job.hourlyRate || 0;
    const overtimeRate = regularRate * 1.5;
    return monthlyOvertime * overtimeRate;
  };

  const getCurrencySymbol = () => {
    const currency = job.salary?.currency || job.currency || 'EUR';
    return currency === 'EUR' ? '€' : 
           currency === 'USD' ? '$' : 
           currency === 'GBP' ? '£' : 
           currency === 'CHF' ? 'CHF' : currency;
  };

  const chartConfig = {
    backgroundGradientFrom: isDark ? '#1f2937' : '#ffffff',
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: isDark ? '#111827' : '#f9fafb',
    backgroundGradientToOpacity: 1,
    color: (opacity = 1) => isDark ? `rgba(251, 191, 36, ${opacity})` : `rgba(245, 158, 11, ${opacity})`, // Orange for overtime
    strokeWidth: 3,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: isDark ? "#fbbf24" : "#f59e0b"
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[
        styles.container,
        { backgroundColor: isDark ? '#0f172a' : '#ffffff' }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Ionicons 
              name="time" 
              size={24} 
              color={isDark ? '#fbbf24' : '#f59e0b'} 
            />
            <Text style={[
              styles.title,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
            {t('reports.overtime')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#ffffff' : '#1f2937'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <LinearGradient
              colors={isDark ? ['#f59e0b', '#fbbf24'] : ['#fef3c7', '#fed7aa']}
              style={styles.summaryCard}
            >
              <Ionicons 
                name="wallet" 
                size={20} 
                color={isDark ? '#ffffff' : '#f59e0b'} 
                style={{ marginBottom: 4 }}
              />
              <Text style={[
                styles.summaryLabel,
                { color: isDark ? '#ffffff' : '#f59e0b' }
              ]}>
                {t('reports.overtime')} {t('reports.monthly_earnings')}
              </Text>
              <Text style={[
                styles.summaryValue,
                { color: isDark ? '#ffffff' : '#f59e0b' }
              ]}>
                {getCurrencySymbol()}{calculateOvertimeEarnings().toFixed(2)}
              </Text>
                          <TouchableOpacity
              style={[
                styles.actionButtone,
                { backgroundColor: isDark ? '#f59e0b' : '#fbbf24' }
              ]}
              onPress={onEditSalary}
            >
              <Ionicons name="settings" size={14} color="#ffffff" />
              <Text style={styles.buttonTexte}>
                {t('jobs.edit_salary')}
              </Text>
            </TouchableOpacity>
            </LinearGradient>

            <View style={[
              styles.summaryCard,
              { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
            ]}>
              <Ionicons 
                name="time" 
                size={28} 
                color={isDark ? '#fbbf24' : '#f59e0b'} 
                style={{ marginBottom: 4 }}
              />
              <Text style={[
                styles.summaryLabel,
                { color: isDark ? '#d1d5db' : '#6b7280' }
              ]}>
                {t('reports.overtime')} {t('reports.total_hours')}
              </Text>
              <Text style={[
                styles.summaryValue,
                { color: isDark ? '#fbbf24' : '#f59e0b' }
              ]}>
                {monthlyOvertime.toFixed(1)}h
              </Text>
            </View>
          </View>

          {/* Weekly Overtime Chart */}
          <View style={styles.chartContainer}>
            <Text style={[
              styles.chartTitle,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
              {t('reports.overtime')} {t('reports.weekly_hours')}
            </Text>
            <BarChart
              data={{
                labels: [t('reports.week') + ' 1', t('reports.week') + ' 2', t('reports.week') + ' 3', t('reports.week') + ' 4'],
                datasets: [{ data: weeklyOvertimeData.length > 0 ? weeklyOvertimeData : [0, 0, 0, 0] }]
              }}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix="h"
            />
          </View>

          {/* Monthly Overtime Comparison Chart */}
          <View style={styles.chartContainer}>
            <Text style={[
              styles.chartTitle,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
              {t('reports.overtime')} {t('reports.monthly_comparison')}
            </Text>
            <LineChart
              data={{
                labels: monthlyOvertimeComparison.map((_, index) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - (5 - index));
                  return date.toLocaleDateString(t('locale_code') || 'es-ES', { month: 'short' });
                }),
                datasets: [{ data: monthlyOvertimeComparison.length > 0 ? monthlyOvertimeComparison : [0, 0, 0, 0, 0, 0] }]
              }}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>


            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? '#059669' : '#10b981' }
              ]}
              onPress={handleExportReport}
            >
              <Ionicons name="download" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>
                {t('reports.export_report')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
     marginBottom: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.2)',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 75,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  chartContainer: {
    marginVertical: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 30,
    paddingBottom: 40,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
    actionButtone: {
    flex: 1,

    paddingVertical: 4,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
    buttonTexte: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    
  },
});