//
//  MediumTimerView.swift
//  WorkTrackWidget
//

import SwiftUI

struct MediumTimerView: View {
    let jobName: String
    let location: String?
    let startTime: Date
    
    private var startTimeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: startTime)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Left side - Timer indicator
            VStack(spacing: 4) {
                Image(systemName: "timer.circle.fill")
                    .font(.system(size: 36))
                    .foregroundColor(.green)
                
                Text("ACTIVE")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.green)
            }
            
            // Middle - Job info
            VStack(alignment: .leading, spacing: 4) {
                Text(jobName)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                if let location = location, !location.isEmpty {
                    Text(location)
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Right side - Start time
            VStack(alignment: .trailing, spacing: 2) {
                Text("Started")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.6))
                
                Text(startTimeString)
                    .font(.system(size: 22, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.green.opacity(0.15))
        )
    }
}