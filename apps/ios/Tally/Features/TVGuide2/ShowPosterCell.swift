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
        case row       // Horizontal row layout (original)
        case grid      // Vertical grid layout (new)
        case poster    // Static posters row (no text, no badge)
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
        backgroundColor = .systemBackground // Light theme

        // Poster image
        posterImageView.contentMode = .scaleAspectFit
        posterImageView.layer.cornerRadius = 0 // Square corners to match horizontal guide
        posterImageView.clipsToBounds = true
        posterImageView.translatesAutoresizingMaskIntoConstraints = false

        // Title label
        titleLabel.font = .systemFont(ofSize: 11, weight: .medium)
        titleLabel.textColor = .label // Light theme
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

    private func posterContentSize() -> CGSize {
        let width = max(TVGV.posterWidth - (2 * TVGV.posterHPadding), 0)
        let height = max((TVGV.posterWidth * TVGV.posterAspect) - (2 * TVGV.posterVPadding), 0)
        return CGSize(width: width, height: height)
    }

    private func setupRowLayout() {
        currentSize = .row

        // Clear existing constraints
        deactivateDynamicConstraints()
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

    private func applyPosterSize() {
        guard currentSize != .row else { return }
        let size = posterContentSize()
        posterWidthConstraint?.constant = size.width
        posterHeightConstraint?.constant = size.height
        setNeedsLayout()
        layoutIfNeeded()
    }

    private func deactivateDynamicConstraints() {
        posterWidthConstraint?.isActive = false
        posterHeightConstraint?.isActive = false
        titleTopConstraint?.isActive = false
        titleLeadingConstraint?.isActive = false
        posterWidthConstraint = nil
        posterHeightConstraint = nil
        titleTopConstraint = nil
        titleLeadingConstraint = nil
    }

    private func setupGridLayout() {
        currentSize = .grid

        // Clear existing constraints
        deactivateDynamicConstraints()
        contentView.subviews.forEach { $0.removeFromSuperview() }

        contentView.addSubview(posterImageView)
        contentView.addSubview(titleLabel)
        contentView.addSubview(episodeBadge)

        let size = posterContentSize()
        posterWidthConstraint = posterImageView.widthAnchor.constraint(equalToConstant: size.width)
        posterHeightConstraint = posterImageView.heightAnchor.constraint(equalToConstant: size.height)
        titleTopConstraint = titleLabel.topAnchor.constraint(equalTo: posterImageView.bottomAnchor, constant: 4)

        NSLayoutConstraint.activate([
            // Poster centered at top
            posterImageView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: TVGV.posterVPadding),
            posterImageView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            posterWidthConstraint!,
            posterHeightConstraint!,
            posterImageView.leadingAnchor.constraint(greaterThanOrEqualTo: contentView.leadingAnchor, constant: TVGV.posterHPadding),
            posterImageView.trailingAnchor.constraint(lessThanOrEqualTo: contentView.trailingAnchor, constant: -TVGV.posterHPadding),

            // Title below poster
            titleTopConstraint!,
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: TVGV.posterHPadding),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -TVGV.posterHPadding),

            // Episode badge on top-right corner of poster
            episodeBadge.topAnchor.constraint(equalTo: posterImageView.topAnchor, constant: 4),
            episodeBadge.trailingAnchor.constraint(equalTo: posterImageView.trailingAnchor, constant: -4),
            episodeBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 30),
            episodeBadge.heightAnchor.constraint(equalToConstant: 16)
        ])

        separatorView.isHidden = true
        episodeBadge.isHidden = false

        applyPosterSize()
    }

    private func setupPosterLayout() {
        currentSize = .poster

        // Clear existing constraints
        deactivateDynamicConstraints()
        contentView.subviews.forEach { $0.removeFromSuperview() }

        // Only add poster image for static posters row
        contentView.addSubview(posterImageView)

        let size = posterContentSize()
        posterWidthConstraint = posterImageView.widthAnchor.constraint(equalToConstant: size.width)
        posterHeightConstraint = posterImageView.heightAnchor.constraint(equalToConstant: size.height)

        NSLayoutConstraint.activate([
            // Poster centered in cell
            posterImageView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            posterImageView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            posterWidthConstraint!,
            posterHeightConstraint!
        ])

        // Hide all other elements
        separatorView.isHidden = true
        episodeBadge.isHidden = true

        applyPosterSize()
    }

    func configure(with show: TVGuide2Show, episode: TVGuide2Episode? = nil, size: DisplaySize = .row) {
        if currentSize != size {
            switch size {
            case .grid:
                setupGridLayout()
            case .poster:
                setupPosterLayout()
            case .row:
                setupRowLayout()
            }
        }

        if size != .row {
            applyPosterSize()
        }

        // Only show title for row and grid layouts (not for static posters)
        if size != .poster {
            titleLabel.text = show.title
        }

        // Configure episode badge for grid layout only
        if let episode = episode, size == .grid {
            episodeBadge.text = " S\(episode.seasonNumber)E\(episode.episodeNumber) "
            episodeBadge.isHidden = false
        } else {
            episodeBadge.isHidden = true
        }

        // Set accessibility label for static posters (since no text is shown)
        if size == .poster {
            accessibilityLabel = show.title
            accessibilityHint = "Show poster"
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
                        if currentSize != .row {
                            applyPosterSize()
                        }
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
            imageSize = posterContentSize()
            fontSize = 14
        case .poster:
            imageSize = posterContentSize()
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

    override func layoutSubviews() {
        super.layoutSubviews()
        if TVGV.debugBordersEnabled {
            contentView.layer.borderColor = TVGV.debugPosterColor
            contentView.layer.borderWidth = 0.5

            // Add debug border to poster image
            posterImageView.layer.cornerRadius = 0 // per spec: no rounded corners
            posterImageView.clipsToBounds = true
            posterImageView.layer.borderColor = TVGV.debugPosterColor
            posterImageView.layer.borderWidth = 0.5
        } else {
            contentView.layer.borderWidth = 0.0
            posterImageView.layer.borderWidth = 0.0
        }

        // Debug border for poster cells alignment
        layer.borderColor = UIColor.green.cgColor
        layer.borderWidth = 1
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        posterImageView.image = nil
        titleLabel.text = nil
    }
}
