import Foundation
import CoreLocation
import UserNotifications

/**
 * CoreLocationManager - Módulo nativo Swift para control directo de Core Location
 * 
 * Este módulo proporciona acceso directo a las APIs de iOS para geofencing robusto
 * y manejo de ubicación en background, superando las limitaciones de Expo.
 */
@objc(CoreLocationManager)
class CoreLocationManager: NSObject {
    private let locationManager = CLLocationManager()
    private var monitoredRegions: [String: CLCircularRegion] = [:]
    private var activeSession: [String: Any]?
    private let userDefaults = UserDefaults.standard
    
    // Keys para UserDefaults (más confiable que AsyncStorage en background)
    private let kActiveSessionKey = "com.worktrack.activeSession"
    private let kGeofenceStateKey = "com.worktrack.geofenceState"
    private let kLastLocationKey = "com.worktrack.lastLocation"
    
    // Configuración optimizada para iOS 17+
    private let kMinimumRegionRadius: CLLocationDistance = 100.0 // iOS funciona mejor con >= 100m
    private let kExitRadiusMultiplier: Double = 1.3 // 30% más grande para salida
    private let kLocationUpdateInterval: TimeInterval = 30.0 // 30 segundos
    
    override init() {
        super.init()
        setupLocationManager()
        loadPersistedState()
    }
    
    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 5.0 // Actualizar cada 5 metros
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
        
