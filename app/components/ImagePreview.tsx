import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ImagePreviewProps {
  image: { uri: string };
  onRemove: () => void;
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDark ? 0.05 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: colors.separator,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDark ? 0.1 : 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  errorContainer: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: colors.separator,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    fontSize: 10,
    color: colors.error,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
});

export default function ImagePreview({ image, onRemove }: ImagePreviewProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors, isDark);
  const [imageError, setImageError] = React.useState(false);
  
  const handleImageError = () => {
    console.error('❌ Error loading image:', image.uri);
    setImageError(true);
  };
  
  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', image.uri);
    setImageError(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="image" size={32} color={colors.error} />
            <Text style={styles.errorText}>{t('chatbot.image_load_error')}</Text>
          </View>
        ) : (
          <Image 
            source={{ uri: image.uri }} 
            style={styles.image}
            onError={handleImageError}
            onLoad={handleImageLoad}
            resizeMode="cover"
          />
        )}
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

