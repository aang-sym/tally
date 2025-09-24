//
//  ShowPosterCell.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class ShowPosterCell: UICollectionViewCell {
    static let identifier = "ShowPosterCell"

    enum DisplaySize {
        case row    // Horizontal row layout (original)
        case grid   // Vertical grid layout (new)
    }

    private let posterImageView = UIImageView()
    private let titleLabel = UILabel()
    private let episodeBadge = UILabel()
    private let separatorView = UIView()

    private var currentSize: DisplaySize = .row
    private var posterWidthConstraint: NSLayoutConstraint?
    private var posterHeightConstraint: NSLayoutConstraint?
    private var titleLeadingConstraint: NSLayoutConstraint?
    private var titleTopConstraint: NSLayoutConstraint?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .black // Dark theme for grid mode

        // Poster image
        posterImageView.contentMode = .scaleAspectFit
        posterImageView.layer.cornerRadius = 8
        posterImageView.clipsToBounds = true
        posterImageView.translatesAutoresizingMaskIntoConstraints = false

        // Title label
        titleLabel.font = .systemFont(ofSize: 11, weight: .medium)
        titleLabel.textColor = .white // Dark theme
        titleLabel.numberOfLines = 2
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        // Episode badge (for grid layout)
        episodeBadge.font = .systemFont(ofSize: 9, weight: .semibold)
        episodeBadge.textColor = .white
        episodeBadge.backgroundColor = .systemBlue
        episodeBadge.textAlignment = .center
        episodeBadge.layer.cornerRadius = 8
        episodeBadge.clipsToBounds = true
        episodeBadge.isHidden = true
        episodeBadge.translatesAutoresizingMaskIntoConstraints = false

        // Separator (for row layout)
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false

        contentView.addSubview(posterImageView)
        contentView.addSubview(titleLabel)
        contentView.addSubview(episodeBadge)
        contentView.addSubview(separatorView)

        setupRowLayout() // Default layout
    }

    private func setupRowLayout() {
        currentSize = .row

        // Clear existing constraints
        posterImageView.removeFromSuperview()
        titleLabel.removeFromSuperview()
        episodeBadge.removeFromSuperview()
        separatorView.removeFromSuperview()

        contentView.addSubview(posterImageView)
        contentView.addSubview(titleLabel)
        contentView.addSubview(episodeBadge)
        contentView.addSubview(separatorView)

        posterWidthConstraint = posterImageView.widthAnchor.constraint(equalToConstant: 45)
        posterHeightConstraint = posterImageView.heightAnchor.constraint(equalToConstant: 60)
        titleLeadingConstraint = titleLabel.leadingAnchor.constraint(equalTo: posterImageView.trailingAnchor, constant: 8)

        NSLayoutConstraint.activate([
            // Poster on left side
            posterImageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            posterImageView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            posterWidthConstraint!,
            posterHeightConstraint!,

            // Title to the right of poster
            titleLeadingConstraint!,
            titleLabel.trailingAnchor.constraint(equalTo: separatorView.leadingAnchor, constant: -8),
            titleLabel.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),

            // Separator on right edge
            separatorView.topAnchor.constraint(equalTo: contentView.topAnchor),
            separatorView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            separatorView.widthAnchor.constraint(equalToConstant: 1),

            // Hide episode badge in row layout
            episodeBadge.widthAnchor.constraint(equalToConstant: 0),
            episodeBadge.heightAnchor.constraint(equalToConstant: 0)
        ])

        separatorView.isHidden = false
        episodeBadge.isHidden = true
    }

    private func setupGridLayout() {
        currentSize = .grid

        // Clear existing constraints
        contentView.subviews.forEach { $0.removeFromSuperview() }

        contentView.addSubview(posterImageView)
        contentView.addSubview(titleLabel)
        contentView.addSubview(episodeBadge)

        posterWidthConstraint = posterImageView.widthAnchor.constraint(equalToConstant: 90)
        posterHeightConstraint = posterImageView.heightAnchor.constraint(equalToConstant: 120)
        titleTopConstraint = titleLabel.topAnchor.constraint(equalTo: posterImageView.bottomAnchor, constant: 4)

        NSLayoutConstraint.activate([
            // Poster centered at top
            posterImageView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            posterImageView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            posterWidthConstraint!,
            posterHeightConstraint!,

            // Title below poster
            titleTopConstraint!,
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 4),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -4),

            // Episode badge on top-right corner of poster
            episodeBadge.topAnchor.constraint(equalTo: posterImageView.topAnchor, constant: 4),
            episodeBadge.trailingAnchor.constraint(equalTo: posterImageView.trailingAnchor, constant: -4),
            episodeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 30),
            episodeBadge.heightAnchor.constraint(equalToConstant: 16)
        ])

        separatorView.isHidden = true
        episodeBadge.isHidden = false
    }

    func configure(with show: TVGuide2Show, episode: TVGuide2Episode? = nil, size: DisplaySize = .row) {
        if currentSize != size {
            if size == .grid {
                setupGridLayout()
            } else {
                setupRowLayout()
            }
        }

        titleLabel.text = show.title

        // Configure episode badge for grid layout
        if let episode = episode, size == .grid {
            episodeBadge.text = " S\(episode.seasonNumber)E\(episode.episodeNumber) "
            episodeBadge.isHidden = false
        } else {
            episodeBadge.isHidden = true
        }

        // Load poster image
        if let posterPath = show.posterPath, !posterPath.isEmpty {
            loadPosterImage(from: posterPath)
        } else {
            posterImageView.image = createPlaceholderPoster(for: show.title, size: size)
        }
    }

    private func loadPosterImage(from path: String) {
        guard let url = URL(string: "https://image.tmdb.org/t/p/w154\(path)") else {
            posterImageView.image = createPlaceholderPoster(for: "", size: currentSize)
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
                    posterImageView.image = createPlaceholderPoster(for: "", size: currentSize)
                }
            }
        }
    }

    private func createPlaceholderPoster(for title: String, size: DisplaySize) -> UIImage? {
        let imageSize: CGSize
        let fontSize: CGFloat

        switch size {
        case .row:
            imageSize = CGSize(width: 45, height: 60)
            fontSize = 10
        case .grid:
            imageSize = CGSize(width: 90, height: 120)
            fontSize = 14
        }

        let renderer = UIGraphicsImageRenderer(size: imageSize)

        return renderer.image { context in
            // Background
            UIColor.systemGray5.setFill()
            context.fill(CGRect(origin: .zero, size: imageSize))

            // Border
            UIColor.systemGray3.setStroke()
            context.stroke(CGRect(origin: .zero, size: imageSize))

            // Title text (first few letters)
            let displayText = String(title.prefix(3)).uppercased()
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: fontSize, weight: .medium),
                .foregroundColor: UIColor.secondaryLabel
            ]

            let textSize = displayText.size(withAttributes: attributes)
            let textRect = CGRect(
                x: (imageSize.width - textSize.width) / 2,
                y: (imageSize.height - textSize.height) / 2,
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
