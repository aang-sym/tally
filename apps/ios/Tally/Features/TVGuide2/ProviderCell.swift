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
    private let nameLabel = UILabel()
    private let separatorView = UIView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .secondarySystemBackground

        // Provider logo
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.layer.cornerRadius = 8
        logoImageView.clipsToBounds = true
        logoImageView.backgroundColor = .systemBackground
        logoImageView.translatesAutoresizingMaskIntoConstraints = false

        // Provider name
        nameLabel.font = .systemFont(ofSize: 12, weight: .medium)
        nameLabel.textColor = .secondaryLabel
        nameLabel.textAlignment = .center
        nameLabel.numberOfLines = 2
        nameLabel.translatesAutoresizingMaskIntoConstraints = false

        // Separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(logoImageView)
        addSubview(nameLabel)
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Logo centered
            logoImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -8),
            logoImageView.widthAnchor.constraint(equalToConstant: 40),
            logoImageView.heightAnchor.constraint(equalToConstant: 40),

            // Name below logo
            nameLabel.topAnchor.constraint(equalTo: logoImageView.bottomAnchor, constant: 4),
            nameLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            nameLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),

            // Separator on right
            separatorView.topAnchor.constraint(equalTo: topAnchor),
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.widthAnchor.constraint(equalToConstant: 1)
        ])
    }

    func configure(with provider: TVGuide2Provider) {
        nameLabel.text = provider.name

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
        let size = CGSize(width: 40, height: 40)
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

    override func prepareForReuse() {
        super.prepareForReuse()
        logoImageView.image = nil
        nameLabel.text = nil
    }
}