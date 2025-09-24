import UIKit

class TVGuideVertViewController: UIViewController {

    // MARK: - Properties
    private let apiClient: ApiClient
    private var tvGuideView: TVGuideVertView!

    // Data
    private var tvGuideData: TVGuide2Data?
    private var dateColumns: [TVGuide2DateColumn] = []
    private var providers: [TVGuide2Provider] = []

    // Data sources
    private var gridDataSource: UICollectionViewDiffableDataSource<Int, GridItem>!
    private var providerHeaderDataSource: UICollectionViewDiffableDataSource<Int, TVGuide2Provider>!
    private var dayRailDataSource: UICollectionViewDiffableDataSource<Int, TVGuide2DateColumn>!

    // Date formatting
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

    // Calendar window config (matches horizontal version)
    private let backfillDays: Int = 7
    private let forwardDays: Int = 60

    // Mapping helpers
    private var providerToColumnMap: [Int: Int] = [:]
    private var dateToRowMap: [String: Int] = [:]

    // MARK: - Data Types

    enum GridItem: Hashable {
        case empty(id: String)
        case episode(show: TVGuide2Show, episode: TVGuide2Episode, provider: TVGuide2Provider)

        var id: String {
            switch self {
            case .empty(let id):
                return id
            case .episode(let show, let episode, _):
                return "\(show.id)-\(episode.id)"
            }
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

    override func loadView() {
        tvGuideView = TVGuideVertView()
        tvGuideView.delegate = self
        view = tvGuideView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupDataSources()
        setupScrollViewDelegates()

        // Pre-seed date columns
        rebuildDateColumnsAnchoredOnToday()

        loadData()
    }

    // MARK: - Setup

    private func setupUI() {
        title = "TV Guide (Vertical)"
        view.backgroundColor = .black // Dark theme

        let refreshButton = UIBarButtonItem(
            barButtonSystemItem: .refresh,
            target: self,
            action: #selector(refreshData)
        )

        let horizontalButton = UIBarButtonItem(
            image: UIImage(systemName: "rectangle.split.3x1"),
            style: .plain,
            target: self,
            action: #selector(switchToHorizontalLayout)
        )

        navigationItem.rightBarButtonItems = [refreshButton, horizontalButton]
    }

    @objc private func switchToHorizontalLayout() {
        navigationController?.popViewController(animated: true)
    }

    private func setupDataSources() {
        // Grid data source
        gridDataSource = UICollectionViewDiffableDataSource<Int, GridItem>(
            collectionView: tvGuideView.gridCollectionView
        ) { [weak self] collectionView, indexPath, item in
            return self?.configureGridCell(collectionView, indexPath: indexPath, item: item)
        }

        // Provider header data source
        providerHeaderDataSource = UICollectionViewDiffableDataSource<Int, TVGuide2Provider>(
            collectionView: tvGuideView.providerHeaderCollectionView
        ) { [weak self] collectionView, indexPath, provider in
            return self?.configureProviderHeaderCell(collectionView, indexPath: indexPath, provider: provider)
        }

        // Day rail data source
        dayRailDataSource = UICollectionViewDiffableDataSource<Int, TVGuide2DateColumn>(
            collectionView: tvGuideView.dayRailCollectionView
        ) { [weak self] collectionView, indexPath, dateColumn in
            return self?.configureDayRailCell(collectionView, indexPath: indexPath, dateColumn: dateColumn)
        }

        // Register cell types
        registerCellTypes()
    }

    private func registerCellTypes() {
        // Grid cells - reuse ShowPosterCell from horizontal version
        tvGuideView.gridCollectionView.register(
            ShowPosterCell.self,
            forCellWithReuseIdentifier: ShowPosterCell.identifier
        )
        tvGuideView.gridCollectionView.register(
            UICollectionViewCell.self,
            forCellWithReuseIdentifier: "EmptyCell"
        )

        // Provider header cells - reuse ProviderSupplementaryView as cell
        tvGuideView.providerHeaderCollectionView.register(
            ProviderCell.self,
            forCellWithReuseIdentifier: "ProviderCell"
        )

        // Day rail cells
        tvGuideView.dayRailCollectionView.register(
            DaySupplementaryView.self,
            forCellWithReuseIdentifier: DaySupplementaryView.identifier
        )
    }

    private func setupScrollViewDelegates() {
        tvGuideView.gridCollectionView.delegate = self
        tvGuideView.providerHeaderCollectionView.delegate = self
        tvGuideView.dayRailCollectionView.delegate = self
    }

    // MARK: - Date Column Management

    private func rebuildDateColumnsAnchoredOnToday() {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        guard let start = cal.date(byAdding: .day, value: -backfillDays, to: today),
              let end = cal.date(byAdding: .day, value: forwardDays, to: today) else { return }

        let weekdayFormatter = DateFormatter()
        weekdayFormatter.dateFormat = "E"
        let dayNumberFormatter = DateFormatter()
        dayNumberFormatter.dateFormat = "d"

        var cursor = start
        var cols: [TVGuide2DateColumn] = []
        var rowIndex = 0

        while cursor <= end {
            let ds = isoDateFormatter.string(from: cursor)
            let dow = weekdayFormatter.string(from: cursor)
            let dayNum = dayNumberFormatter.string(from: cursor)

            cols.append(TVGuide2DateColumn(date: ds, dayOfWeek: dow, dayNumber: dayNum))
            dateToRowMap[ds] = rowIndex
            rowIndex += 1

            cursor = cal.date(byAdding: .day, value: 1, to: cursor) ?? cursor
        }

        self.dateColumns = cols

        // Update month label
        let monthText = monthFormatter.string(from: today).uppercased()
        tvGuideView.updateMonthLabel(monthText)
    }

    // MARK: - Data Loading

    @objc private func refreshData() {
        loadData()
    }

    private func loadData() {
        Task {
            do {
                let data = try await apiClient.getTVGuide2Data()
                await MainActor.run {
                    self.tvGuideData = data
                    self.updateMappings()
                    self.updateSnapshots()
                }
            } catch {
                await MainActor.run {
                    self.showError(error)
                }
            }
        }
    }

    private func updateMappings() {
        guard let data = tvGuideData else { return }

        // Build provider-to-column mapping
        providerToColumnMap.removeAll()
        for (index, provider) in data.providers.enumerated() {
            providerToColumnMap[provider.id] = index
        }

        providers = data.providers

        // Update layouts with actual dimensions
        tvGuideView.updateLayouts(
            columnCount: data.providers.count,
            rowCount: dateColumns.count
        )
    }

    // MARK: - Cell Configuration

    private func configureGridCell(_ collectionView: UICollectionView, indexPath: IndexPath, item: GridItem) -> UICollectionViewCell {
        switch item {
        case .empty:
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "EmptyCell", for: indexPath)
            cell.backgroundColor = .clear
            return cell

        case .episode(let show, let episode, _):
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ShowPosterCell.identifier, for: indexPath) as! ShowPosterCell

            // Configure for grid display (smaller size)
            cell.configure(
                with: show,
                episode: episode,
                size: .grid // Will need to add this size option
            )

            return cell
        }
    }

