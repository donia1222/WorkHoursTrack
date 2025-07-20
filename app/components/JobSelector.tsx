import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Theme } from '../constants/Theme';
import { BlurView } from 'expo-blur';
import { Job } from '../types/WorkTypes';

interface JobSelectorProps {
  jobs: Job[];
  selectedJobId: string;
  onJobSelect: (jobId: string) => void;
  onAddJob?: () => void;
  showAddButton?: boolean;
}

export default function JobSelector({ 
  jobs, 
  selectedJobId, 
  onJobSelect, 
  onAddJob,
  showAddButton = true 
}: JobSelectorProps) {
  const activeJobs = jobs.filter(job => job.isActive);

  return (
    <BlurView intensity={95} tint="light" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seleccionar trabajo</Text>
        <Text style={styles.subtitle}>
          {activeJobs.length} trabajo{activeJobs.length !== 1 ? 's' : ''} disponible{activeJobs.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.jobsContainer}
        style={styles.scrollView}
      >
        {activeJobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={[
              styles.jobCard,
              selectedJobId === job.id && styles.jobCardSelected
            ]}
            onPress={() => onJobSelect(job.id)}
          >
            <View style={styles.jobCardInner}>
              <View 
                style={[
                  styles.jobColorIndicator, 
                  { backgroundColor: job.color }
                ]} 
              />
              <View style={styles.jobInfo}>
                <Text 
                  style={[
                    styles.jobName,
                    selectedJobId === job.id && styles.jobNameSelected
                  ]}
                  numberOfLines={1}
                >
                  {job.name}
                </Text>
                {job.company && (
                  <Text 
                    style={[
                      styles.jobCompany,
                      selectedJobId === job.id && styles.jobCompanySelected
                    ]}
                    numberOfLines={1}
                  >
                    {job.company}
                  </Text>
                )}
                <View style={styles.jobDetails}>
                  <Text 
                    style={[
                      styles.jobHours,
                      selectedJobId === job.id && styles.jobHoursSelected
                    ]}
                  >
                    {job.defaultHours}h por defecto
                  </Text>
                  {job.hourlyRate && job.hourlyRate > 0 && (
                    <Text 
                      style={[
                        styles.jobRate,
                        selectedJobId === job.id && styles.jobRateSelected
                      ]}
                    >
                      • {job.hourlyRate} {job.currency || 'EUR'}/h
                    </Text>
                  )}
                </View>
              </View>
              {selectedJobId === job.id && (
                <View style={styles.selectedIndicator}>
                  <IconSymbol 
                    size={16} 
                    name="checkmark" 
                    color="#FFFFFF" 
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {showAddButton && onAddJob && (
          <TouchableOpacity
            style={styles.addJobCard}
            onPress={onAddJob}
          >
            <View style={styles.addJobCardInner}>
              <View style={styles.addJobIcon}>
                <IconSymbol 
                  size={24} 
                  name="plus" 
                  color={Theme.colors.primary} 
                />
              </View>
              <Text style={styles.addJobText}>
                Agregar{'\n'}trabajo
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
  },
  scrollView: {
    marginHorizontal: -Theme.spacing.xs,
  },
  jobsContainer: {
    paddingHorizontal: Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
  jobCard: {
    width: 160,
    marginHorizontal: Theme.spacing.xs,
  },
  jobCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  jobCardInner: {
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Theme.shadows.small,
    minHeight: 100,
    position: 'relative',
  },
  jobColorIndicator: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: Theme.spacing.sm,
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    ...Theme.typography.headline,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
  },
  jobNameSelected: {
    color: Theme.colors.primary,
  },
  jobCompany: {
    ...Theme.typography.footnote,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  jobCompanySelected: {
    color: Theme.colors.textSecondary,
  },
  jobHours: {
    ...Theme.typography.caption2,
    color: Theme.colors.textTertiary,
    fontWeight: '500',
  },
  jobHoursSelected: {
    color: Theme.colors.primary,
  },
  jobDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobRate: {
    ...Theme.typography.caption2,
    color: Theme.colors.textTertiary,
    fontWeight: '500',
  },
  jobRateSelected: {
    color: Theme.colors.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addJobCard: {
    width: 160,
    marginHorizontal: Theme.spacing.xs,
  },
  addJobCardInner: {
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    backgroundColor: `${Theme.colors.primary}10`,
    borderWidth: 2,
    borderColor: `${Theme.colors.primary}30`,
    borderStyle: 'dashed',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addJobIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  addJobText: {
    ...Theme.typography.footnote,
    color: Theme.colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
});