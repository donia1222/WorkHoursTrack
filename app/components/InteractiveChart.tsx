import React, { useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { IconSymbol } from '@/components/ui/IconSymbol';

const { width: screenWidth } = Dimensions.get('window');

export type ChartType = 'line' | 'bar' | 'pie';

export interface ChartDataPoint {
  value: number;
  label: string;
  color?: string;
  date?: string;
}

interface InteractiveChartProps {
  title: string;
  data: ChartDataPoint[];
  type: ChartType;
  onDataPointPress?: (dataPoint: ChartDataPoint, index: number) => void;
  height?: number;
  showComparison?: boolean;
  comparisonData?: ChartDataPoint[];
  comparisonLabel?: string;
}

export default function InteractiveChart({
  title,
  data,
  type,
  onDataPointPress,
  height = 220,
  showComparison = false,
  comparisonData,
  comparisonLabel = "Anterior",
}: InteractiveChartProps) {
  // Validar y sanear props
  const safeHeight = typeof height === 'number' && height > 0 ? height : 220;
  const safeData = Array.isArray(data) ? data : [];
  const safeTitle = title || 'Gráfico';
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const styles = getStyles(colors);

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 1,
    color: (opacity = 1) => {
      const hex = Math.round((opacity || 1) * 255).toString(16).padStart(2, '0');
      return `${colors.primary}${hex}`;
    },
    labelColor: (opacity = 1) => {
      const hex = Math.round((opacity || 1) * 255).toString(16).padStart(2, '0');
      return `${colors.textSecondary}${hex}`;
    },
    style: {
      borderRadius: 16,
      backgroundColor: 'transparent',
    },
    propsForBackgroundLines: {
      strokeOpacity: isDark ? 0.1 : 0.2,
      stroke: colors.border || '#E0E0E0',
    },
    propsForLabels: {
      fontSize: 12,
      fontFamily: 'System',
    },
    fillShadowGradient: colors.primary,
    fillShadowGradientOpacity: 0.1,
  };

  const comparisonChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => {
      const hex = Math.round((opacity || 1) * 255).toString(16).padStart(2, '0');
      return `${colors.warning}${hex}`;
    },
  };

  const handlePress = () => {
    triggerHaptic('light');
    scale.value = withSpring(1.05, {}, () => {
      scale.value = withSpring(1);
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));


  const toggleExpanded = () => {
    triggerHaptic('light');
    setIsExpanded(!isExpanded);
  };

  const renderChart = (chartData: ChartDataPoint[], config: any, key?: string) => {
    if (!chartData || chartData.length === 0) {
      return (
        <View style={[styles.chart, { height: safeHeight, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary }}>No hay datos disponibles</Text>
        </View>
      );
    }

    const chartHeight = isExpanded ? safeHeight * 1.5 : safeHeight;
    const chartWidth = screenWidth - 40;
    
    // Validar y limpiar datos
    const validData = chartData.filter(d => d && typeof d.value === 'number' && !isNaN(d.value));
    if (validData.length === 0) {
      return (
        <View style={[styles.chart, { height: chartHeight, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: colors.textSecondary }}>Datos inválidos</Text>
        </View>
      );
    }
    
    switch (type) {
      case 'line':
        const chartData = {
          labels: validData.length > 0 ? validData.map(d => String(d.label || '')) : [''],
          datasets: [{
            data: validData.length > 0 ? validData.map(d => Math.max(0, Number(d.value) || 0)) : [0],
            strokeWidth: 3,
            color: (opacity = 1) => config.color ? config.color(opacity) : colors.primary,
          }],
        };

        return (
          <LineChart
            key={key}
            data={chartData}
            width={Math.max(chartWidth, 250)}
            height={Math.max(chartHeight, 200)}
            chartConfig={config}
            bezier={true}
            withDots={true}
            withShadow={false}
            withScrollableDot={true}
            style={{
              borderRadius: 16,
              backgroundColor: 'transparent',
            }}
          />
        );

      case 'bar':
        const barChartData = {
          labels: validData.length > 0 ? validData.map(d => String(d.label || '')) : [''],
          datasets: [{
            data: validData.length > 0 ? validData.map(d => Math.max(0, Number(d.value) || 0)) : [0],
          }],
        };

        return (
          <BarChart
            key={key}
            data={barChartData}
            width={Math.max(chartWidth, 250)}
            height={Math.max(chartHeight, 200)}
            chartConfig={config}
            showValuesOnTopOfBars={true}
            yAxisLabel=""
            yAxisSuffix=""
            style={{
              borderRadius: 16,
              backgroundColor: 'transparent',
            }}
          />
        );

      case 'pie':
        const pieData = validData.length > 0 ? validData.map((item, index) => ({
          name: String(item.label || `Item ${index + 1}`),
          population: Math.max(0, Number(item.value) || 0),
          color: item.color || `${colors.primary}${Math.round((0.8 - index * 0.1) * 255).toString(16).padStart(2, '0')}`,
          legendFontColor: colors.textSecondary || '#666',
          legendFontSize: 12,
        })) : [{
          name: 'Sin datos',
          population: 1,
          color: colors.textSecondary || '#ccc',
          legendFontColor: colors.textSecondary || '#666',
          legendFontSize: 12,
        }];

        return (
          <PieChart
            key={key}
            data={pieData}
            width={Math.max(chartWidth, 250)}
            height={Math.max(chartHeight, 200)}
            chartConfig={config}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute={false}
            style={{
              borderRadius: 16,
              backgroundColor: 'transparent',
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{safeTitle}</Text>
        <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
          <IconSymbol 
            size={20} 
            name={isExpanded ? "chevron.up" : "chevron.down"} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Animated.View 
          entering={FadeIn.delay(300)}
          style={[styles.chartContainer, animatedStyle]}
        >
          {showComparison && comparisonData ? (
            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Actual</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
                  <Text style={styles.legendText}>{comparisonLabel}</Text>
                </View>
              </View>
              
              {type !== 'pie' && (
                <View style={styles.overlayCharts}>
                  {renderChart(comparisonData, comparisonChartConfig, 'comparison')}
                  <View style={styles.overlayChart}>
                    {renderChart(data, chartConfig, 'main')}
                  </View>
                </View>
              )}
              
              {type === 'pie' && renderChart(safeData, chartConfig)}
            </View>
          ) : (
            renderChart(safeData, chartConfig)
          )}
        </Animated.View>
      </TouchableOpacity>

      {selectedIndex !== null && safeData && safeData[selectedIndex] && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedLabel}>
            {safeData[selectedIndex].label}: {safeData[selectedIndex].value}
          </Text>
          {safeData[selectedIndex].date && (
            <Text style={styles.selectedDate}>{safeData[selectedIndex].date}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
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
  expandButton: {
    padding: 4,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  comparisonContainer: {
    width: '100%',
  },
  comparisonLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  overlayCharts: {
    position: 'relative',
  },
  overlayChart: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  selectedInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  selectedDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});