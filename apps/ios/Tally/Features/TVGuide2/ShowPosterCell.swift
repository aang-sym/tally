//
//  ShowPosterCell.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class ShowPosterCell: UICollectionViewCell {
    static let identifier = "ShowPosterCell"

    private let posterImageView = UIImageView()
    private let titleLabel = UILabel()
    private let separatorView = UIView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .systemBackground

        // Poster image
        posterImageView.contentMode = .scaleAspectFit
        posterImageView.layer.cornerRadius = 6
        posterImageView.clipsToBounds = true
        posterImageView.backgroundColor = .systemGray6
        posterImageView.translatesAutoresizingMaskIntoConstraints = false

        // Title label
        titleLabel.font = .systemFont(ofSize: 11, weight: .medium)
        titleLabel.textColor = .label
        titleLabel.numberOfLines = 2
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        // Separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(posterImageView)
        addSubview(titleLabel)
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Poster on left side
            posterImageView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            posterImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            posterImageView.widthAnchor.constraint(equalToConstant: 45),
            posterImageView.heightAnchor.constraint(equalToConstant: 60),

            // Title to the right of poster
            titleLabel.leadingAnchor.constraint(equalTo: posterImageView.trailingAnchor, constant: 8),
            titleLabel.trailingAnchor.constraint(equalTo: separatorView.leadingAnchor, constant: -8),
            titleLabel.centerYAnchor.constraint(equalTo: centerYAnchor),

            // Separator on right edge
            separatorView.topAnchor.constraint(equalTo: topAnchor),
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.widthAnchor.constraint(equalToConstant: 1)
        ])
    }

    func configure(with show: TVGuide2Show) {
        titleLabel.text = show.title

        // Load poster image
        if let posterPath = show.posterPath, !posterPath.isEmpty {
            loadPosterImage(from: posterPath)
        } else {
            posterImageView.image = createPlaceholderPoster(for: show.title)
        }
    }

    private func loadPosterImage(from path: String) {
        guard let url = URL(string: "https://image.tmdb.org/t/p/w154\(path)") else {
            posterImageView.image = createPlaceholderPoster(for: "")
            return
        }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        posterImageView.image = image
                    }
                }
            } catch {
                await MainActor.run {
                    posterImageView.image = createPlaceholderPoster(for: "")
                }
            }
        }
    }

    private func createPlaceholderPoster(for title: String) -> UIImage? {
        let size = CGSize(width: 45, height: 60)
        let renderer = UIGraphicsImageRenderer(size: size)

        return renderer.image { context in
            // Background
            UIColor.systemGray5.setFill()
            context.fill(CGRect(origin: .zero, size: size))

            // Border
            UIColor.systemGray3.setStroke()
            context.stroke(CGRect(origin: .zero, size: size))

            // Title text (first few letters)
            let displayText = String(title.prefix(3)).uppercased()
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10, weight: .medium),
                .foregroundColor: UIColor.secondaryLabel
            ]

            let textSize = displayText.size(withAttributes: attributes)
            let textRect = CGRect(
                x: (size.width - textSize.width) / 2,
                y: (size.height - textSize.height) / 2,
                width: textSize.width,
                height: textSize.height
            )

            displayText.draw(in: textRect, withAttributes: attributes)
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        posterImageView.image = nil
        titleLabel.text = nil
    }
}