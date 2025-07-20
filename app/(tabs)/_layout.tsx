import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import SideMenu from '@/app/components/SideMenu';

export default function RootLayout() {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
      
      <SideMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)}
        onMenuToggle={() => setMenuVisible(!menuVisible)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
