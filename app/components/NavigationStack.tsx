import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Easing,
} from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH; // Más fácil completar el swipe
const SWIPE_VELOCITY_THRESHOLD = 0.2; // Más sensible a la velocidad

interface NavigationStackProps {
  children: (screen: string) => React.ReactNode;
}

export default function NavigationStack({ children }: NavigationStackProps) {
  const { currentScreen, navigationHistory, canGoBack, navigateBack } = useNavigation();
  const { colors } = useTheme();
  
  const [screenStack, setScreenStack] = useState<string[]>([currentScreen]);
  const translateX = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Crear un PanResponder para el gesto de swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Solo activar si el swipe es desde el borde izquierdo y es horizontal
        const { dx, dy, x0 } = gestureState;
        const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy) * 1.5;
        const isFromLeftEdge = x0 < 80; // 80px desde el borde izquierdo (área más grande)
        return canGoBack() && isHorizontalSwipe && isFromLeftEdge && dx > 8;
      },
      onPanResponderGrant: () => {
        // Mostrar overlay cuando empieza el gesto
        Animated.timing(overlayOpacity, {
          toValue: 0.2,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        // Mover la pantalla con el dedo
        const { dx } = gestureState;
        if (dx > 0) {
          translateX.setValue(dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        
        // Decidir si completar el swipe o volver
        if (dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD) {
          // Completar el swipe - navegar hacia atrás
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.out(Easing.quad),
            }),
          ]).start(() => {
            navigateBack();
            translateX.setValue(0);
          });
        } else {
          // Cancelar el swipe - volver a la posición original
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
              easing: Easing.out(Easing.back(1.2)),
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
              easing: Easing.out(Easing.quad),
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Estado para controlar si estamos navegando hacia atrás
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // Actualizar el stack cuando cambia la pantalla
  useEffect(() => {
    const currentStackTop = screenStack[screenStack.length - 1];
    
    if (currentScreen !== currentStackTop && !isNavigatingBack) {
      // Nueva pantalla - navegando hacia adelante
      translateX.setValue(SCREEN_WIDTH);
      setScreenStack(prev => [...prev, currentScreen]);
      
      Animated.timing(translateX, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)), // Misma curva suave
      }).start();
    } else if (isNavigatingBack) {
      // Resetear flag
      setIsNavigatingBack(false);
    }
  }, [currentScreen, isNavigatingBack]);

  // Detectar navegación hacia atrás
  useEffect(() => {
    if (navigationHistory.length < screenStack.length - 1) {
      setIsNavigatingBack(true);
      
      // Animar la transición hacia atrás con animación suave
      translateX.setValue(0);
      Animated.timing(translateX, {
        toValue: SCREEN_WIDTH,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)),
      }).start(() => {
        setScreenStack(prev => prev.slice(0, navigationHistory.length + 1));
        translateX.setValue(0);
      });
    }
  }, [navigationHistory.length]);

  const currentScreenElement = children(currentScreen);
  const previousScreen = screenStack.length > 1 ? screenStack[screenStack.length - 2] : null;
  const previousScreenElement = previousScreen ? children(previousScreen) : null;

  return (
    <View style={styles.container}>
      {/* Pantalla anterior (debajo) */}
      {previousScreenElement && (
        <View style={[styles.screen, styles.previousScreen]}>
          {previousScreenElement}
          <Animated.View 
            style={[
              styles.overlay,
              { 
                opacity: overlayOpacity,
                backgroundColor: colors.background 
              }
            ]} 
          />
        </View>
      )}
      
      {/* Pantalla actual con animación y gesto */}
      <Animated.View
        style={[
          styles.screen,
          styles.currentScreen,
          {
            transform: [{ translateX }],
            // Sombra para iOS
            shadowColor: '#000',
            shadowOffset: {
              width: -2,
              height: 0,
            },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            // Sombra para Android
            elevation: 10,
          }
        ]}
        {...(Platform.OS === 'ios' ? panResponder.panHandlers : {})}
      >
        {currentScreenElement}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previousScreen: {
    zIndex: 1,
  },
  currentScreen: {
    zIndex: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});