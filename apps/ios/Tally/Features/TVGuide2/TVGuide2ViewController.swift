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

    // MARK: - Left Rail UI
    private let leftRailContainer = UIView()
    private let monthLabel = UILabel()
    private let leftRailScrollView = UIScrollView()
    private let providerStackView = UIStackView()
    private let leftRailDivider = UIView()

    // MARK: - Layout Constants
    private let monthRailWidth: CGFloat = 64
    private let showRowHeight: CGFloat = 120  // Taller for full poster
    private let dateHeaderHeight: CGFloat = 60

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

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        syncLeftRailVerticalOffset()
    }

    // MARK: - Setup
    private func setupUI() {
        title = "TV Guide"
        view.backgroundColor = .systemBackground

        setupLeftRail()

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
            collectionView.leadingAnchor.constraint(equalTo: leftRailDivider.trailingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        // Register cells and headers
        collectionView.register(ShowRowCell.self, forCellWithReuseIdentifier: ShowRowCell.identifier)
        collectionView.register(DateHeaderView.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: DateHeaderView.identifier)
    }

    private func setupLeftRail() {
        leftRailContainer.translatesAutoresizingMaskIntoConstraints = false
        leftRailContainer.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.4)
        view.addSubview(leftRailContainer)

        monthLabel.translatesAutoresizingMaskIntoConstraints = false
        monthLabel.font = .systemFont(ofSize: 18, weight: .bold)
        monthLabel.textAlignment = .center
        monthLabel.textColor = .label
        monthLabel.numberOfLines = 1
        monthLabel.adjustsFontSizeToFitWidth = true
        monthLabel.minimumScaleFactor = 0.6
        monthLabel.text = ""

        leftRailScrollView.translatesAutoresizingMaskIntoConstraints = false
        leftRailScrollView.showsVerticalScrollIndicator = false
        leftRailScrollView.showsHorizontalScrollIndicator = false
        leftRailScrollView.isScrollEnabled = false
        leftRailScrollView.backgroundColor = .clear

        providerStackView.translatesAutoresizingMaskIntoConstraints = false
        providerStackView.axis = .vertical
        providerStackView.alignment = .fill
        providerStackView.distribution = .fill
        providerStackView.spacing = 0

        leftRailDivider.translatesAutoresizingMaskIntoConstraints = false
        leftRailDivider.backgroundColor = .separator
        view.addSubview(leftRailDivider)

        leftRailContainer.addSubview(monthLabel)
        leftRailContainer.addSubview(leftRailScrollView)
        leftRailScrollView.addSubview(providerStackView)

        NSLayoutConstraint.activate([
            leftRailContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            leftRailContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            leftRailContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            leftRailContainer.widthAnchor.constraint(equalToConstant: monthRailWidth),

            monthLabel.topAnchor.constraint(equalTo: leftRailContainer.topAnchor, constant: 8),
            monthLabel.leadingAnchor.constraint(equalTo: leftRailContainer.leadingAnchor, constant: 8),
            monthLabel.trailingAnchor.constraint(equalTo: leftRailContainer.trailingAnchor, constant: -8),
            monthLabel.heightAnchor.constraint(equalToConstant: dateHeaderHeight),

            leftRailScrollView.topAnchor.constraint(equalTo: monthLabel.bottomAnchor),
            leftRailScrollView.leadingAnchor.constraint(equalTo: leftRailContainer.leadingAnchor),
            leftRailScrollView.trailingAnchor.constraint(equalTo: leftRailContainer.trailingAnchor),
            leftRailScrollView.bottomAnchor.constraint(equalTo: leftRailContainer.bottomAnchor),

            providerStackView.topAnchor.constraint(equalTo: leftRailScrollView.contentLayoutGuide.topAnchor),
            providerStackView.leadingAnchor.constraint(equalTo: leftRailScrollView.contentLayoutGuide.leadingAnchor),
            providerStackView.trailingAnchor.constraint(equalTo: leftRailScrollView.contentLayoutGuide.trailingAnchor),
            providerStackView.bottomAnchor.constraint(equalTo: leftRailScrollView.contentLayoutGuide.bottomAnchor),
            providerStackView.widthAnchor.constraint(equalTo: leftRailScrollView.frameLayoutGuide.widthAnchor),

            leftRailDivider.leadingAnchor.constraint(equalTo: leftRailContainer.trailingAnchor),
            leftRailDivider.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            leftRailDivider.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            leftRailDivider.widthAnchor.constraint(equalToConstant: 1 / UIScreen.main.scale)
        ])
    }

    private func createLayout() -> UICollectionViewLayout {
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
        config.boundarySupplementaryItems = [header]
        layout.configuration = config

        return layout
    }

    private func createProviderSection() -> NSCollectionLayoutSection {
        // Create item for each row (show)
        let itemSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .estimated(showRowHeight)
        )
        let item = NSCollectionLayoutItem(layoutSize: itemSize)

        // Create group for each row
        let groupSize = NSCollectionLayoutSize(
            widthDimension: .fractionalWidth(1.0),
            heightDimension: .estimated(showRowHeight)
        )
        let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])

        // Create section
        let section = NSCollectionLayoutSection(group: group)
        section.interGroupSpacing = 0
        section.contentInsets = NSDirectionalEdgeInsets(
            top: 0,
            leading: 0,
            bottom: 0,
            trailing: 0
        )

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
                return cell
            }
        }

        // Configure supplementary view provider for headers only
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
                self.expandedEpisodeContexts.removeAll()
                self.updateMonthLabel(forVisibleColumnIndex: 0)
                self.updateSnapshot()
                self.isLoading = false
            } catch {
                self.showError(error)
                self.refreshLeftRail(with: [])
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
            refreshLeftRail(with: [])
            scrollViewsForSync.removeAllObjects()
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
        dataSource.apply(snapshot, animatingDifferences: true)

        refreshLeftRail(with: data.providers)
        collectionView.reloadData()
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

    @MainActor
    private func refreshLeftRail(with providers: [TVGuide2Provider]) {
        providerStackView.arrangedSubviews.forEach { subview in
            providerStackView.removeArrangedSubview(subview)
            subview.removeFromSuperview()
        }

        guard !providers.isEmpty else {
            syncLeftRailVerticalOffset()
            return
        }

        collectionView.layoutIfNeeded()

        for (sectionIndex, provider) in providers.enumerated() {
            var providerHeight: CGFloat = CGFloat(provider.shows.count) * ShowRowCell.baseRowHeight

            if collectionView.numberOfSections > sectionIndex,
               let firstIndex = provider.shows.indices.first,
               let lastIndex = provider.shows.indices.last,
               let firstAttributes = collectionView.layoutAttributesForItem(at: IndexPath(item: firstIndex, section: sectionIndex)),
               let lastAttributes = collectionView.layoutAttributesForItem(at: IndexPath(item: lastIndex, section: sectionIndex)) {
                let top = firstAttributes.frame.minY
                let bottom = lastAttributes.frame.maxY
                providerHeight = max(bottom - top, 0)
            }

            let providerView = createProviderLogoView(for: provider, height: providerHeight)
            providerStackView.addArrangedSubview(providerView)
        }

        syncLeftRailVerticalOffset()
    }

    @MainActor
    private func syncLeftRailVerticalOffset() {
        let maxOffset = max(leftRailScrollView.contentSize.height - leftRailScrollView.bounds.height, 0)
        let reference = collectionView.contentOffset.y
        let target = max(0, min(reference, maxOffset))
        leftRailScrollView.contentOffset.y = target.isFinite ? target : 0
    }

    private func createProviderLogoView(for provider: TVGuide2Provider, height: CGFloat) -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = .clear

        let backgroundView = UIView()
        backgroundView.translatesAutoresizingMaskIntoConstraints = false
        backgroundView.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.3)
        backgroundView.layer.cornerRadius = 18
        backgroundView.layer.masksToBounds = true
        container.addSubview(backgroundView)

        let logoImageView = UIImageView()
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.backgroundColor = .secondarySystemBackground
        logoImageView.layer.cornerRadius = 22
        logoImageView.layer.masksToBounds = true

        container.addSubview(logoImageView)

        let separator = UIView()
        separator.translatesAutoresizingMaskIntoConstraints = false
        separator.backgroundColor = .separator
        container.addSubview(separator)

        let heightConstraint = container.heightAnchor.constraint(equalToConstant: max(height, ShowRowCell.baseRowHeight))
        heightConstraint.priority = .defaultHigh
        heightConstraint.isActive = true

        NSLayoutConstraint.activate([
            backgroundView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            backgroundView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            backgroundView.topAnchor.constraint(equalTo: container.topAnchor),
            backgroundView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            logoImageView.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            logoImageView.widthAnchor.constraint(equalToConstant: 44),
            logoImageView.heightAnchor.constraint(equalToConstant: 44),
            separator.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            separator.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            separator.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            separator.heightAnchor.constraint(equalToConstant: 1)
        ])

        logoImageView.image = providerPlaceholderImage(for: provider.name)

        if let logoPath = provider.logoPath, !logoPath.isEmpty,
           let url = URL(string: "https://image.tmdb.org/t/p/w92\(logoPath)") {
            Task {
                do {
                    let (data, _) = try await URLSession.shared.data(from: url)
                    if let image = UIImage(data: data) {
                        await MainActor.run {
                            logoImageView.image = image
                        }
                    }
                } catch {
                    // Keep placeholder on failure
                }
            }
        }

        return container
    }

    private func providerPlaceholderImage(for name: String) -> UIImage? {
        let size = CGSize(width: 44, height: 44)
        let renderer = UIGraphicsImageRenderer(size: size)
        let initial = String(name.prefix(1)).uppercased()
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 18, weight: .semibold),
            .foregroundColor: UIColor.label
        ]

        return renderer.image { context in
            UIColor.systemGray5.withAlphaComponent(0.6).setFill()
            context.fill(CGRect(origin: .zero, size: size))

            let textSize = initial.size(withAttributes: attributes)
            let rect = CGRect(
                x: (size.width - textSize.width) / 2,
                y: (size.height - textSize.height) / 2,
                width: textSize.width,
                height: textSize.height
            )
            initial.draw(in: rect, withAttributes: attributes)
        }
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
                monthLabel.text = monthText
            }
        } else if currentMonthLabelText != dateString {
            currentMonthLabelText = dateString
            monthLabel.text = dateString
        }
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

        if let providers = tvGuideData?.providers {
            refreshLeftRail(with: providers)
        }

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
        let existingOffset = scrollViewsForSync.allObjects.first?.contentOffset.x ?? scrollView.contentOffset.x

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
        if scrollView === collectionView {
            syncLeftRailVerticalOffset()
            return
        }

        updateMonthLabel(forContentOffsetX: scrollView.contentOffset.x)

        for syncScrollView in scrollViewsForSync.allObjects where syncScrollView !== scrollView {
            if abs(syncScrollView.contentOffset.x - scrollView.contentOffset.x) > .ulpOfOne {
                syncScrollView.contentOffset.x = scrollView.contentOffset.x
            }
        }
    }
}
