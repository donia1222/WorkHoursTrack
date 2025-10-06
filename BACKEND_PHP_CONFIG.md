# Configuración del Backend PHP para el Bot de Reseñas

## Variables de Entorno en el Servidor PHP

Para que el archivo `response.php` use variables de entorno en lugar de API keys hardcodeadas, necesitas crear un archivo `.env` en el servidor donde está alojado el PHP.

### 1. Crear archivo .env en el servidor

Crea un archivo `.env` en el mismo directorio que `response.php`:

```bash
# .env (en el servidor web.lweb.ch)

# API Key de Google Gemini para el bot de reseñas
GOOGLE_GEMINI_API_KEY=tu_api_key_aqui

# API Key de OpenAI (opcional, si usas OpenAI)
OPENAI_API_KEY=tu_openai_key_aqui

# URL base de la API
API_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Configuración de seguridad
ALLOWED_BUNDLE_IDS=com.roberto.worktrack,host.exp.Exponent
```

### 2. Instalar vlucas/phpdotenv

Ejecuta en el servidor:

```bash
composer require vlucas/phpdotenv
```

### 3. Modificar response.php

Añade al inicio de `response.php`:

```php
<?php
require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

// Cargar variables de entorno
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Obtener la API key desde .env
$geminiApiKey = $_ENV['GOOGLE_GEMINI_API_KEY'] ?? null;
$openaiApiKey = $_ENV['OPENAI_API_KEY'] ?? null;
$apiBaseUrl = $_ENV['API_BASE_URL'] ?? 'https://generativelanguage.googleapis.com/v1beta';
$allowedBundleIds = explode(',', $_ENV['ALLOWED_BUNDLE_IDS'] ?? '');

// Validar que existe la API key
if (empty($geminiApiKey)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'API key not configured',
        'message' => 'Please configure GOOGLE_GEMINI_API_KEY in .env file'
    ]);
    exit;
}

// Validar Bundle ID (seguridad)
$requestBundleId = $_SERVER['HTTP_X_BUNDLE_ID'] ?? '';
if (!in_array($requestBundleId, $allowedBundleIds)) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized bundle ID']);
    exit;
}

// Usar $geminiApiKey en lugar de una clave hardcodeada
$url = $apiBaseUrl . "/models/gemini-pro:generateContent?key=" . $geminiApiKey;

// Resto del código de response.php...
?>
```

### 4. Actualizar AIProxyService.ts (ya está configurado)

El archivo ya usa `process.env.EXPO_PUBLIC_AI_PROXY_URL`, pero asegúrate de añadir el header con el Bundle ID:

```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'WorkTrack/1.0.0',
    'X-Bundle-ID': process.env.EXPO_PUBLIC_BUNDLE_ID || 'com.roberto.worktrack',
  },
  body: JSON.stringify(body),
  signal: controller.signal,
});
```

### 5. Configurar .htaccess (opcional, para mayor seguridad)

Crea un archivo `.htaccess` para denegar acceso al archivo `.env`:

```apache
# .htaccess
<Files ".env">
    Order allow,deny
    Deny from all
</Files>
```

## Ventajas de esta configuración

1. ✅ **Seguridad**: Las API keys no están en el código
2. ✅ **Flexibilidad**: Cambiar de API sin modificar código
3. ✅ **Múltiples entornos**: Diferentes .env para desarrollo/producción
4. ✅ **Control de acceso**: Validación por Bundle ID

## Variables configuradas en .env del proyecto React Native

```bash
# .env (en el proyecto React Native)
EXPO_PUBLIC_AI_PROXY_URL=https://web.lweb.ch/work/response.php
EXPO_PUBLIC_APP_TOKEN=tu_token_aqui
EXPO_PUBLIC_BUNDLE_ID=com.roberto.worktrack
EXPO_PUBLIC_GOOGLE_GEMINI_API_KEY=  # Opcional, solo si usas AI directo desde la app
EXPO_PUBLIC_OPENAI_API_KEY=          # Opcional, solo si usas AI directo desde la app
```

## Notas importantes

- **NUNCA** subas el archivo `.env` a Git
- Añade `.env` al `.gitignore` tanto en el proyecto React Native como en el servidor PHP
- Usa diferentes API keys para desarrollo y producción
- Considera implementar rate limiting en el PHP para evitar abuso
