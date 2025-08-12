//
//  WorkTrackWidgetLiveActivity.swift
//  WorkTrackWidget
//
//  Created by roberto on 12/8/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct WorkTrackWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkTrackWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here - Diseño mejorado
            HStack(spacing: 16) {
                // Ícono principal con fondo
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.15))
                        .frame(width: 45, height: 45)
                    Image(systemName: "timer")
                        .font(.system(size: 22))
                        .foregroundColor(.blue)
                }
                
                // Información del trabajo
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.jobName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.blue)
                        .lineLimit(1)
                    
                    HStack(spacing: 4) {
                        Image(systemName: "location.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                        Text(context.attributes.location)
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                            .lineLimit(1)
                    }
                }
                
                Spacer()
                
                // Timer con estado
                VStack(alignment: .trailing, spacing: 2) {
                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.system(size: 20, weight: .medium, design: .monospaced))
                        .foregroundColor(.blue)
                    
                    HStack(spacing: 4) {
                        Circle()
                            .fill(context.state.isRunning ? Color.green : Color.orange)
                            .frame(width: 6, height: 6)
                        Text(context.state.isRunning ? "Activo" : "Pausado")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(context.state.isRunning ? .green : .orange)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .activityBackgroundTint(Color(UIColor.systemBackground))
            .activitySystemActionForegroundColor(Color.blue)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "timer")
                            .foregroundColor(.blue)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.jobName)
                                .font(.caption)
                                .lineLimit(1)
                            Text(context.attributes.location)
                                .font(.caption2)
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.system(.title2, design: .monospaced))
                        .foregroundColor(.blue)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Label("Iniciado", systemImage: "clock")
                            .font(.caption)
                        Spacer()
                        Text(context.attributes.startTime, style: .time)
                            .font(.caption)
                    }
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(.blue)
            } compactTrailing: {
                Text(formatTimeCompact(context.state.elapsedSeconds))
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(.blue)
            } minimal: {
                Image(systemName: "timer.circle.fill")
                    .foregroundColor(.blue)
            }
            .widgetURL(URL(string: "worktrack://timer"))
            .keylineTint(Color.blue)
        }
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, secs)
    }
    
    private func formatTimeCompact(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 {
            return String(format: "%dh %dm", hours, minutes)
        } else {
            return String(format: "%dm", minutes)
        }
    }
}

// Previews para desarrollo
extension WorkTrackWidgetAttributes {
    static var preview: WorkTrackWidgetAttributes {
        WorkTrackWidgetAttributes(
            jobName: "Oficina Principal",
            location: "Calle Mayor 123",
            startTime: Date()
        )
    }
}

extension WorkTrackWidgetAttributes.ContentState {
    static var running: WorkTrackWidgetAttributes.ContentState {
        WorkTrackWidgetAttributes.ContentState(
            elapsedSeconds: 3661,
            isRunning: true
        )
    }
     
    static var paused: WorkTrackWidgetAttributes.ContentState {
        WorkTrackWidgetAttributes.ContentState(
            elapsedSeconds: 7200,
            isRunning: false
        )
    }
}

#Preview("Notification", as: .content, using: WorkTrackWidgetAttributes.preview) {
   WorkTrackWidgetLiveActivity()
} contentStates: {
    WorkTrackWidgetAttributes.ContentState.running
    WorkTrackWidgetAttributes.ContentState.paused
}