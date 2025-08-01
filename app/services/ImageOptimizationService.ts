import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  compressionTarget: 'size' | 'quality' | 'balanced';
}

export interface OptimizedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
  fileSize: number;
  compressionRatio: number;
}

/**
 * Mobile-optimized image processing service for AI analysis
 * Reduces API costs and improves performance
 */
export class ImageOptimizationService {
  // Preset configurations for different use cases
  static readonly PRESETS = {
    AI_ANALYSIS: {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      format: 'jpeg' as const,
      compressionTarget: 'balanced' as const,
    },
    DOCUMENT_SCAN: {
      maxWidth: 1200,
      maxHeight: 1600,
      quality: 0.9,
      format: 'jpeg' as const,
      compressionTarget: 'quality' as const,
    },
    QUICK_PREVIEW: {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.6,
      format: 'jpeg' as const,
      compressionTarget: 'size' as const,
    },
  };

  /**
   * Optimize image for AI processing with automatic configuration selection
   */
  static async optimizeForAI(
    imageUri: string,
    analysisType: 'general' | 'document' | 'schedule' = 'general'
  ): Promise<OptimizedImage> {
    const config = analysisType === 'document' 
      ? this.PRESETS.DOCUMENT_SCAN 
      : this.PRESETS.AI_ANALYSIS;

    return this.optimizeImage(imageUri, config);
  }

  /**
   * Optimize image with custom configuration
   */
  static async optimizeImage(
    imageUri: string,
    config: ImageOptimizationConfig
  ): Promise<OptimizedImage> {
    try {
      console.log('🖼️ [IMG-OPT] Starting image optimization...');
      console.log('📊 [IMG-OPT] Config:', config);

      // Get original image info
      const originalInfo = await FileSystem.getInfoAsync(imageUri);
      const originalSize = originalInfo.exists ? originalInfo.size || 0 : 0;

      console.log('📏 [IMG-OPT] Original size:', originalSize, 'bytes');

      // Prepare manipulation actions
      const actions: ImageManipulator.Action[] = [];

      // Resize if needed
      actions.push({
        resize: {
          width: config.maxWidth,
          height: config.maxHeight,
        },
      });

      // Apply optimization based on target
      if (config.compressionTarget === 'size') {
        // Prioritize smaller file size
        actions.push({
          compress: Math.max(0.3, config.quality - 0.2),
        });
      } else if (config.compressionTarget === 'quality') {
        // Prioritize image quality for text recognition
        actions.push({
          compress: Math.min(1.0, config.quality + 0.1),
        });
      }

      // Process the image
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: config.quality,
          format: config.format === 'jpeg' 
            ? ImageManipulator.SaveFormat.JPEG 
            : ImageManipulator.SaveFormat.PNG,
          base64: true,
        }
      );

      // Get optimized file info
      const optimizedInfo = await FileSystem.getInfoAsync(result.uri);
      const optimizedSize = optimizedInfo.exists ? optimizedInfo.size || 0 : 0;
      const compressionRatio = originalSize > 0 ? optimizedSize / originalSize : 1;

      console.log('✅ [IMG-OPT] Optimization complete');
      console.log('📊 [IMG-OPT] Results:', {
        originalSize,
        optimizedSize,
        compressionRatio: Math.round(compressionRatio * 100) + '%',
        dimensions: `${result.width}x${result.height}`,
      });

      return {
        uri: result.uri,
        base64: result.base64!,
        width: result.width,
        height: result.height,
        fileSize: optimizedSize,
        compressionRatio,
      };

    } catch (error) {
      console.error('❌ [IMG-OPT] Optimization failed:', error);
      
      // Fallback: return original image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return {
        uri: imageUri,
        base64,
        width: 0,
        height: 0,
        fileSize: 0,
        compressionRatio: 1,
      };
    }
  }

  /**
   * Validate image before processing
   */
  static async validateImage(imageUri: string): Promise<{
    valid: boolean;
    error?: string;
    fileSize?: number;
    dimensions?: { width: number; height: number };
  }> {
    try {
      const info = await FileSystem.getInfoAsync(imageUri);
      
      if (!info.exists) {
        return { valid: false, error: 'File does not exist' };
      }

      const fileSize = info.size || 0;
      const maxSize = 10 * 1024 * 1024; // 10MB limit

      if (fileSize > maxSize) {
        return { 
          valid: false, 
          error: `File too large: ${Math.round(fileSize / 1024 / 1024)}MB (max: 10MB)`,
          fileSize 
        };
      }

      // Additional validation could be added here
      // (e.g., checking image dimensions, format, etc.)

      return { valid: true, fileSize };

    } catch (error) {
      return { 
        valid: false, 
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Estimate API cost based on image size and provider
   */
  static estimateAPIPrice(
    imageSize: number,
    provider: 'openai' | 'google' = 'openai'
  ): { tokensEstimate: number; costEstimate: number; currency: string } {
    // Rough estimates for pricing calculation
    const pricing = {
      openai: {
        baseTokens: 765, // Base tokens for GPT-4o vision
        tokensPerPixel: 0.00017, // Approximate tokens per pixel
        costPer1kTokens: 0.005, // $0.005 per 1k tokens for GPT-4o
      },
      google: {
        baseTokens: 300, // Base tokens for Gemini Pro Vision
        tokensPerPixel: 0.00012,
        costPer1kTokens: 0.00025, // Lower cost for Gemini
      },
    };

    const config = pricing[provider];
    
    // Estimate pixels from file size (rough approximation)
    const estimatedPixels = imageSize * 8; // Very rough estimate
    const tokenEstimate = config.baseTokens + (estimatedPixels * config.tokensPerPixel);
    const costEstimate = (tokenEstimate / 1000) * config.costPer1kTokens;

    return {
      tokensEstimate: Math.round(tokenEstimate),
      costEstimate: Math.round(costEstimate * 10000) / 10000, // Round to 4 decimal places
      currency: 'USD',
    };
  }
}