//
//  SubscriptionDropdownButton.swift
//  Tally
//
//  Circular liquid glass button to navigate to subscriptions list
//

import SwiftUI

struct SubscriptionDropdownButton: View {
    var body: some View {
        Image(systemName: "square.stack.3d.up")
            .font(.system(size: 18, weight: .medium))
            .foregroundColor(.textPrimary)
            .frame(width: 40, height: 40)
            .background(
                Circle()
                    .fill(Color.black.opacity(0.3))
                    .background(
                        Circle()
                            .fill(.ultraThinMaterial)
                    )
            )
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Subscription Button") {
    VStack {
        SubscriptionDropdownButton()
    }
    .padding()
    .background(Color.background)
}
#endif
