import { SupportedLanguage } from '../contexts/LanguageContext';

export interface AIProxyConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * Secure AI Proxy Service for production environments
 * Routes AI requests through your backend to hide API keys
 */
export class AIProxyService {
  private static readonly config: AIProxyConfig = {
    baseUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL || 'https://your-backend.com/api/ai',
    timeout: 30000,
    retryAttempts: 3,
  };

  /**
   * Send a text message to AI with automatic retry logic
   */
  static async sendMessage(
    message: string,
    language: SupportedLanguage = 'en',
    conversationId?: string
  ): Promise<{ response: string; conversationId: string }> {
    const endpoint = `${this.config.baseUrl}/chat`;
    
    const requestBody = {
      message,
      language,
      conversationId,
      timestamp: new Date().toISOString(),
    };

    return this.makeRequest(endpoint, requestBody);
  }

  /**
   * Analyze image with retry and error handling
   */
  static async analyzeImage(
    imageBase64: string,
    prompt: string,
    language: SupportedLanguage = 'en',
    analysisType: 'general' | 'schedule' | 'document' = 'general'
  ): Promise<{ response: string; analysisId: string }> {
    const endpoint = `${this.config.baseUrl}/analyze-image`;
    
    const requestBody = {
      image: imageBase64,
      prompt,
      language,
      analysisType,
      timestamp: new Date().toISOString(),
    };

    return this.makeRequest(endpoint, requestBody);
  }

  /**
   * Process PDF document through backend
   */
  static async processPDF(
    pdfBase64: string,
    prompt: string,
    language: SupportedLanguage = 'en'
  ): Promise<{ response: string; documentId: string }> {
    const endpoint = `${this.config.baseUrl}/process-pdf`;
    
    const requestBody = {
      document: pdfBase64,
      prompt,
      language,
      timestamp: new Date().toISOString(),
    };

    return this.makeRequest(endpoint, requestBody);
  }

  /**
   * Generic request handler with retry logic and error handling
   */
  private static async makeRequest(
    endpoint: string,
    body: any,
    attempt: number = 1
  ): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GeolocalizacionApp/1.0.0',
          // Add authorization header if using API keys for your backend
          // 'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;

    } catch (error) {
      console.error(`AI Proxy Error (attempt ${attempt}):`, error);

      // Retry logic for network errors
      if (attempt < this.config.retryAttempts) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(endpoint, body, attempt + 1);
      }

      // Transform errors for user-friendly messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        if (error.message.includes('Network')) {
          throw new Error('Network error. Please check your connection.');
        }
      }

      throw error;
    }
  }

  /**
   * Get service health status
   */
  static async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    latency: number;
    services: Record<string, boolean>;
  }> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.config.baseUrl}/health`);
      const latency = Date.now() - startTime;
      
      const data = await response.json();
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latency,
        services: data.services || {},
      };
    } catch (error) {
      return {
        status: 'down',
        latency: -1,
        services: {},
      };
    }
  }
}