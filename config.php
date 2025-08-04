<?php
// config.php - Configuración de base de datos
// IMPORTANTE: Este archivo NO debe ser accesible públicamente
// Ubicar en el mismo directorio que response.php o en un directorio protegido

return [
    'database' => [
        'host' => 'owoxogis.mysql.db.internal',
        'dbname' => 'owoxogis_work',
        'username' => 'owoxogis_work',
        'password' => 'TU_PASSWORD_AQUI', // CAMBIAR por tu contraseña real
        'charset' => 'utf8mb4'
    ],
    
    // Configuración adicional de seguridad
    'security' => [
        'allowed_origins' => [
            'http://localhost:8081',
            'http://localhost:19006',
            'https://tu-app.com' // CAMBIAR por tu dominio de producción
        ],
        'rate_limit' => 60, // Máximo de requests por minuto
        'enable_logging' => true
    ]
];