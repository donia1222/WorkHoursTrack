import Foundation
import ActivityKit
import React
import UIKit
import WidgetKit

// Extension para convertir push token a string
extension Data {
    var hexString: String {
        return map { String(format: "%02x", $0) }.joined()
    }
}

// Helper to detect device capabilities
struct DeviceCapabilities {
    static var hasDynamicIsland: Bool {
        // iPhone 14 Pro, 15 Pro, 16 Pro series have Dynamic Island
        if let modelName = UIDevice.current.modelName {
            return modelName.contains("iPhone15,2") || // iPhone 14 Pro
                   modelName.contains("iPhone15,3") || // iPhone 14 Pro Max
                   modelName.contains("iPhone16,1") || // iPhone 15 Pro
                   modelName.contains("iPhone16,2") || // iPhone 15 Pro Max
                   modelName.contains("iPhone17,1") || // iPhone 16 Pro
                   modelName.contains("iPhone17,2")    // iPhone 16 Pro Max
        }
        return false
    }
}

extension UIDevice {
    var modelName: String? {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        let identifier = machineMirror.children.reduce("") { identifier, element in
            guard let value = element.value as? Int8, value != 0 else { return identifier }
            return identifier + String(UnicodeScalar(UInt8(value)))
        }
        return identifier
    }
}

