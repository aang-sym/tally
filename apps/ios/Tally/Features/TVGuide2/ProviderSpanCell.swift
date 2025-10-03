//
//  ProviderSpanCell.swift
//  Tally
//
//  Created by Angus Symons on 24/9/2025.
//

import UIKit

class ProviderSpanCell: UICollectionViewCell {
    static let identifier = "ProviderSpanCell"

    private let logoImageView = UIImageView()

    // Dynamic width constraint that can be updated based on span
    private var logoWidthConstraint: NSLayoutConstraint!

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .systemBackground // Light theme

        // Provider logo
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.layer.cornerRadius = TVGV.providerLogoDiameter / 2
        logoImageView.clipsToBounds = true
        logoImageView.backgroundColor = .clear
        logoImageView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(logoImageView)

        // Store reference to width constraint for dynamic resizing
        logoWidthConstraint = logoImageView.widthAnchor.constraint(equalToConstant: TVGV.providerLogoDiameter)

        NSLayoutConstraint.activate([
            // Logo centered
            logoImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            logoWidthConstraint,
            logoImageView.heightAnchor.constraint(equalToConstant: TVGV.providerLogoDiameter)
        ])
    }

    func configure(with providerSpan: TVGuideVertViewController.ViewControllerProviderSpan) {
        let provider = providerSpan.provider
        print("ProviderSpanCell: configuring provider=\(provider.name) logoPath=\(provider.logoPath ?? "nil")")

        // Load provider logo
        if let logoPath = provider.logoPath, !logoPath.isEmpty {
            loadImage(from: logoPath, providerName: provider.name)
        } else {
            print("ProviderSpanCell: missing logoPath for provider \(provider.name)")
            logoImageView.image = createPlaceholderImage(for: provider.name)
        }

        // Set accessibility label since we removed text labels
        accessibilityLabel = provider.name
        accessibilityHint = "Provider logo"
    }

    private func loadImage(from path: String, providerName: String) {
        guard let url = normalizeLogoURL(from: path) else {
            print("ProviderSpanCell: invalid logo URL for provider \(providerName): \(path)")
            return
        }

        print("ProviderSpanCell: fetching logo for \(providerName) path=\(path) resolvedURL=\(url.absoluteString)")

        Task {
            do {
                let (data, response) = try await URLSession.shared.data(from: url)

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                    print("ProviderSpanCell: HTTP \(httpResponse.statusCode) for provider \(providerName) at URL \(url)")
                }

                if let image = UIImage(data: data) {
                    await MainActor.run {
                        logoImageView.image = image
                        print("ProviderSpanCell: applied logo image for \(providerName)")
                    }
                } else {
                    print("ProviderSpanCell: received empty image data for provider \(providerName) from \(url)")
                }
            } catch {
                print("ProviderSpanCell: failed to load logo for provider \(providerName) from \(url): \(error)")
            }
        }
    }

    private func normalizeLogoURL(from rawPath: String) -> URL? {
        let trimmed = rawPath.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if let absoluteURL = URL(string: trimmed), absoluteURL.scheme != nil {
            if absoluteURL.host?.contains("image.tmdb.org") == true,
               let markerRange = absoluteURL.absoluteString.range(of: "/t/p/", options: [.caseInsensitive, .backwards]) {
                let suffix = absoluteURL.absoluteString[markerRange.lowerBound...]
                return URL(string: "https://image.tmdb.org\(suffix)")
            }
            return absoluteURL
        }

        if let markerRange = trimmed.range(of: "/t/p/", options: [.caseInsensitive, .backwards]) {
            let suffix = trimmed[markerRange.lowerBound...]
            return URL(string: "https://image.tmdb.org\(suffix)")
        }

        let ensuredLeadingSlash = trimmed.hasPrefix("/") ? trimmed : "/\(trimmed)"
        return URL(string: "https://image.tmdb.org\(ensuredLeadingSlash)")
    }

    private func createPlaceholderImage(for name: String) -> UIImage? {
        let diameter = TVGV.providerLogoDiameter
        let size = CGSize(width: diameter, height: diameter)
        let renderer = UIGraphicsImageRenderer(size: size)

        return renderer.image { context in
            // Background
            UIColor.systemGray4.setFill()
            context.fill(CGRect(origin: .zero, size: size))

            // First letter
            let firstLetter = String(name.prefix(1)).uppercased()
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 18, weight: .semibold),
                .foregroundColor: UIColor.label
            ]

            let textSize = firstLetter.size(withAttributes: attributes)
            let textRect = CGRect(
                x: (size.width - textSize.width) / 2,
                y: (size.height - textSize.height) / 2,
                width: textSize.width,
                height: textSize.height
            )

            firstLetter.draw(in: textRect, withAttributes: attributes)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        if TVGV.debugBordersEnabled {
            contentView.layer.borderColor = TVGV.debugHeaderColor
            contentView.layer.borderWidth = 0.5

            logoImageView.layer.cornerRadius = min(logoImageView.bounds.width, logoImageView.bounds.height) / 2
            logoImageView.clipsToBounds = true
            logoImageView.layer.borderColor = TVGV.debugHeaderColor
            logoImageView.layer.borderWidth = 0.5

            layer.borderColor = UIColor.red.cgColor
            layer.borderWidth = 1
        } else {
            contentView.layer.borderWidth = 0.0
            logoImageView.layer.borderWidth = 0.0
            layer.borderWidth = 0.0
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        logoImageView.image = nil
    }

    override func preferredLayoutAttributesFitting(_ layoutAttributes: UICollectionViewLayoutAttributes) -> UICollectionViewLayoutAttributes {
        // Allow the cell to dynamically size based on provider span width
        let attributes = super.preferredLayoutAttributesFitting(layoutAttributes)
        return attributes
    }
}
