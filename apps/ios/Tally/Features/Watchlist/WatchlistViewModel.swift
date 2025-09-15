

import Foundation
import SwiftUI

@MainActor
final class WatchlistViewModel: ObservableObject {
    @Published var shows: [UserShow] = []
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var selectedStatus: ShowStatus = .watching

    func load(api: ApiClient) async {
        isLoading = true
        error = nil
        do {
            let fetched = try await api.getWatchlist(status: selectedStatus)
            self.shows = fetched
        } catch let apiErr as ApiError {
            self.error = Self.describe(apiErr)
        } catch {
            self.error = "Unexpected error: \(error.localizedDescription)"
        }
        isLoading = false
    }

    func refresh(api: ApiClient) async {
        await load(api: api)
    }

    func changeStatus(to status: ShowStatus, api: ApiClient) async {
        guard selectedStatus != status else { return }
        selectedStatus = status
        await load(api: api)
    }
    private static func describe(_ err: ApiError) -> String {
        switch err {
        case .unauthorized:
            return "You need to log in to view your shows."
        case .badStatus(let code):
            return "Server error (\(code)). Please try again."
        case .cannotParse:
            return "We couldn't read the server response."
        case .timeout:
            return "The request timed out. Please check your connection."
        case .network:
            return "You're offline. Please check your internet connection."
        case .underlying(let e):
            return "Something went wrong: \(e.localizedDescription)"
        default:
            return "Something went wrong. Please try again."
        }
    }
}
