//
//  DateHeaderView.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class DateHeaderView: UICollectionReusableView {
    static let identifier = "DateHeaderView"

    private static let isoFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    private static let dayNumberFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd"
        return formatter
    }()

    // MARK: - UI Elements
    private let scrollView = UIScrollView()
    private let scrollContentView = UIView()
    private let headerStackView = UIStackView()
    private let showHeaderLabel = UILabel()
    private let separatorView = UIView()
    private var scrollContentWidthConstraint: NSLayoutConstraint?

    // MARK: - Properties
    weak var viewController: TVGuide2ViewController?

    // MARK: - Layout Constants
    private let leadingFrozenWidth: CGFloat = ShowRowCell.frozenLeadingWidth
    private let dateCellWidth: CGFloat = ShowRowCell.episodeColumnWidth
    private let headerHeight: CGFloat = 60

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .systemBackground

        // Setup scroll view for horizontal scrolling (matches row cells)
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        // Setup content view
        scrollContentView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(scrollContentView)

        // Setup show header (frozen left column - only poster column now)
        showHeaderLabel.text = ""  // No text as requested
        showHeaderLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        showHeaderLabel.textAlignment = .center
        showHeaderLabel.backgroundColor = .clear
        showHeaderLabel.isHidden = true
        showHeaderLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(showHeaderLabel) // Add directly to header, not scroll view

        // Setup date headers container
        headerStackView.axis = .horizontal
        headerStackView.distribution = .fillEqually
        headerStackView.spacing = 0
        headerStackView.translatesAutoresizingMaskIntoConstraints = false
        scrollContentView.addSubview(headerStackView)

        // Setup separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Scroll view constraints (starts after poster column)
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: leadingFrozenWidth),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            // Content view constraints
            scrollContentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            scrollContentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            scrollContentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            scrollContentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            scrollContentView.heightAnchor.constraint(equalTo: scrollView.heightAnchor),

            // Show header (frozen left column)
            showHeaderLabel.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            showHeaderLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            showHeaderLabel.widthAnchor.constraint(equalToConstant: leadingFrozenWidth - 8),
            showHeaderLabel.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4),

            // Date headers container
            headerStackView.topAnchor.constraint(equalTo: scrollContentView.topAnchor),
            headerStackView.leadingAnchor.constraint(equalTo: scrollContentView.leadingAnchor),
            headerStackView.trailingAnchor.constraint(equalTo: scrollContentView.trailingAnchor),
            headerStackView.bottomAnchor.constraint(equalTo: scrollContentView.bottomAnchor),

            // Separator
            separatorView.leadingAnchor.constraint(equalTo: leadingAnchor),
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.heightAnchor.constraint(equalToConstant: 1)
        ])

        scrollContentWidthConstraint = scrollContentView.widthAnchor.constraint(equalToConstant: 0)
        scrollContentWidthConstraint?.isActive = true
    }

    func configure(with dateColumns: [TVGuide2DateColumn], viewController: TVGuide2ViewController? = nil) {
        self.viewController = viewController

        // Register scroll view for synchronization
        if let vc = viewController {
            vc.registerScrollViewForSync(scrollView)
        }

        // Clear existing date headers
        headerStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        // Create date header for each column
        for dateColumn in dateColumns {
            let dateHeaderView = createDateHeaderView(for: dateColumn)
            headerStackView.addArrangedSubview(dateHeaderView)
        }

        // Update content view width based on number of date columns
        let columnCount = max(dateColumns.count, 1)
        scrollContentWidthConstraint?.constant = CGFloat(columnCount) * dateCellWidth
    }

    private func createDateHeaderView(for dateColumn: TVGuide2DateColumn) -> UIView {
        let dateHeaderView = UIView()
        dateHeaderView.backgroundColor = .clear
        dateHeaderView.translatesAutoresizingMaskIntoConstraints = false

        let dayLabel = UILabel()
        dayLabel.font = .systemFont(ofSize: 15, weight: .semibold)
        dayLabel.textColor = .label
        dayLabel.textAlignment = .center
        dayLabel.translatesAutoresizingMaskIntoConstraints = false
        dateHeaderView.addSubview(dayLabel)

        let borderView = UIView()
        borderView.backgroundColor = .separator
        borderView.translatesAutoresizingMaskIntoConstraints = false
        dateHeaderView.addSubview(borderView)

        var isToday = false

        if let date = DateHeaderView.isoFormatter.date(from: dateColumn.date) {
            dayLabel.text = DateHeaderView.dayNumberFormatter.string(from: date)
            isToday = Calendar.current.isDateInToday(date)
        } else {
            dayLabel.text = dateColumn.dayNumber
        }

        if isToday {
            dayLabel.textColor = .systemBlue
            dayLabel.font = .systemFont(ofSize: 15, weight: .bold)
        }

        NSLayoutConstraint.activate([
            dateHeaderView.widthAnchor.constraint(equalToConstant: dateCellWidth),

            dayLabel.centerXAnchor.constraint(equalTo: dateHeaderView.centerXAnchor),
            dayLabel.centerYAnchor.constraint(equalTo: dateHeaderView.centerYAnchor),

            borderView.trailingAnchor.constraint(equalTo: dateHeaderView.trailingAnchor),
            borderView.topAnchor.constraint(equalTo: dateHeaderView.topAnchor),
            borderView.bottomAnchor.constraint(equalTo: dateHeaderView.bottomAnchor),
            borderView.widthAnchor.constraint(equalToConstant: 1)
        ])

        return dateHeaderView
    }
}
