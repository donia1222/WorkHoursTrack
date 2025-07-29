import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImagePreviewProps {
  image: { uri: string };
  onRemove: () => void;
}

export default function ImagePreview({ image, onRemove }: ImagePreviewProps) {
  return (
    <View style={styles.container}>
      <Image source={image} style={styles.image} />
      <TouchableOpacity 
        style={styles.removeButton} 
        onPress={onRemove}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  image: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});