    private func configureProviderHeaderCell(_ collectionView: UICollectionView, indexPath: IndexPath, provider: TVGuide2Provider) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "ProviderCell", for: indexPath) as! ProviderCell
        cell.configure(with: provider)
        return cell
    }

    private func configureDayRailCell(_ collectionView: UICollectionView, indexPath: IndexPath, dateColumn: TVGuide2DateColumn) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: DaySupplementaryView.identifier, for: indexPath) as! DaySupplementaryView

        // Calculate episode count for this day
        let episodeCount = calculateEpisodeCount(for: dateColumn.date)
        let isToday = Calendar.current.isDateInToday(isoDateFormatter.date(from: dateColumn.date) ?? Date())

        cell.configure(with: dateColumn, episodeCount: episodeCount, isToday: isToday)
        return cell
    }

    // MARK: - Helper Methods

    private func calculateEpisodeCount(for date: String) -> Int {
        guard let data = tvGuideData else { return 0 }

        var count = 0
        for provider in data.providers {
            for show in provider.shows {
                if show.episodes.contains(where: { $0.airDate == date }) {
                    count += 1
                }
            }
        }
        return count
    }

    private func showError(_ error: Error) {
        let alert = UIAlertController(title: "Error", message: error.localizedDescription, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - Snapshot Updates

extension TVGuideVertViewController {
    private func updateSnapshots() {
        guard let data = tvGuideData else { return }

        updateGridSnapshot(with: data)
        updateProviderHeaderSnapshot(with: data)
        updateDayRailSnapshot()
        updateTodayIndicator()
    }

    private func updateGridSnapshot(with data: TVGuide2Data) {
        var snapshot = NSDiffableDataSourceSnapshot<Int, GridItem>()
        snapshot.appendSections([0])

        var gridItems: [GridItem] = []

        // Populate grid in row-major order (days x providers)
        for (rowIndex, dateColumn) in dateColumns.enumerated() {
            for (columnIndex, provider) in data.providers.enumerated() {
                let gridItem = createGridItem(
                    for: dateColumn.date,
                    provider: provider,
                    row: rowIndex,
                    column: columnIndex
                )
                gridItems.append(gridItem)
            }
        }

        snapshot.appendItems(gridItems, toSection: 0)
        gridDataSource.apply(snapshot, animatingDifferences: false)
    }

    private func updateProviderHeaderSnapshot(with data: TVGuide2Data) {
        var snapshot = NSDiffableDataSourceSnapshot<Int, TVGuide2Provider>()
        snapshot.appendSections([0])
        snapshot.appendItems(data.providers, toSection: 0)
        providerHeaderDataSource.apply(snapshot, animatingDifferences: false)
    }

    private func updateDayRailSnapshot() {
        var snapshot = NSDiffableDataSourceSnapshot<Int, TVGuide2DateColumn>()
        snapshot.appendSections([0])
        snapshot.appendItems(dateColumns, toSection: 0)
        dayRailDataSource.apply(snapshot, animatingDifferences: false)
    }

    private func createGridItem(for date: String, provider: TVGuide2Provider, row: Int, column: Int) -> GridItem {
        // Search for an episode on this date for this provider
        for show in provider.shows {
            if let episode = show.episodes.first(where: { $0.airDate == date }) {
                return .episode(show: show, episode: episode, provider: provider)
            }
        }

        // No episode found - create empty cell
        return .empty(id: "\(date)-\(provider.id)")
    }

    private func updateTodayIndicator() {
        let today = Calendar.current.startOfDay(for: Date())
        let todayString = isoDateFormatter.string(from: today)

        if let todayRowIndex = dateToRowMap[todayString] {
            tvGuideView.showTodayIndicator(at: todayRowIndex)
        } else {
            tvGuideView.hideTodayIndicator()
        }
    }
}

// MARK: - Mapping Helpers

extension TVGuideVertViewController {
    func columnIndex(for providerID: Int) -> Int? {
        return providerToColumnMap[providerID]
    }

    func rowIndex(for date: Date) -> Int? {
        let dateString = isoDateFormatter.string(from: date)
        return dateToRowMap[dateString]
    }

    func rowIndex(for dateString: String) -> Int? {
        return dateToRowMap[dateString]
    }

    func dateColumn(for row: Int) -> TVGuide2DateColumn? {
        guard row >= 0 && row < dateColumns.count else { return nil }
        return dateColumns[row]
    }

    func provider(for column: Int) -> TVGuide2Provider? {
        guard column >= 0 && column < providers.count else { return nil }
        return providers[column]
    }
}

// MARK: - UICollectionViewDelegate & Scroll Synchronization

extension TVGuideVertViewController: UICollectionViewDelegate {

    // MARK: - Selection Handling

    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        collectionView.deselectItem(at: indexPath, animated: true)

        if collectionView == tvGuideView.gridCollectionView {
            handleGridSelection(at: indexPath)
        } else if collectionView == tvGuideView.providerHeaderCollectionView {
            handleProviderHeaderSelection(at: indexPath)
        } else if collectionView == tvGuideView.dayRailCollectionView {
            handleDayRailSelection(at: indexPath)
        }
    }

    private func handleGridSelection(at indexPath: IndexPath) {
        guard let item = gridDataSource.itemIdentifier(for: indexPath) else { return }

        switch item {
        case .empty:
            // No action for empty cells
            break
        case .episode(let show, let episode, _):
            // Bubble selection to delegate (same as horizontal guide)
            tvGuideView.delegate?.tvGuideVertView(tvGuideView, didSelectShow: show, episode: episode)
        }
    }

    private func handleProviderHeaderSelection(at indexPath: IndexPath) {
        // Optional: Could implement provider filtering or info display
        print("Selected provider at index: \(indexPath.item)")
    }

    private func handleDayRailSelection(at indexPath: IndexPath) {
        // Optional: Could implement date navigation
        if let dateColumn = dateColumn(for: indexPath.item) {
            print("Selected date: \(dateColumn.date)")
        }
    }

    // MARK: - Scroll View Delegate Methods

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        // Identify which collection view is scrolling
        if scrollView == tvGuideView.gridCollectionView {
            // Grid is scrolling - sync both header and day rail
            syncScrollViews(from: tvGuideView.gridCollectionView)
        } else if scrollView == tvGuideView.providerHeaderCollectionView {
            // Provider header is scrolling - sync grid's X axis only
            syncGridFromProviderHeader()
        } else if scrollView == tvGuideView.dayRailCollectionView {
            // Day rail is scrolling - sync grid's Y axis only
            syncGridFromDayRail()
        }
    }

    private func syncScrollViews(from sourceScrollView: UIScrollView) {
        // Only sync on user-initiated scrolls to avoid feedback loops
        guard sourceScrollView.isTracking || sourceScrollView.isDecelerating else { return }

        let sourceOffset = sourceScrollView.contentOffset

        // Sync provider header's X axis
        if tvGuideView.providerHeaderCollectionView.contentOffset.x != sourceOffset.x {
            tvGuideView.providerHeaderCollectionView.setContentOffset(
                CGPoint(x: sourceOffset.x, y: 0),
                animated: false
            )
        }

        // Sync day rail's Y axis
        if tvGuideView.dayRailCollectionView.contentOffset.y != sourceOffset.y {
            tvGuideView.dayRailCollectionView.setContentOffset(
                CGPoint(x: 0, y: sourceOffset.y),
                animated: false
            )
        }
    }

    private func syncGridFromProviderHeader() {
        guard tvGuideView.providerHeaderCollectionView.isTracking ||
              tvGuideView.providerHeaderCollectionView.isDecelerating else { return }

        let headerOffset = tvGuideView.providerHeaderCollectionView.contentOffset
        let currentGridOffset = tvGuideView.gridCollectionView.contentOffset

        // Update grid's X axis only
        if currentGridOffset.x != headerOffset.x {
            tvGuideView.gridCollectionView.setContentOffset(
                CGPoint(x: headerOffset.x, y: currentGridOffset.y),
                animated: false
            )
        }
    }

    private func syncGridFromDayRail() {
        guard tvGuideView.dayRailCollectionView.isTracking ||
              tvGuideView.dayRailCollectionView.isDecelerating else { return }

        let railOffset = tvGuideView.dayRailCollectionView.contentOffset
        let currentGridOffset = tvGuideView.gridCollectionView.contentOffset

        // Update grid's Y axis only
        if currentGridOffset.y != railOffset.y {
            tvGuideView.gridCollectionView.setContentOffset(
                CGPoint(x: currentGridOffset.x, y: railOffset.y),
                animated: false
            )
        }
    }
}

