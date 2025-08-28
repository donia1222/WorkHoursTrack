# Guía de Internacionalización - VixTime

Esta guía explica cómo traducir textos en la aplicación VixTime para soportar múltiples idiomas.

## 📋 Resumen

VixTime soporta **10 idiomas**:
- 🇪🇸 **Español** (es.json) - Idioma base
- 🇺🇸 **Inglés** (en.json)
- 🇩🇪 **Alemán** (de.json) 
- 🇫🇷 **Francés** (fr.json)
- 🇮🇹 **Italiano** (it.json)
- 🇯🇵 **Japonés** (ja.json)
- 🇳🇱 **Holandés** (nl.json)
- 🇵🇹 **Portugués** (pt.json)
- 🇷🇺 **Ruso** (ru.json)
- 🇹🇷 **Turco** (tr.json)

## 🛠️ Cómo Internacionalizar un Texto

### 1. Importar el Hook de Idioma

En cualquier componente de React, importa el hook `useLanguage`:

```typescript
import { useLanguage } from '../contexts/LanguageContext';
```

### 2. Usar el Hook en el Componente

Dentro del componente, usa el hook para obtener la función de traducción:

```typescript
export default function MiComponente() {
  const { t } = useLanguage(); // 't' es la función de traducción
  
  return (
    <View>
      {/* ❌ ANTES: Texto hard-coded */}
      <Text>Configuración</Text>
      
      {/* ✅ DESPUÉS: Texto traducido */}
      <Text>{t('settings.title')}</Text>
    </View>
  );
}
```

### 3. Agregar las Claves de Traducción

Para cada texto que quieras traducir, debes agregar las claves correspondientes en **todos los 10 archivos** de idiomas:

#### Ubicación de los archivos:
```
app/locales/
├── es.json    # Español
├── en.json    # Inglés  
├── de.json    # Alemán
├── fr.json    # Francés
├── it.json    # Italiano
├── ja.json    # Japonés
├── nl.json    # Holandés
├── pt.json    # Portugués
├── ru.json    # Ruso
└── tr.json    # Turco
```

#### Estructura de claves:

Las claves usan notación de puntos para organizar jerárquicamente:

```json
{
  "settings": {
    "title": "Configuración",
    "jobs": {
      "title": "Mis Trabajos",
      "description": "Gestiona tus trabajos y proyectos"
    }
  }
}
```

## 📝 Ejemplo Completo

### Paso 1: Identificar el texto a traducir

```typescript
// ❌ Texto hard-coded en DebugScreen.tsx
<Text style={styles.headerTitle}>Debug AutoTimer</Text>
<Text style={styles.statusLabel}>Estado Actual</Text>
```

### Paso 2: Importar useLanguage

```typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function DebugScreen({ onBack }: { onBack?: () => void }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage(); // ✅ Agregar esta línea
```

### Paso 3: Reemplazar textos hard-coded

```typescript
// ✅ Textos traducidos
<Text style={styles.headerTitle}>{t('debug.title')}</Text>
<Text style={styles.statusLabel}>{t('debug.current_status')}</Text>
```

### Paso 4: Agregar traducciones en todos los idiomas

Debes agregar las claves en **todos los 10 archivos** de idiomas:

#### app/locales/es.json
```json
{
  "debug": {
    "title": "Debug AutoTimer",
    "current_status": "Estado Actual"
  }
}
```

#### app/locales/en.json
```json
{
  "debug": {
    "title": "Debug AutoTimer", 
    "current_status": "Current Status"
  }
}
```

#### Y así para todos los idiomas:
- **de.json** (Alemán): "Aktueller Status"
- **fr.json** (Francés): "État actuel" 
- **it.json** (Italiano): "Stato attuale"
- **ja.json** (Japonés): "現在の状態"
- **nl.json** (Holandés): "Huidige Status"
- **pt.json** (Portugués): "Estado Atual"
- **ru.json** (Ruso): "Текущее состояние"
- **tr.json** (Turco): "Mevcut Durum"

## 🔧 Casos Especiales

### 1. Textos con Variables

Puedes usar interpolación de variables:

```typescript
// En el componente
<Text>{t('timer.session_saved', { hours: '2.5' })}</Text>

// En los archivos JSON
"session_saved": "Sesión guardada: {{hours}} horas"
```