@available(iOS 16.2, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
    
    // Usar static para que persista entre reinicios del módulo
    private static var currentActivity: Activity<WorkTrackWidgetAttributes>?
    // Track if we're in the process of ending activities to prevent duplicates
    private static var isEndingActivities = false
    // Queue to serialize Live Activity operations
    private static let operationQueue = DispatchQueue(label: "com.worktrack.liveactivity", qos: .userInitiated)
    // Key for storing activity ID persistently
    private static let activityIDKey = "WorkTrackLiveActivityID"
    // Track last known activity attributes to detect if we need to update or create new
    private static var lastKnownJobName: String?
    private static var lastKnownLocation: String?
    
    // App Group for sharing data with widget
    private static let appGroupIdentifier = "group.com.roberto.worktrack"
    private static let timerDataKey = "WorkTrack.TimerData"
    private static let dataVersionKey = "WorkTrack.DataVersion"
    
    private var currentActivity: Activity<WorkTrackWidgetAttributes>? {
        get { return LiveActivityModule.currentActivity }
        set { 
            LiveActivityModule.currentActivity = newValue
            // Persist the activity ID
            if let activityId = newValue?.id {
                UserDefaults.standard.set(activityId, forKey: LiveActivityModule.activityIDKey)
            } else {
                UserDefaults.standard.removeObject(forKey: LiveActivityModule.activityIDKey)
            }
        }
    }
    
    override init() {
        super.init()
        
        // Clean up stale activities on init
        Task {
            await self.cleanupStaleActivities()
        }
        
        // Escuchar notificaciones para terminar el Live Activity
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleStopNotification),
            name: Notification.Name("StopLiveActivity"),
            object: nil
        )
        
        // Escuchar cuando la app se va a cerrar
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppTermination),
            name: UIApplication.willTerminateNotification,
            object: nil
        )
        
        // Escuchar cuando la app entra en background
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        
        // Escuchar cuando la app vuelve a foreground
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Shared Data Methods
    
    private func saveTimerDataToSharedContainer(jobName: String, location: String, startTime: Date) {
        guard let sharedDefaults = UserDefaults(suiteName: LiveActivityModule.appGroupIdentifier) else {
            print("❌ Failed to access shared UserDefaults")
            return
        }
        
        // Create timer data structure
        let timerData: [String: Any] = [
            "isActive": true,
            "jobName": jobName,
            "location": location,
            "startTime": startTime.timeIntervalSince1970,
            "lastUpdated": Date().timeIntervalSince1970
        ]
        
        // Save to shared UserDefaults
        sharedDefaults.set(timerData, forKey: LiveActivityModule.timerDataKey)
        
        // Increment data version to force widget refresh
        let currentVersion = sharedDefaults.integer(forKey: LiveActivityModule.dataVersionKey)
        sharedDefaults.set(currentVersion + 1, forKey: LiveActivityModule.dataVersionKey)
        
        // Force synchronization
        sharedDefaults.synchronize()
        CFPreferencesAppSynchronize(LiveActivityModule.appGroupIdentifier as CFString)
        
        print("✅ Timer data saved to shared container: \(jobName) at \(location) [v\(currentVersion + 1)]")
        
        // Force immediate widget update
        WidgetCenter.shared.reloadAllTimelines()
        
        // And again with delay to ensure data is written
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
    
    private func clearTimerDataFromSharedContainer() {
        guard let sharedDefaults = UserDefaults(suiteName: LiveActivityModule.appGroupIdentifier) else {
            print("❌ Failed to access shared UserDefaults")
            return
        }
        
        // Save inactive state
        let timerData: [String: Any] = [
            "isActive": false,
            "jobName": "WorkTrack",
            "location": "",
            "startTime": Date().timeIntervalSince1970,
            "lastUpdated": Date().timeIntervalSince1970
        ]
        
        sharedDefaults.set(timerData, forKey: LiveActivityModule.timerDataKey)
        
        // Increment data version to force widget refresh
        let currentVersion = sharedDefaults.integer(forKey: LiveActivityModule.dataVersionKey)
        sharedDefaults.set(currentVersion + 1, forKey: LiveActivityModule.dataVersionKey)
        
        // Force synchronization
        sharedDefaults.synchronize()
        CFPreferencesAppSynchronize(LiveActivityModule.appGroupIdentifier as CFString)
        
        print("✅ Timer data cleared from shared container [v\(currentVersion + 1)]")
        
        // Force immediate widget update
        WidgetCenter.shared.reloadAllTimelines()
        
        // And again with delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
    
    @objc
    private func handleStopNotification() {
        print("📱 Received notification to stop Live Activity")
        Task {
            await self.endAllActivities()
        }
    }
    
    @objc
    private func handleAppTermination() {
        print("🛑 App terminating - ending all Live Activities")
        Task {
            await self.endAllActivities()
        }
    }
    
    @objc
    private func handleAppBackground() {
        print("📱 App entering background - forcing widget refresh")
        // Force widget refresh when app goes to background
        DispatchQueue.main.async {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
    
    @objc
    private func handleAppForeground() {
        print("📱 App entering foreground - forcing widget refresh")
        
        // Force widget refresh when app comes to foreground
        if let sharedDefaults = UserDefaults(suiteName: LiveActivityModule.appGroupIdentifier) {
            // Force synchronization from disk to get latest data
            sharedDefaults.synchronize()
            CFPreferencesAppSynchronize(LiveActivityModule.appGroupIdentifier as CFString)
            
            // Increment version to force refresh
            let currentVersion = sharedDefaults.integer(forKey: LiveActivityModule.dataVersionKey)
            sharedDefaults.set(currentVersion + 1, forKey: LiveActivityModule.dataVersionKey)
            sharedDefaults.synchronize()
        }
        
        // Force all widgets to reload
        WidgetCenter.shared.reloadAllTimelines()
        
        Task {
            await self.cleanupStaleActivities()
        }
    }
    
    private func cleanupStaleActivities() async {
        if #available(iOS 16.2, *) {
            let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
            print("🔍 Checking for stale activities. Found: \(existingActivities.count)")
            
            // Get persisted activity ID
            let persistedId = UserDefaults.standard.string(forKey: LiveActivityModule.activityIDKey)
            
            for activity in existingActivities {
                // Check if this is a stale activity (not our current one)
                if let persistedId = persistedId, activity.id == persistedId {
                    // This is our current activity, keep it
                    LiveActivityModule.currentActivity = activity
                    print("✅ Found and reconnected to existing activity: \(activity.id)")
                } else {
                    // This is a stale/orphaned activity, end it
                    print("🧹 Ending stale activity: \(activity.id)")
                    
                    if DeviceCapabilities.hasDynamicIsland {
                        // For Dynamic Island devices, use more aggressive cleanup
                        let staleState = WorkTrackWidgetAttributes.ContentState(isStopped: true)
                        await activity.update(
                            ActivityContent(
                                state: staleState,
                                staleDate: Date() // Mark as stale immediately
                            )
                        )
                        // Use after dismissal for Dynamic Island to ensure removal
                        await activity.end(dismissalPolicy: .after(Date().addingTimeInterval(1)))
                    } else {
                        // For non-Dynamic Island, end immediately
                        await activity.end(dismissalPolicy: .immediate)
                    }
                }
            }
        }
    }
    
    private func endAllActivities() async {
        if #available(iOS 16.2, *) {
            // Prevent concurrent ending operations
            guard !LiveActivityModule.isEndingActivities else {
                print("⚠️ Already ending activities, skipping")
                return
            }
            
            LiveActivityModule.isEndingActivities = true
            defer { 
                LiveActivityModule.isEndingActivities = false
                LiveActivityModule.lastKnownJobName = nil
                LiveActivityModule.lastKnownLocation = nil
            }
            
            let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
            print("🧹 Ending \(existingActivities.count) Live Activities")
            
            for activity in existingActivities {
                if DeviceCapabilities.hasDynamicIsland {
                    // For Dynamic Island, mark as stopped and use stale date
                    let stoppedState = WorkTrackWidgetAttributes.ContentState(isStopped: true)
                    await activity.update(
                        ActivityContent(
                            state: stoppedState,
                            staleDate: Date() // Mark as stale immediately
                        )
                    )
                    // Give Dynamic Island time to process before ending
                    await activity.end(dismissalPolicy: .after(Date().addingTimeInterval(2)))
                } else {
                    // For non-Dynamic Island, end immediately
                    await activity.end(dismissalPolicy: .immediate)
                }
            }
            self.currentActivity = nil
            
            // Clear timer data from shared container
            self.clearTimerDataFromSharedContainer()
            
            print("✅ All Live Activities ended via notification")
        }
    }
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func startLiveActivity(_ jobName: String, 
                          location: String,
                          resolver: @escaping RCTPromiseResolveBlock,
                          rejecter: @escaping RCTPromiseRejectBlock) {
        
        // Verificar versión de iOS
        if #available(iOS 16.2, *) {
            // Use the serial queue to prevent race conditions
            LiveActivityModule.operationQueue.async {
                // Verificar si Live Activities están disponibles
                guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                    DispatchQueue.main.async {
                        rejecter("LIVE_ACTIVITY_ERROR", "Live Activities are not enabled", nil)
                    }
                    return
                }
                
                // Prevent starting if we're already ending activities
                guard !LiveActivityModule.isEndingActivities else {
                    print("⚠️ Currently ending activities, waiting...")
                    // Retry after a short delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        self.startLiveActivity(jobName, location: location, resolver: resolver, rejecter: rejecter)
                    }
                    return
                }
                
                // Check if we can reuse an existing activity (non-Dynamic Island devices)
                let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
                print("🔍 Found \(existingActivities.count) existing Live Activities")
                
                // For non-Dynamic Island devices, try to update existing activity instead of creating new
                if !DeviceCapabilities.hasDynamicIsland && !existingActivities.isEmpty {
                    // Check if we can reuse the first activity
                    if let existingActivity = existingActivities.first,
                       LiveActivityModule.lastKnownJobName == jobName,
                       LiveActivityModule.lastKnownLocation == location {
                        print("♻️ Reusing existing Live Activity for same job")
                        
                        // Update the existing activity to running state
                        Task {
                            let runningState = WorkTrackWidgetAttributes.ContentState(isStopped: false)
                            await existingActivity.update(
                                ActivityContent(
                                    state: runningState,
                                    staleDate: nil // Remove stale date
                                )
                            )
                            
                            // Store the reference
                            LiveActivityModule.currentActivity = existingActivity
                            LiveActivityModule.lastKnownJobName = jobName
                            LiveActivityModule.lastKnownLocation = location
                            
                            // Save timer data to shared container for widget
                            self.saveTimerDataToSharedContainer(jobName: jobName, location: location, startTime: Date())
                            
                            DispatchQueue.main.async {
                                resolver(["id": existingActivity.id, "reused": true])
                            }
                        }
                        return
                    }
                }
                
                // Need to create new activity - first clean up existing ones
                if !existingActivities.isEmpty {
                    print("🧹 Cleaning up \(existingActivities.count) existing Live Activities before creating new")
                    
                    // Mark that we're ending activities
                    LiveActivityModule.isEndingActivities = true
                    
                    Task {
                        // End all existing activities with proper cleanup for each device type
                        for activity in existingActivities {
                            if DeviceCapabilities.hasDynamicIsland {
                                // Dynamic Island: Mark as stale and end with delay
                                let staleState = WorkTrackWidgetAttributes.ContentState(isStopped: true)
                                await activity.update(
                                    ActivityContent(
                                        state: staleState,
                                        staleDate: Date()
                                    )
                                )
                                await activity.end(dismissalPolicy: .after(Date().addingTimeInterval(1)))
                            } else {
                                // Non-Dynamic Island: End immediately
                                await activity.end(dismissalPolicy: .immediate)
                            }
                        }
                        
                        // Clear the current activity reference
                        LiveActivityModule.currentActivity = nil
                        
                        // Small delay to ensure iOS processes the endings
                        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                        
                        // Mark that we're done ending activities
                        LiveActivityModule.isEndingActivities = false
                        
                        // Create new activity on the operation queue
                        LiveActivityModule.operationQueue.async {
                            self.createNewLiveActivity(jobName: jobName, location: location, resolver: resolver, rejecter: rejecter)
                        }
                    }
                } else {
                    // No existing activities, create new directly
                    print("✅ No existing Live Activities, creating new one")
                    self.createNewLiveActivity(jobName: jobName, location: location, resolver: resolver, rejecter: rejecter)
                }
            }
        } else {
            rejecter("LIVE_ACTIVITY_ERROR", "Live Activities require iOS 16.2 or newer", nil)
        }
    }
    
    private func createNewLiveActivity(jobName: String, location: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            // Double-check no activity exists
            if LiveActivityModule.currentActivity != nil {
                print("⚠️ Current activity still exists, clearing it first")
                LiveActivityModule.currentActivity = nil
            }
            
            // Crear los atributos del Live Activity
            let attributes = WorkTrackWidgetAttributes(
                jobName: jobName,
                location: location,
                startTime: Date()
            )
            
            // Estado inicial - marcado como activo (no stopped)
            let initialState = WorkTrackWidgetAttributes.ContentState(isStopped: false)
            
            do {
                // Iniciar el Live Activity CON push para que funcione con app cerrada
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: initialState, staleDate: nil),
                    pushType: .token // Habilitar push notifications
                )
                
                // Store the activity reference and update tracking
                LiveActivityModule.currentActivity = activity
                LiveActivityModule.lastKnownJobName = jobName
                LiveActivityModule.lastKnownLocation = location
                
                // Save timer data to shared container for widget
                self.saveTimerDataToSharedContainer(jobName: jobName, location: location, startTime: attributes.startTime)
                
                // Registrar para recibir el push token
                Task {
                    for await pushToken in activity.pushTokenUpdates {
                        let pushTokenString = pushToken.hexString
                        print("📱 Live Activity Push Token: \(pushTokenString)")
                        
                        // Guardar el token para uso futuro
                        UserDefaults.standard.set(pushTokenString, forKey: "LiveActivityPushToken")
                    }
                }
                
                DispatchQueue.main.async {
                    resolver(["id": activity.id, "pushToken": "pending"])
                }
                
                print("✅ Live Activity started with ID: \(activity.id)")
                print("📊 Total active Live Activities: \(Activity<WorkTrackWidgetAttributes>.activities.count)")
                
            } catch {
                DispatchQueue.main.async {
                    rejecter("LIVE_ACTIVITY_ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    @objc
    func updateLiveActivity(_ elapsedSeconds: NSNumber,
                           resolver: @escaping RCTPromiseResolveBlock,
                           rejecter: @escaping RCTPromiseRejectBlock) {
        
        // Ya no necesitamos actualizar constantemente, pero mantenemos la función por compatibilidad
        // Simplemente no hacemos nada y retornamos true
        resolver(true)
    }
    
    @objc
    func syncJobsToWidget(_ jobs: NSArray,
                         resolver: @escaping RCTPromiseResolveBlock,
                         rejecter: @escaping RCTPromiseRejectBlock) {
        
        guard let sharedDefaults = UserDefaults(suiteName: LiveActivityModule.appGroupIdentifier) else {
            rejecter("SYNC_ERROR", "Could not access shared storage", nil)
            return
        }
        
        // Convert jobs to dictionary array for storage
        var jobsArray: [[String: Any]] = []
        for job in jobs {
            if let jobDict = job as? NSDictionary {
                // Try different field names for compatibility
                let name = (jobDict["name"] as? String) ?? (jobDict["empresa"] as? String) ?? "Work"
                var jobInfo: [String: Any] = ["name": name]
                
                // Try different field names for address/location
                if let location = (jobDict["address"] as? String) ?? (jobDict["direccion"] as? String) ?? (jobDict["location"] as? String) {
                    jobInfo["location"] = location
                }
                
                if let color = jobDict["color"] as? String {
                    jobInfo["color"] = color
                }
                
                jobsArray.append(jobInfo)
            }
        }
        
        // Save to shared storage
        sharedDefaults.set(jobsArray, forKey: "WorkTrack.JobsData")
        
        // Increment data version to force widget refresh
        let currentVersion = sharedDefaults.integer(forKey: LiveActivityModule.dataVersionKey)
        sharedDefaults.set(currentVersion + 1, forKey: LiveActivityModule.dataVersionKey)
        
        // Force synchronization
        sharedDefaults.synchronize()
        
        // Force widget update with delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        
        print("✅ Synced \(jobsArray.count) jobs to widget")
        resolver(true)
    }
    
    @objc
    func syncCalendarToWidget(_ workDays: NSArray,
                            resolver: @escaping RCTPromiseResolveBlock,
                            rejecter: @escaping RCTPromiseRejectBlock) {
        
        guard let sharedDefaults = UserDefaults(suiteName: LiveActivityModule.appGroupIdentifier) else {
            rejecter("SYNC_ERROR", "Could not access shared storage", nil)
            return
        }
        
        // Convert work days to proper format for widget
        struct TempWorkDay: Codable {
            let date: Date
            let type: String
            let jobName: String?
            let jobColor: String?
            let hours: Double?
        }
        
        var workDayStructs: [TempWorkDay] = []
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = TimeZone.current // Use local timezone to match app data
        
        for workDay in workDays {
            if let dayDict = workDay as? NSDictionary,
               let dateString = dayDict["date"] as? String,
               let type = dayDict["type"] as? String,
               let date = dateFormatter.date(from: dateString) {
                
                let dayStruct = TempWorkDay(
                    date: date,
                    type: type,
                    jobName: dayDict["jobName"] as? String,
                    jobColor: dayDict["jobColor"] as? String,
                    hours: dayDict["hours"] as? Double
                )
                
                workDayStructs.append(dayStruct)
            }
        }
        
        // Encode properly with JSONEncoder for widget
        let encoder = JSONEncoder()
        // Use custom date encoding to preserve local dates
        let localFormatter = DateFormatter()
        localFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        localFormatter.timeZone = TimeZone.current
        encoder.dateEncodingStrategy = .formatted(localFormatter)
        if let data = try? encoder.encode(workDayStructs) {
            sharedDefaults.set(data, forKey: "WorkTrack.CalendarData")
            
            // Increment data version to force widget refresh
            let currentVersion = sharedDefaults.integer(forKey: LiveActivityModule.dataVersionKey)
            sharedDefaults.set(currentVersion + 1, forKey: LiveActivityModule.dataVersionKey)
            
            // Force synchronization
            sharedDefaults.synchronize()
            CFPreferencesAppSynchronize(LiveActivityModule.appGroupIdentifier as CFString)
            
            // Force widget update with delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            
            print("✅ Synced \(workDayStructs.count) calendar days to widget [v\(currentVersion + 1)]")
            resolver(true)
        } else {
            rejecter("SYNC_ERROR", "Failed to encode calendar data", nil)
        }
    }
    
    @objc
    func endLiveActivity(_ finalElapsedSeconds: NSNumber,
                        resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.2, *) {
            LiveActivityModule.operationQueue.async {
                Task {
                    // Mark that we're ending activities
                    LiveActivityModule.isEndingActivities = true
                    defer { LiveActivityModule.isEndingActivities = false }
                    
                    // Get all active Live Activities
                    let allActivities = Activity<WorkTrackWidgetAttributes>.activities
                    print("📱 Ending \(allActivities.count) Live Activities")
                    
                    // Process each activity based on device type
                    for activity in allActivities {
                        // Update to stopped state
                        let finalState = WorkTrackWidgetAttributes.ContentState(isStopped: true)
                        
                        if DeviceCapabilities.hasDynamicIsland {
                            // Dynamic Island: Use stale date for auto-dismissal
                            await activity.update(
                                ActivityContent(
                                    state: finalState,
                                    staleDate: Date().addingTimeInterval(2) // Auto-dismiss after 2 seconds
                                )
                            )
                            
                            // Wait to show stopped state
                            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                            
                            // End with after policy to ensure Dynamic Island releases it
                            await activity.end(dismissalPolicy: .after(Date().addingTimeInterval(3)))
                        } else {
                            // Non-Dynamic Island: Show stopped state briefly then remove
                            await activity.update(
                                ActivityContent(
                                    state: finalState,
                                    staleDate: Date().addingTimeInterval(5)
                                )
                            )
                            
                            // Wait to show stopped state
                            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                            
                            // End with default policy
                            await activity.end(dismissalPolicy: .default)
                        }
                    }
                    
                    // Clear the current activity reference and tracking
                    LiveActivityModule.currentActivity = nil
                    LiveActivityModule.lastKnownJobName = nil
                    LiveActivityModule.lastKnownLocation = nil
                    
                    // Clear timer data from shared container
                    self.clearTimerDataFromSharedContainer()
                    
                    DispatchQueue.main.async {
                        resolver(true)
                    }
                    print("✅ All Live Activities ended with stopped state shown")
                }
            }
        } else {
            rejecter("LIVE_ACTIVITY_ERROR", "Live Activities require iOS 16.2 or newer", nil)
        }
    }
    
    @objc
    func saveCalendarData(_ calendarData: [[String: Any]],
                         resolver: @escaping RCTPromiseResolveBlock,
                         rejecter: @escaping RCTPromiseRejectBlock) {
        guard let sharedDefaults = UserDefaults(suiteName: LiveActivityModule.appGroupIdentifier) else {
            rejecter("CALENDAR_ERROR", "Failed to access shared UserDefaults", nil)
            return
        }
        
        do {
            // Convert the calendar data to JSON
            let jsonData = try JSONSerialization.data(withJSONObject: calendarData, options: [])
            
            // Save to shared UserDefaults
            sharedDefaults.set(jsonData, forKey: "WorkTrack.CalendarData")
            sharedDefaults.synchronize()
            
            print("✅ Calendar data saved to widget: \(calendarData.count) days")
            
            // Trigger widget update
            WidgetCenter.shared.reloadAllTimelines()
            
            resolver(true)
        } catch {
            rejecter("CALENDAR_ERROR", "Failed to save calendar data: \(error.localizedDescription)", error)
        }
    }
    
    @objc
    func hasActiveLiveActivity(_ resolver: @escaping RCTPromiseResolveBlock,
                               rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            DispatchQueue.main.async {
                // Verificar actividad en memoria
                if self.currentActivity != nil {
                    resolver(true)
                    return
                }
                
                // Verificar todas las actividades existentes
                let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
                if !existingActivities.isEmpty {
                    // Guardar la primera actividad encontrada
                    self.currentActivity = existingActivities.first
                    resolver(true)
                } else {
                    resolver(false)
                }
            }
        } else {
            resolver(false)
        }
    }
    
    @objc
    func endAllLiveActivities(_ resolver: @escaping RCTPromiseResolveBlock,
                              rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            LiveActivityModule.operationQueue.async {
                Task {
                    // Mark that we're ending activities
                    LiveActivityModule.isEndingActivities = true
                    defer { LiveActivityModule.isEndingActivities = false }
                    
                    // Terminar todas las actividades existentes
                    let existingActivities = Activity<WorkTrackWidgetAttributes>.activities
                    print("🧹 Force ending \(existingActivities.count) Live Activities")
                    
                    for activity in existingActivities {
                        if DeviceCapabilities.hasDynamicIsland {
                            // Dynamic Island: Force immediate removal with stale date
                            let staleState = WorkTrackWidgetAttributes.ContentState(isStopped: true)
                            await activity.update(
                                ActivityContent(
                                    state: staleState,
                                    staleDate: Date() // Mark as stale immediately
                                )
                            )
                            await activity.end(dismissalPolicy: .immediate)
                        } else {
                            // Non-Dynamic Island: End immediately
                            await activity.end(dismissalPolicy: .immediate)
                        }
                    }
                    
                    // Clear all references and tracking
                    LiveActivityModule.currentActivity = nil
                    LiveActivityModule.lastKnownJobName = nil
                    LiveActivityModule.lastKnownLocation = nil
                    UserDefaults.standard.removeObject(forKey: "LiveActivityPushToken")
                    UserDefaults.standard.removeObject(forKey: LiveActivityModule.activityIDKey)
                    
                    // Clear timer data from shared container
                    self.clearTimerDataFromSharedContainer()
                    
                    DispatchQueue.main.async {
                        resolver(true)
                    }
                    print("✅ All Live Activities force ended")
                }
            }
        } else {
            resolver(true)
        }
    }
}