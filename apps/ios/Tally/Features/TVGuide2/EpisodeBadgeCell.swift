//
//  EpisodeBadgeCell.swift
//  Tally
//
//  Created by Angus Symons on 24/9/2025.
//

import UIKit

class EpisodeBadgeCell: UICollectionViewCell {
    static let identifier = "EpisodeBadgeCell"

    private let episodeIndicator = UIView()
    private let episodeLabel = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .systemBackground // Light theme

        // Episode indicator (small blue dot)
        episodeIndicator.backgroundColor = .systemBlue
        episodeIndicator.layer.cornerRadius = 4
        episodeIndicator.translatesAutoresizingMaskIntoConstraints = false

        // Episode label (S1E1 format)
        episodeLabel.font = .systemFont(ofSize: 10, weight: .semibold)
        episodeLabel.textColor = .label
        episodeLabel.textAlignment = .center
        episodeLabel.numberOfLines = 1
        episodeLabel.translatesAutoresizingMaskIntoConstraints = false

        addSubview(episodeIndicator)
        addSubview(episodeLabel)

        NSLayoutConstraint.activate([
            // Small blue dot at top center
            episodeIndicator.topAnchor.constraint(equalTo: topAnchor, constant: 12),
            episodeIndicator.centerXAnchor.constraint(equalTo: centerXAnchor),
            episodeIndicator.widthAnchor.constraint(equalToConstant: 8),
            episodeIndicator.heightAnchor.constraint(equalToConstant: 8),

            // Episode label below dot
            episodeLabel.topAnchor.constraint(equalTo: episodeIndicator.bottomAnchor, constant: 4),
            episodeLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            episodeLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4)
        ])
    }

    func configure(with episode: TVGuide2Episode, show: TVGuide2Show) {
        episodeLabel.text = "S\(episode.seasonNumber)E\(episode.episodeNumber)"

        // Set accessibility
        accessibilityLabel = "\(show.title) Season \(episode.seasonNumber) Episode \(episode.episodeNumber)"
        accessibilityHint = "Episode information"
    }

    func configureEmpty() {
        episodeIndicator.isHidden = true
        episodeLabel.text = nil
        accessibilityLabel = "No episode"
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        if TVGV.debugBordersEnabled {
            contentView.layer.borderColor = TVGV.debugGridColor
            contentView.layer.borderWidth = 0.25
        } else {
            contentView.layer.borderWidth = 0.0
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        episodeIndicator.isHidden = false
        episodeLabel.text = nil
        accessibilityLabel = nil
    }
}