//
//  ShowRowCell.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class ShowRowCell: UICollectionViewCell {
    static let identifier = "ShowRowCell"
    static let providerColumnWidth: CGFloat = 60
    static let posterColumnWidth: CGFloat = 90
    static let frozenLeadingWidth: CGFloat = providerColumnWidth + posterColumnWidth

    private static let isoDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    private static let detailDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "E, MMM d"
        return formatter
    }()

    // MARK: - UI Elements
    private let contentStackView = UIStackView()
    private let mainRowContainer = UIView()
    private let providerLogoImageView = UIImageView()
    private let scrollView = UIScrollView()
    private let scrollContentView = UIView()
    private let showPosterImageView = UIImageView()
    private let episodeCellsContainer = UIStackView()
    private let separatorView = UIView()
    private let detailContainer = UIView()
    private let detailStackView = UIStackView()
    private let detailTitleLabel = UILabel()
    private let detailStatusLabel = UILabel()
    private let detailOverviewLabel = UILabel()
    private var scrollContentWidthConstraint: NSLayoutConstraint?
    private var posterHeightConstraint: NSLayoutConstraint?

    // MARK: - Properties
    weak var viewController: TVGuide2ViewController?

    private let providerLogoWidth: CGFloat = ShowRowCell.providerColumnWidth
    private let providerLogoHeight: CGFloat = 48
    private let showPosterWidth: CGFloat = ShowRowCell.posterColumnWidth
    private let episodeCellWidth: CGFloat = 100
    private let baseRowHeight: CGFloat = 120

    private var currentDateColumns: [TVGuide2DateColumn] = []
    private var currentShowRowData: TVGuide2ViewController.ShowRowData?
    private var currentExpandedContext: (date: String, episode: TVGuide2Episode)?
    private var providerLogoTask: Task<Void, Never>?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        showPosterImageView.image = UIImage(systemName: "photo")
        providerLogoImageView.image = nil
        providerLogoTask?.cancel()
        providerLogoTask = nil
        currentDateColumns = []
        currentShowRowData = nil
        currentExpandedContext = nil
        viewController = nil
        detailContainer.isHidden = true
        detailTitleLabel.text = nil
        detailStatusLabel.text = nil
        detailOverviewLabel.text = nil
        episodeCellsContainer.arrangedSubviews.forEach { view in
            episodeCellsContainer.removeArrangedSubview(view)
            view.removeFromSuperview()
        }
    }

    private func setupUI() {
        contentView.backgroundColor = .systemBackground

        contentStackView.axis = .vertical
        contentStackView.spacing = 8
        contentStackView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(contentStackView)

        NSLayoutConstraint.activate([
            contentStackView.topAnchor.constraint(equalTo: contentView.topAnchor),
            contentStackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            contentStackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            contentStackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor)
        ])

        mainRowContainer.translatesAutoresizingMaskIntoConstraints = false
        contentStackView.addArrangedSubview(mainRowContainer)
        mainRowContainer.heightAnchor.constraint(equalToConstant: baseRowHeight).isActive = true

        // Provider logo column
        providerLogoImageView.contentMode = .scaleAspectFit
        providerLogoImageView.layer.cornerRadius = 12
        providerLogoImageView.clipsToBounds = true
        providerLogoImageView.backgroundColor = .secondarySystemBackground
        providerLogoImageView.translatesAutoresizingMaskIntoConstraints = false
        mainRowContainer.addSubview(providerLogoImageView)

        // Setup scroll view for horizontal scrolling
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        mainRowContainer.addSubview(scrollView)

        // Setup content view
        scrollContentView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(scrollContentView)

        // Setup show poster (leading frozen column)
        showPosterImageView.contentMode = .scaleAspectFill
        showPosterImageView.backgroundColor = .systemGray6
        showPosterImageView.clipsToBounds = true
        showPosterImageView.layer.cornerRadius = 8
        showPosterImageView.translatesAutoresizingMaskIntoConstraints = false
        mainRowContainer.addSubview(showPosterImageView)

        // Setup episode cells container
        episodeCellsContainer.axis = .horizontal
        episodeCellsContainer.distribution = .fillEqually
        episodeCellsContainer.spacing = 0
        episodeCellsContainer.translatesAutoresizingMaskIntoConstraints = false
        scrollContentView.addSubview(episodeCellsContainer)

        // Setup separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false
        mainRowContainer.addSubview(separatorView)

        NSLayoutConstraint.activate([
            providerLogoImageView.leadingAnchor.constraint(equalTo: mainRowContainer.leadingAnchor, constant: 8),
            providerLogoImageView.centerYAnchor.constraint(equalTo: mainRowContainer.centerYAnchor),
            providerLogoImageView.widthAnchor.constraint(equalToConstant: providerLogoWidth - 16),
            providerLogoImageView.heightAnchor.constraint(equalToConstant: providerLogoHeight),

            // Scroll view constraints (starts after poster)
            scrollView.topAnchor.constraint(equalTo: mainRowContainer.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: showPosterImageView.trailingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: mainRowContainer.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: mainRowContainer.bottomAnchor),

            // Content view constraints
            scrollContentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            scrollContentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            scrollContentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            scrollContentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            scrollContentView.heightAnchor.constraint(equalTo: scrollView.heightAnchor),

            // Show poster (leading frozen column)
            showPosterImageView.topAnchor.constraint(greaterThanOrEqualTo: mainRowContainer.topAnchor, constant: 8),
            showPosterImageView.leadingAnchor.constraint(equalTo: providerLogoImageView.trailingAnchor, constant: 8),
            showPosterImageView.widthAnchor.constraint(equalToConstant: showPosterWidth),
            showPosterImageView.centerYAnchor.constraint(equalTo: mainRowContainer.centerYAnchor),
            showPosterImageView.bottomAnchor.constraint(lessThanOrEqualTo: mainRowContainer.bottomAnchor, constant: -8),

            // Episode cells container
            episodeCellsContainer.topAnchor.constraint(equalTo: scrollContentView.topAnchor),
            episodeCellsContainer.leadingAnchor.constraint(equalTo: scrollContentView.leadingAnchor),
            episodeCellsContainer.trailingAnchor.constraint(equalTo: scrollContentView.trailingAnchor),
            episodeCellsContainer.bottomAnchor.constraint(equalTo: scrollContentView.bottomAnchor),

            // Separator
            separatorView.leadingAnchor.constraint(equalTo: mainRowContainer.leadingAnchor),
            separatorView.trailingAnchor.constraint(equalTo: mainRowContainer.trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: mainRowContainer.bottomAnchor),
            separatorView.heightAnchor.constraint(equalToConstant: 1)
        ])

        scrollContentWidthConstraint = scrollContentView.widthAnchor.constraint(equalToConstant: 0)
        scrollContentWidthConstraint?.isActive = true

        posterHeightConstraint = showPosterImageView.heightAnchor.constraint(equalToConstant: baseRowHeight - 16)
        posterHeightConstraint?.priority = .defaultHigh
        posterHeightConstraint?.isActive = true

        // Detail container setup
        detailContainer.translatesAutoresizingMaskIntoConstraints = false
        detailContainer.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.7)
        detailContainer.layer.cornerRadius = 12
        detailContainer.layer.masksToBounds = true
        detailContainer.isHidden = true
        contentStackView.addArrangedSubview(detailContainer)

        detailStackView.axis = .vertical
        detailStackView.spacing = 8
        detailStackView.translatesAutoresizingMaskIntoConstraints = false
        detailStackView.isLayoutMarginsRelativeArrangement = true
        detailStackView.layoutMargins = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
        detailContainer.addSubview(detailStackView)

        detailTitleLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        detailTitleLabel.textColor = .label
        detailTitleLabel.numberOfLines = 1

        detailStatusLabel.font = .systemFont(ofSize: 12, weight: .semibold)
        detailStatusLabel.textColor = .secondaryLabel
        detailStatusLabel.numberOfLines = 1

        detailOverviewLabel.font = .systemFont(ofSize: 13)
        detailOverviewLabel.textColor = .secondaryLabel
        detailOverviewLabel.numberOfLines = 3

        detailStackView.addArrangedSubview(detailTitleLabel)
        detailStackView.addArrangedSubview(detailStatusLabel)
        detailStackView.addArrangedSubview(detailOverviewLabel)

        NSLayoutConstraint.activate([
            detailStackView.topAnchor.constraint(equalTo: detailContainer.topAnchor),
            detailStackView.leadingAnchor.constraint(equalTo: detailContainer.leadingAnchor),
            detailStackView.trailingAnchor.constraint(equalTo: detailContainer.trailingAnchor),
            detailStackView.bottomAnchor.constraint(equalTo: detailContainer.bottomAnchor)
        ])
    }

    func configure(
        with showRowData: TVGuide2ViewController.ShowRowData,
        dateColumns: [TVGuide2DateColumn],
        expandedContext: (date: String, episode: TVGuide2Episode)?,
        viewController: TVGuide2ViewController? = nil
    ) {
        self.viewController = viewController
        currentShowRowData = showRowData
        currentDateColumns = dateColumns
        currentExpandedContext = expandedContext

        if let vc = viewController {
            vc.registerScrollViewForSync(scrollView)
        }

        loadProviderLogo(for: showRowData.provider)
        loadPosterImage(from: showRowData.show.posterPath)

        episodeCellsContainer.arrangedSubviews.forEach { view in
            episodeCellsContainer.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        for (index, dateColumn) in dateColumns.enumerated() {
            let episodeView = createEpisodeView(for: dateColumn, columnIndex: index, showRowData: showRowData)
            episodeCellsContainer.addArrangedSubview(episodeView)
        }

        scrollContentWidthConstraint?.constant = CGFloat(max(dateColumns.count, 1)) * episodeCellWidth
        updateDetailSection()
    }

    private func createEpisodeView(
        for dateColumn: TVGuide2DateColumn,
        columnIndex: Int,
        showRowData: TVGuide2ViewController.ShowRowData
    ) -> UIView {
        let episodeView = UIView()
        episodeView.translatesAutoresizingMaskIntoConstraints = false
        episodeView.layer.cornerRadius = 12
        episodeView.clipsToBounds = true
        episodeView.tag = columnIndex

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

        guard let episode = showRowData.episodes[dateColumn.date] else {
            episodeView.backgroundColor = .clear
            return episodeView
        }

        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.alignment = .center
        stackView.spacing = 6
        stackView.translatesAutoresizingMaskIntoConstraints = false

        let dotView = UIView()
        dotView.translatesAutoresizingMaskIntoConstraints = false
        dotView.layer.cornerRadius = 3

        let episodeLabel = UILabel()
        episodeLabel.text = "S\(episode.seasonNumber)E\(episode.episodeNumber)"
        episodeLabel.font = .systemFont(ofSize: 12, weight: .medium)
        episodeLabel.textAlignment = .left
        episodeLabel.layer.cornerRadius = 4
        episodeLabel.clipsToBounds = true
        episodeLabel.translatesAutoresizingMaskIntoConstraints = false

        let today = Date()
        var textColor: UIColor = .label
        var dotColor: UIColor = .systemBlue
        var backgroundColor: UIColor = .clear

        if let airDate = ShowRowCell.isoDateFormatter.date(from: episode.airDate) {
            if episode.isWatched {
                textColor = .systemGreen
                dotColor = .systemGreen
                backgroundColor = .systemGreen.withAlphaComponent(0.12)
            } else if airDate > today {
                textColor = .secondaryLabel
                dotColor = .systemGray3
                backgroundColor = .clear
            } else if Calendar.current.isDateInToday(airDate) {
                textColor = .systemBlue
                dotColor = .systemBlue
                backgroundColor = .systemBlue.withAlphaComponent(0.2)
            } else {
                textColor = .systemGreen
                dotColor = .systemGreen
                backgroundColor = .systemGreen.withAlphaComponent(0.12)
            }
        }

        if currentExpandedContext?.date == dateColumn.date {
            episodeView.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.6)
            episodeView.layer.borderWidth = 1
            episodeView.layer.borderColor = UIColor.separator.cgColor
            episodeLabel.font = .systemFont(ofSize: 12, weight: .semibold)
            episodeLabel.backgroundColor = .clear
        } else {
            episodeView.backgroundColor = backgroundColor
            episodeView.layer.borderWidth = 0
            episodeView.layer.borderColor = UIColor.clear.cgColor
            episodeLabel.backgroundColor = backgroundColor
        }

        episodeLabel.textColor = textColor
        dotView.backgroundColor = dotColor

        stackView.addArrangedSubview(dotView)
        stackView.addArrangedSubview(episodeLabel)
        episodeView.addSubview(stackView)

        NSLayoutConstraint.activate([
            stackView.centerXAnchor.constraint(equalTo: episodeView.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: episodeView.centerYAnchor),
            stackView.leadingAnchor.constraint(greaterThanOrEqualTo: episodeView.leadingAnchor, constant: 8),
            stackView.trailingAnchor.constraint(lessThanOrEqualTo: episodeView.trailingAnchor, constant: -8),

            dotView.widthAnchor.constraint(equalToConstant: 6),
            dotView.heightAnchor.constraint(equalToConstant: 6),

            episodeLabel.heightAnchor.constraint(equalToConstant: 24)
        ])

        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleEpisodeTap(_:)))
        episodeView.addGestureRecognizer(tapGesture)
        episodeView.isUserInteractionEnabled = true

        return episodeView
    }

    private func updateDetailSection() {
        guard let context = currentExpandedContext else {
            detailContainer.isHidden = true
            return
        }

        detailContainer.isHidden = false
        detailTitleLabel.text = context.episode.title

        if let airDate = ShowRowCell.isoDateFormatter.date(from: context.date) {
            let formattedDate = ShowRowCell.detailDateFormatter.string(from: airDate)
            let status = statusText(for: airDate)
            detailStatusLabel.text = "\(status) • \(formattedDate)"
        } else {
            detailStatusLabel.text = "Air date TBD"
        }

        if let overview = context.episode.overview, !overview.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            detailOverviewLabel.text = overview
        } else {
            detailOverviewLabel.text = "Synopsis coming soon."
        }
    }

    private func statusText(for airDate: Date) -> String {
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        let startOfAir = calendar.startOfDay(for: airDate)
        guard let dayDifference = calendar.dateComponents([.day], from: startOfToday, to: startOfAir).day else {
            return "Airs"
        }

        switch dayDifference {
        case Int.min..<(-1):
            return "Aired \(-dayDifference) days ago"
        case -1:
            return "Aired yesterday"
        case 0:
            return "Airs today"
        case 1:
            return "Airs tomorrow"
        default:
            return "Airs in \(dayDifference) days"
        }
    }

    @objc private func handleEpisodeTap(_ gesture: UITapGestureRecognizer) {
        guard let view = gesture.view,
              currentDateColumns.indices.contains(view.tag),
              let rowData = currentShowRowData else { return }

        let dateColumn = currentDateColumns[view.tag]
        viewController?.toggleEpisodeExpansion(for: rowData, on: dateColumn.date)
    }

    private func loadProviderLogo(for provider: TVGuide2Provider) {
        providerLogoTask?.cancel()
        providerLogoImageView.image = ShowRowCell.providerPlaceholderImage(for: provider.name)

        guard let logoPath = provider.logoPath, !logoPath.isEmpty,
              let url = URL(string: "https://image.tmdb.org/t/p/w92\(logoPath)") else {
            return
        }

        providerLogoTask = Task { [weak self] in
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        guard let self = self,
                              self.currentShowRowData?.provider.id == provider.id else { return }
                        self.providerLogoImageView.image = image
                    }
                }
            } catch {
                // Ignore and keep placeholder
            }
        }
    }

    private func loadPosterImage(from path: String?) {
        showPosterImageView.image = UIImage(systemName: "photo")

        guard let path = path, !path.isEmpty,
              let url = URL(string: "https://image.tmdb.org/t/p/w342\(path)") else { return }

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        if self.currentShowRowData?.show.posterPath == path {
                            self.showPosterImageView.image = image
                        }
                    }
                }
            } catch {
                // Fallback handled by placeholder above
            }
        }
    }

    private static func providerPlaceholderImage(for name: String) -> UIImage? {
        let size = CGSize(width: 48, height: 48)
        let renderer = UIGraphicsImageRenderer(size: size)
        let initials = String(name.prefix(1)).uppercased()
        let backgroundColor = UIColor.systemGray5.withAlphaComponent(0.6)
        let textAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
            .foregroundColor: UIColor.label
        ]

        return renderer.image { context in
            backgroundColor.setFill()
            context.fill(CGRect(origin: .zero, size: size))

            let textSize = initials.size(withAttributes: textAttributes)
            let rect = CGRect(
                x: (size.width - textSize.width) / 2,
                y: (size.height - textSize.height) / 2,
                width: textSize.width,
                height: textSize.height
            )
            initials.draw(in: rect, withAttributes: textAttributes)
        }
    }
}
