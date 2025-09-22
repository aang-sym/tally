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
    private var scrollViewsForSync = NSHashTable<UIScrollView>.weakObjects()

    private struct ExpandedEpisodeContext {
        let date: String
        let episode: TVGuide2Episode
    }

    private var expandedEpisodeContexts: [Int: ExpandedEpisodeContext] = [:]

    private enum SupplementaryKind {
        static let providerLeading = "provider.leading"
    }

    // MARK: - Layout Constants
    private let providerColumnWidth: CGFloat = 64
    private let showRowHeight: CGFloat = ShowRowCell.baseRowHeight
    private let dateHeaderHeight: CGFloat = 60
    private let rowSpacing: CGFloat = 0

    // Calendar window config (anchor on today; allow one week back)
    private let backfillDays: Int = 7
    private let forwardDays: Int = 60
    private var hasSeededInitialOffset = false
    private var initialContentOffsetX: CGFloat { CGFloat(backfillDays) * ShowRowCell.episodeColumnWidth }

    private var itemHeights: [Item: CGFloat] = [:]

    // MARK: - Date Formatting
    private lazy var isoDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    private lazy var monthFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"
        return formatter
    }()

    private var currentMonthLabelText: String?

    /// Helper to build date columns and set initial month label, then refresh header
    private func rebuildDateColumns(from start: String, to end: String) {
        // Build date columns via existing ApiClient helper
        self.dateColumns = apiClient.generateDateColumns(from: start, to: end)
        // Set initial month label based on the first day (if available)
        if let first = self.dateColumns.first, let d = isoDateFormatter.date(from: first.date) {
            self.currentMonthLabelText = monthFormatter.string(from: d).uppercased()
        }
        // Ensure the global header reconfigures after data arrives
        collectionView.reloadData()
        updateVisibleMonthLabels()
    }

    /// Build date columns anchored on today, with window [today-backfillDays, today+forwardDays]
    private func rebuildDateColumnsAnchoredOnToday() {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        guard let start = cal.date(byAdding: .day, value: -backfillDays, to: today),
              let end = cal.date(byAdding: .day, value: forwardDays, to: today) else { return }

        let weekdayFormatter = DateFormatter()
        weekdayFormatter.dateFormat = "E" // Mon, Tue, etc.
        let dayNumberFormatter = DateFormatter()
        dayNumberFormatter.dateFormat = "d" // 1..31

        var cursor = start
        var cols: [TVGuide2DateColumn] = []
        while cursor <= end {
            let ds = isoDateFormatter.string(from: cursor)
            let dow = weekdayFormatter.string(from: cursor)
            let dayNum = dayNumberFormatter.string(from: cursor)
            cols.append(TVGuide2DateColumn(date: ds, dayOfWeek: dow, dayNumber: dayNum))
            cursor = cal.date(byAdding: .day, value: 1, to: cursor)!
        }
        self.dateColumns = cols
        self.currentMonthLabelText = monthFormatter.string(from: today).uppercased()
        collectionView.reloadData()
        updateVisibleMonthLabels()
    }

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
        let provider: TVGuide2Provider

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
        DateHeaderView.providerColumnWidth = providerColumnWidth
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
        // Pre-seed month label and columns so header shows immediately
        let now = Date()
        self.currentMonthLabelText = monthFormatter.string(from: now).uppercased()
        rebuildDateColumnsAnchoredOnToday()
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
        collectionView.register(ProviderSupplementaryView.self, forSupplementaryViewOfKind: SupplementaryKind.providerLeading, withReuseIdentifier: ProviderSupplementaryView.reuseIdentifier)
    }

    private func createLayout() -> UICollectionViewLayout {
        DateHeaderView.providerColumnWidth = providerColumnWidth
        let layout = UICollectionViewCompositionalLayout { [weak self] sectionIndex, environment in
            guard let self = self else { return nil }
            return self.createProviderSection()
        }

        // Add configuration for sticky date header across all sections
        let config = UICollectionViewCompositionalLayoutConfiguration()
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
        header.zIndex = 1000
        config.boundarySupplementaryItems = [header]
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

        let groupSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .estimated(showRowHeight)
        )
        let group = NSCollectionLayoutGroup.vertical(layoutSize: groupSize, subitems: [item])
        group.interItemSpacing = .fixed(rowSpacing)

        let section = NSCollectionLayoutSection(group: group)
        section.interGroupSpacing = rowSpacing
        section.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: providerColumnWidth, bottom: 0, trailing: 0)
        section.supplementariesFollowContentInsets = false

        let providerSupplementary = NSCollectionLayoutBoundarySupplementaryItem(
            layoutSize: NSCollectionLayoutSize(
                widthDimension: .absolute(providerColumnWidth),
                heightDimension: .estimated(showRowHeight)
            ),
            elementKind: SupplementaryKind.providerLeading,
            alignment: .leading
        )
        providerSupplementary.pinToVisibleBounds = true
        providerSupplementary.zIndex = 10
        providerSupplementary.extendsBoundary = true

        section.boundarySupplementaryItems = [providerSupplementary]

        return section
    }

    // MARK: - Data Source
    private func setupDataSource() {
        dataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) { [weak self] collectionView, indexPath, item in
            guard let self = self else { return UICollectionViewCell() }

            switch item {
            case .showRow(let showRowData):
                let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ShowRowCell.identifier, for: indexPath) as! ShowRowCell
                let expandedContext = self.expandedEpisodeContexts[showRowData.rowIndex]
                cell.configure(
                    with: showRowData,
                    dateColumns: self.dateColumns,
                    expandedContext: expandedContext.map { ($0.date, $0.episode) },
                    viewController: self
                )
                cell.setNeedsLayout()
                cell.layoutIfNeeded()
                let measuredHeight = cell.contentView.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize).height
                if measuredHeight > 0 {
                    self.itemHeights[item] = max(measuredHeight, self.showRowHeight)
                }
                return cell
            }
        }

        // Configure supplementary view provider for headers only
        dataSource.supplementaryViewProvider = { [weak self] collectionView, kind, indexPath in
            guard let self = self else { return nil }

            if kind == SupplementaryKind.providerLeading {
                let providerView = collectionView.dequeueReusableSupplementaryView(
                    ofKind: kind,
                    withReuseIdentifier: ProviderSupplementaryView.reuseIdentifier,
                    for: indexPath
                ) as! ProviderSupplementaryView
                let section = self.dataSource.snapshot().sectionIdentifiers[indexPath.section]
                let sectionHeight = self.providerSectionHeight(forSectionAt: indexPath.section)
                providerView.configure(with: section.provider, preferredHeight: sectionHeight)
                return providerView
            }

            if kind == UICollectionView.elementKindSectionHeader {
                let header = collectionView.dequeueReusableSupplementaryView(
                    ofKind: kind,
                    withReuseIdentifier: DateHeaderView.identifier,
                    for: indexPath
                ) as! DateHeaderView
                header.configure(with: self.dateColumns, monthText: self.currentMonthLabelText, viewController: self)
                header.updateMonthLabel(self.currentMonthLabelText)
                print("[TVGuide2] Dequeued DateHeaderView for indexPath: \(indexPath)")
                return header
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
                self.expandedEpisodeContexts.removeAll()
                self.rebuildDateColumnsAnchoredOnToday()
                self.updateSnapshot()
                self.isLoading = false
            } catch {
                self.showError(error)
                self.isLoading = false
            }
        }
    }

    @MainActor
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
            scrollViewsForSync.removeAllObjects()
            itemHeights.removeAll()
            dataSource.apply(snapshot, animatingDifferences: true)
            return
        }

        hideEmptyState()
        scrollViewsForSync.removeAllObjects()

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
                    rowIndex: globalRowIndex,
                    provider: provider
                )

                providerShowRows.append(.showRow(showRowData))
                globalRowIndex += 1

                print("TVGuide2ViewController: Adding show row for \(show.title) in provider section \(provider.name) with \(show.episodes.count) episodes")
            }

            snapshot.appendItems(providerShowRows, toSection: providerSection)
            print("TVGuide2ViewController: Created section for \(provider.name) with \(providerShowRows.count) shows")
        }

        print("TVGuide2ViewController: Applying snapshot with \(data.providers.count) provider sections")
        expandedEpisodeContexts = expandedEpisodeContexts.filter { $0.key < globalRowIndex }
        itemHeights = itemHeights.filter { snapshot.indexOfItem($0.key) != nil }
        dataSource.apply(snapshot, animatingDifferences: true)
        // Refresh the header view to guarantee it is reconfigured with latest date columns
        collectionView.reloadData()

        collectionView.collectionViewLayout.invalidateLayout()
        collectionView.layoutIfNeeded()
        updateVisibleMonthLabels()

        // Seed initial horizontal offset so today is the first visible column
        if !hasSeededInitialOffset {
            hasSeededInitialOffset = true
            for sv in scrollViewsForSync.allObjects {
                sv.setContentOffset(CGPoint(x: initialContentOffsetX, y: sv.contentOffset.y), animated: false)
            }
            updateMonthLabel(forContentOffsetX: initialContentOffsetX)
        }
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

    private func providerSectionHeight(forSectionAt sectionIndex: Int) -> CGFloat {
        let snapshot = dataSource.snapshot()
        guard snapshot.sectionIdentifiers.indices.contains(sectionIndex) else { return showRowHeight }

        let sectionIdentifier = snapshot.sectionIdentifiers[sectionIndex]
        let items = snapshot.itemIdentifiers(inSection: sectionIdentifier)
        guard !items.isEmpty else { return showRowHeight }

        let itemsHeight = items.reduce(CGFloat(0)) { partialResult, item in
            partialResult + (itemHeights[item] ?? showRowHeight)
        }

        let spacingTotal = rowSpacing * CGFloat(max(items.count - 1, 0))
        return max(showRowHeight, itemsHeight + spacingTotal)
    }

    private func invalidateProviderHeight(forSection sectionIndex: Int) {
        let indexPath = IndexPath(item: 0, section: sectionIndex)

        if let providerView = collectionView.supplementaryView(
            forElementKind: SupplementaryKind.providerLeading,
            at: indexPath
        ) as? ProviderSupplementaryView {
            providerView.updatePreferredHeight(providerSectionHeight(forSectionAt: sectionIndex))
        }

        collectionView.collectionViewLayout.invalidateLayout()
    }

    private func findEpisode(for show: TVGuide2Show, on date: String) -> TVGuide2Episode? {
        return show.episodes.first { $0.airDate == date }
    }

    @MainActor
    private func updateMonthLabel(forContentOffsetX offsetX: CGFloat) {
        guard !dateColumns.isEmpty else { return }

        let columnWidth = ShowRowCell.episodeColumnWidth
        guard columnWidth > 0 else { return }

        let adjustedOffset = max(offsetX, 0)
        let index = min(dateColumns.count - 1, Int(floor(adjustedOffset / columnWidth)))
        updateMonthLabel(forVisibleColumnIndex: index)
    }

    @MainActor
    private func updateMonthLabel(forVisibleColumnIndex index: Int) {
        guard dateColumns.indices.contains(index) else { return }

        let dateString = dateColumns[index].date
        if let date = isoDateFormatter.date(from: dateString) {
            let monthText = monthFormatter.string(from: date).uppercased()
            if monthText != currentMonthLabelText {
                currentMonthLabelText = monthText
                updateVisibleMonthLabels()
            }
        } else if currentMonthLabelText != dateString {
            currentMonthLabelText = dateString
            updateVisibleMonthLabels()
        }
    }

    @MainActor
    private func updateVisibleMonthLabels() {
        let text = currentMonthLabelText
        let visibleHeaders = collectionView.visibleSupplementaryViews(ofKind: UICollectionView.elementKindSectionHeader)
        visibleHeaders.compactMap { $0 as? DateHeaderView }.forEach { $0.updateMonthLabel(text) }
        collectionView.collectionViewLayout.invalidateLayout()
    }

    @MainActor
    func toggleEpisodeExpansion(for showRowData: ShowRowData, on date: String) {
        guard let episode = showRowData.episodes[date] else { return }

        let rowIndex = showRowData.rowIndex
        let isCurrentlyExpanded = expandedEpisodeContexts[rowIndex]?.date == date

        print("[TVGuide2] toggleEpisodeExpansion rowIndex=\(rowIndex) show=\(showRowData.show.title) date=\(date) expanding=\(!isCurrentlyExpanded)")

        if isCurrentlyExpanded {
            expandedEpisodeContexts.removeValue(forKey: rowIndex)
        } else {
            expandedEpisodeContexts[rowIndex] = ExpandedEpisodeContext(date: date, episode: episode)
        }

        let item = Item.showRow(showRowData)

        var snapshot = dataSource.snapshot()
        guard snapshot.indexOfItem(item) != nil else {
            print("[TVGuide2] toggleEpisodeExpansion missing item for show row")
            return
        }

        snapshot.reloadItems([item])
        dataSource.apply(snapshot, animatingDifferences: true)
        collectionView.collectionViewLayout.invalidateLayout()
        collectionView.layoutIfNeeded()
        updateVisibleMonthLabels()

        if !isCurrentlyExpanded,
           let refreshedIndexPath = dataSource.indexPath(for: item) {
            collectionView.scrollToItem(at: refreshedIndexPath, at: .centeredVertically, animated: true)
        }
    }

    private func showError(_ error: Error) {
        let alert = UIAlertController(title: "Error", message: error.localizedDescription, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - UICollectionViewDelegate
extension TVGuide2ViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, willDisplay cell: UICollectionViewCell, forItemAt indexPath: IndexPath) {
        guard let item = dataSource.itemIdentifier(for: indexPath) else { return }
        let newHeight = cell.bounds.height
        let previousHeight = itemHeights[item] ?? 0
        if abs(newHeight - previousHeight) > 0.5 {
            itemHeights[item] = newHeight
            invalidateProviderHeight(forSection: indexPath.section)
        }
    }

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
        var baselineOffset = scrollViewsForSync.allObjects.first?.contentOffset.x
        if baselineOffset == nil {
            baselineOffset = initialContentOffsetX
        }
        let existingOffset = baselineOffset ?? scrollView.contentOffset.x
        if scrollView.contentOffset.x != existingOffset {
            scrollView.setContentOffset(CGPoint(x: existingOffset, y: scrollView.contentOffset.y), animated: false)
        }

        if !scrollViewsForSync.allObjects.contains(where: { $0 === scrollView }) {
            scrollViewsForSync.add(scrollView)
        }

        scrollView.delegate = self
        updateMonthLabel(forContentOffsetX: existingOffset)
    }
}

// MARK: - UIScrollViewDelegate
extension TVGuide2ViewController: UIScrollViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        if scrollView === collectionView { return }

        updateMonthLabel(forContentOffsetX: scrollView.contentOffset.x)

        for syncScrollView in scrollViewsForSync.allObjects where syncScrollView !== scrollView {
            if abs(syncScrollView.contentOffset.x - scrollView.contentOffset.x) > .ulpOfOne {
                syncScrollView.contentOffset.x = scrollView.contentOffset.x
            }
        }
    }
}
