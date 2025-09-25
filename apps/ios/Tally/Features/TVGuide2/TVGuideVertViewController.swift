import UIKit

class TVGuideVertViewController: UIViewController {

    // MARK: - Properties
    private let apiClient: ApiClient
    private var tvGuideView: TVGuideVertView!

    // Data
    private var tvGuideData: TVGuide2Data?
    private var dateColumns: [TVGuide2DateColumn] = []

    // New flattened structure for columns
    private var showColumns: [ShowColumn] = []
    private var providerSpans: [ViewControllerProviderSpan] = []

    // MARK: - Day Rail Item Types
    enum DayRailItem: Hashable {
        case spacer
        case date(TVGuide2DateColumn)
    }

    // Data sources for 3-rail system
    private var gridDataSource: UICollectionViewDiffableDataSource<Int, GridItem>!
    private var providerHeaderDataSource: UICollectionViewDiffableDataSource<Int, ViewControllerProviderSpan>!
    private var postersRowDataSource: UICollectionViewDiffableDataSource<Int, ShowColumn>!
    private var dayRailDataSource: UICollectionViewDiffableDataSource<Int, DayRailItem>!

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
    private var dateToRowMap: [String: Int] = [:]

    // Inline expansion
    private var expandedDayIndex: Int? = nil
    private let expandedRowHeight: CGFloat = 160 // Height when expanded

    // MARK: - Data Types

    // Show column represents one column in the grid (one show)
    struct ShowColumn: Hashable {
        let show: TVGuide2Show
        let provider: TVGuide2Provider
        let columnIndex: Int

        func hash(into hasher: inout Hasher) {
            hasher.combine(show.id)
            hasher.combine(columnIndex)
        }

        static func == (lhs: ShowColumn, rhs: ShowColumn) -> Bool {
            return lhs.show.id == rhs.show.id && lhs.columnIndex == rhs.columnIndex
        }
    }

    // Provider span for merged header cells
    struct ViewControllerProviderSpan: Hashable {
        let provider: TVGuide2Provider
        let startColumn: Int
        let endColumn: Int
        let showCount: Int

        func hash(into hasher: inout Hasher) {
            hasher.combine(provider.id)
            hasher.combine(startColumn)
            hasher.combine(endColumn)
        }

        static func == (lhs: ViewControllerProviderSpan, rhs: ViewControllerProviderSpan) -> Bool {
            return lhs.provider.id == rhs.provider.id && lhs.startColumn == rhs.startColumn && lhs.endColumn == rhs.endColumn
        }
    }

    enum GridItem: Hashable {
        case empty(id: String)
        case episodeBadge(show: TVGuide2Show, episode: TVGuide2Episode, columnIndex: Int)