### 2. Textos en Alerts

```typescript
// ❌ ANTES
Alert.alert('Error', 'No se pudo guardar');

// ✅ DESPUÉS  
Alert.alert(t('common.error'), t('save_error_message'));
```

### 3. Arrays de Textos

```typescript
// En JSON
"days": ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

// En componente
const dayNames = t('calendar.days');
<Text>{dayNames[0]}</Text> // "Dom"
```

## 📂 Organización de Claves

### Estructura Recomendada

```json
{
  "common": {
    "cancel": "Cancelar",
    "save": "Guardar", 
    "error": "Error"
  },
  "screens": {
    "timer": {
      "title": "Timer",
      "start": "Iniciar"
    },
    "settings": {
      "title": "Configuración"
    }
  },
  "components": {
    "modal": {
      "close": "Cerrar"
    }
  }
}
```

### Convenciones de Nombres

- **snake_case** para las claves: `current_status`, `save_error`
- **Agrupación lógica** por pantalla o componente
- **Claves comunes** en `common` para reutilizar

## ✅ Checklist para Internacionalizar

Cuando agregues una nueva funcionalidad:

- [ ] Importar `useLanguage` en el componente
- [ ] Obtener función `t` del hook  
- [ ] Reemplazar todos los textos hard-coded con `t('clave')`
- [ ] Agregar las claves en **los 10 archivos** de idioma:
  - [ ] es.json (Español)
  - [ ] en.json (Inglés)
  - [ ] de.json (Alemán) 
  - [ ] fr.json (Francés)
  - [ ] it.json (Italiano)
  - [ ] ja.json (Japonés)
  - [ ] nl.json (Holandés)
  - [ ] pt.json (Portugués)
  - [ ] ru.json (Ruso)
  - [ ] tr.json (Turco)
- [ ] Probar que funciona cambiando idioma en la app

## 🚫 Errores Comunes

### 1. No agregar en todos los idiomas
```typescript
// ❌ Error: Solo agregaste en es.json
{t('nueva_clave')} // Error en otros idiomas
```

### 2. Claves incorrectas
```typescript
// ❌ Error: Clave no existe
{t('configuracion')} // Debería ser t('settings.title')
```

### 3. Olvidar importar useLanguage
```typescript
// ❌ Error: t no está definido
{t('settings.title')} // Error: t is not defined
```

## 🔍 Cómo Encontrar Textos Sin Traducir

1. **Buscar textos hard-coded:**
```bash
grep -r "Text.*>" app/screens/
grep -r "Alert.alert" app/
```

2. **Buscar strings en español:**
```bash
grep -r "configuraci" app/
grep -r "Error" app/
```

## 📱 Testear Traducciones

1. Abrir la app
2. Ir a **Configuración > Preferencias > Idioma** 
3. Cambiar entre idiomas
4. Verificar que todos los textos cambian correctamente

## 🌐 Idiomas Soportados

| Idioma | Código | Archivo | Status |
|--------|--------|---------|---------|
| 🇪🇸 Español | es | es.json | ✅ Base |
| 🇺🇸 English | en | en.json | ✅ Completo |
| 🇩🇪 Deutsch | de | de.json | ✅ Completo |
| 🇫🇷 Français | fr | fr.json | ✅ Completo |
| 🇮🇹 Italiano | it | it.json | ✅ Completo |
| 🇯🇵 日本語 | ja | ja.json | ✅ Completo |
| 🇳🇱 Nederlands | nl | nl.json | ✅ Completo |
| 🇵🇹 Português | pt | pt.json | ✅ Completo |
| 🇷🇺 Русский | ru | ru.json | ✅ Completo |
| 🇹🇷 Türkçe | tr | tr.json | ✅ Completo |

---

## 💡 Tips Adicionales

- **Contexto importa**: "Save" puede ser "Guardar" o "Ahorrar" según el contexto
- **Longitud de texto**: Ten en cuenta que algunos idiomas son más largos (alemán) o cortos (inglés)
- **Pluralización**: Algunos textos cambian en plural, considera usar variables
- **Mayúsculas**: Mantén la consistencia en el uso de mayúsculas por idioma

¡Con esta guía ya puedes internacionalizar cualquier texto en VixTime! 🚀