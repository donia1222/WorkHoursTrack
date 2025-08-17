////
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
        HStack(spacing: 10) {
            // Left side - Timer indicator
            VStack(spacing: 2) {
                Image(systemName: "timer.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.green)
                
                Text("ACTIVE")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.green)
            }
            
            // Middle - Job info
            VStack(alignment: .leading, spacing: 2) {
                Text(jobName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Right side - Start time
            VStack(alignment: .trailing, spacing: 1) {
                Text("Started")
                    .font(.system(size: 9))
                    .foregroundColor(.white.opacity(0.6))
                
                Text(startTimeString)
                    .font(.system(size: 20, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.green.opacity(0.15))
        )
    }
}