        // iOS 14+ configuración adicional
        if #available(iOS 14.0, *) {
            locationManager.accuracyAuthorization = .fullAccuracy
        }
        
        // Solicitar permisos si es necesario
        requestLocationPermissions()
    }
    
    private func requestLocationPermissions() {
        let status = locationManager.authorizationStatus
        
        switch status {
        case .notDetermined:
            locationManager.requestAlwaysAuthorization()
        case .authorizedWhenInUse:
            locationManager.requestAlwaysAuthorization()
        case .authorizedAlways:
            print("✅ Permisos de ubicación Always autorizados")
        case .denied, .restricted:
            print("❌ Permisos de ubicación denegados")
        @unknown default:
            break
        }
    }
    
    // MARK: - Public Methods (Exposed to React Native)
    
    @objc
    func startMonitoring(_ jobs: [[String: Any]], 
                        resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
        
        print("🚀 CoreLocationManager: Iniciando monitoreo para \(jobs.count) trabajos")
        
        // Limpiar regiones anteriores
        stopAllMonitoring()
        
        var regionsAdded = 0
        
        for job in jobs {
            guard let jobId = job["id"] as? String,
                  let latitude = job["latitude"] as? Double,
                  let longitude = job["longitude"] as? Double,
                  let radius = job["radius"] as? Double,
                  let autoTimerEnabled = job["autoTimerEnabled"] as? Bool,
                  autoTimerEnabled else {
                continue
            }
            
            // Ajustar radio para iOS
            let adjustedRadius = max(kMinimumRegionRadius, radius)
            
            // Crear región de entrada
            let enterRegion = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
                radius: adjustedRadius,
                identifier: "\(jobId)_enter"
            )
            enterRegion.notifyOnEntry = true
            enterRegion.notifyOnExit = false
            
            // Crear región de salida (radio mayor)
            let exitRadius = adjustedRadius * kExitRadiusMultiplier
            let exitRegion = CLCircularRegion(
                center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
                radius: exitRadius,
                identifier: "\(jobId)_exit"
            )
            exitRegion.notifyOnEntry = false
            exitRegion.notifyOnExit = true
            
            // Monitorear ambas regiones
            locationManager.startMonitoring(for: enterRegion)
            locationManager.startMonitoring(for: exitRegion)
            
            monitoredRegions[enterRegion.identifier] = enterRegion
            monitoredRegions[exitRegion.identifier] = exitRegion
            
            regionsAdded += 2
            
            print("📍 Monitoreando: \(job["name"] ?? jobId) - Enter: \(adjustedRadius)m, Exit: \(exitRadius)m")
        }
        
        // Iniciar actualizaciones de ubicación como fallback
        startLocationUpdates()
        
        // Iniciar monitoreo de cambios significativos
        locationManager.startMonitoringSignificantLocationChanges()
        
        // Verificar estado inicial
        locationManager.requestLocation()
        
        resolver([
            "success": true,
            "regionsMonitored": regionsAdded,
            "message": "Monitoreo iniciado con Core Location nativo"
        ])
    }
    
    @objc
    func stopMonitoring(_ resolver: RCTPromiseResolveBlock,
                       rejecter: RCTPromiseRejectBlock) {
        stopAllMonitoring()
        resolver(["success": true])
    }
    
    @objc
    func getCurrentState(_ resolver: RCTPromiseResolveBlock,
                        rejecter: RCTPromiseRejectBlock) {
        var state: [String: Any] = [:]
        
        // Estado de las regiones
        for region in locationManager.monitoredRegions {
            if let circularRegion = region as? CLCircularRegion {
                locationManager.requestState(for: circularRegion)
                state[circularRegion.identifier] = [
                    "center": [
                        "latitude": circularRegion.center.latitude,
                        "longitude": circularRegion.center.longitude
                    ],
                    "radius": circularRegion.radius
                ]
            }
        }
        
        // Sesión activa
        if let session = loadActiveSession() {
            state["activeSession"] = session
        }
        
        // Última ubicación
        if let lastLocation = locationManager.location {
            state["lastLocation"] = [
                "latitude": lastLocation.coordinate.latitude,
                "longitude": lastLocation.coordinate.longitude,
                "timestamp": lastLocation.timestamp.timeIntervalSince1970
            ]
        }
        
        resolver(state)
    }
    
    // MARK: - Private Methods
    
    private func stopAllMonitoring() {
        for region in locationManager.monitoredRegions {
            locationManager.stopMonitoring(for: region)
        }
        monitoredRegions.removeAll()
        locationManager.stopMonitoringSignificantLocationChanges()
        locationManager.stopUpdatingLocation()
    }
    
    private func startLocationUpdates() {
        // Usar actualizaciones diferidas para optimizar batería
        if #available(iOS 13.0, *) {
            locationManager.startUpdatingLocation()
            locationManager.allowDeferredLocationUpdates(
                untilTraveled: 50, // 50 metros
                timeout: kLocationUpdateInterval
            )
        } else {
            locationManager.startUpdatingLocation()
        }
    }
    
    private func loadPersistedState() {
        activeSession = userDefaults.dictionary(forKey: kActiveSessionKey)
    }
    
    private func saveActiveSession(_ session: [String: Any]?) {
        activeSession = session
        if let session = session {
            userDefaults.set(session, forKey: kActiveSessionKey)
        } else {
            userDefaults.removeObject(forKey: kActiveSessionKey)
        }
        userDefaults.synchronize()
    }
    
    private func loadActiveSession() -> [String: Any]? {
        return userDefaults.dictionary(forKey: kActiveSessionKey)
    }
    
    private func handleRegionEnter(_ region: CLRegion) {
        guard let circularRegion = region as? CLCircularRegion else { return }
        
        let jobId = circularRegion.identifier.replacingOccurrences(of: "_enter", with: "")
        print("✅ ENTERED region: \(jobId)")
        
        // Guardar estado
        var state = userDefaults.dictionary(forKey: kGeofenceStateKey) ?? [:]
        state["\(jobId)_inside"] = true
        state["\(jobId)_entered_at"] = Date().timeIntervalSince1970
        userDefaults.set(state, forKey: kGeofenceStateKey)
        
        // Si no hay sesión activa, iniciar timer
        if loadActiveSession() == nil {
            startTimerForJob(jobId)
        }
        
        // Enviar notificación local
        sendLocalNotification(
            title: "📍 Arrived at Work",
            body: "Auto-timer will start for \(jobId)",
            identifier: "enter_\(jobId)"
        )
    }
    
    private func handleRegionExit(_ region: CLRegion) {
        guard let circularRegion = region as? CLCircularRegion else { return }
        
        let jobId = circularRegion.identifier.replacingOccurrences(of: "_exit", with: "")
        print("🚪 EXITED region: \(jobId)")
        
        // Guardar estado
        var state = userDefaults.dictionary(forKey: kGeofenceStateKey) ?? [:]
        state["\(jobId)_inside"] = false
        state["\(jobId)_exited_at"] = Date().timeIntervalSince1970
        userDefaults.set(state, forKey: kGeofenceStateKey)
        
        // Si hay sesión activa para este trabajo, detener timer
        if let session = loadActiveSession(),
           let sessionJobId = session["jobId"] as? String,
           sessionJobId == jobId {
            stopTimerForJob(jobId)
        }
        
        // Enviar notificación local
        sendLocalNotification(
            title: "👋 Left Work",
            body: "Auto-timer stopped for \(jobId)",
            identifier: "exit_\(jobId)"
        )
    }
    
    private func startTimerForJob(_ jobId: String) {
        let session: [String: Any] = [
            "jobId": jobId,
            "startTime": Date().timeIntervalSince1970,
            "source": "CoreLocationManager"
        ]
        saveActiveSession(session)
        
        print("⏱️ Timer started for job: \(jobId)")
        
        // Notificar a React Native
        sendEventToReactNative(name: "TimerStarted", body: session)
    }
    
    private func stopTimerForJob(_ jobId: String) {
        guard let session = loadActiveSession(),
              let startTime = session["startTime"] as? TimeInterval else {
            return
        }
        
        let endTime = Date().timeIntervalSince1970
        let duration = endTime - startTime
        let hours = duration / 3600.0
        
        // Guardar día trabajado
        let workDay: [String: Any] = [
            "jobId": jobId,
            "date": ISO8601DateFormatter().string(from: Date()),
            "hours": hours,
            "source": "CoreLocationManager"
        ]
        
        // Aquí deberías guardar en AsyncStorage o tu sistema de persistencia
        saveWorkDay(workDay)
        
        // Limpiar sesión
        saveActiveSession(nil)
        
        print("⏹️ Timer stopped for job: \(jobId), Hours: \(String(format: "%.2f", hours))")
        
        // Notificar a React Native
        sendEventToReactNative(name: "TimerStopped", body: workDay)
    }
    
    private func saveWorkDay(_ workDay: [String: Any]) {
        // Guardar en UserDefaults como respaldo
        var workDays = userDefaults.array(forKey: "com.worktrack.workDays") as? [[String: Any]] ?? []
        workDays.append(workDay)
        
        // Mantener solo los últimos 100 días
        if workDays.count > 100 {
            workDays = Array(workDays.suffix(100))
        }
        
        userDefaults.set(workDays, forKey: "com.worktrack.workDays")
        userDefaults.synchronize()
    }
    
    private func sendLocalNotification(title: String, body: String, identifier: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = "TIMER_CATEGORY"
        
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: nil // Inmediato
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ Error enviando notificación: \(error)")
            }
        }
    }
    
    private func sendEventToReactNative(name: String, body: Any?) {
        // Aquí deberías implementar el bridge para enviar eventos a React Native
        // Por ejemplo, usando RCTEventEmitter
        NotificationCenter.default.post(
            name: Notification.Name("CoreLocationEvent"),
            object: nil,
            userInfo: ["name": name, "body": body ?? NSNull()]
        )
    }
}