        var id: String {
            switch self {
            case .empty(let id):
                return id
            case .episodeBadge(let show, let episode, let columnIndex):
                return "\(show.id)-\(episode.id)-\(columnIndex)"
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
        view.backgroundColor = .systemBackground // Light theme

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

        // Provider header data source (now using ProviderSpan)
        providerHeaderDataSource = UICollectionViewDiffableDataSource<Int, ViewControllerProviderSpan>(
            collectionView: tvGuideView.providerHeaderCollectionView
        ) { [weak self] collectionView, indexPath, providerSpan in
            return self?.configureProviderHeaderCell(collectionView, indexPath: indexPath, providerSpan: providerSpan)
        }

        // Static posters row data source
        postersRowDataSource = UICollectionViewDiffableDataSource<Int, ShowColumn>(
            collectionView: tvGuideView.postersRowCollectionView
        ) { [weak self] collectionView, indexPath, showColumn in
            return self?.configurePostersRowCell(collectionView, indexPath: indexPath, showColumn: showColumn)
        }

        // Day rail data source
        dayRailDataSource = UICollectionViewDiffableDataSource<Int, DayRailItem>(
            collectionView: tvGuideView.dayRailCollectionView
        ) { [weak self] collectionView, indexPath, item in
            guard let self = self else {
                assertionFailure("Self is nil in day rail data source")
                let fallbackCell = collectionView.dequeueReusableCell(withReuseIdentifier: "SpacerCell", for: indexPath)
                return fallbackCell
            }

            switch item {
            case .spacer:
                return self.configureSpacerCell(collectionView, indexPath: indexPath)
            case .date(let dateColumn):
                return self.configureDayCell(collectionView, indexPath: indexPath, dateColumn: dateColumn)
            }
        }

        // Provide the month header supplementary
        dayRailDataSource.supplementaryViewProvider = { [weak self] collectionView, kind, indexPath in
            guard kind == MonthHeaderView.elementKind,
                  let header = collectionView.dequeueReusableSupplementaryView(
                      ofKind: MonthHeaderView.elementKind,
                      withReuseIdentifier: MonthHeaderView.reuseID,
                      for: indexPath
                  ) as? MonthHeaderView,
                  let month = self?.tvGuideView.monthText else {
                return UICollectionReusableView()
            }
            header.configure(monthText: month)
            return header
        }

        // Register cell types
        registerCellTypes()
    }

    private func registerCellTypes() {
        // Grid cells - use EpisodeBadgeCell for episode badges
        tvGuideView.gridCollectionView.register(
            EpisodeBadgeCell.self,
            forCellWithReuseIdentifier: EpisodeBadgeCell.identifier
        )
        tvGuideView.gridCollectionView.register(
            UICollectionViewCell.self,
            forCellWithReuseIdentifier: "EmptyCell"
        )

        // Provider header cells - use ProviderSpanCell for merged cells
        tvGuideView.providerHeaderCollectionView.register(
            ProviderSpanCell.self,
            forCellWithReuseIdentifier: ProviderSpanCell.identifier
        )
        tvGuideView.providerHeaderCollectionView.register(
            ProviderCell.self,
            forCellWithReuseIdentifier: ProviderCell.identifier
        )

        // Static posters row cells - use ShowPosterCell in poster mode
        tvGuideView.postersRowCollectionView.register(
            ShowPosterCell.self,
            forCellWithReuseIdentifier: ShowPosterCell.identifier
        )

        // Day rail cells
        tvGuideView.dayRailCollectionView.register(
            TVG2DayCell.self,
            forCellWithReuseIdentifier: TVG2DayCell.identifier
        )

        // Day rail spacer cells
        tvGuideView.dayRailCollectionView.register(
            UICollectionViewCell.self,
            forCellWithReuseIdentifier: "SpacerCell"
        )
    }

    private func setupScrollViewDelegates() {
        tvGuideView.gridCollectionView.delegate = self
        tvGuideView.providerHeaderCollectionView.delegate = self
        tvGuideView.postersRowCollectionView.delegate = self
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

        // Build flattened show columns and provider spans
        buildShowColumnsAndProviderSpans(with: data)
        tvGuideView.setProviderSpans(convertToLayoutProviderSpans(providerSpans))

        // Update layouts with actual dimensions
        tvGuideView.updateLayouts(
            columnCount: showColumns.count,
            rowCount: dateColumns.count
        )
    }

    private func buildShowColumnsAndProviderSpans(with data: TVGuide2Data) {
        showColumns.removeAll()
        providerSpans.removeAll()

        var columnIndex = 0

        for provider in data.providers {
            let startColumn = columnIndex

            // Add a column for each show in this provider
            for show in provider.shows {
                let showColumn = ShowColumn(
                    show: show,
                    provider: provider,
                    columnIndex: columnIndex
                )
                showColumns.append(showColumn)
                columnIndex += 1
            }

            let endColumn = columnIndex - 1

            // Create provider span (merged cell)
            if !provider.shows.isEmpty {
                let providerSpan = ViewControllerProviderSpan(
                    provider: provider,
                    startColumn: startColumn,
                    endColumn: endColumn,
                    showCount: provider.shows.count
                )
                providerSpans.append(providerSpan)
            }
        }

        print("Built \(showColumns.count) show columns and \(providerSpans.count) provider spans")
    }

    private func convertToLayoutProviderSpans(_ spans: [ViewControllerProviderSpan]) -> [ProviderSpan] {
        return spans.map { span in
            ProviderSpan(
                startColumn: span.startColumn,
                endColumn: span.endColumn
            )
        }
    }

    // MARK: - Cell Configuration

    private func configureGridCell(_ collectionView: UICollectionView, indexPath: IndexPath, item: GridItem) -> UICollectionViewCell {
        switch item {
        case .empty:
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "EmptyCell", for: indexPath)
            cell.backgroundColor = .clear

            // Add debug border to empty cells
            if TVGV.debugBordersEnabled {
                cell.contentView.layer.borderColor = TVGV.debugGridColor
                cell.contentView.layer.borderWidth = 0.25
            } else {
                cell.contentView.layer.borderWidth = 0.0
            }
            return cell

        case .episodeBadge(let show, let episode, _):
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: EpisodeBadgeCell.identifier, for: indexPath) as! EpisodeBadgeCell
            cell.configure(with: episode, show: show)
            return cell
        }
    }

