//
//  TVGuide2ViewController.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class TVGuide2ViewController: UIViewController {

    // MARK: - Properties
    private var collectionView: UICollectionView!
    private var dataSource: UICollectionViewDiffableDataSource<Section, Item>!
    private let apiClient: ApiClient
    private var tvGuideData: TVGuide2Data?
    private var dateColumns: [TVGuide2DateColumn] = []
    private var isLoading = false
    private var expandedRowIndices: Set<Int> = []
    private var scrollViewsForSync: [UIScrollView] = []

    // MARK: - Layout Constants
    private let providerWidth: CGFloat = 60
    private let showPosterWidth: CGFloat = 90
    private let frozenColumnWidth: CGFloat = 150  // providerWidth + showPosterWidth
    private let showRowHeight: CGFloat = 120  // Taller for full poster
    private let expandedRowHeight: CGFloat = 180
    private let dateHeaderHeight: CGFloat = 60
    private let episodeCellWidth: CGFloat = 100

    // MARK: - Data Types (Provider-section structure)
    enum Section: Hashable {
        case provider(TVGuide2Provider)

        var provider: TVGuide2Provider {
            switch self {
            case .provider(let provider):
                return provider
            }
        }
    }

    enum Item: Hashable {
        case showRow(ShowRowData)
    }

    // Represents one show row: poster + episodes across dates
    struct ShowRowData: Hashable {
        let show: TVGuide2Show
        let episodes: [String: TVGuide2Episode] // [date: episode]
        let rowIndex: Int

        static func == (lhs: ShowRowData, rhs: ShowRowData) -> Bool {
            return lhs.show.id == rhs.show.id && lhs.rowIndex == rhs.rowIndex
        }

        func hash(into hasher: inout Hasher) {
            hasher.combine(show.id)
            hasher.combine(rowIndex)
        }
    }

    // MARK: - Initialization
    init(apiClient: ApiClient) {
        self.apiClient = apiClient
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupCollectionView()
        setupDataSource()
        loadData()
    }

    // MARK: - Setup
    private func setupUI() {
        title = "TV Guide"
        view.backgroundColor = .systemBackground

        navigationItem.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .refresh,
            target: self,
            action: #selector(refreshData)
        )
    }

    private func setupCollectionView() {
        collectionView = UICollectionView(frame: .zero, collectionViewLayout: createLayout())
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        collectionView.backgroundColor = .systemBackground
        collectionView.delegate = self

        view.addSubview(collectionView)

        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        // Register cells and headers
        collectionView.register(ShowRowCell.self, forCellWithReuseIdentifier: ShowRowCell.identifier)
        collectionView.register(DateHeaderView.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: DateHeaderView.identifier)
        collectionView.register(ProviderRailView.self, forSupplementaryViewOfKind: TVGuide2Kinds.providerRail, withReuseIdentifier: ProviderRailView.identifier)
    }

    private func createLayout() -> UICollectionViewLayout {
        let layout = UICollectionViewCompositionalLayout { [weak self] sectionIndex, environment in
            guard let self = self else { return nil }
            return self.createProviderSection()
        }

        // Add configuration for sticky headers (dates)
        let config = UICollectionViewCompositionalLayoutConfiguration()
        layout.configuration = config

        return layout
    }

    private func createProviderSection() -> NSCollectionLayoutSection {
        // Create item for each row (show)
        let itemSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .absolute(showRowHeight)
        )
        let item = NSCollectionLayoutItem(layoutSize: itemSize)

        // Create group for each row
        let groupSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .absolute(showRowHeight)
        )
        let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])

        // Create section
        let section = NSCollectionLayoutSection(group: group)
        section.interGroupSpacing = 1

        // IMPORTANT: Add content insets to leave space for the provider rail
        section.contentInsets = NSDirectionalEdgeInsets(
            top: 0,
            leading: providerWidth, // Leave space for provider rail
            bottom: 0,
            trailing: 0
        )

        // Add sticky date header
        let headerSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .absolute(dateHeaderHeight)
        )
        let header = NSCollectionLayoutBoundarySupplementaryItem(
            layoutSize: headerSize,
            elementKind: UICollectionView.elementKindSectionHeader,
            alignment: .top
        )
        header.pinToVisibleBounds = true

        // Create provider rail that spans the full section height
        let providerRail = NSCollectionLayoutSupplementaryItem(
            layoutSize: NSCollectionLayoutSize(
                widthDimension: .absolute(providerWidth),
                heightDimension: .fractionalHeight(1.0) // Full section height
            ),
            elementKind: TVGuide2Kinds.providerRail,
            containerAnchor: NSCollectionLayoutAnchor(edges: [.leading])
        )
        providerRail.zIndex = -1 // Draw behind cells

        // Add the provider rail to the group
        group.supplementaryItems = [providerRail]
        section.boundarySupplementaryItems = [header]

        return section
    }

    private func updateFrozenColumnVisibility(visibleItems: [NSCollectionLayoutVisibleItem], scrollOffset: CGPoint) {
        // Implementation for keeping frozen columns visible during horizontal scroll
        // This would involve updating cell frames or using transform
    }


    // MARK: - Data Source
    private func setupDataSource() {
        dataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) { [weak self] collectionView, indexPath, item in
            guard let self = self else { return UICollectionViewCell() }

            switch item {
            case .showRow(let showRowData):
                let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ShowRowCell.identifier, for: indexPath) as! ShowRowCell
                cell.configure(with: showRowData, dateColumns: self.dateColumns, viewController: self)
                return cell
            }
        }

        // Configure supplementary view provider for headers and provider rails
        dataSource.supplementaryViewProvider = { [weak self] collectionView, kind, indexPath in
            guard let self = self else { return nil }

            if kind == UICollectionView.elementKindSectionHeader {
                let header = collectionView.dequeueReusableSupplementaryView(
                    ofKind: kind,
                    withReuseIdentifier: DateHeaderView.identifier,
                    for: indexPath
                ) as! DateHeaderView
                header.configure(with: self.dateColumns, viewController: self)
                return header
            } else if kind == TVGuide2Kinds.providerRail {
                let rail = collectionView.dequeueReusableSupplementaryView(
                    ofKind: kind,
                    withReuseIdentifier: ProviderRailView.identifier,
                    for: indexPath
                ) as! ProviderRailView

                // Get the provider for this section
                if let section = self.dataSource.sectionIdentifier(for: indexPath.section) {
                    rail.configure(with: section.provider)
                }
                return rail
            }

            return nil
        }
    }

    // MARK: - Data Loading
    @objc private func refreshData() {
        loadData()
    }

    private func loadData() {
        guard !isLoading else { return }
        isLoading = true

        Task { @MainActor in
            do {
                let data = try await apiClient.getTVGuide2Data()
                self.tvGuideData = data
                self.dateColumns = apiClient.generateDateColumns(from: data.startDate, to: data.endDate)
                self.updateSnapshot()
                self.isLoading = false
            } catch {
                self.showError(error)
                self.isLoading = false
            }
        }
    }

    private func updateSnapshot() {
        guard let data = tvGuideData else {
            print("TVGuide2ViewController: No data to display")
            return
        }

        var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()

        // Check if we have any data to display
        if data.providers.isEmpty {
            print("TVGuide2ViewController: No providers found, showing empty state")
            showEmptyState()
            dataSource.apply(snapshot, animatingDifferences: true)
            return
        }

        hideEmptyState()

        print("TVGuide2ViewController: Creating snapshot with \(data.providers.count) providers")

        // Debug: Print provider structure
        for (providerIndex, provider) in data.providers.enumerated() {
            print("Provider \(providerIndex): \(provider.name) with \(provider.shows.count) shows")
            for (showIndex, show) in provider.shows.enumerated() {
                print("  Show \(showIndex): \(show.title)")
            }
        }

        // Create one section per provider
        var globalRowIndex = 0

        for provider in data.providers {
            let providerSection = Section.provider(provider)
            snapshot.appendSections([providerSection])

            // Create show rows for this provider
            var providerShowRows: [Item] = []
            for show in provider.shows {
                // Create episodes dictionary keyed by date
                var episodesDict: [String: TVGuide2Episode] = [:]
                for episode in show.episodes {
                    episodesDict[episode.airDate] = episode
                }

                let showRowData = ShowRowData(
                    show: show,
                    episodes: episodesDict,
                    rowIndex: globalRowIndex
                )

                providerShowRows.append(.showRow(showRowData))
                globalRowIndex += 1

                print("TVGuide2ViewController: Adding show row for \(show.title) in provider section \(provider.name) with \(show.episodes.count) episodes")
            }

            snapshot.appendItems(providerShowRows, toSection: providerSection)
            print("TVGuide2ViewController: Created section for \(provider.name) with \(providerShowRows.count) shows")
        }

        print("TVGuide2ViewController: Applying snapshot with \(data.providers.count) provider sections")
        dataSource.apply(snapshot, animatingDifferences: true)
    }

    private func showEmptyState() {
        // Create empty state view
        let emptyStateView = UIView()
        emptyStateView.backgroundColor = .systemBackground

        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.alignment = .center
        stackView.spacing = 16
        stackView.translatesAutoresizingMaskIntoConstraints = false

        let imageView = UIImageView(image: UIImage(systemName: "tv"))
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .systemGray3
        imageView.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "No Episodes Found"
        titleLabel.font = .systemFont(ofSize: 18, weight: .semibold)
        titleLabel.textColor = .label
        titleLabel.textAlignment = .center

        let messageLabel = UILabel()
        messageLabel.text = "No upcoming episodes found for your watching shows in the selected date range."
        messageLabel.font = .systemFont(ofSize: 14)
        messageLabel.textColor = .secondaryLabel
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0

        stackView.addArrangedSubview(imageView)
        stackView.addArrangedSubview(titleLabel)
        stackView.addArrangedSubview(messageLabel)

        emptyStateView.addSubview(stackView)
        view.addSubview(emptyStateView)

        NSLayoutConstraint.activate([
            emptyStateView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            emptyStateView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            emptyStateView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            emptyStateView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            stackView.centerXAnchor.constraint(equalTo: emptyStateView.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: emptyStateView.centerYAnchor),
            stackView.leadingAnchor.constraint(greaterThanOrEqualTo: emptyStateView.leadingAnchor, constant: 32),
            stackView.trailingAnchor.constraint(lessThanOrEqualTo: emptyStateView.trailingAnchor, constant: -32),

            imageView.widthAnchor.constraint(equalToConstant: 80),
            imageView.heightAnchor.constraint(equalToConstant: 80)
        ])

        emptyStateView.tag = 999 // Tag for easy removal
    }

    private func hideEmptyState() {
        view.subviews.first { $0.tag == 999 }?.removeFromSuperview()
    }

    private func findEpisode(for show: TVGuide2Show, on date: String) -> TVGuide2Episode? {
        return show.episodes.first { $0.airDate == date }
    }

    private func showError(_ error: Error) {
        let alert = UIAlertController(title: "Error", message: error.localizedDescription, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - UICollectionViewDelegate
extension TVGuide2ViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        collectionView.deselectItem(at: indexPath, animated: true)

        guard let item = dataSource.itemIdentifier(for: indexPath) else { return }

        switch item {
        case .showRow(let showRowData):
            handleShowTap(show: showRowData.show)
        }
    }

    private func handleShowTap(show: TVGuide2Show) {
        // Show poster zoom overlay
        showPosterZoom(for: show)
        print("TVGuide2ViewController: Tapped show \(show.title)")
    }

    private func handleEpisodeTap(episode: TVGuide2Episode) {
        // Show episode details
        let alert = UIAlertController(title: episode.title, message: episode.overview ?? "Summary unavailable", preferredStyle: .alert)

        if !episode.isWatched {
            alert.addAction(UIAlertAction(title: "Mark as Watched", style: .default) { [weak self] _ in
                self?.markEpisodeAsWatched(episode)
            })
        }

        alert.addAction(UIAlertAction(title: "Close", style: .cancel))
        present(alert, animated: true)
    }

    private func showPosterZoom(for show: TVGuide2Show) {
        // Create poster zoom overlay
        let overlay = UIView(frame: view.bounds)
        overlay.backgroundColor = UIColor.black.withAlphaComponent(0.6)
        overlay.alpha = 0

        let posterImageView = UIImageView()
        posterImageView.contentMode = .scaleAspectFit
        posterImageView.layer.cornerRadius = 12
        posterImageView.clipsToBounds = true
        posterImageView.backgroundColor = .systemGray6
        posterImageView.translatesAutoresizingMaskIntoConstraints = false

        // Load poster image
        if let posterPath = show.posterPath, !posterPath.isEmpty {
            loadPosterImageForZoom(posterImageView, from: posterPath)
        }

        overlay.addSubview(posterImageView)
        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            posterImageView.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            posterImageView.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            posterImageView.widthAnchor.constraint(equalTo: overlay.widthAnchor, multiplier: 0.6),
            posterImageView.heightAnchor.constraint(equalTo: overlay.heightAnchor, multiplier: 0.8)
        ])

        // Add tap gesture to dismiss
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissPosterZoom))
        overlay.addGestureRecognizer(tapGesture)

        // Add pan gesture for flick to dismiss
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePosterPan(_:)))
        posterImageView.addGestureRecognizer(panGesture)
        posterImageView.isUserInteractionEnabled = true

        // Animate in
        UIView.animate(withDuration: 0.3) {
            overlay.alpha = 1
        }
    }

    @objc private func dismissPosterZoom() {
        guard let overlay = view.subviews.last(where: { $0.backgroundColor == UIColor.black.withAlphaComponent(0.6) }) else { return }

        UIView.animate(withDuration: 0.3, animations: {
            overlay.alpha = 0
        }) { _ in
            overlay.removeFromSuperview()
        }
    }

    @objc private func handlePosterPan(_ gesture: UIPanGestureRecognizer) {
        guard let posterView = gesture.view,
              let overlay = posterView.superview else { return }

        let translation = gesture.translation(in: overlay)
        let velocity = gesture.velocity(in: overlay)

        switch gesture.state {
        case .changed:
            posterView.transform = CGAffineTransform(translationX: translation.x, y: translation.y)
        case .ended:
            let magnitude = sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            if magnitude > 500 { // Fast flick
                // Animate out in direction of flick
                UIView.animate(withDuration: 0.3, animations: {
                    posterView.transform = CGAffineTransform(translationX: translation.x * 3, y: translation.y * 3)
                    overlay.alpha = 0
                }) { _ in
                    overlay.removeFromSuperview()
                }
            } else {
                // Snap back
                UIView.animate(withDuration: 0.3) {
                    posterView.transform = .identity
                }
            }
        default:
            break
        }
    }

    private func loadPosterImageForZoom(_ imageView: UIImageView, from path: String) {
        guard let url = URL(string: "https://image.tmdb.org/t/p/w500\(path)") else { return }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        imageView.image = image
                    }
                }
            } catch {
                // Silently fail for now
            }
        }
    }

    private func markEpisodeAsWatched(_ episode: TVGuide2Episode) {
        // This would integrate with the episode progress API
        Task {
            do {
                let _ = try await apiClient.setEpisodeProgress(
                    tmdbId: episode.tmdbId,
                    seasonNumber: episode.seasonNumber,
                    episodeNumber: episode.episodeNumber,
                    status: "watched"
                )

                // Refresh data to show updated watch status
                loadData()
            } catch {
                showError(error)
            }
        }
    }


    // MARK: - Scroll Synchronization
    func registerScrollViewForSync(_ scrollView: UIScrollView) {
        scrollViewsForSync.append(scrollView)
        scrollView.delegate = self
    }
}

// MARK: - UIScrollViewDelegate
extension TVGuide2ViewController: UIScrollViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        // Sync all registered scroll views to the same horizontal position
        for syncScrollView in scrollViewsForSync {
            if syncScrollView !== scrollView {
                syncScrollView.contentOffset.x = scrollView.contentOffset.x
            }
        }
    }
}