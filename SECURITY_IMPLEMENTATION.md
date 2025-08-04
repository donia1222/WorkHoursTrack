# Guía de Implementación de Seguridad para WorkTrack

## 🔒 Mejoras de Seguridad Implementadas

### 1. **Autenticación basada en Bundle ID y Token**
- Cada app debe enviar su Bundle ID y un token único
- Los tokens se almacenan en la base de datos y pueden tener fecha de expiración
- Soporte para múltiples Bundle IDs (desarrollo, producción, Expo Go)

### 2. **Rate Limiting**
- Límite de 100 peticiones por hora por Bundle ID + IP
- Previene abuso y ataques DoS
- Configurable en el archivo PHP

### 3. **CORS Restrictivo**
- Lista blanca de orígenes permitidos
- Configurable para desarrollo y producción

### 4. **Validación de Entrada**
- Validación de servicios y acciones permitidas
- Límite de tamaño de payload (10MB)
- Sanitización de modelos de Gemini

### 5. **Logging y Auditoría**
- Registro de todas las peticiones a la API
- Incluye IP, user agent, respuesta, etc.
- Útil para detectar uso anormal

### 6. **Headers de Seguridad**
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

## 📋 Pasos de Implementación

### 1. **Configurar la Base de Datos**

```bash
# Ejecutar el script SQL en tu base de datos
mysql -h tu_host -u tu_usuario -p tu_base_datos < database_schema.sql
```

### 2. **Generar Token de App**

```sql
-- Generar un nuevo token para tu app
INSERT INTO app_tokens (token, bundle_id, description) 
VALUES (
    SHA2(CONCAT(UUID(), NOW()), 256),
    'com.tuempresa.worktrack',
    'Token de producción'
);

-- Ver el token generado
SELECT token FROM app_tokens WHERE bundle_id = 'com.tuempresa.worktrack' ORDER BY id DESC LIMIT 1;
```

### 3. **Actualizar archivo .env**

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar y agregar:
EXPO_PUBLIC_API_PROXY_URL=https://web.lweb.ch/work/response.php
EXPO_PUBLIC_APP_TOKEN=el_token_generado_en_paso_2
```

### 4. **Subir el nuevo response.php**

- Renombrar `response_secure.php` a `response.php`
- Subir al servidor reemplazando el archivo actual
- Asegurarse de que `config.php` existe con las credenciales de BD

### 5. **Configurar Bundle IDs**

En `response.php`, actualizar los Bundle IDs permitidos:

```php
define('ALLOWED_BUNDLE_IDS', [
    'com.tuempresa.worktrack',        // Tu Bundle ID real
    'com.tuempresa.worktrack.dev',    // Para desarrollo
    'host.exp.Exponent'               // Para Expo Go
]);
```

### 6. **Ajustar CORS para Producción**

En `response.php`, actualizar los orígenes permitidos:

```php
$allowed_origins = [
    'https://tu-dominio.com',         // Tu dominio de producción
    'http://localhost:8081',          // Desarrollo
    'http://localhost:19000',         // Expo web
];
```

## 🧪 Testing

### Test de Autenticación

```bash
# Sin token (debe fallar)
curl -X POST https://web.lweb.ch/work/response.php \
  -H "Content-Type: application/json" \
  -d '{"service":"gemini","action":"generateContent"}'

# Con token válido (debe funcionar)
curl -X POST https://web.lweb.ch/work/response.php \
  -H "Content-Type: application/json" \
  -H "X-App-Token: tu_token_aqui" \
  -H "X-Bundle-ID: com.tuempresa.worktrack" \
  -d '{"service":"gemini","action":"generateContent","data":{}}'
```

### Test de Rate Limiting

Ejecutar más de 100 peticiones en una hora debe devolver error 429.

## 🚀 Consideraciones de Producción

1. **Monitoreo**:
   - Configurar alertas para errores 401 (auth) y 429 (rate limit)
   - Revisar logs regularmente para detectar patrones anormales

2. **Rotación de Tokens**:
   - Implementar expiración de tokens
   - Rotar tokens periódicamente

3. **Backup**:
   - Hacer backup regular de la tabla `api_usage_logs`
   - Limpiar logs antiguos periódicamente

4. **Escalabilidad**:
   - Considerar usar Redis para rate limiting en lugar de MySQL
   - Implementar caché para respuestas frecuentes

## 🔐 Seguridad Adicional (Opcional)

1. **Encriptación de Tokens**:
   ```php
   // En el cliente, encriptar el token antes de enviarlo
   $encrypted_token = openssl_encrypt($token, 'AES-256-CBC', $key, 0, $iv);
   ```

2. **Firma de Peticiones**:
   ```javascript
   // Firmar cada petición con HMAC
   const signature = crypto.createHmac('sha256', secret)
     .update(JSON.stringify(body))
     .digest('hex');
   ```

3. **IP Whitelisting**:
   - Para apps corporativas, limitar a IPs específicas

4. **Certificado SSL Pinning**:
   - En la app móvil, validar el certificado SSL del servidor

## 📱 Nota para Desarrollo con Expo

Durante el desarrollo con Expo Go, el Bundle ID será `host.exp.Exponent`. Asegúrate de:

1. Tener un token específico para desarrollo
2. Agregar `host.exp.Exponent` a los Bundle IDs permitidos
3. En producción, cambiar al Bundle ID real de tu app

## ⚠️ Importante

- **Nunca** commitar el archivo `.env` con tokens reales
- **Nunca** exponer el `response.php` sin las medidas de seguridad
- **Siempre** usar HTTPS en producción
- **Revisar** logs regularmente para detectar uso anormal