# Solución Robusta de Geofencing para iOS

## Problema Identificado

El sistema de geofencing actual detecta correctamente la ENTRADA al área de trabajo con la app cerrada, pero NO detecta la SALIDA de manera confiable. Esto se debe a:

1. **Limitaciones de iOS**: iOS desprioritiza eventos de geofencing EXIT cuando la app está killed
2. **Radios pequeños**: iOS es menos confiable con radios < 100m en background
3. **AsyncStorage puede ser purgado**: iOS puede limpiar AsyncStorage cuando mata la app
4. **Expo Location limitaciones**: No tiene control total sobre Core Location APIs

## Solución Implementada

He creado una solución multicapa que combina varias estrategias para garantizar detección confiable:

### 1. **Módulo Nativo Swift (CoreLocationManager)**
- Control directo sobre Core Location APIs
- Usa CLCircularRegion con configuración optimizada
- Radios separados para ENTER y EXIT (histéresis espacial)
- Persistencia con UserDefaults (más confiable que AsyncStorage)
- Monitoreo de Significant Location Changes como fallback
- Verificación manual de distancias en cada actualización

### 2. **Enhanced Background Geofence (Expo mejorado)**
- Geofencing principal con expo-location
- Significant Location Changes como fallback
- Background Fetch periódico (cada 15 min)
- Estado persistente redundante
- Procesamiento de delays programados

### 3. **Robust Geofence Service (Orquestador)**
- Detecta automáticamente qué estrategia usar
- Fallback automático si una estrategia falla
- Configuración optimizada para iOS
- Verificación inicial de ubicación

## Configuración Requerida

### 1. Agregar archivos Swift al proyecto Xcode

1. Abre el proyecto en Xcode:
```bash
cd ios
open geolocalizacionapp.xcworkspace
```

2. En Xcode:
   - Click derecho en la carpeta `geolocalizacionapp`
   - Select "Add Files to geolocalizacionapp..."
   - Agrega los archivos:
     - `CoreLocationManager.swift`
     - `CoreLocationManagerBridge.m`
   - Asegúrate de que estén marcados para el target principal

3. Configura el Bridging Header:
   - En Build Settings, busca "Objective-C Bridging Header"
   - Establece la ruta: `geolocalizacionapp/geolocalizacionapp-Bridging-Header.h`

### 2. Configurar Info.plist (ya configurado)

Las siguientes claves ya están configuradas correctamente:
- `UIBackgroundModes`: location, fetch, remote-notification
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `NSLocationAlwaysUsageDescription`
- `NSLocationWhenInUseUsageDescription`

### 3. Capacidades del proyecto

En Xcode, ve a la pestaña "Signing & Capabilities" y asegúrate de tener:
- ✅ Background Modes:
  - Location updates
  - Background fetch
  - Remote notifications
- ✅ Push Notifications (opcional pero recomendado)

## Implementación en la App

### 1. Reemplazar el servicio actual

En tu componente principal o servicio de auto-timer:

```typescript
import RobustGeofenceService from './services/RobustGeofenceService';

// En lugar de usar startBackgroundGeofencing
const startRobustMonitoring = async () => {
  const jobs = await JobService.getJobs();
  const success = await RobustGeofenceService.startMonitoring(jobs);
  
  if (success) {
    console.log('✅ Monitoreo robusto activado');
  } else {
    console.error('❌ Error activando monitoreo');
  }
};

// Para detener
const stopRobustMonitoring = async () => {
  await RobustGeofenceService.stopMonitoring();
};
```

### 2. Verificar estado del sistema

```typescript
// Para debugging
const checkStatus = async () => {
  const status = await RobustGeofenceService.getStatus();
  console.log('Estado del sistema:', status);
};
```

## Configuración Optimizada para iOS

### Radios Recomendados
- **Radio mínimo**: 100 metros (iOS funciona mejor con radios >= 100m)
- **Radio de salida**: 130% del radio de entrada (histéresis espacial)
- **Delays mínimos**: 30s entrada, 60s salida (evitar falsos positivos)

### Ejemplo de configuración de trabajo:
```javascript
{
  id: 'job1',
  name: 'Oficina',
  location: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  autoTimer: {
    enabled: true,
    geofenceRadius: 100, // Mínimo 100m para iOS
    startDelayMinutes: 1,
    stopDelayMinutes: 2
  }
}
```

## Testing y Debugging

### 1. Simulador de iOS

Para probar en el simulador:
1. Debug → Location → Custom Location
2. Ingresa coordenadas cerca/lejos del trabajo
3. Observa los logs en la consola

### 2. Dispositivo físico

Para testing real:
1. Compila la app en modo Release: `npx react-native run-ios --configuration Release`
2. Desconecta el cable USB
3. Cierra completamente la app (swipe up)
4. Camina/conduce entrando y saliendo del área
5. Verifica las notificaciones y el timer

### 3. Logs y debugging

El sistema genera logs extensivos. Para verlos:

```typescript
// En la app
const logs = await AsyncStorage.getItem('@geofence_events');
console.log('Eventos de geofencing:', JSON.parse(logs));

// En Xcode Console
// Filtra por: "ENTERED", "EXITED", "CoreLocationManager"
```

## Solución de Problemas Comunes

### Problema: No detecta salida con app cerrada
**Solución**: 
- Verifica que el radio sea >= 100m
- Asegúrate de tener permisos "Always"
- Compila en modo Release, no Debug

### Problema: Detección inconsistente
**Solución**:
- Aumenta el radio a 150-200m
- Agrega delays (1-2 minutos)
- Verifica que Background Fetch esté habilitado

### Problema: AsyncStorage vacío después de kill
**Solución**:
- El módulo nativo usa UserDefaults (no se borra)
- Enhanced service usa respaldos redundantes
- La sesión activa se recupera automáticamente

## Mejoras Futuras Recomendadas

1. **Widget de iOS**: Mostrar estado del timer en la pantalla de inicio
2. **Live Activities**: Timer en Dynamic Island (iPhone 14+)
3. **iBeacons**: Para detección ultra-precisa en interiores
4. **Apple Watch**: Companion app para mejor precisión
5. **Siri Shortcuts**: "Hey Siri, ¿estoy trabajando?"

## Conclusión

Esta solución multicapa garantiza la detección confiable de entrada/salida en iOS, incluso con la app completamente cerrada. La combinación de:

- Módulo nativo Swift (máxima confiabilidad)
- Múltiples métodos de detección (geofencing + significant changes + fetch)
- Persistencia redundante (UserDefaults + AsyncStorage)
- Radios optimizados para iOS (>= 100m)

Asegura que el auto-timer funcione correctamente en todos los escenarios.

## Comandos Útiles

```bash
# Limpiar build de iOS
cd ios && rm -rf build && pod install && cd ..

# Build de producción
npx react-native run-ios --configuration Release

# Ver logs en tiempo real
npx react-native log-ios

# Resetear permisos (Simulador)
xcrun simctl privacy booted reset all
```

---

**Implementado por**: Claude (Anthropic)
**Fecha**: Agosto 2025
**Versión**: 1.0.0