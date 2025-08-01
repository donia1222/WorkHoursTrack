import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguage } from '../contexts/LanguageContext';

export interface AIMetrics {
  requestId: string;
  provider: 'openai' | 'google';
  operation: 'chat' | 'vision' | 'pdf';
  startTime: number;
  endTime: number;
  duration: number;
  inputSize: number;
  outputSize: number;
  success: boolean;
  errorCode?: string;
  language: SupportedLanguage;
  userId?: string;
  cost?: number;
  tokensUsed?: number;
}

export interface AIUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  requestsByProvider: Record<string, number>;
  requestsByOperation: Record<string, number>;
  errorsByCode: Record<string, number>;
  lastUpdated: number;
}

/**
 * Analytics and performance monitoring for AI operations
 * Helps optimize costs, performance, and user experience
 */
export class AIAnalyticsService {
  private static readonly STORAGE_KEY = 'ai_analytics';
  private static readonly MAX_STORED_METRICS = 1000;
  private static readonly CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Track an AI operation
   */
  static async trackOperation(metrics: Omit<AIMetrics, 'requestId' | 'duration'>): Promise<string> {
    const requestId = this.generateRequestId();
    const duration = metrics.endTime - metrics.startTime;

    const fullMetrics: AIMetrics = {
      ...metrics,
      requestId,
      duration,
    };

    console.log('📊 [ANALYTICS] Tracking operation:', {
      requestId,
      provider: metrics.provider,
      operation: metrics.operation,
      duration: `${duration}ms`,
      success: metrics.success,
    });

    try {
      await this.storeMetrics(fullMetrics);
      await this.updateUsageStats(fullMetrics);
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to store metrics:', error);
    }

    return requestId;
  }

