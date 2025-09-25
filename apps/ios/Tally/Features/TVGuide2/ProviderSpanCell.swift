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
        logoImageView.layer.cornerRadius = 24 // Circular (48pt diameter / 2)
        logoImageView.clipsToBounds = true
        logoImageView.backgroundColor = .clear
        logoImageView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(logoImageView)

        // Store reference to width constraint for dynamic resizing
        logoWidthConstraint = logoImageView.widthAnchor.constraint(equalToConstant: 48)

        NSLayoutConstraint.activate([
            // Logo centered
            logoImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            logoWidthConstraint,
            logoImageView.heightAnchor.constraint(equalToConstant: 48)
        ])
    }

    func configure(with providerSpan: Any) {
        // Type casting since we can't import the ViewController's nested struct here
        guard let spanMirror = Mirror(reflecting: providerSpan).children.first?.value,
              let provider = Mirror(reflecting: spanMirror).children.first(where: { $0.label == "provider" })?.value as? TVGuide2Provider else {
            return
        }

        // Load provider logo
        if let logoPath = provider.logoPath, !logoPath.isEmpty {
            loadImage(from: logoPath)
        } else {
            // Fallback to first letter of provider name
            logoImageView.image = createPlaceholderImage(for: provider.name)
        }

        // Set accessibility label since we removed text labels
        accessibilityLabel = provider.name
        accessibilityHint = "Provider logo"
    }

    private func loadImage(from path: String) {
        // Simple image loading - in production, use a proper image cache
        guard let url = URL(string: "https://image.tmdb.org/t/p/w92\(path)") else {
            logoImageView.image = createPlaceholderImage(for: "")
            return
        }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        logoImageView.image = image
                    }
                }
            } catch {
                await MainActor.run {
                    logoImageView.image = createPlaceholderImage(for: "")
                }
            }
        }
    }

    private func createPlaceholderImage(for name: String) -> UIImage? {
        let size = CGSize(width: 48, height: 48)
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

            // Add debug border to icon
            logoImageView.layer.cornerRadius = min(logoImageView.bounds.width, logoImageView.bounds.height) / 2
            logoImageView.clipsToBounds = true
            logoImageView.layer.borderColor = TVGV.debugHeaderColor
            logoImageView.layer.borderWidth = 0.5
        } else {
            contentView.layer.borderWidth = 0.0
            logoImageView.layer.borderWidth = 0.0
        }

        // Debug border for provider header cells alignment
        layer.borderColor = UIColor.red.cgColor
        layer.borderWidth = 1
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