//
//  ProviderCell.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class ProviderCell: UICollectionViewCell {
    static let identifier = "ProviderCell"

    private let logoImageView = UIImageView()
    private let separatorView = UIView()

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

        // Separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(logoImageView)
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Logo centered - larger for header cell
            logoImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            logoImageView.widthAnchor.constraint(equalToConstant: TVGV.providerLogoDiameter),
            logoImageView.heightAnchor.constraint(equalToConstant: TVGV.providerLogoDiameter),

            // Separator on right
            separatorView.topAnchor.constraint(equalTo: topAnchor),
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.widthAnchor.constraint(equalToConstant: 1)
        ])
    }

    func configure(with provider: TVGuide2Provider, span: Int = 1) {
        // Load provider logo
        if let logoPath = provider.logoPath, !logoPath.isEmpty {
            loadImage(from: logoPath)
        } else {
            // Fallback to first letter of provider name
            logoImageView.image = createPlaceholderImage(for: provider.name)
        }
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
                .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
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
}
