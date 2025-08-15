//
//  ActiveTimerView.swift
//  WorkTrackWidget
//

import SwiftUI
import WidgetKit

struct ActiveTimerView: View {
    let jobName: String
    let location: String?
    let startTime: Date
    let isCompact: Bool
    
    private var startTimeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: startTime)
    }
    
    private var startDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: startTime)
    }
    
    var body: some View {
        VStack(spacing: isCompact ? 4 : 8) {
            // Timer status header
            HStack(spacing: 6) {
                // Animated timer icon
                Image(systemName: "timer")
                    .font(.system(size: isCompact ? 14 : 16, weight: .bold))
                    .foregroundColor(.green)
                
                Text("TIMER ACTIVE")
                    .font(.system(size: isCompact ? 12 : 14, weight: .bold))
                    .foregroundColor(.green)
                
                Spacer()
            }
            
            // Job info
            VStack(alignment: .leading, spacing: 2) {
                Text(jobName)
                    .font(.system(size: isCompact ? 16 : 20, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                if let location = location, !location.isEmpty {
                    Text(location)
                        .font(.system(size: isCompact ? 11 : 13))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Start time display
            VStack(spacing: 4) {
                HStack(spacing: 8) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: isCompact ? 20 : 24))
                        .foregroundColor(.green)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Started at")
                            .font(.system(size: isCompact ? 11 : 13))
                            .foregroundColor(.white.opacity(0.7))
                        
                        Text(startTimeString)
                            .font(.system(size: isCompact ? 24 : 30, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                }
                
                Text(startDateString)
                    .font(.system(size: isCompact ? 10 : 12))
                    .foregroundColor(.white.opacity(0.6))
            }
            .padding(.vertical, isCompact ? 6 : 10)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.green.opacity(0.15))
            )
        }
        .padding(isCompact ? 8 : 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.08))
        )
    }
}

// Compact version for small widget
struct CompactTimerView: View {
    let jobName: String
    let startTime: Date
    
    private var startTimeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: startTime)
    }
    
    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Image(systemName: "timer.circle.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.green)
                
                Text("ACTIVE")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.green)
                
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(jobName)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                HStack(spacing: 3) {
                    Image(systemName: "clock")
                        .font(.system(size: 9))
                        .foregroundColor(.white.opacity(0.7))
                    
                    Text("Since \(startTimeString)")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.green.opacity(0.15))
        )
    }
}