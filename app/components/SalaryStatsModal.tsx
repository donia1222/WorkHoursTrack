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
import * as Print from 'expo-print';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { JobService } from '../services/JobService';
import { Job } from '../types/WorkTypes';
import { PDFExportService } from '../services/PDFExportService';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SalaryStatsModalProps {
  visible: boolean;
  onClose: () => void;
  onEditSalary: () => void;
  job: Job;
  monthlyTotalHours: number;
  monthlyOvertime: number;
}

export const SalaryStatsModal: React.FC<SalaryStatsModalProps> = ({
  visible,
  onClose,
  onEditSalary,
  job,
  monthlyTotalHours,
  monthlyOvertime,
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<number[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<any[]>([]);

  useEffect(() => {
    if (visible && job) {
      loadStatistics();
    }
  }, [visible, job]);

  const handleExportReport = async () => {
    try {
      const allWorkDays = await JobService.getWorkDays();
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // January = 1
      const currentYear = now.getFullYear(); // 2025
      
      console.log('🗓️ PDF Export - Current date:', now);
      console.log('🗓️ PDF Export - Current month:', currentMonth, 'year:', currentYear);
      
      // Filter work days for current job and month
      const jobWorkDays = allWorkDays.filter((day: any) => {
        const dayDate = new Date(day.date);
        const isCurrentMonth = dayDate.getMonth() + 1 === currentMonth;
        const isCurrentYear = dayDate.getFullYear() === currentYear;
        const isWorkDay = (day.type === 'work' || !day.type);
        const isCorrectJob = day.jobId === job.id;
        
        // Debug each day
        if (isCorrectJob) {
          console.log('🔍 Day check:', day.date, 
            'Month:', dayDate.getMonth() + 1, '=', currentMonth, '?', isCurrentMonth,
            'Year:', dayDate.getFullYear(), '=', currentYear, '?', isCurrentYear,
            'Work?', isWorkDay);
        }
        
        return isCurrentMonth && isCurrentYear && isWorkDay && isCorrectJob;
      });
      
      console.log('📊 PDF Debug - Total ALL work days:', allWorkDays.length);
      console.log('📊 PDF Debug - Filtered work days found:', jobWorkDays.length);
      console.log('📊 PDF Debug - Current month/year:', currentMonth, currentYear);
      console.log('📊 PDF Debug - Job ID:', job.id);

      // Calculate job breakdown
      const totalJobHours = jobWorkDays.reduce((sum: number, day: any) => {
        return sum + Math.max(0, (day.hours || 0) - (day.breakHours || 0));
      }, 0);
      
      const reportData = {
        title: t('reports.salary_statistics'),
        period: `${now.toLocaleDateString(t('locale_code') || 'es-ES', { month: 'long', year: 'numeric' })}`,
        jobs: [job],
        workDays: jobWorkDays,
        totalHours: monthlyTotalHours,
        totalDays: jobWorkDays.length,
        overtimeHours: monthlyOvertime,
        jobBreakdown: [{
          job: job,
          hours: totalJobHours,
          days: jobWorkDays.length,
          percentage: 100
        }]
      };

      // Generate and share PDF
      const htmlContent = generateSalaryReportHTML(reportData);
      const fileName = `${t('reports.salary_statistics')}_${job.name}_${now.getFullYear()}_${String(currentMonth).padStart(2, '0')}.pdf`;
      
      await generateAndSharePDF(htmlContent, fileName);
    } catch (error) {
      console.error('Error exporting salary report:', error);
    }
  };

  const generateSalaryReportHTML = (data: any): string => {
    const currencySymbol = getCurrencySymbol();
    const totalEarnings = calculateTotalEarnings();
    
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
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 25px; margin: 40px 0; max-width: 600px; margin-left: auto; margin-right: auto;
          }
          .summary-grid .summary-card:last-child {
            grid-column: 1 / -1; max-width: 280px; margin: 0 auto;
          }
          .summary-card {
            background: linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%); 
            border: 2px solid #cbd5e1; border-radius: 16px;
            padding: 30px 20px; text-align: center; 
            box-shadow: 0 8px 25px rgba(30, 58, 138, 0.1);
            transition: all 0.3s ease;
          }
          .summary-card h3 {
            color: #1e3a8a; font-size: 0.9rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
          }
          .summary-card .value {
            color: #1e3a8a; font-size: 2.5rem; font-weight: 800; margin: 10px 0;
            text-shadow: 0 2px 4px rgba(30, 58, 138, 0.1);
          }
          .summary-card .unit {
            color: #1e3a8a; font-size: 0.9rem;
          }
          .footer {
            margin-top: 30px; padding: 20px 0; border-top: 2px solid #1e3a8a;
            text-align: center; color: #1e3a8a; font-size: 0.9rem;
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
            <h3>${t('reports.monthly_earnings')}</h3>
            <div class="value">${currencySymbol}${totalEarnings.toFixed(2)}</div>
            <div class="unit">${t('reports.total_earnings')}</div>
          </div>
          
          <div class="summary-card">
            <h3>${t('maps.total_hours')}</h3>
            <div class="value">${data.totalHours.toFixed(1)}</div>
            <div class="unit">${t('reports.hours_worked')}</div>
          </div>
          
          <div class="summary-card">
            <h3>${t('reports.work_days')}</h3>
            <div class="value">${data.totalDays}</div>
            <div class="unit">${t('reports.days_worked')}</div>
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

  const loadStatistics = async () => {
    try {
      // Get work days for calculations
      const allWorkDays = await JobService.getWorkDays();
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Weekly data for current month (last 4 weeks)
      const weeklyHours: number[] = [0, 0, 0, 0];
      const monthlyData: number[] = [];

      // Calculate weekly hours for current month
      allWorkDays.forEach((day: any) => {
        const dayDate = new Date(day.date);
        if (dayDate.getMonth() + 1 === currentMonth && 
            dayDate.getFullYear() === currentYear && 
            (day.type === 'work' || !day.type) &&
            day.jobId === job.id) {
          const weekNumber = Math.floor(dayDate.getDate() / 7);
          const netHours = Math.max(0, (day.hours || 0) - (day.breakHours || 0));
          weeklyHours[Math.min(weekNumber, 3)] += netHours;
        }
      });

      // Monthly comparison (last 6 months)
      for (let i = 5; i >= 0; i--) {
        const targetMonth = new Date(currentYear, currentMonth - 1 - i, 1);
        let monthHours = 0;
        
        allWorkDays.forEach((day: any) => {
          const dayDate = new Date(day.date);
          if (dayDate.getMonth() === targetMonth.getMonth() && 
              dayDate.getFullYear() === targetMonth.getFullYear() &&
              (day.type === 'work' || !day.type) &&
              day.jobId === job.id) {
            const netHours = Math.max(0, (day.hours || 0) - (day.breakHours || 0));
            monthHours += netHours;
          }
        });
        
        monthlyData.push(monthHours);
      }

      setWeeklyData(weeklyHours);
      setMonthlyComparison(monthlyData);

      // Earnings breakdown - only show if there are hours to display
      const regularHours = Math.max(0, monthlyTotalHours - monthlyOvertime);
      const overtimeHours = monthlyOvertime;
      
      console.log('📊 Pie Chart Data:', {
        monthlyTotalHours,
        monthlyOvertime,
        regularHours,
        overtimeHours,
      });
      
      if (regularHours > 0 || overtimeHours > 0) {
        setEarningsBreakdown([
          {
            name: `${t('reports.regular_hours')}: ${regularHours.toFixed(1)}h`,
            population: parseFloat(regularHours.toFixed(1)),
            color: isDark ? '#4ade80' : '#16a34a',
            legendFontColor: isDark ? '#ffffff' : '#000000',
            legendFontSize: 11,
          },
          {
            name: `${t('reports.overtime')}: ${overtimeHours.toFixed(1)}h`,
            population: overtimeHours > 0 ? parseFloat(overtimeHours.toFixed(1)) : 0.1,
            color: isDark ? '#fbbf24' : '#f59e0b',
            legendFontColor: isDark ? '#ffffff' : '#000000',
            legendFontSize: 11,
          },
        ]);
      } else {
        setEarningsBreakdown([]);
      }
    } catch (error) {
      console.error('Error loading salary statistics:', error);
    }
  };

  const calculateTotalEarnings = () => {
    // Use same calculation as the widget - simple hourly rate * total hours
    const rate = job.salary?.amount || job.hourlyRate || 0;
    return monthlyTotalHours * rate;
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
    color: (opacity = 1) => isDark ? `rgba(74, 222, 128, ${opacity})` : `rgba(22, 163, 74, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: isDark ? "#4ade80" : "#16a34a"
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
              name="analytics" 
              size={24} 
              color={isDark ? '#4ade80' : '#16a34a'} 
            />
            <Text style={[
              styles.title,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
              {t('reports.salary_statistics')}
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
              colors={isDark ? ['#1e40af', '#3b82f6'] : ['#dbeafe', '#93c5fd']}
              style={styles.summaryCard}
            >
              <Ionicons 
                name="wallet" 
                size={20} 
                color={isDark ? '#ffffff' : '#1e40af'} 
                style={{ marginBottom: 4 }}
              />
              <Text style={[
                styles.summaryLabel,
                { color: isDark ? '#ffffff' : '#1e40af' }
              ]}>
                {t('reports.monthly_earnings')}
              </Text>
              <Text style={[
                styles.summaryValue,
                { color: isDark ? '#ffffff' : '#1e40af' }
              ]}>
                {getCurrencySymbol()}{calculateTotalEarnings().toFixed(2)}
              </Text>
            </LinearGradient>

            <View style={[
              styles.summaryCard,
              { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
            ]}>
              <Ionicons 
                name="time" 
                size={20} 
                color={isDark ? '#4ade80' : '#16a34a'} 
                style={{ marginBottom: 4 }}
              />
              <Text style={[
                styles.summaryLabel,
                { color: isDark ? '#d1d5db' : '#6b7280' }
              ]}>
                {t('maps.total_hours')}
              </Text>
              <Text style={[
                styles.summaryValue,
                { color: isDark ? '#4ade80' : '#16a34a' }
              ]}>
                {monthlyTotalHours.toFixed(1)}h
              </Text>
            </View>
          </View>

          {/* Weekly Progress Chart */}
          <View style={styles.chartContainer}>
            <Text style={[
              styles.chartTitle,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
              {t('reports.weekly_hours')}
            </Text>
            <BarChart
              data={{
                labels: [t('reports.week') + ' 1', t('reports.week') + ' 2', t('reports.week') + ' 3', t('reports.week') + ' 4'],
                datasets: [{ data: weeklyData.length > 0 ? weeklyData : [0, 0, 0, 0] }]
              }}
              width={screenWidth - 60}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix="h"
            />
          </View>

          {/* Monthly Comparison Chart */}
          <View style={styles.chartContainer}>
            <Text style={[
              styles.chartTitle,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
              {t('reports.monthly_comparison')}
            </Text>
            <LineChart
              data={{
                labels: monthlyComparison.map((_, index) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - (5 - index));
                  return date.toLocaleDateString(t('locale_code') || 'es-ES', { month: 'short' });
                }),
                datasets: [{ data: monthlyComparison.length > 0 ? monthlyComparison : [0, 0, 0, 0, 0, 0] }]
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
                { backgroundColor: isDark ? '#1e40af' : '#3b82f6' }
              ]}
              onPress={onEditSalary}
            >
              <Ionicons name="settings" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>
                {t('jobs.edit_salary')}
              </Text>
            </TouchableOpacity>

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
});