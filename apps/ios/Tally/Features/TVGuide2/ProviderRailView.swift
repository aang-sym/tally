//
//  ProviderRailView.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class ProviderRailView: UICollectionReusableView {
    static let identifier = "ProviderRailView"

    // MARK: - UI Elements
    private let logoImageView = UIImageView()
    private let separatorView = UIView()

    // MARK: - Layout Constants
    private let logoSize: CGFloat = 36

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .clear

        // Setup logo image view
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.clipsToBounds = true
        logoImageView.layer.cornerRadius = logoSize / 2  // Circular
        logoImageView.backgroundColor = .systemGray6
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(logoImageView)

        // Setup separator (subtle vertical line at trailing edge)
        separatorView.backgroundColor = UIColor(white: 0.9, alpha: 0.5)
        separatorView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Center logo in the rail
            logoImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            logoImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            logoImageView.widthAnchor.constraint(equalToConstant: logoSize),
            logoImageView.heightAnchor.constraint(equalToConstant: logoSize),

            // Separator at trailing edge
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.topAnchor.constraint(equalTo: topAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.widthAnchor.constraint(equalToConstant: 1 / UIScreen.main.scale)
        ])
    }

    func configure(with provider: TVGuide2Provider) {
        loadProviderLogo(from: provider.logoPath)
    }

    private func loadProviderLogo(from path: String?) {
        guard let path = path, !path.isEmpty else {
            logoImageView.image = UIImage(systemName: "tv")
            return
        }

        guard let url = URL(string: path) else {
            logoImageView.image = UIImage(systemName: "tv")
            return
        }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        self.logoImageView.image = image
                    }
                }
            } catch {
                await MainActor.run {
                    self.logoImageView.image = UIImage(systemName: "tv")
                }
            }
        }
    }
}