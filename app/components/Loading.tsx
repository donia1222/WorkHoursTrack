import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  message?: string;
  showMessage?: boolean;
};

export default function Loading({ message = 'Cargando...', showMessage = true }: Props) {
  const { colors } = useTheme();
  
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {showMessage && message && (
        <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
  },
});