// MARK: - CLLocationManagerDelegate

extension CoreLocationManager: CLLocationManagerDelegate {
    
    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        handleRegionEnter(region)
    }
    
    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        handleRegionExit(region)
    }
    
    func locationManager(_ manager: CLLocationManager, didDetermineState state: CLRegionState, for region: CLRegion) {
        let stateString: String
        switch state {
        case .inside:
            stateString = "INSIDE"
            if region.identifier.contains("_enter") {
                handleRegionEnter(region)
            }
        case .outside:
            stateString = "OUTSIDE"
            if region.identifier.contains("_exit") {
                handleRegionExit(region)
            }
        case .unknown:
            stateString = "UNKNOWN"
        }
        
        print("📍 Region \(region.identifier) state: \(stateString)")
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        // Guardar última ubicación
        userDefaults.set([
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "timestamp": location.timestamp.timeIntervalSince1970
        ], forKey: kLastLocationKey)
        
        // Verificar manualmente las regiones (fallback para geofencing)
        checkLocationAgainstRegions(location)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("❌ Location manager error: \(error)")
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        print("📍 Authorization changed: \(manager.authorizationStatus.rawValue)")
        requestLocationPermissions()
    }
    
    // MARK: - Manual Region Checking (Fallback)
    
    private func checkLocationAgainstRegions(_ location: CLLocation) {
        let state = userDefaults.dictionary(forKey: kGeofenceStateKey) ?? [:]
        
        for (identifier, region) in monitoredRegions {
            guard let circularRegion = region as? CLCircularRegion else { continue }
            
            let distance = location.distance(from: CLLocation(
                latitude: circularRegion.center.latitude,
                longitude: circularRegion.center.longitude
            ))
            
            let isInside = distance <= circularRegion.radius
            let jobId = identifier.replacingOccurrences(of: "_enter", with: "")
                                  .replacingOccurrences(of: "_exit", with: "")
            let wasInside = state["\(jobId)_inside"] as? Bool ?? false
            
            // Detectar cambios de estado manualmente
            if identifier.contains("_enter") && isInside && !wasInside {
                print("🔍 Manual detection: ENTERED \(jobId)")
                handleRegionEnter(region)
            } else if identifier.contains("_exit") && !isInside && wasInside {
                print("🔍 Manual detection: EXITED \(jobId)")
                handleRegionExit(region)
            }
        }
    }
}

// MARK: - React Native Bridge Module

@objc(CoreLocationManagerBridge)
class CoreLocationManagerBridge: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc
    func constantsToExport() -> [AnyHashable: Any]! {
        return [
            "isAvailable": true,
            "platform": "iOS",
            "version": "1.0.0"
        ]
    }
}