//
//  SharedDataManager.swift
//  WorkTrackWidget
//
//  Manages shared data between the main app and widget extension
//

import Foundation
import WidgetKit

// MARK: - Shared Data Model
struct TimerData: Codable {
    let isActive: Bool
    let jobName: String
    let location: String?
    let startTime: Date?
    let lastUpdated: Date
    
    // Computed property for display
    var displayStartTime: Date {
        return startTime ?? Date()
    }
    
    // Initialize with defaults
    static var inactive: TimerData {
        return TimerData(
            isActive: false,
            jobName: "WorkTrack",
            location: nil,
            startTime: nil,
            lastUpdated: Date()
        )
    }
}

// MARK: - Shared Data Manager
class SharedDataManager {
    // App Group identifier - must match the one in entitlements
    private static let appGroupIdentifier = "group.com.roberto.worktrack"
    
    // Keys for UserDefaults
    private static let timerDataKey = "WorkTrack.TimerData"
    private static let widgetNeedsUpdateKey = "WorkTrack.WidgetNeedsUpdate"
    
    // Shared UserDefaults instance
    private static var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }
    
    // MARK: - Write Methods (For Main App)
    
    /// Save current timer state to shared storage
    static func saveTimerData(isActive: Bool, jobName: String, location: String?, startTime: Date?) {
        guard let defaults = sharedDefaults else {
            print("❌ Failed to access shared UserDefaults")
            return
        }
        
        let timerData = TimerData(
            isActive: isActive,
            jobName: jobName,
            location: location,
            startTime: startTime,
            lastUpdated: Date()
        )
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(timerData)
            defaults.set(data, forKey: timerDataKey)
            defaults.set(true, forKey: widgetNeedsUpdateKey)
            defaults.synchronize()
            
            print("✅ Timer data saved to shared storage: isActive=\(isActive), job=\(jobName)")
            
            // Reload all widgets to show new data
            WidgetCenter.shared.reloadAllTimelines()
            
        } catch {
            print("❌ Failed to encode timer data: \(error)")
        }
    }
    
    /// Clear timer data when timer stops
    static func clearTimerData() {
        guard let defaults = sharedDefaults else {
            print("❌ Failed to access shared UserDefaults")
            return
        }
        
        // Save inactive state instead of removing completely
        let timerData = TimerData.inactive
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(timerData)
            defaults.set(data, forKey: timerDataKey)
            defaults.set(true, forKey: widgetNeedsUpdateKey)
            defaults.synchronize()
            
            print("✅ Timer data cleared (set to inactive)")
            
            // Reload all widgets to show inactive state
            WidgetCenter.shared.reloadAllTimelines()
            
        } catch {
            print("❌ Failed to clear timer data: \(error)")
        }
    }
    
    // MARK: - Read Methods (For Widget)
    
    /// Read current timer state from shared storage
    static func readTimerData() -> TimerData {
        guard let defaults = sharedDefaults else {
            print("❌ Failed to access shared UserDefaults from widget")
            return TimerData.inactive
        }
        
        guard let data = defaults.data(forKey: timerDataKey) else {
            print("ℹ️ No timer data found in shared storage")
            return TimerData.inactive
        }
        
        do {
            let decoder = JSONDecoder()
            let timerData = try decoder.decode(TimerData.self, from: data)
            
            // Check if data is stale (older than 24 hours)
            let hoursSinceUpdate = Date().timeIntervalSince(timerData.lastUpdated) / 3600
            if hoursSinceUpdate > 24 {
                print("⚠️ Timer data is stale (>24 hours old)")
                return TimerData.inactive
            }
            
            print("✅ Timer data read from shared storage: isActive=\(timerData.isActive)")
            return timerData
            
        } catch {
            print("❌ Failed to decode timer data: \(error)")
            return TimerData.inactive
        }
    }
    
    /// Check if widget needs update
    static func widgetNeedsUpdate() -> Bool {
        guard let defaults = sharedDefaults else {
            return false
        }
        
        let needsUpdate = defaults.bool(forKey: widgetNeedsUpdateKey)
        if needsUpdate {
            // Reset the flag after reading
            defaults.set(false, forKey: widgetNeedsUpdateKey)
            defaults.synchronize()
        }
        return needsUpdate
    }
    
    // MARK: - Debug Methods
    
    /// Print all shared data for debugging
    static func debugPrintSharedData() {
        guard let defaults = sharedDefaults else {
            print("❌ Cannot access shared UserDefaults for debugging")
            return
        }
        
        print("=== Shared Data Debug ===")
        print("App Group: \(appGroupIdentifier)")
        
        if let data = defaults.data(forKey: timerDataKey),
           let timerData = try? JSONDecoder().decode(TimerData.self, from: data) {
            print("Timer Active: \(timerData.isActive)")
            print("Job Name: \(timerData.jobName)")
            print("Location: \(timerData.location ?? "N/A")")
            print("Start Time: \(timerData.startTime?.description ?? "N/A")")
            print("Last Updated: \(timerData.lastUpdated)")
        } else {
            print("No timer data found")
        }
        
        print("Widget Needs Update: \(defaults.bool(forKey: widgetNeedsUpdateKey))")
        print("========================")
    }
}