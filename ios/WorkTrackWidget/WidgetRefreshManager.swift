//
//  WidgetRefreshManager.swift
//  WorkTrackWidget
//
//  Manages widget refresh and cache invalidation
//

import Foundation
import WidgetKit

class WidgetRefreshManager {
    static let shared = WidgetRefreshManager()
    
    private let appGroupIdentifier = "group.com.roberto.worktrack"
    private let dataVersionKey = "WorkTrack.DataVersion"
    private var lastKnownVersion: Int = 0
    private var refreshTimer: Timer?
    
    private init() {
        // Start monitoring for data changes
        startMonitoring()
    }
    
    /// Start monitoring for data version changes
    private func startMonitoring() {
        // Check for version changes every 5 seconds
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            self.checkForDataChanges()
        }
        
        // Also listen for Darwin notifications from the app
        let notificationName = "com.worktrack.widget.refresh" as CFString
        let notificationCenter = CFNotificationCenterGetDarwinNotifyCenter()
        
        CFNotificationCenterAddObserver(
            notificationCenter,
            nil,
            { _, _, _, _, _ in
                DispatchQueue.main.async {
                    print("📱 Received refresh notification from app")
                    WidgetCenter.shared.reloadAllTimelines()
                }
            },
            notificationName,
            nil,
            .deliverImmediately
        )
    }
    
    /// Check if data version has changed and trigger refresh if needed
    private func checkForDataChanges() {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else { return }
        
        // Force synchronization from disk
        sharedDefaults.synchronize()
        CFPreferencesAppSynchronize(appGroupIdentifier as CFString)
        
        let currentVersion = sharedDefaults.integer(forKey: dataVersionKey)
        
        if currentVersion != lastKnownVersion && lastKnownVersion != 0 {
            print("🔄 Data version changed from \(lastKnownVersion) to \(currentVersion) - refreshing widget")
            lastKnownVersion = currentVersion
            WidgetCenter.shared.reloadAllTimelines()
        } else if lastKnownVersion == 0 {
            lastKnownVersion = currentVersion
        }
    }
    
    /// Force immediate refresh of all widget data
    static func forceRefresh() {
        // Invalidate UserDefaults cache
        if let sharedDefaults = UserDefaults(suiteName: WidgetRefreshManager.shared.appGroupIdentifier) {
            sharedDefaults.synchronize()
            CFPreferencesAppSynchronize(WidgetRefreshManager.shared.appGroupIdentifier as CFString)
        }
        
        // Reload all widget timelines
        WidgetCenter.shared.reloadAllTimelines()
    }
    
    deinit {
        refreshTimer?.invalidate()
    }
}