    private func configureProviderHeaderCell(_ collectionView: UICollectionView, indexPath: IndexPath, providerSpan: ViewControllerProviderSpan) -> UICollectionViewCell {
        if providerSpan.showCount > 1 {
            // Multiple shows - use ProviderSpanCell for merged display
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ProviderSpanCell.identifier, for: indexPath) as! ProviderSpanCell
            cell.configure(with: providerSpan)
            return cell
        } else {
            // Single show - use regular ProviderCell
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ProviderCell.identifier, for: indexPath) as! ProviderCell
            cell.configure(with: providerSpan.provider)
            return cell
        }
    }

    private func configurePostersRowCell(_ collectionView: UICollectionView, indexPath: IndexPath, showColumn: ShowColumn) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ShowPosterCell.identifier, for: indexPath) as! ShowPosterCell
        cell.configure(with: showColumn.show, size: .poster)
        return cell
    }

    private func configureSpacerCell(_ collectionView: UICollectionView, indexPath: IndexPath) -> UICollectionViewCell {
        // Properly dequeue spacer cell with registered identifier
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "SpacerCell", for: indexPath)
        cell.backgroundColor = .clear
        cell.isHidden = true  // Make it completely invisible
        return cell
    }

    private func configureDayCell(_ collectionView: UICollectionView, indexPath: IndexPath, dateColumn: TVGuide2DateColumn) -> UICollectionViewCell {
        guard let cell = collectionView.dequeueReusableCell(withReuseIdentifier: TVG2DayCell.identifier, for: indexPath) as? TVG2DayCell else {
            assertionFailure("Failed to dequeue TVG2DayCell with identifier: \(TVG2DayCell.identifier)")
            // Return a basic cell as fallback to prevent crashes
            return collectionView.dequeueReusableCell(withReuseIdentifier: "SpacerCell", for: indexPath)
        }

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

        // First build the flattened show columns and provider spans
        buildShowColumnsAndProviderSpans(with: data)
        tvGuideView.setProviderSpans(convertToLayoutProviderSpans(providerSpans))

        // Then update all collection view snapshots
        updateGridSnapshot(with: data)
        updateProviderHeaderSnapshot()
        updatePostersRowSnapshot()
        updateDayRailSnapshot()
        updateTodayIndicator()

        // Update collection view layouts with new dimensions
        let columnCount = showColumns.count
        let rowCount = dateColumns.count
        tvGuideView.updateLayouts(columnCount: columnCount, rowCount: rowCount)
    }

    private func updateGridSnapshot(with data: TVGuide2Data) {
        var snapshot = NSDiffableDataSourceSnapshot<Int, GridItem>()
        snapshot.appendSections([0])

        var gridItems: [GridItem] = []

        // Populate grid in row-major order (days x show columns)
        for (rowIndex, dateColumn) in dateColumns.enumerated() {
            for (columnIndex, showColumn) in showColumns.enumerated() {
                let gridItem = createGridItem(
                    for: dateColumn.date,
                    showColumn: showColumn,
                    row: rowIndex,
                    column: columnIndex
                )
                gridItems.append(gridItem)
            }
        }

        snapshot.appendItems(gridItems, toSection: 0)
        gridDataSource.apply(snapshot, animatingDifferences: false)
    }

    private func updateProviderHeaderSnapshot() {
        var snapshot = NSDiffableDataSourceSnapshot<Int, ViewControllerProviderSpan>()
        snapshot.appendSections([0])
        snapshot.appendItems(providerSpans, toSection: 0)
        providerHeaderDataSource.apply(snapshot, animatingDifferences: false)
    }

    private func updatePostersRowSnapshot() {
        var snapshot = NSDiffableDataSourceSnapshot<Int, ShowColumn>()
        snapshot.appendSections([0])
        snapshot.appendItems(showColumns, toSection: 0)
        postersRowDataSource.apply(snapshot, animatingDifferences: false)
    }

    private func updateDayRailSnapshot() {
        var snapshot = NSDiffableDataSourceSnapshot<Int, DayRailItem>()
        snapshot.appendSections([0])

        // Add spacer as first item
        var items: [DayRailItem] = [.spacer]

        // Add date columns with safety check
        guard !dateColumns.isEmpty else {
            assertionFailure("dateColumns is empty when creating day rail snapshot")
            // Still apply empty snapshot to avoid crashes
            snapshot.appendItems(items, toSection: 0)
            dayRailDataSource.apply(snapshot, animatingDifferences: false)
            return
        }

        for dateColumn in dateColumns {
            items.append(.date(dateColumn))
        }

        snapshot.appendItems(items, toSection: 0)
        dayRailDataSource.apply(snapshot, animatingDifferences: false)
    }

    private func createGridItem(for date: String, showColumn: ShowColumn, row: Int, column: Int) -> GridItem {
        // Check if this specific show has an episode on this date
        if let episode = showColumn.show.episodes.first(where: { $0.airDate == date }) {
            return .episodeBadge(show: showColumn.show, episode: episode, columnIndex: showColumn.columnIndex)
        }

        // No episode found - create empty cell
        return .empty(id: "\(date)-\(showColumn.show.id)")
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
        return showColumns.first(where: { $0.provider.id == providerID })?.columnIndex
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
        guard column >= 0 && column < showColumns.count else { return nil }
        return showColumns[column].provider
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
        case .episodeBadge(let show, let episode, _):
            // Calculate which day row this belongs to
            let rowIndex = indexPath.item / showColumns.count
            toggleRowExpansion(at: rowIndex, show: show, episode: episode)
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

    private func toggleRowExpansion(at rowIndex: Int, show: TVGuide2Show, episode: TVGuide2Episode) {
        // If same row is tapped, collapse it
        if expandedDayIndex == rowIndex {
            expandedDayIndex = nil
        } else {
            // Expand new row, collapse any previous
            expandedDayIndex = rowIndex
        }

        // Update layout with new row heights
        updateGridLayoutForExpansion()

        // Show episode details in expanded area (implement later)
        // For now, just log the selection
        print("Row \(rowIndex) expansion: \(expandedDayIndex != nil ? "expanded" : "collapsed")")
        print("Episode: \(show.title) - \(episode.title)")
    }

    private func updateGridLayoutForExpansion() {
        // Update the grid layout to support variable row heights
        let columnCount = showColumns.count
        let rowCount = dateColumns.count

        tvGuideView.gridCollectionView.collectionViewLayout = TVGuideVertLayout.createGridLayoutWithExpansion(
            columnCount: columnCount,
            rowCount: rowCount,
            expandedRowIndex: expandedDayIndex,
            normalRowHeight: TVGV.rowHeight,
            expandedRowHeight: expandedRowHeight
        )

        // Also update day rail to match
        tvGuideView.dayRailCollectionView.collectionViewLayout = TVGuideVertLayout.createDayRailLayoutWithExpansion(
            rowCount: rowCount,
            expandedRowIndex: expandedDayIndex,
            normalRowHeight: TVGV.rowHeight,
            expandedRowHeight: expandedRowHeight
        )

        // Force layout before clearing content insets
        tvGuideView.dayRailCollectionView.layoutIfNeeded()
        tvGuideView.gridCollectionView.layoutIfNeeded()

        // Clear content insets - positioning handled by layout constraints and section insets
        tvGuideView.dayRailCollectionView.contentInset = .zero
        tvGuideView.dayRailCollectionView.scrollIndicatorInsets = .zero
        tvGuideView.gridCollectionView.contentInset = .zero

        // Force final layout calculations
        tvGuideView.dayRailCollectionView.layoutIfNeeded()
        tvGuideView.gridCollectionView.layoutIfNeeded()
    }

    // MARK: - Month Header Update

    private func updateMonthFromVisibleDate() {
        // Find the smallest visible index (topmost date cell), accounting for spacer at index 0
        let visible = tvGuideView.dayRailCollectionView.indexPathsForVisibleItems
        let dateItemIndexPaths = visible.filter { $0.item > 0 } // Skip spacer at index 0
        guard let top = dateItemIndexPaths.min(by: { $0.item < $1.item }) else { return }

        // Convert to dateColumns index (subtract 1 for spacer)
        let dateIndex = top.item - 1
        guard dateIndex >= 0 && dateIndex < dateColumns.count else { return }

        let dateString = dateColumns[dateIndex].date
        guard let date = isoDateFormatter.date(from: dateString) else { return }

        let newMonth = monthFormatter.string(from: date).uppercased()
        if newMonth != tvGuideView.monthText {
            tvGuideView.updateMonthLabel(newMonth)
        }
    }

    // MARK: - Scroll View Delegate Methods

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        // Identify which collection view is scrolling
        if scrollView == tvGuideView.gridCollectionView {
            // Grid is scrolling - sync header, posters row, and day rail
            syncScrollViews(from: tvGuideView.gridCollectionView)
            // Grid drives vertical scroll too; keep month in sync
            updateMonthFromVisibleDate()
        } else if scrollView == tvGuideView.providerHeaderCollectionView {
            // Provider header is scrolling - sync grid and posters row X axis only
            syncFromProviderHeader()
        } else if scrollView == tvGuideView.postersRowCollectionView {
            // Posters row is scrolling - sync grid and header X axis only
            syncFromPostersRow()
        } else if scrollView == tvGuideView.dayRailCollectionView {
            // Day rail is scrolling - sync grid's Y axis only
            syncGridFromDayRail()
            // Update month header based on visible date cells
            updateMonthFromVisibleDate()
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

        // Sync posters row's X axis
        if tvGuideView.postersRowCollectionView.contentOffset.x != sourceOffset.x {
            tvGuideView.postersRowCollectionView.setContentOffset(
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

    private func syncFromProviderHeader() {
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

        // Update posters row's X axis
        if tvGuideView.postersRowCollectionView.contentOffset.x != headerOffset.x {
            tvGuideView.postersRowCollectionView.setContentOffset(
                CGPoint(x: headerOffset.x, y: 0),
                animated: false
            )
        }
    }

    private func syncFromPostersRow() {
        guard tvGuideView.postersRowCollectionView.isTracking ||
              tvGuideView.postersRowCollectionView.isDecelerating else { return }

        let postersOffset = tvGuideView.postersRowCollectionView.contentOffset
        let currentGridOffset = tvGuideView.gridCollectionView.contentOffset

        // Update grid's X axis only
        if currentGridOffset.x != postersOffset.x {
            tvGuideView.gridCollectionView.setContentOffset(
                CGPoint(x: postersOffset.x, y: currentGridOffset.y),
                animated: false
            )
        }

        // Update provider header's X axis
        if tvGuideView.providerHeaderCollectionView.contentOffset.x != postersOffset.x {
            tvGuideView.providerHeaderCollectionView.setContentOffset(
                CGPoint(x: postersOffset.x, y: 0),
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