import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        switch appState.authState {
        case .unknown:
            ProgressView()
        case .unauthenticated:
            LoginView()
        case .authenticated(let user):
            let api = ApiClient()
            let _ = api.setAuthentication(user: user)
            DashboardView(api: api)
        }
    }
}