  /**
   * Get usage statistics
   */
  static async getUsageStats(): Promise<AIUsageStats> {
    try {
      const statsJson = await AsyncStorage.getItem(`${this.STORAGE_KEY}_stats`);
      
      if (statsJson) {
        return JSON.parse(statsJson);
      }
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to load stats:', error);
    }

    // Return default stats
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalCost: 0,
      requestsByProvider: {},
      requestsByOperation: {},
      errorsByCode: {},
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get recent metrics for analysis
   */
  static async getRecentMetrics(limit: number = 100): Promise<AIMetrics[]> {
    try {
      const metricsJson = await AsyncStorage.getItem(`${this.STORAGE_KEY}_metrics`);
      
      if (metricsJson) {
        const metrics: AIMetrics[] = JSON.parse(metricsJson);
        return metrics.slice(-limit);
      }
    } catch (error) {
      console.error('❌ [ANALYTICS] Failed to load metrics:', error);
    }

    return [];
  }

  /**
   * Get performance insights
   */
  static async getPerformanceInsights(): Promise<{
    slowestOperations: Array<{ operation: string; averageTime: number }>;
    mostReliableProvider: string;
    costEfficiencyReport: {
      totalSpent: number;
      averageCostPerRequest: number;
      mostExpensiveOperation: string;
    };
    errorAnalysis: Array<{ errorCode: string; frequency: number; impact: string }>;
  }> {
    const metrics = await this.getRecentMetrics(500);
    const stats = await this.getUsageStats();

    // Analyze slowest operations
    const operationTimes: Record<string, number[]> = {};
    metrics.forEach(metric => {
      if (!operationTimes[metric.operation]) {
        operationTimes[metric.operation] = [];
      }
      operationTimes[metric.operation].push(metric.duration);
    });

    const slowestOperations = Object.entries(operationTimes)
      .map(([operation, times]) => ({
        operation,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    // Find most reliable provider
    const providerSuccess: Record<string, { success: number; total: number }> = {};
    metrics.forEach(metric => {
      if (!providerSuccess[metric.provider]) {
        providerSuccess[metric.provider] = { success: 0, total: 0 };
      }
      providerSuccess[metric.provider].total++;
      if (metric.success) {
        providerSuccess[metric.provider].success++;
      }
    });

    const mostReliableProvider = Object.entries(providerSuccess)
      .map(([provider, data]) => ({
        provider,
        reliability: data.success / data.total,
      }))
      .sort((a, b) => b.reliability - a.reliability)[0]?.provider || 'unknown';

    // Cost analysis
    const totalCost = metrics.reduce((sum, metric) => sum + (metric.cost || 0), 0);
    const operationCosts: Record<string, number> = {};
    metrics.forEach(metric => {
      if (metric.cost) {
        operationCosts[metric.operation] = (operationCosts[metric.operation] || 0) + metric.cost;
      }
    });

    const mostExpensiveOperation = Object.entries(operationCosts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';

    // Error analysis
    const errorAnalysis = Object.entries(stats.errorsByCode)
      .map(([errorCode, frequency]) => ({
        errorCode,
        frequency,
        impact: frequency > 10 ? 'high' : frequency > 5 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return {
      slowestOperations,
      mostReliableProvider,
      costEfficiencyReport: {
        totalSpent: totalCost,
        averageCostPerRequest: totalCost / (metrics.length || 1),
        mostExpensiveOperation,
      },
      errorAnalysis,
    };
  }

  /**
   * Clear old analytics data
   */
  static async cleanup(): Promise<void> {
    try {
      const metrics = await this.getRecentMetrics(this.MAX_STORED_METRICS * 2);
      const cutoffTime = Date.now() - this.CLEANUP_INTERVAL;
      
      const recentMetrics = metrics.filter(metric => metric.endTime > cutoffTime);
      
      await AsyncStorage.setItem(
        `${this.STORAGE_KEY}_metrics`,
        JSON.stringify(recentMetrics.slice(-this.MAX_STORED_METRICS))
      );

      console.log(`🧹 [ANALYTICS] Cleaned up old metrics, kept ${recentMetrics.length} recent entries`);
    } catch (error) {
      console.error('❌ [ANALYTICS] Cleanup failed:', error);
    }
  }

  /**
   * Export analytics data for external analysis
   */
  static async exportData(): Promise<{
    metrics: AIMetrics[];
    stats: AIUsageStats;
    insights: any;
    exportTimestamp: number;
  }> {
    const [metrics, stats, insights] = await Promise.all([
      this.getRecentMetrics(1000),
      this.getUsageStats(),
      this.getPerformanceInsights(),
    ]);

    return {
      metrics,
      stats,
      insights,
      exportTimestamp: Date.now(),
    };
  }

  // Private helper methods

  private static generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async storeMetrics(metrics: AIMetrics): Promise<void> {
    const existingMetrics = await this.getRecentMetrics(this.MAX_STORED_METRICS - 1);
    const updatedMetrics = [...existingMetrics, metrics];

    await AsyncStorage.setItem(
      `${this.STORAGE_KEY}_metrics`,
      JSON.stringify(updatedMetrics)
    );
  }

  private static async updateUsageStats(metrics: AIMetrics): Promise<void> {
    const stats = await this.getUsageStats();

    stats.totalRequests++;
    if (metrics.success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
      if (metrics.errorCode) {
        stats.errorsByCode[metrics.errorCode] = (stats.errorsByCode[metrics.errorCode] || 0) + 1;
      }
    }

    stats.averageResponseTime = (
      (stats.averageResponseTime * (stats.totalRequests - 1) + metrics.duration) /
      stats.totalRequests
    );

    if (metrics.cost) {
      stats.totalCost += metrics.cost;
    }

    stats.requestsByProvider[metrics.provider] = (stats.requestsByProvider[metrics.provider] || 0) + 1;
    stats.requestsByOperation[metrics.operation] = (stats.requestsByOperation[metrics.operation] || 0) + 1;
    stats.lastUpdated = Date.now();

    await AsyncStorage.setItem(`${this.STORAGE_KEY}_stats`, JSON.stringify(stats));
  }
}