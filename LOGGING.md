# Sistema de Logging Inteligente

Para reducir el spam de logs y mejorar la experiencia de debugging, hemos implementado un sistema de logging categorizado y inteligente.

## Problema Solucionado

Antes teníamos logs muy repetitivos como:
- `🕐 Loading time format preference: null` (cada segundo)
- `🔍 Screen detection: {...}` (constantemente)
- `🔧 MiniMapWidget props: {...}` (cada render)

Esto hacía difícil encontrar logs importantes entre tanto ruido.

## Solución

### 1. LogManager (`app/utils/LogManager.ts`)

Sistema inteligente que:
- **Agrupa logs similares** y evita repeticiones excesivas
- **Throttle automático** después de N repeticiones
- **Resumen de logs suprimidos** cada cierto tiempo
- **Limpieza automática** de caches viejos

```typescript
import { logger, smartLog, throttledLog } from '../utils/LogManager';

// Log normal con detección inteligente de spam
smartLog('Este mensaje se puede repetir');

// Log con throttle manual (máximo cada 5 segundos)
throttledLog('Mensaje frecuente', 5000, data);

// Log importante que nunca se suprime
logger.important('Mensaje crítico');
```

### 2. Logging Categorizado (`app/config/logging.ts`)

Sistema de categorías que permite habilitar/deshabilitar logs por tipo:

```typescript
export const LogConfig = {
  TIME_FORMAT: false,        // 🕐 Deshabilitado - muy frecuente
  SCREEN_DETECTION: false,   // 🔍 Deshabilitado - muy frecuente
  MINI_MAP_WIDGET: false,    // 🔧 Deshabilitado - muy frecuente
  AUTO_TIMER: true,          // ⏱️ Habilitado - importante para debug
  SERVICES: true,            // 🔧 Habilitado - importante
  ERRORS: true,              // ❌ Siempre habilitado
};
```

### 3. Helpers Específicos

```typescript
import { logTimeFormat, logAutoTimer, logError } from '../config/logging';

// Solo se muestra si TIME_FORMAT está habilitado
logTimeFormat('Loading preference:', value);

// Solo se muestra si AUTO_TIMER está habilitado  
logAutoTimer('Timer started:', data);

// Siempre se muestra (ERRORS: true)
logError('Critical error:', error);
```

## Uso Recomendado

### Para Logs Muy Frecuentes
```typescript
// ❌ Antes: spam constante
console.log('🕐 Loading time format preference:', saved);

// ✅ Ahora: categorizado y deshabilitado por defecto
logTimeFormat('Loading time format preference:', saved);
```

### Para Logs Importantes pero Repetitivos
```typescript
// ❌ Antes: repetitivo pero importante
console.log('⏱️ AutoTimer state changed:', state);

// ✅ Ahora: inteligente con throttle automático
smartLog('⏱️ AutoTimer state changed:', state);
```

### Para Logs Críticos
```typescript
// ✅ Para errores o logs importantes que nunca se deben suprimir
logError('Critical error occurred:', error);
logger.important('App initialization complete');
```

## Configuración

Puedes ajustar qué logs ver editando `app/config/logging.ts`:

```typescript
export const LogConfig = {
  // Cambiar a true para ver logs de tiempo
  TIME_FORMAT: true,
  
  // Cambiar a true para debugging de pantalla
  SCREEN_DETECTION: true,
  
  // Etc.
};
```

## Beneficios

1. **Menos Ruido**: Logs frecuentes pero no críticos están deshabilitados por defecto
2. **Debugging Fácil**: Se pueden habilitar categorías específicas cuando se necesiten
3. **Rendimiento**: Menos `console.log` = mejor rendimiento en debug mode
4. **Organización**: Logs categorizados con prefijos consistentes
5. **Inteligencia**: El sistema aprende patrones de spam y los reduce automáticamente

## Migración de Logs Existentes

Cuando encuentres logs muy repetitivos:

1. Identifica la categoría (TIME_FORMAT, SCREEN_DETECTION, etc.)
2. Reemplaza `console.log` con el helper apropiado
3. Si no hay categoría, usa `smartLog` para detección automática de spam

Ejemplo:
```typescript
// ❌ Antes
console.log('🔍 Screen detection:', data);

// ✅ Después  
logScreenDetection('Screen detection:', data);
```