//
//  WorkTrackIntents.swift
//  WorkTrackWidget
//
//  Created by Assistant on 12/8/25.
//

import AppIntents
import ActivityKit
import Foundation

// Intent para pausar/reanudar el timer
struct TogglePauseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Toggle Pause"
    static var description = IntentDescription("Pause or resume the timer")
    
    func perform() async throws -> some IntentResult {
        // Obtener todas las Live Activities activas
        for activity in Activity<WorkTrackWidgetAttributes>.activities {
            // Toggle el estado de pausa
            let currentState = activity.contentState
            let newState = WorkTrackWidgetAttributes.ContentState(
                elapsedSeconds: currentState.elapsedSeconds,
                isRunning: !currentState.isRunning
            )
            
            await activity.update(
                ActivityContent(
                    state: newState,
                    staleDate: nil
                )
            )
            
            // Notificar a la app principal
            NotificationCenter.default.post(
                name: Notification.Name("LiveActivityTogglePause"),
                object: nil,
                userInfo: ["isRunning": newState.isRunning]
            )
        }
        
        return .result()
    }
}

// Intent para detener el timer
struct StopTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Stop Timer"
    static var description = IntentDescription("Stop the timer and end tracking")
    
    func perform() async throws -> some IntentResult {
        // Terminar todas las Live Activities
        for activity in Activity<WorkTrackWidgetAttributes>.activities {
            await activity.end(
                ActivityContent(
                    state: WorkTrackWidgetAttributes.ContentState(
                        elapsedSeconds: activity.contentState.elapsedSeconds,
                        isRunning: false
                    ),
                    staleDate: nil
                ),
                dismissalPolicy: .immediate
            )
            
            // Notificar a la app principal
            NotificationCenter.default.post(
                name: Notification.Name("LiveActivityStop"),
                object: nil
            )
        }
        
        return .result()
    }
}