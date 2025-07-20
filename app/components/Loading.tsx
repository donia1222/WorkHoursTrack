import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

type Props = {
  message?: string;
};

export default function Loading({ message = 'Cargando...' }: Props) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>{message}</Text>
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
