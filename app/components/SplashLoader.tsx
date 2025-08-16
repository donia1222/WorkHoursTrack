import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface SplashLoaderProps {
  isExiting?: boolean;
}

export default function SplashLoader({ isExiting = false }: SplashLoaderProps) {
  const { colors, isDark } = useTheme();
  
  // Animations
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const dotScale1 = useSharedValue(1);
  const dotScale2 = useSharedValue(1);
  const dotScale3 = useSharedValue(1);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0.3);
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  useEffect(() => {
    if (isExiting) {
      // Exit animation
      containerOpacity.value = withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.ease) 
      });
      containerScale.value = withTiming(0.95, { 
        duration: 400, 
        easing: Easing.out(Easing.ease) 
      });
      return;
    }

    // Main icon animation
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );
    
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Ring pulse animation
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 1000, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );

    // Dots animation
    dotScale1.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 400 }),
        withTiming(1, { duration: 400 })
      ),
      -1,
      true
    );

    setTimeout(() => {
      dotScale2.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      );
    }, 150);

    setTimeout(() => {
      dotScale3.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      );
    }, 300);
  }, [isExiting]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale3.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  return (
    <Animated.View style={[styles.fullScreen, containerAnimatedStyle]}>
    <LinearGradient
      colors={isDark 
        ? ['#000000', '#0a0a0a', '#1a1a1a']
        : ['#ffffff', '#f8f9fa', '#e9ecef']
      }
      style={styles.container}
    >
      <BlurView 
        intensity={isDark ? 60 : 40} 
        tint={isDark ? "dark" : "light"} 
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Animated ring */}
      <Animated.View style={[styles.ring, animatedRingStyle]}>
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ringGradient}
        />
      </Animated.View>

      {/* Main icon container */}
      <View style={styles.iconContainer}>
        <Animated.View style={animatedIconStyle}>
          <View style={styles.iconBackground}>
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <IconSymbol size={40} name="clock.fill" color="#FFFFFF" />
            </LinearGradient>
          </View>
        </Animated.View>
      </View>

      {/* App name with gradient text effect */}
      <Animated.View entering={FadeIn.delay(300).duration(600)}>
        <View style={styles.textContainer}>
          <Text style={styles.workText}>
            <Text style={{ color: '#007AFF', fontWeight: '800' }}>Vix</Text>
            <Text style={{ color: '#5856D6', fontWeight: '700' }}>Time</Text>
            <Text style={{ color: '#34C759', fontWeight: '800' }}>App</Text>
          </Text>
          <Text style={[styles.tagline, { color: isDark ? '#999' : '#666' }]}>
            Time Management Simplified
          </Text>
        </View>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, dot1Style, { backgroundColor: '#007AFF' }]} />
        <Animated.View style={[styles.dot, dot2Style, { backgroundColor: '#5856D6' }]} />
        <Animated.View style={[styles.dot, dot3Style, { backgroundColor: '#34C759' }]} />
      </View>

      {/* Bottom wave decoration */}
      <View style={styles.bottomDecoration}>
        <LinearGradient
          colors={isDark 
            ? ['transparent', 'rgba(0, 122, 255, 0.1)']
            : ['transparent', 'rgba(0, 122, 255, 0.05)']
          }
          style={styles.wave}
        />
      </View>
    </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    borderWidth: 3,
    borderColor: 'transparent',
    opacity: 0.3,
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  workText: {
    fontSize: 42,
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 50,
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.3,
  },
  wave: {
    flex: 1,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
});