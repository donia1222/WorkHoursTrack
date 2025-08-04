<?php
// response.php - Proxy seguro para APIs de IA
// Ubicar en: https://web.lweb.ch/work/response.php

// Cargar configuración desde archivo externo
$config = require_once(__DIR__ . '/config.php');
$db_config = $config['database'];

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // En producción, especificar dominio exacto
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Función para obtener API key de la base de datos
function getApiKey($service_name, $pdo) {
    $stmt = $pdo->prepare("SELECT api_key FROM api_keys WHERE service_name = ? AND is_active = TRUE LIMIT 1");
    $stmt->execute([$service_name]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ? $result['api_key'] : null;
}

// Función para hacer llamada a Google Vision API
function callGoogleVisionAPI($endpoint, $data, $api_key) {
    $url = "https://vision.googleapis.com/v1/images:annotate?key=" . $api_key;
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'status' => $http_code,
        'response' => json_decode($response, true)
    ];
}

// Función para hacer llamada a Gemini API
function callGeminiAPI($model, $data, $api_key) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=" . $api_key;
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'status' => $http_code,
        'response' => json_decode($response, true)
    ];
}

try {
    // Conectar a la base de datos
    $pdo = new PDO(
        "mysql:host={$db_config['host']};dbname={$db_config['dbname']};charset={$db_config['charset']}",
        $db_config['username'],
        $db_config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Obtener datos del request
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['service']) || !isset($input['action'])) {
        throw new Exception('Invalid request format');
    }
    
    $service = $input['service'];
    $action = $input['action'];
    $data = $input['data'] ?? [];
    
    // Obtener API key
    $api_key = getApiKey('google_vision', $pdo);
    if (!$api_key) {
        throw new Exception('API key not found');
    }
    
    // Procesar según el servicio y acción
    $result = null;
    
    switch ($service) {
        case 'vision':
            if ($action === 'annotate') {
                $result = callGoogleVisionAPI('annotate', $data, $api_key);
            }
            break;
            
        case 'gemini':
            if ($action === 'generateContent') {
                $model = $input['model'] ?? 'gemini-1.5-pro';
                $result = callGeminiAPI($model, $data, $api_key);
            }
            break;
            
        default:
            throw new Exception('Unknown service');
    }
    
    if (!$result) {
        throw new Exception('No result from API');
    }
    
    // Devolver respuesta
    http_response_code($result['status']);
    echo json_encode($result['response']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'timestamp' => time()
    ]);
}