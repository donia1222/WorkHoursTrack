import { SupportedLanguage } from '../contexts/LanguageContext';
import { OpenAIService } from './OpenAIService';
import { GoogleVisionService } from './GoogleVisionService';
import { AIAnalyticsService } from './AIAnalyticsService';
import { ImageOptimizationService } from './ImageOptimizationService';
import { AIErrorHandler } from './AIErrorHandler';

export interface AIServiceConfig {
  provider: 'openai' | 'google' | 'auto';
  enableAnalytics: boolean;
  enableImageOptimization: boolean;
  enableCaching: boolean;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
  requestId?: string;
  provider: 'openai' | 'google';
  cached?: boolean;
  performance: {
    duration: number;
    inputSize: number;
    outputSize: number;
  };
}

/**
 * Enhanced AI Service Manager
 * Provides intelligent provider selection, caching, optimization, and analytics
 */
export class EnhancedAIService {
  private static config: AIServiceConfig = {
    provider: process.env.EXPO_PUBLIC_USE_OPENAI === 'true' ? 'openai' : 'google',
    enableAnalytics: true,
    enableImageOptimization: true,
    enableCaching: true,
  };

  private static cache = new Map<string, { data: string; timestamp: number; ttl: number }>();
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Send a chat message with intelligent provider selection
   */
  static async sendMessage(
    message: string,
    language: SupportedLanguage = 'en',
    conversationHistory: any[] = []
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = await this.selectOptimalProvider('chat');
    
    // Check cache first
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey('chat', message, language);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          provider,
          cached: true,
          performance: {
            duration: Date.now() - startTime,
            inputSize: message.length,
            outputSize: cached.length,
          },
        };
      }
    }

    try {
      let result: string;
      
      if (provider === 'openai') {
        if (conversationHistory.length > 0) {
          result = await OpenAIService.getChatResponseWithContext(message, conversationHistory, undefined, language);
        } else {
          result = await OpenAIService.getChatResponse(message, language);
        }
      } else {
        if (conversationHistory.length > 0) {
          result = await GoogleVisionService.getChatResponseWithContext(message, conversationHistory, undefined, language);
        } else {
          result = await GoogleVisionService.getChatResponse(message, language);
        }
      }

      // Cache successful results
      if (this.config.enableCaching && result && !result.includes('Error')) {
        const cacheKey = this.generateCacheKey('chat', message, language);
        this.setInCache(cacheKey, result, this.CACHE_TTL);
      }

      const endTime = Date.now();
      return {
        success: true,
        data: result,
        provider,
        performance: {
          duration: endTime - startTime,
          inputSize: message.length,
          outputSize: result.length,
        },
      };

    } catch (error) {
      const processedError = AIErrorHandler.processError(error, provider, language);
      
      return {
        success: false,
        error: processedError.userMessage,
        provider,
        performance: {
          duration: Date.now() - startTime,
          inputSize: message.length,
          outputSize: 0,
        },
      };
    }
  }

  /**
   * Analyze image with optimization and intelligent provider selection
   */
  static async analyzeImage(
    imageUri: string,
    prompt: string,
    language: SupportedLanguage = 'en',
    analysisType: 'general' | 'document' | 'schedule' = 'general'
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = await this.selectOptimalProvider('vision');
    let inputSize = 0;

    try {
      // Validate image first
      const validation = await ImageOptimizationService.validateImage(imageUri);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid image',
          provider,
          performance: {
            duration: Date.now() - startTime,
            inputSize: 0,
            outputSize: 0,
          },
        };
      }

      inputSize = validation.fileSize || 0;

      // Check cache
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey('vision', `${imageUri}:${prompt}`, language);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            provider,
            cached: true,
            performance: {
              duration: Date.now() - startTime,
              inputSize,
              outputSize: cached.length,
            },
          };
        }
      }

      let result: string;

      if (provider === 'openai') {
        result = await OpenAIService.analyzeImageWithGPTVision(imageUri, prompt, language);
      } else {
        result = await GoogleVisionService.analyzeWorkPlan(imageUri, prompt, language);
      }

      // Cache successful results
      if (this.config.enableCaching && result && !result.includes('Error')) {
        const cacheKey = this.generateCacheKey('vision', `${imageUri}:${prompt}`, language);
        this.setInCache(cacheKey, result, this.CACHE_TTL * 2); // Longer cache for vision
      }

      const endTime = Date.now();
      return {
        success: true,
        data: result,
        provider,
        performance: {
          duration: endTime - startTime,
          inputSize,
          outputSize: result.length,
        },
      };

    } catch (error) {
      const processedError = AIErrorHandler.processError(error, provider, language);
      
      return {
        success: false,
        error: processedError.userMessage,
        provider,
        performance: {
          duration: Date.now() - startTime,
          inputSize,
          outputSize: 0,
        },
      };
    }
  }

  /**
   * Process PDF document
   */
  static async processPDF(
    pdfUri: string,
    prompt: string,
    fileName: string,
    language: SupportedLanguage = 'en'
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const provider = await this.selectOptimalProvider('document');

    try {
      let result: string;

      if (provider === 'openai') {
        // OpenAI doesn't support PDF directly
        result = `OpenAI no puede procesar PDFs directamente. Por favor, convierte "${fileName}" a imagen y envíala.`;
      } else {
        result = await GoogleVisionService.analyzePDFDocument(pdfUri, fileName, prompt, language);
      }

      const endTime = Date.now();
      return {
        success: true,
        data: result,
        provider,
        performance: {
          duration: endTime - startTime,
          inputSize: 0, // PDF size would need to be calculated
          outputSize: result.length,
        },
      };

    } catch (error) {
      const processedError = AIErrorHandler.processError(error, provider, language);
      
      return {
        success: false,
        error: processedError.userMessage,
        provider,
        performance: {
          duration: Date.now() - startTime,
          inputSize: 0,
          outputSize: 0,
        },
      };
    }
  }

  /**
   * Get service health and recommendations
   */
  static async getServiceHealth(): Promise<{
    overallHealth: 'excellent' | 'good' | 'degraded' | 'poor';
    providers: Record<string, { available: boolean; latency: number; reliability: number }>;
    recommendations: string[];
    costEfficiency: { totalSpent: number; averageCost: number; trend: 'increasing' | 'stable' | 'decreasing' };
  }> {
    const insights = await AIAnalyticsService.getPerformanceInsights();
    const stats = await AIAnalyticsService.getUsageStats();

    // Calculate provider health
    const providers: Record<string, { available: boolean; latency: number; reliability: number }> = {
      openai: { available: true, latency: 0, reliability: 0 },
      google: { available: true, latency: 0, reliability: 0 },
    };

    // Generate recommendations based on analytics
    const recommendations: string[] = [];
    
    if (insights.costEfficiencyReport.totalSpent > 10) {
      recommendations.push('Consider using image optimization to reduce API costs');
    }
    
    if (stats.averageResponseTime > 5000) {
      recommendations.push('Response times are high. Consider switching providers or optimizing requests');
    }

    if (insights.errorAnalysis.length > 0) {
      recommendations.push(`Address frequent ${insights.errorAnalysis[0].errorCode} errors`);
    }

    // Determine overall health
    const successRate = stats.successfulRequests / Math.max(stats.totalRequests, 1);
    let overallHealth: 'excellent' | 'good' | 'degraded' | 'poor' = 'excellent';
    
    if (successRate < 0.5) overallHealth = 'poor';
    else if (successRate < 0.7) overallHealth = 'degraded';
    else if (successRate < 0.9) overallHealth = 'good';

    return {
      overallHealth,
      providers,
      recommendations,
      costEfficiency: {
        totalSpent: insights.costEfficiencyReport.totalSpent,
        averageCost: insights.costEfficiencyReport.averageCostPerRequest,
        trend: 'stable', // Would need historical data to determine trend
      },
    };
  }

  /**
   * Update service configuration
   */
  static updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 [AI-SERVICE] Configuration updated:', this.config);
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 [AI-SERVICE] Cache cleared');
  }

  /**
   * Get current configuration
   */
  static getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  // Private helper methods

  private static async selectOptimalProvider(operation: 'chat' | 'vision' | 'document'): Promise<'openai' | 'google'> {
    if (this.config.provider === 'openai') return 'openai';
    if (this.config.provider === 'google') return 'google';

    // Intelligent provider selection based on operation type and analytics
    const insights = await AIAnalyticsService.getPerformanceInsights();
    
    // For document processing, prefer Google (supports PDF)
    if (operation === 'document') return 'google';
    
    // For other operations, use the most reliable provider
    return insights.mostReliableProvider as 'openai' | 'google' || 'google';
  }

  private static generateCacheKey(operation: string, input: string, language: string): string {
    const hash = this.simpleHash(input);
    return `${operation}:${language}:${hash}`;
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private static getFromCache(key: string): string | null {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('💾 [CACHE] Cache hit for key:', key);
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    
    return null;
  }

  private static setInCache(key: string, data: string, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    
    console.log('💾 [CACHE] Cached result for key:', key);
    
    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private static cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key);
      }
    }
    console.log('🧹 [CACHE] Cleanup completed, cache size:', this.cache.size);
  }
}
