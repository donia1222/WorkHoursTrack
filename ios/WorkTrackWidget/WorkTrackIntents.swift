//
//  WorkTrackIntents.swift
//  WorkTrackWidget
//
//  Created by Assistant on 12/8/25.
//

import AppIntents
import ActivityKit
import Foundation

// Intent para detener el timer
struct StopTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Stop Timer"
    
    func perform() async throws -> some IntentResult {
        // Terminar TODAS las Live Activities inmediatamente
        let activities = Activity<WorkTrackWidgetAttributes>.activities
        print("🛑 STOP: Found \(activities.count) activities to terminate")
        
        for activity in activities {
            print("  Terminating activity: \(activity.id)")
            await activity.end(dismissalPolicy: .immediate)
        }
        
        print("✅ All Live Activities terminated")
        return .result()
    }
}