// MARK: - TVGuideVertViewDelegate

extension TVGuideVertViewController: TVGuideVertViewDelegate {
    func tvGuideVertView(_ view: TVGuideVertView, didSelectShow show: TVGuide2Show, episode: TVGuide2Episode?) {
        // Use same handling as horizontal guide
        handleShowSelection(show: show, episode: episode)
    }

    private func handleShowSelection(show: TVGuide2Show, episode: TVGuide2Episode?) {
        // Create episode details alert (same style as horizontal guide)
        let title = episode?.title ?? show.title
        let message = episode?.overview ?? "No episode details available"

        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)

        // Add "Mark as Watched" option if episode exists and not watched
        if let episode = episode, !episode.isWatched {
            alert.addAction(UIAlertAction(title: "Mark as Watched", style: .default) { [weak self] _ in
                self?.markEpisodeAsWatched(episode)
            })
        }

        // Show full poster option
        alert.addAction(UIAlertAction(title: "View Poster", style: .default) { [weak self] _ in
            self?.showPosterZoom(for: show)
        })

        alert.addAction(UIAlertAction(title: "Close", style: .cancel))
        present(alert, animated: true)
    }

    private func markEpisodeAsWatched(_ episode: TVGuide2Episode) {
        Task {
            do {
                try await apiClient.setEpisodeProgress(tmdbId: episode.tmdbId, seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber, status: "watched")
                await MainActor.run {
                    // Refresh data to show updated watch status
                    self.loadData()
                }
            } catch {
                await MainActor.run {
                    self.showError(error)
                }
            }
        }
    }

    private func showPosterZoom(for show: TVGuide2Show) {
        // Create poster zoom overlay (same as horizontal guide)
        let overlay = UIView()
        overlay.backgroundColor = UIColor.black.withAlphaComponent(0.8)
        overlay.tag = 777
        overlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(overlay)

        let posterImageView = UIImageView()
        posterImageView.contentMode = .scaleAspectFit
        posterImageView.layer.cornerRadius = 16
        posterImageView.clipsToBounds = true
        posterImageView.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(posterImageView)

        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            posterImageView.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            posterImageView.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            posterImageView.widthAnchor.constraint(equalTo: overlay.widthAnchor, multiplier: 0.8),
            posterImageView.heightAnchor.constraint(lessThanOrEqualTo: overlay.heightAnchor, multiplier: 0.8)
        ])

        // Load poster image
        if let posterPath = show.posterPath, !posterPath.isEmpty,
           let url = URL(string: "https://image.tmdb.org/t/p/w500\(posterPath)") {
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
                        posterImageView.backgroundColor = .systemGray4
                    }
                }
            }
        } else {
            posterImageView.backgroundColor = .systemGray4
        }

        // Add tap gesture to dismiss
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissPosterZoom))
        overlay.addGestureRecognizer(tapGesture)

        // Animate in
        overlay.alpha = 0
        UIView.animate(withDuration: 0.3) {
            overlay.alpha = 1
        }
    }

    @objc private func dismissPosterZoom() {
        guard let overlay = view.viewWithTag(777) else { return }
        UIView.animate(withDuration: 0.3) {
            overlay.alpha = 0
        } completion: { _ in
            overlay.removeFromSuperview()
        }
    }
}