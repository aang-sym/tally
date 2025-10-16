//
//  DashboardSearchBar.swift
//  Tally
//
//  Liquid glass search bar for dashboard
//

import SwiftUI

struct DashboardSearchBar: View {
    @Binding var query: String
    @Binding var isActive: Bool
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: 12) {
            // Search icon or back button (animated)
            Button(action: {
                if isActive {
                    // Dismiss search
                    query = ""
                    isActive = false
                    isFocused = false
                }
            }) {
                Image(systemName: isActive ? "chevron.left" : "magnifyingglass")
                    .foregroundColor(.textSecondary)
                    .font(.system(size: 16, weight: .medium))
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.plain)
            .disabled(!isActive) // Only tappable when search is active

            // Text field
            TextField("Search shows...", text: $query)
                .textFieldStyle(.plain)
                .font(.bodyMedium)
                .foregroundColor(.textPrimary)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
                .focused($isFocused)
                .onSubmit {
                    // Trigger search on return key
                    if !query.isEmpty {
                        isActive = true
                    }
                }

            // Clear button (only when text exists)
            if !query.isEmpty {
                Button(action: {
                    query = ""
                    isActive = false
                    isFocused = false
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textSecondary)
                        .font(.system(size: 16))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background {
            if !isActive {
                // Add semi-transparent dark overlay when inactive to dim logos behind
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.black.opacity(0.6))
            }
        }
        .glassEffect(.clear, in: .rect(cornerRadius: 20))
        .onChange(of: isFocused) { _, newValue in
            // When field gets focus, activate search
            if newValue {
                isActive = true
            }
        }
        .onChange(of: isActive) { _, newValue in
            // When search is deactivated, remove focus (removes cursor)
            if !newValue {
                isFocused = false
            }
        }
        .onChange(of: query) { _, newValue in
            // Activate search when typing (only if not already active)
            if !newValue.isEmpty && !isActive {
                isActive = true
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Search Bar Inactive") {
    @Previewable @State var query = ""
    @Previewable @State var isActive = false

    VStack {
        DashboardSearchBar(query: $query, isActive: $isActive)
            .padding()

        Text("Active: \(isActive ? "Yes" : "No")")
            .font(.caption)
            .foregroundColor(.secondary)

        Spacer()
    }
    .background(Color.background)
}

#Preview("Search Bar Active") {
    @Previewable @State var query = "Breaking Bad"
    @Previewable @State var isActive = true

    VStack {
        DashboardSearchBar(query: $query, isActive: $isActive)
            .padding()

        Text("Active: \(isActive ? "Yes" : "No")")
            .font(.caption)
            .foregroundColor(.secondary)

        Spacer()
    }
    .background(Color.background)
}
#endif
