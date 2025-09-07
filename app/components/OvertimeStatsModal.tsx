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
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  Easing 
} from 'react-native-reanimated';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { JobService } from '../services/JobService';
import { Job, WorkDay } from '../types/WorkTypes';
import { PDFExportService } from '../services/PDFExportService';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import EditWorkDayModal from './EditWorkDayModal';
import DeleteWorkDayModal from './DeleteWorkDayModal';

const { width: screenWidth } = Dimensions.get('window');

interface OvertimeStatsModalProps {
  visible: boolean;
  onClose: () => void;
  onEditSalary: () => void;
  job: Job;
  monthlyOvertime: number;
  onDataChange?: () => void;
}

export const OvertimeStatsModal: React.FC<OvertimeStatsModalProps> = ({
  visible,
  onClose,
  onEditSalary,
  job,
  monthlyOvertime,
  onDataChange,
}) => {
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();
  const [weeklyOvertimeData, setWeeklyOvertimeData] = useState<number[]>([]);
  const [monthlyOvertimeComparison, setMonthlyOvertimeComparison] = useState<number[]>([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | 'all'>('all');
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [calculatedOvertime, setCalculatedOvertime] = useState<number>(0);
  const [visibleRecentDays, setVisibleRecentDays] = useState(6);
  const [editWorkDayModal, setEditWorkDayModal] = useState(false);
  const [selectedWorkDay, setSelectedWorkDay] = useState<WorkDay | null>(null);
  const [deleteWorkDayModal, setDeleteWorkDayModal] = useState(false);
  const [workDayToDelete, setWorkDayToDelete] = useState<WorkDay | null>(null);

  // Animation values for charts
  const chartOpacity = useSharedValue(0);
  const chartScale = useSharedValue(0.8);
  const barChartOpacity = useSharedValue(0);
  const barChartTranslateY = useSharedValue(30);
  const lineChartOpacity = useSharedValue(0);
  const lineChartTranslateX = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      loadJobsAndData();
      
      // Start chart animations with delays
      chartOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
      chartScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) });
      
      barChartOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
      barChartTranslateY.value = withDelay(400, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }));
      
      lineChartOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
      lineChartTranslateX.value = withDelay(800, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }));
    } else {
      // Reset animations when modal closes
      chartOpacity.value = 0;
      chartScale.value = 0.8;
      barChartOpacity.value = 0;
      barChartTranslateY.value = 30;
      lineChartOpacity.value = 0;
      lineChartTranslateX.value = 50;
    }
  }, [visible]);

  useEffect(() => {
    if (visible && jobs.length > 0 && workDays.length > 0) {
      loadOvertimeStatistics();
    }
  }, [visible, selectedJobId, jobs, workDays]);

  // Animated styles for charts
  const chartAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: chartOpacity.value,
      transform: [{ scale: chartScale.value }],
    };
  });

  const barChartAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: barChartOpacity.value,
      transform: [{ translateY: barChartTranslateY.value }],
    };
  });

  const lineChartAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: lineChartOpacity.value,
      transform: [{ translateX: lineChartTranslateX.value }],
    };
  });

  const loadJobsAndData = async () => {
    try {
      const [loadedJobs, loadedWorkDays] = await Promise.all([
        JobService.getJobs(),
        JobService.getWorkDays()
      ]);
      setJobs(loadedJobs);
      setWorkDays(loadedWorkDays);
      // If job prop is provided, set it as selected
      if (job) {
        setSelectedJobId(job.id);
      } else if (loadedJobs.length === 1) {
        // Auto-select if only one job
        setSelectedJobId(loadedJobs[0].id);
      }
    } catch (error) {
      console.error('Error loading jobs and data:', error);
    }
  };

  const handleExportReport = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Filter work days based on selected job filter
      let overtimeWorkDays = workDays.filter((day: any) => {
        const dayDate = new Date(day.date);
        return dayDate.getMonth() + 1 === currentMonth && 
               dayDate.getFullYear() === currentYear && 
               (day.type === 'work' || !day.type) &&
               day.overtime;
      });
      
      // Apply job filter
      if (selectedJobId !== 'all') {
        overtimeWorkDays = overtimeWorkDays.filter(day => day.jobId === selectedJobId);
      }

      // Calculate overtime breakdown (only for days marked as overtime)
      const totalOvertimeHours = overtimeWorkDays.reduce((sum: number, day: any) => {
        if (day.overtime) {
          const netHours = Math.max(0, (day.hours || 0) - (day.breakHours || 0));
          return sum + Math.max(0, netHours - 8); // Net hours over 8 = overtime
        }
        return sum;
      }, 0);
      
      const selectedJob = selectedJobId === 'all' ? null : jobs.find(j => j.id === selectedJobId);
      const jobName = selectedJob ? selectedJob.name : t('reports.all_jobs');
      
      // Get recent activity for PDF
      const recentOvertimeDays = getAllRecentOvertimeDays(); // TODOS los días del mes
      
      const reportData = {
        title: t('reports.overtime'),
        period: `${now.toLocaleDateString(t('locale_code') || 'es-ES', { month: 'long', year: 'numeric' })}`,
        jobName: jobName,
        jobs: selectedJob ? [selectedJob] : jobs,
        workDays: overtimeWorkDays,
        recentActivity: recentOvertimeDays,
        totalHours: totalOvertimeHours,
        totalDays: overtimeWorkDays.length,
        overtimeHours: calculatedOvertime,
        jobBreakdown: [{
          job: selectedJob || { name: t('reports.all_jobs') },
          hours: totalOvertimeHours,
          days: overtimeWorkDays.length,
          percentage: 100
        }]
      };

      // Generate and share PDF
      const htmlContent = generateOvertimeReportHTML(reportData);
      const fileName = `${t('reports.overtime')}_${jobName}_${now.getFullYear()}_${String(currentMonth).padStart(2, '0')}.pdf`;
      
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
            display: grid; grid-template-columns: 1fr 1fr 1fr;
            gap: 15px; margin: 20px 0; max-width: 100%;
          }
          .summary-card {
            background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px;
            padding: 10px 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .summary-card h3 {
            color: #1e3a8a; font-size: 0.9rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
          }
          .summary-card .value {
            color: #1e3a8a; font-size: 1.8rem; font-weight: 700; margin-bottom: 5px;
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
          <h1 class="title">${data.jobName}</h1>
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
        
        ${data.recentActivity && data.recentActivity.length > 0 ? `
        <div style="margin-top: 20px;">
          <h2 style="color: #1e3a8a; font-size: 1.2rem; margin-bottom: 10px; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px;">
            ${t('reports.recent_activity')}
          </h2>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; font-size: 9px;">
            ${data.recentActivity.map((day: any) => {
              const job = data.jobs.find((j: any) => j.id === day.jobId);
              const netHours = Math.max(0, day.hours - (day.breakHours || 0));
              const overtimeHours = Math.max(0, netHours - 8);
              const dayDate = new Date(day.date);
              const formattedDate = dayDate.toLocaleDateString(t('locale_code') || 'es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
              return `
                <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 3px; text-align: center; box-shadow: 0 1px 2px rgba(30, 58, 138, 0.03);">
                  <div style="font-weight: 600; color: #1e3a8a; margin-bottom: 1px; font-size: 0.55rem;">${dayDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</div>
                  <div style="color: #1e3a8a; font-size: 0.5rem; margin-bottom: 1px; font-weight: 400;">${dayDate.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                  <div style="font-weight: 700; color: #1e3a8a; font-size: 0.65rem; margin-bottom: 1px;">${overtimeHours.toFixed(1)}h</div>
                  ${day.actualStartTime && day.actualEndTime ? 
                    `<div style="color: #1e3a8a; font-size: 0.45rem;">${day.actualStartTime.substring(0,5)}-${day.actualEndTime.substring(0,5)}</div>` : 
                    (day.startTime && day.endTime ? 
                      `<div style="color: #6b7280; font-size: 0.45rem;">${day.startTime.substring(0,5)}-${day.endTime.substring(0,5)}</div>` : '')
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}
        
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
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Weekly overtime data for current month (last 4 weeks)
      const weeklyOvertimeHours: number[] = [0, 0, 0, 0];
      const monthlyOvertimeData: number[] = [];
      
      // Calculate total overtime for selected job(s)
      let totalMonthlyOvertime = 0;

      // Calculate weekly overtime hours for current month
      workDays.forEach((day: any) => {
        const dayDate = new Date(day.date);
        const isCurrentMonth = dayDate.getMonth() + 1 === currentMonth && 
                              dayDate.getFullYear() === currentYear;
        const isWorkDay = day.type === 'work' || !day.type;
        const matchesJobFilter = selectedJobId === 'all' || day.jobId === selectedJobId;
        
        if (isCurrentMonth && isWorkDay && matchesJobFilter && day.overtime) {
          const weekNumber = Math.floor(dayDate.getDate() / 7);
          const netHours = Math.max(0, (day.hours || 0) - (day.breakHours || 0));
          const overtimeHours = Math.max(0, netHours - 8); // Net hours over 8 = overtime
          weeklyOvertimeHours[Math.min(weekNumber, 3)] += overtimeHours;
          totalMonthlyOvertime += overtimeHours;
        }
      });
      
      setCalculatedOvertime(totalMonthlyOvertime);

      // Monthly overtime comparison (last 6 months)
      for (let i = 5; i >= 0; i--) {
        const targetMonth = new Date(currentYear, currentMonth - 1 - i, 1);
        let monthOvertimeHours = 0;
        
        workDays.forEach((day: any) => {
          const dayDate = new Date(day.date);
          const matchesJobFilter = selectedJobId === 'all' || day.jobId === selectedJobId;
          
          if (dayDate.getMonth() === targetMonth.getMonth() && 
              dayDate.getFullYear() === targetMonth.getFullYear() &&
              (day.type === 'work' || !day.type) &&
              matchesJobFilter &&
              day.overtime) {
            const netHours = Math.max(0, (day.hours || 0) - (day.breakHours || 0));
            const overtimeHours = Math.max(0, netHours - 8);
            monthOvertimeHours += overtimeHours;
          }
        });
        
        monthlyOvertimeData.push(monthOvertimeHours);
      }

      setWeeklyOvertimeData(weeklyOvertimeHours);
      setMonthlyOvertimeComparison(monthlyOvertimeData);

      // Overtime breakdown (regular vs overtime earnings)
      const regularHours = Math.max(0, 160 - totalMonthlyOvertime); // Assume 160 standard monthly hours
      const overtimeHours = totalMonthlyOvertime;
      const regularRate = getHourlyRate();
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

  const getHourlyRate = () => {
    // Get rate from selected job or average from all jobs
    if (selectedJobId !== 'all') {
      const selectedJob = jobs.find(j => j.id === selectedJobId);
      return selectedJob?.salary?.amount || selectedJob?.hourlyRate || 0;
    } else {
      // Calculate average rate from all jobs
      const rates = jobs.map(j => j.salary?.amount || j.hourlyRate || 0).filter(r => r > 0);
      return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    }
  };

  const calculateOvertimeEarnings = () => {
    const regularRate = getHourlyRate();
    const overtimeRate = regularRate * 1.5;
    return calculatedOvertime * overtimeRate;
  };

  const getCurrencySymbol = () => {
    // Get currency from selected job or first job with currency
    let currency = 'EUR';
    if (selectedJobId !== 'all') {
      const selectedJob = jobs.find(j => j.id === selectedJobId);
      currency = selectedJob?.salary?.currency || selectedJob?.currency || 'EUR';
    } else if (jobs.length > 0) {
      currency = jobs[0]?.salary?.currency || jobs[0]?.currency || 'EUR';
    }
    return currency === 'EUR' ? '€' : 
           currency === 'USD' ? '$' : 
           currency === 'GBP' ? '£' : 
           currency === 'CHF' ? 'CHF' : currency;
  };

  const getAllRecentWorkDays = () => {
    // First filter only work days (include days without type for legacy data)
    let filteredWorkDays = workDays.filter(day => day.type === 'work' || !day.type);
    
    // Filter by selected job if not "all"
    if (selectedJobId !== 'all') {
      filteredWorkDays = filteredWorkDays.filter(day => day.jobId === selectedJobId);
    }
    
    // Group by date and job to consolidate multiple sessions (same logic as ReportsScreen)
    const consolidatedMap = new Map<string, WorkDay>();
    
    filteredWorkDays.forEach(day => {
      const dateKey = day.date.split('T')[0];
      const key = `${dateKey}_${day.jobId || 'no-job'}`;
      
      const existing = consolidatedMap.get(key);
      if (existing) {
        // Create a fresh copy to avoid mutation
        const updatedDay: WorkDay = {
          ...existing,
          hours: existing.hours + day.hours,
          breakHours: (existing.breakHours || 0) + (day.breakHours || 0)
        };
        
        // Handle notes more carefully - avoid duplicates
        if (day.notes && day.notes.trim()) {
          const existingNotes = existing.notes?.trim() || '';
          const newNotes = day.notes.trim();
          
          // Only add the new note if it's different from existing notes
          if (!existingNotes.includes(newNotes)) {
            updatedDay.notes = existingNotes ? `${existingNotes}; ${newNotes}` : newNotes;
          } else {
            updatedDay.notes = existingNotes;
          }
        }
        
        // Handle time fields - use earliest start and latest end
        if (day.actualStartTime) {
          if (!existing.actualStartTime || day.actualStartTime < existing.actualStartTime) {
            updatedDay.actualStartTime = day.actualStartTime;
          }
        }
        if (day.actualEndTime) {
          if (!existing.actualEndTime || day.actualEndTime > existing.actualEndTime) {
            updatedDay.actualEndTime = day.actualEndTime;
          }
        }
        
        // Preserve the most recent updatedAt
        if (day.updatedAt && (!existing.updatedAt || day.updatedAt > existing.updatedAt)) {
          updatedDay.updatedAt = day.updatedAt;
        }
        
        consolidatedMap.set(key, updatedDay);
      } else {
        // Create a fresh copy for the first entry
        consolidatedMap.set(key, { ...day });
      }
    });
    
    // Convert to array and sort by date (newest first)
    // Convert to array and filter for overtime days AFTER consolidation
    return Array.from(consolidatedMap.values())
      .filter(day => {
        // Only include days with overtime (net hours > 8)
        const netHours = Math.max(0, (day.hours || 0) - (day.breakHours || 0));
        return netHours > 8;
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || a.date).getTime();
        const bTime = new Date(b.createdAt || b.date).getTime();
        return bTime - aTime;
      });
  };

  const getRecentWorkDays = () => {
    // getAllRecentWorkDays already filters for overtime, just slice for pagination
    return getAllRecentWorkDays().slice(0, visibleRecentDays);
  };

  const getAllRecentOvertimeDays = () => {
    // getAllRecentWorkDays already returns only overtime days
    return getAllRecentWorkDays();
  };

  const handleLoadMore = () => {
    setVisibleRecentDays(prev => prev + 10);
  };

  const handleEditWorkDay = (workDay: WorkDay) => {
    setSelectedWorkDay(workDay);
    setEditWorkDayModal(true);
  };

  const handleDeleteWorkDay = (workDay: WorkDay) => {
    setWorkDayToDelete(workDay);
    setDeleteWorkDayModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!workDayToDelete) return;
    
    try {
      // Get all work days for this date and job (same consolidation logic)
      const dateKey = workDayToDelete.date.split('T')[0];
      const allWorkDays = await JobService.getWorkDays();
      
      // Find all sessions for the same date and job
      const sameDateSessions = allWorkDays.filter(wd => {
        const wdDateKey = wd.date.split('T')[0];
        return wdDateKey === dateKey && wd.jobId === workDayToDelete.jobId;
      });
      
      // Delete all sessions for this date/job
      for (const session of sameDateSessions) {
        await JobService.deleteWorkDay(session.id);
      }
      
      // Force complete reload from storage
      const refreshedWorkDays = await JobService.getWorkDays();
      setWorkDays(refreshedWorkDays);
      
      // Reload statistics to reflect changes
      if (jobs.length > 0) {
        await loadOvertimeStatistics();
      }
      
      // Notify parent component about data changes (MapLocation widgets)
      if (onDataChange) {
        onDataChange();
      }
      
    } catch (error) {
      console.error('Error deleting work day:', error);
    } finally {
      // Close modal
      setDeleteWorkDayModal(false);
      setWorkDayToDelete(null);
    }
  };

  const handleWorkDayUpdate = async (updatedWorkDay: WorkDay) => {
    try {
      // Get all work days for this date and job
      const dateKey = updatedWorkDay.date.split('T')[0];
      const allWorkDays = await JobService.getWorkDays();
      
      // Find all sessions for the same date and job
      const sameDateSessions = allWorkDays.filter(wd => {
        const wdDateKey = wd.date.split('T')[0];
        return wdDateKey === dateKey && wd.jobId === updatedWorkDay.jobId;
      });
      
      if (sameDateSessions.length > 1) {
        // Multiple sessions for same date/job - consolidate into single record
        console.log(`🔄 Consolidating ${sameDateSessions.length} sessions for ${dateKey}`);
        
        // Delete all existing sessions for this date/job
        for (const session of sameDateSessions) {
          await JobService.deleteWorkDay(session.id);
        }
        
        // Calculate total net hours from edited data
        const netHours = Math.max(0, updatedWorkDay.hours - (updatedWorkDay.breakHours || 0));
        
        // Create a single consolidated work day record
        const consolidatedWorkDay = {
          ...updatedWorkDay,
          id: updatedWorkDay.id, // Keep the original ID
          hours: netHours + (updatedWorkDay.breakHours || 0), // Preserve break structure
          createdAt: sameDateSessions[0].createdAt, // Keep original creation time
          updatedAt: new Date().toISOString(),
        };
        
        // Save the consolidated record
        await JobService.addWorkDay(consolidatedWorkDay);
        
      } else {
        // Single session - just update normally
        await JobService.updateWorkDay(updatedWorkDay.id, updatedWorkDay);
      }
      
      // Force complete reload from storage
      const refreshedWorkDays = await JobService.getWorkDays();
      setWorkDays(refreshedWorkDays);
      
      // Reload statistics to reflect changes
      if (jobs.length > 0) {
        await loadOvertimeStatistics();
      }
      
      // Notify parent component about data changes (MapLocation widgets)
      if (onDataChange) {
        onDataChange();
      }
      
    } catch (error) {
      console.error('Error updating work day:', error);
    } finally {
      // Close modal
      setEditWorkDayModal(false);
      setSelectedWorkDay(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('common.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('common.yesterday');
    } else {
      return date.toLocaleDateString(t('locale_code') || 'es-ES', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
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
          {/* Job Filter - Copy exact style from ReportsScreen */}
          {jobs.length > 1 && (
            <View style={styles.compactJobSelector}>
              <Text style={[styles.compactJobSelectorTitle, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
                {t('reports.filter_by_job')}
              </Text>
              <View style={[styles.compactJobTabs, { backgroundColor: (isDark ? '#374151' : '#f3f4f6') + '40' }]}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.compactJobScrollContainer}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                <TouchableOpacity
                  style={[
                    styles.compactJobTab,
                    selectedJobId === 'all' && styles.compactJobTabActive,
                    { 
                      flex: 0,
                      minWidth: 100,
                      marginRight: 8,
                      backgroundColor: selectedJobId === 'all'
                        ? (isDark ? '#1f2937' : '#ffffff')
                        : 'transparent'
                    }
                  ]}
                  onPress={() => setSelectedJobId('all')}
                >
                  <Text style={[
                    styles.compactJobTabText,
                    selectedJobId === 'all' && styles.compactJobTabTextActive,
                    { 
                      color: selectedJobId === 'all'
                        ? (isDark ? '#ffffff' : '#1f2937')
                        : (isDark ? '#d1d5db' : '#6b7280')
                    }
                  ]}>
                    {t('reports.all_jobs')}
                  </Text>
                </TouchableOpacity>
                {jobs.map((jobItem, index) => (
                  <TouchableOpacity
                    key={jobItem.id}
                    style={[
                      styles.compactJobTab,
                      selectedJobId === jobItem.id && styles.compactJobTabActive,
                      { 
                        flex: 0,
                        minWidth: 100,
                        marginRight: index < jobs.length - 1 ? 8 : 0,
                        backgroundColor: selectedJobId === jobItem.id
                          ? (isDark ? '#1f2937' : '#ffffff')
                          : 'transparent'
                      }
                    ]}
                    onPress={() => setSelectedJobId(jobItem.id)}
                  >
                    <View style={[styles.compactJobTabDot, { backgroundColor: jobItem.color || colors.primary }]} />
                    <Text style={[
                      styles.compactJobTabText,
                      selectedJobId === jobItem.id && styles.compactJobTabTextActive,
                      { 
                        color: selectedJobId === jobItem.id
                          ? (isDark ? '#ffffff' : '#1f2937')
                          : (isDark ? '#d1d5db' : '#6b7280')
                      }
                    ]}>
                      {jobItem.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                </ScrollView>
              </View>
            </View>
          )}
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
                {calculatedOvertime.toFixed(1)}h
              </Text>
            </View>
          </View>

          {/* Weekly Overtime Chart */}
          <Animated.View style={[styles.chartContainer, chartAnimatedStyle]}>
            <Text style={[
              styles.chartTitle,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
              {t('reports.overtime')} {t('reports.weekly_hours')}
            </Text>
            <Animated.View style={barChartAnimatedStyle}>
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
            </Animated.View>
          </Animated.View>

          {/* Monthly Overtime Comparison Chart */}
          <Animated.View style={[styles.chartContainer, chartAnimatedStyle]}>
            <Text style={[
              styles.chartTitle,
              { color: isDark ? '#ffffff' : '#1f2937' }
            ]}>
              {t('reports.overtime')} {t('reports.monthly_comparison')}
            </Text>
            <Animated.View style={lineChartAnimatedStyle}>
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
            </Animated.View>
          </Animated.View>

          {/* Recent Activity Section */}
          <View style={[styles.chartContainer, { marginTop: 30 }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={24} color={isDark ? '#fbbf24' : '#f59e0b'} />
              <Text style={[
                styles.chartTitle,
                { color: isDark ? '#ffffff' : '#1f2937', textAlign: 'left', marginBottom: 0 }
              ]}>
                {t('reports.recent_activity')}
              </Text>
            </View>
            {getRecentWorkDays().length > 0 ? (
              <>
                {getRecentWorkDays().map((day) => {
                  const job = jobs.find(j => j.id === day.jobId);
                  return (
                    <TouchableOpacity 
                      key={day.id} 
                      style={[
                        styles.modernRecentItem,
                        { backgroundColor: isDark ? '#374151' : '#f9fafb' }
                      ]}
                      onPress={() => handleEditWorkDay(day)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.recentItemContent}>
                        <View style={styles.recentLeft}>
                          <View style={[
                            styles.modernJobIndicator, 
                            { backgroundColor: job?.color || (isDark ? '#fbbf24' : '#f59e0b') }
                          ]}>
                            <Ionicons name="business" size={16} color="white" />
                          </View>
                          <View style={styles.recentInfo}>
                            <Text style={[
                              styles.recentDate,
                              { color: isDark ? '#ffffff' : '#1f2937' }
                            ]}>
                              {formatDate(day.date)}
                            </Text>
                            <Text style={[
                              styles.recentJob,
                              { color: isDark ? '#d1d5db' : '#6b7280' }
                            ]}>
                              {job?.name || 'Trabajo'}
                            </Text>
                            {/* Show actual times if available, otherwise scheduled times */}
                            {(day.actualStartTime && day.actualEndTime) ? (
                              <Text style={[
                                styles.recentSchedule, 
                                { color: isDark ? '#fbbf24' : '#f59e0b' }
                              ]}>
                                <Ionicons name="time" size={12} color={isDark ? '#fbbf24' : '#f59e0b'} />
                                {' '}{day.actualStartTime} - {day.actualEndTime}
                              </Text>
                            ) : (day.startTime && day.endTime) ? (
                              <Text style={[
                                styles.recentSchedule,
                                { color: isDark ? '#9ca3af' : '#6b7280' }
                              ]}>
                                <Ionicons name="time-outline" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                                {' '}{day.startTime} - {day.endTime}
                              </Text>
                            ) : null}
                            {day.notes && (
                              <Text style={[
                                styles.recentNotes,
                                { color: isDark ? '#9ca3af' : '#6b7280' }
                              ]}>
                                {day.notes}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.recentRight}>
                          <Text style={[
                            styles.recentHours,
                            { color: isDark ? '#fbbf24' : '#f59e0b', fontSize: 16 }
                          ]}>
                            {Math.max(0, Math.max(0, day.hours - (day.breakHours || 0)) - 8).toFixed(1)}h
                          </Text>
                          <View style={styles.actionButtons}>
                            {day.notes && (
                              <TouchableOpacity 
                                style={[
                                  styles.noteButton,
                                  { backgroundColor: isDark ? 'rgba(255, 159, 10, 0.1)' : 'rgba(255, 159, 10, 0.08)' }
                                ]}
                                onPress={() => handleEditWorkDay(day)}
                              >
                                <Ionicons name="document-text" size={16} color={isDark ? '#3b82f6' : '#1e40af'} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                              style={[
                                styles.editButton,
                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }
                              ]}
                              onPress={() => handleEditWorkDay(day)}
                            >
                              <Ionicons name="create" size={16} color={isDark ? '#3b82f6' : '#1e40af'} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[
                                styles.deleteButton,
                                { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 69, 58, 0.1)' }
                              ]}
                              onPress={() => handleDeleteWorkDay(day)}
                            >
                              <Ionicons name="trash" size={16} color={isDark ? '#ef4444' : '#dc2626'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {(() => {
                  const allOvertimeDays = getAllRecentOvertimeDays();
                  const totalDays = allOvertimeDays.length;
                  const currentlyShowing = getRecentWorkDays().length;
                  const shouldShow = totalDays > currentlyShowing;
                  return shouldShow;
                })() && (
                  <TouchableOpacity
                    style={[
                      styles.loadMoreButton,
                      { backgroundColor: isDark ? '#374151' : '#f3f4f6' }
                    ]}
                    onPress={handleLoadMore}
                  >
                    <Text style={[
                      styles.loadMoreText,
                      { color: isDark ? '#fbbf24' : '#f59e0b' }
                    ]}>
                      {t('reports.load_more', { remaining: getAllRecentOvertimeDays().length - getRecentWorkDays().length })}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={isDark ? '#fbbf24' : '#f59e0b'} />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time" size={48} color={isDark ? '#6b7280' : '#9ca3af'} />
                   <Text style={[
                           styles.emptyText,
                           { color: isDark ? '#9ca3af' : '#6b7280' }
                         ]}>
                           {t('reports.no_records')}
                         </Text>
               <Text style={[
                       styles.emptyText,
                       { color: isDark ? '#9ca3af' : '#6b7280' }
                     ]}>
                       {t('reports.no_records')}
                     </Text>
              </View>
            )}
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
      
      {/* Edit Work Day Modal */}
      <EditWorkDayModal
        visible={editWorkDayModal}
        onClose={() => setEditWorkDayModal(false)}
        workDay={selectedWorkDay}
        job={selectedWorkDay ? jobs.find(j => j.id === selectedWorkDay.jobId) || null : null}
        onSave={handleWorkDayUpdate}
      />
      
      {/* Delete Work Day Modal */}
      <DeleteWorkDayModal
        visible={deleteWorkDayModal}
        onClose={() => setDeleteWorkDayModal(false)}
        onConfirm={handleConfirmDelete}
        workDay={workDayToDelete}
        jobName={workDayToDelete ? jobs.find(j => j.id === workDayToDelete.jobId)?.name || 'Trabajo' : ''}
        formatDate={(date: string) => new Date(date).toLocaleDateString(t('locale_code') || 'es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      />
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
marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
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
  compactJobSelector: {
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  compactJobSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  compactJobTabs: {
    borderRadius: 12,
    padding: 4,
  },
  compactJobScrollContainer: {
    flexDirection: 'row',
  },
  compactJobTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    justifyContent: 'center',
  },
  compactJobTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactJobTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactJobTabTextActive: {
    fontWeight: '600',
  },
  compactJobTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Recent Activity Styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modernRecentItem: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recentItemContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  modernJobIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
  },
  recentDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentJob: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  recentSchedule: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  recentNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  recentRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  recentHours: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  noteButton: {
    padding: 8,
    borderRadius: 12,
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 12,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});