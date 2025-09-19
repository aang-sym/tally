//
//  ShowRowCell.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class ShowRowCell: UICollectionViewCell {
    static let identifier = "ShowRowCell"

    // MARK: - UI Elements
    private let scrollView = UIScrollView()
    private let scrollContentView = UIView()
    private let showPosterImageView = UIImageView()
    private let episodeCellsContainer = UIStackView()
    private let separatorView = UIView()

    // MARK: - Properties
    weak var viewController: TVGuide2ViewController?

    // MARK: - Layout Constants
    private let showPosterWidth: CGFloat = 90  // Wider for full poster
    private let episodeCellWidth: CGFloat = 100

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .systemBackground

        // Setup scroll view for horizontal scrolling
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        // Setup content view
        scrollContentView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(scrollContentView)

        // Setup show poster (leading frozen column) - no corner rounding
        showPosterImageView.contentMode = .scaleAspectFill
        showPosterImageView.backgroundColor = .systemGray6
        showPosterImageView.clipsToBounds = true
        showPosterImageView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(showPosterImageView) // Add directly to cell, not scroll view

        // Setup episode cells container
        episodeCellsContainer.axis = .horizontal
        episodeCellsContainer.distribution = .fillEqually
        episodeCellsContainer.spacing = 1
        episodeCellsContainer.translatesAutoresizingMaskIntoConstraints = false
        scrollContentView.addSubview(episodeCellsContainer)

        // Setup separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Scroll view constraints (starts after poster)
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: showPosterWidth),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            // Content view constraints
            scrollContentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            scrollContentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            scrollContentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            scrollContentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            scrollContentView.heightAnchor.constraint(equalTo: scrollView.heightAnchor),

            // Show poster (leading frozen column)
            showPosterImageView.topAnchor.constraint(equalTo: topAnchor, constant: 2),
            showPosterImageView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 2),
            showPosterImageView.widthAnchor.constraint(equalToConstant: showPosterWidth - 4),
            showPosterImageView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -2),

            // Episode cells container
            episodeCellsContainer.topAnchor.constraint(equalTo: scrollContentView.topAnchor),
            episodeCellsContainer.leadingAnchor.constraint(equalTo: scrollContentView.leadingAnchor),
            episodeCellsContainer.trailingAnchor.constraint(equalTo: scrollContentView.trailingAnchor),
            episodeCellsContainer.bottomAnchor.constraint(equalTo: scrollContentView.bottomAnchor),

            // Separator
            separatorView.leadingAnchor.constraint(equalTo: leadingAnchor),
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.heightAnchor.constraint(equalToConstant: 1)
        ])
    }

    func configure(with showRowData: TVGuide2ViewController.ShowRowData, dateColumns: [TVGuide2DateColumn], viewController: TVGuide2ViewController? = nil) {
        self.viewController = viewController

        // Register scroll view for synchronization
        if let vc = viewController {
            vc.registerScrollViewForSync(scrollView)
        }

        // Configure show poster
        loadPosterImage(from: showRowData.show.posterPath)

        // Clear existing episode cells
        episodeCellsContainer.arrangedSubviews.forEach { $0.removeFromSuperview() }

        // Create episode cells for each date
        for dateColumn in dateColumns {
            let episodeView = createEpisodeView(for: dateColumn, showRowData: showRowData)
            episodeCellsContainer.addArrangedSubview(episodeView)
        }

        // Update content view width based on number of date columns
        scrollContentView.widthAnchor.constraint(equalToConstant: CGFloat(dateColumns.count) * episodeCellWidth).isActive = true
    }

    private func createEpisodeView(for dateColumn: TVGuide2DateColumn, showRowData: TVGuide2ViewController.ShowRowData) -> UIView {
        let episodeView = UIView()
        episodeView.backgroundColor = .systemBackground
        episodeView.translatesAutoresizingMaskIntoConstraints = false

        // Add right border
        let borderView = UIView()
        borderView.backgroundColor = .separator
        borderView.translatesAutoresizingMaskIntoConstraints = false
        episodeView.addSubview(borderView)

        NSLayoutConstraint.activate([
            episodeView.widthAnchor.constraint(equalToConstant: episodeCellWidth),
            borderView.trailingAnchor.constraint(equalTo: episodeView.trailingAnchor),
            borderView.topAnchor.constraint(equalTo: episodeView.topAnchor),
            borderView.bottomAnchor.constraint(equalTo: episodeView.bottomAnchor),
            borderView.widthAnchor.constraint(equalToConstant: 1)
        ])

        // Check if there's an episode for this date
        if let episode = showRowData.episodes[dateColumn.date] {
            let episodeLabel = UILabel()
            episodeLabel.text = "S\(episode.seasonNumber)E\(episode.episodeNumber)"
            episodeLabel.font = .systemFont(ofSize: 12, weight: .medium)
            episodeLabel.textAlignment = .center
            episodeLabel.textColor = episode.isWatched ? .systemGreen : .label
            episodeLabel.backgroundColor = episode.isWatched ? .systemGreen.withAlphaComponent(0.1) : .clear
            episodeLabel.layer.cornerRadius = 4
            episodeLabel.clipsToBounds = true
            episodeLabel.translatesAutoresizingMaskIntoConstraints = false

            episodeView.addSubview(episodeLabel)

            NSLayoutConstraint.activate([
                episodeLabel.centerXAnchor.constraint(equalTo: episodeView.centerXAnchor),
                episodeLabel.centerYAnchor.constraint(equalTo: episodeView.centerYAnchor),
                episodeLabel.widthAnchor.constraint(lessThanOrEqualTo: episodeView.widthAnchor, constant: -8),
                episodeLabel.heightAnchor.constraint(equalToConstant: 24)
            ])
        }

        return episodeView
    }


    private func loadPosterImage(from path: String?) {
        guard let path = path, !path.isEmpty else {
            showPosterImageView.image = UIImage(systemName: "photo")
            return
        }

        guard let url = URL(string: "https://image.tmdb.org/t/p/w342\(path)") else {
            showPosterImageView.image = UIImage(systemName: "photo")
            return
        }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        self.showPosterImageView.image = image
                    }
                }
            } catch {
                await MainActor.run {
                    self.showPosterImageView.image = UIImage(systemName: "photo")
                }
            }
        }
    }
}