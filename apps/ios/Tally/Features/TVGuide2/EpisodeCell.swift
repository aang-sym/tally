//
//  EpisodeCell.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class EpisodeCell: UICollectionViewCell {
    static let identifier = "EpisodeCell"

    private let episodeLabel = UILabel()
    private let watchedIndicator = UIView()
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

        // Episode label (S1E8, S2E3, etc.)
        episodeLabel.font = .systemFont(ofSize: 12, weight: .medium)
        episodeLabel.textColor = .label
        episodeLabel.textAlignment = .center
        episodeLabel.backgroundColor = .systemBlue.withAlphaComponent(0.1)
        episodeLabel.layer.cornerRadius = 4
        episodeLabel.clipsToBounds = true
        episodeLabel.translatesAutoresizingMaskIntoConstraints = false

        // Watched indicator (small blue dot)
        watchedIndicator.backgroundColor = .systemBlue
        watchedIndicator.layer.cornerRadius = 3
        watchedIndicator.isHidden = true
        watchedIndicator.translatesAutoresizingMaskIntoConstraints = false

        // Bottom separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(episodeLabel)
        addSubview(watchedIndicator)
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Episode label centered
            episodeLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            episodeLabel.centerYAnchor.constraint(equalTo: centerYAnchor),
            episodeLabel.widthAnchor.constraint(equalToConstant: 50),
            episodeLabel.heightAnchor.constraint(equalToConstant: 24),

            // Watched indicator top-right
            watchedIndicator.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            watchedIndicator.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),
            watchedIndicator.widthAnchor.constraint(equalToConstant: 6),
            watchedIndicator.heightAnchor.constraint(equalToConstant: 6),

            // Bottom separator
            separatorView.leadingAnchor.constraint(equalTo: leadingAnchor),
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.heightAnchor.constraint(equalToConstant: 1)
        ])
    }

    func configure(with episode: TVGuide2Episode) {
        episodeLabel.text = "S\(episode.seasonNumber)E\(episode.episodeNumber)"
        watchedIndicator.isHidden = !episode.isWatched

        // Color coding based on air date
        let today = Date()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        if let airDate = dateFormatter.date(from: episode.airDate) {
            if airDate > today {
                // Future episode
                episodeLabel.backgroundColor = .systemGray5
                episodeLabel.textColor = .secondaryLabel
            } else if Calendar.current.isDateInToday(airDate) {
                // Today's episode
                episodeLabel.backgroundColor = .systemBlue.withAlphaComponent(0.2)
                episodeLabel.textColor = .systemBlue
            } else {
                // Past episode
                episodeLabel.backgroundColor = .systemGreen.withAlphaComponent(0.1)
                episodeLabel.textColor = .systemGreen
            }
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        episodeLabel.text = nil
        episodeLabel.backgroundColor = .systemBlue.withAlphaComponent(0.1)
        episodeLabel.textColor = .label
        watchedIndicator.isHidden = true
    }
}