import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  FadeIn,
  SlideInUp
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { IconSymbol } from '@/components/ui/IconSymbol';

export interface GoalData {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  color?: string;
  icon?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

interface GoalProgressCircleProps {
  goal: GoalData;
  size?: number;
  onPress?: (goal: GoalData) => void;
  showDetails?: boolean;
  animated?: boolean;
}

export default function GoalProgressCircle({
  goal,
  size = 120,
  onPress,
  showDetails = true,
  animated = true,
}: GoalProgressCircleProps) {
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const styles = getStyles(colors, isDark, size);
  
  // Validar datos del goal
  const safeGoal = {
    ...goal,
    current: Number(goal.current) || 0,
    target: Number(goal.target) || 1, // Evitar división por cero
    title: goal.title || 'Meta',
    unit: goal.unit || '',
  };
  
  const percentage = Math.min((safeGoal.current / safeGoal.target) * 100, 100);
  const isCompleted = safeGoal.current >= safeGoal.target;
  const circleColor = goal.color || colors.primary;

  useEffect(() => {
    if (isCompleted && animated) {
      // Animación de celebración cuando se completa el goal
      scale.value = withSequence(
        withSpring(1.1, { duration: 300 }),
        withSpring(1, { duration: 200 })
      );
    }
  }, [isCompleted, animated]);

  const handlePress = () => {
    triggerHaptic(isCompleted ? 'success' : 'light');
    
    // Animación de press
    scale.value = withSequence(
      withSpring(0.95, { duration: 100 }),
      withSpring(1, { duration: 150 })
    );
    
    onPress?.(goal);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getPeriodEmoji = () => {
    switch (goal.period) {
      case 'daily': return '📅';
      case 'weekly': return '🗓️';
      case 'monthly': return '📆';
      default: return '🎯';
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return colors.success;
    if (percentage >= 75) return colors.warning;
    if (percentage >= 50) return circleColor;
    return colors.error;
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <Animated.View 
        entering={animated ? FadeIn.delay(200) : undefined}
        style={[styles.container, animatedStyle]}
      >
        {/* Main Progress Circle */}
        <View style={styles.circleContainer}>
          <AnimatedCircularProgress
            size={size}
            width={8}
            fill={percentage}
            tintColor={getStatusColor()}
            backgroundColor={isDark ? colors.border : colors.surface}
            rotation={-90}
            lineCap="round"
            duration={animated ? 1500 : 0}
          >
            {() => (
              <View style={styles.centerContent}>
                {goal.icon && (
                  <IconSymbol 
                    size={size * 0.2} 
                    name={goal.icon} 
                    color={getStatusColor()} 
                  />
                )}
                <Text style={[styles.percentage, { color: getStatusColor() }]}>
                  {Math.round(percentage)}%
                </Text>
                {isCompleted && (
                  <Animated.View 
                    entering={animated ? SlideInUp.delay(1000) : undefined}
                    style={styles.completedBadge}
                  >
                    <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                  </Animated.View>
                )}
              </View>
            )}
          </AnimatedCircularProgress>
        </View>

        {showDetails && (
          <Animated.View 
            entering={animated ? FadeIn.delay(500) : undefined}
            style={styles.detailsContainer}
          >
            <View style={styles.titleRow}>
              <Text style={styles.periodEmoji}>{getPeriodEmoji()}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {safeGoal.title}
              </Text>
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.current}>
                {safeGoal.current}
              </Text>
              <Text style={styles.separator}>/</Text>
              <Text style={styles.target}>
                {safeGoal.target}
              </Text>
              <Text style={styles.unit}>{safeGoal.unit}</Text>
            </View>

            {/* Progress Bar (Linear) */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${percentage}%`,
                      backgroundColor: getStatusColor()
                    }
                  ]} 
                />
              </View>
            </View>

            {/* Status Message */}
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {isCompleted 
                ? '🎉 ¡Meta completada!' 
                : `${Math.max(0, safeGoal.target - safeGoal.current)} ${safeGoal.unit} restantes`
              }
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: any, isDark: boolean, size: number) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: isDark ? colors.border : colors.surface,
  },
  circleContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: size * 0.15,
    fontWeight: '700',
    marginTop: 4,
  },
  completedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  detailsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  periodEmoji: {
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 2,
  },
  current: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  separator: {
    fontSize: 18,
    color: colors.textSecondary,
    marginHorizontal: 2,
  },
  target: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  unit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: isDark ? colors.border : colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});