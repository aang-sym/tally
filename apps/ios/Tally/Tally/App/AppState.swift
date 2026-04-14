import Foundation

@Observable
final class AppState {
    enum AuthState {
        case unknown
        case unauthenticated
        case authenticated(AuthenticatedUser)
    }

    private(set) var authState: AuthState = .unknown

    init() {
        restoreSession()
    }

    func restoreSession() {
        guard let token = KeychainStore.load(key: "auth_token"),
              let id = UserDefaults.standard.string(forKey: "auth_id"),
              let email = UserDefaults.standard.string(forKey: "auth_email")
        else {
            authState = .unauthenticated
            return
        }
        let displayName = UserDefaults.standard.string(forKey: "auth_display_name") ?? email
        authState = .authenticated(AuthenticatedUser(id: id, email: email, displayName: displayName, token: token))
    }

    func login(_ user: AuthenticatedUser) {
        KeychainStore.save(key: "auth_token", value: user.token)
        UserDefaults.standard.set(user.id, forKey: "auth_id")
        UserDefaults.standard.set(user.email, forKey: "auth_email")
        UserDefaults.standard.set(user.displayName, forKey: "auth_display_name")
        authState = .authenticated(user)
    }

    func logout() {
        KeychainStore.delete(key: "auth_token")
        UserDefaults.standard.removeObject(forKey: "auth_id")
        UserDefaults.standard.removeObject(forKey: "auth_email")
        UserDefaults.standard.removeObject(forKey: "auth_display_name")
        authState = .unauthenticated
    }
}
