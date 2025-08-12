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
            // Lock screen/banner UI goes here
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "timer")
                        .foregroundColor(.blue)
                    Text(context.attributes.jobName)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Spacer()
                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.system(.title2, design: .monospaced))
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Image(systemName: "location.fill")
                        .foregroundColor(.gray)
                        .font(.caption)
                    Text(context.attributes.location)
                        .font(.caption)
                        .foregroundColor(.gray)
                    Spacer()
                    Text(context.state.isRunning ? "Activo" : "Pausado")
                        .font(.caption)
                        .foregroundColor(context.state.isRunning ? .green : .orange)
                }
            }
            .padding()
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
    fileprivate static var preview: WorkTrackWidgetAttributes {
        WorkTrackWidgetAttributes(
            jobName: "Oficina Principal",
            location: "Calle Mayor 123",
            startTime: Date()
        )
    }
}

extension WorkTrackWidgetAttributes.ContentState {
    fileprivate static var running: WorkTrackWidgetAttributes.ContentState {
        WorkTrackWidgetAttributes.ContentState(
            elapsedSeconds: 3661,
            isRunning: true
        )
    }
     
    fileprivate static var paused: WorkTrackWidgetAttributes.ContentState {
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