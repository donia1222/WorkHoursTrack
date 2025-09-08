import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { IconSymbol } from '@/components/ui/IconSymbol';

export interface ChartDataPoint {
  value: number;
  label: string;
  color?: string;
  date?: string;
}

export type ChartType = 'line' | 'bar' | 'pie';

interface SafeInteractiveChartProps {
  title: string;
  data: ChartDataPoint[];
  type: ChartType;
  onDataPointPress?: (dataPoint: ChartDataPoint, index: number) => void;
  height?: number;
}

export default function SafeInteractiveChart({
  title,
  data,
  type,
  onDataPointPress,
  height = 220,
}: SafeInteractiveChartProps) {
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const styles = getStyles(colors, isDark, height);

  const safeData = Array.isArray(data) ? data.filter(d => d && typeof d.value === 'number') : [];
  const maxValue = safeData.length > 0 ? Math.max(...safeData.map(d => d.value)) : 1;

  const handleDataPress = (dataPoint: ChartDataPoint, index: number) => {
    triggerHaptic('selection');
    onDataPointPress?.(dataPoint, index);
  };

  const renderBarChart = () => (
    <View style={styles.barContainer}>
      {safeData.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 60) : 0;
        return (
          <TouchableOpacity
            key={index}
            style={styles.barWrapper}
            onPress={() => handleDataPress(item, index)}
          >
            <View style={styles.barColumn}>
              <Text style={styles.barValue}>{item.value}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, 2),
                    backgroundColor: item.color || colors.primary,
                  },
                ]}
              />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderPieChart = () => {
    const total = safeData.reduce((sum, item) => sum + item.value, 0);
    return (
      <View style={styles.pieContainer}>
        <View style={styles.pieChart}>
          <View style={[styles.pieCenter, { backgroundColor: colors.surface }]}>
            <Text style={styles.pieTotal}>{total.toFixed(1)}</Text>
            <Text style={styles.pieTotalLabel}>Total</Text>
          </View>
        </View>
        <View style={styles.pieLegend}>
          {safeData.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <TouchableOpacity
                key={index}
                style={styles.legendItem}
                onPress={() => handleDataPress(item, index)}
              >
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: item.color || colors.primary },
                  ]}
                />
                <Text style={styles.legendText}>
                  {item.label}: {percentage.toFixed(1)}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderLineChart = () => (
    <View style={styles.lineContainer}>
      <View style={styles.lineChart}>
        {safeData.map((item, index) => {
          const pointHeight = maxValue > 0 ? (item.value / maxValue) * (height - 80) : 0;
          const leftPosition = (index / Math.max(safeData.length - 1, 1)) * 80;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.linePoint,
                {
                  bottom: pointHeight,
                  left: `${leftPosition}%`,
                  backgroundColor: item.color || colors.primary,
                },
              ]}
              onPress={() => handleDataPress(item, index)}
            >
              <Text style={styles.pointValue}>{item.value}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.lineLabels}>
        {safeData.map((item, index) => (
          <Text key={index} style={styles.lineLabel}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );

  if (safeData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <IconSymbol size={48} name="chart.bar" color={colors.textSecondary} />

        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <IconSymbol size={16} name="chart.bar.fill" color={colors.primary} />
      </View>
      
      <View style={styles.chartContent}>
        {type === 'bar' && renderBarChart()}
        {type === 'pie' && renderPieChart()}
        {type === 'line' && renderLineChart()}
      </View>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean, height: number) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  chartContent: {
    height: height,
    justifyContent: 'center',
  },
  emptyContainer: {
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Bar Chart Styles
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    flex: 1,
    paddingHorizontal: 10,
  },
  barWrapper: {
    flex: 1,
    marginHorizontal: 2,
  },
  barColumn: {
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    marginVertical: 4,
  },
  barValue: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Pie Chart Styles
  pieContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  pieChart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieCenter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: colors.primary,
  },
  pieTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  pieTotalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pieLegend: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
  },
  // Line Chart Styles
  lineContainer: {
    flex: 1,
  },
  lineChart: {
    flex: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: 20,
  },
  linePoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointValue: {
    position: 'absolute',
    top: -20,
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  lineLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});