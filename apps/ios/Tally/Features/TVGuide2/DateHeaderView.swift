//
//  DateHeaderView.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class DateHeaderView: UICollectionReusableView {
    static let identifier = "DateHeaderView"

    // MARK: - UI Elements
    private let scrollView = UIScrollView()
    private let scrollContentView = UIView()
    private let headerStackView = UIStackView()
    private let showHeaderLabel = UILabel()
    private let separatorView = UIView()

    // MARK: - Properties
    weak var viewController: TVGuide2ViewController?

    // MARK: - Layout Constants
    private let showPosterWidth: CGFloat = 90
    private let dateCellWidth: CGFloat = 100
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
        showHeaderLabel.backgroundColor = .systemGray6
        showHeaderLabel.layer.cornerRadius = 8
        showHeaderLabel.clipsToBounds = true
        showHeaderLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(showHeaderLabel) // Add directly to header, not scroll view

        // Setup date headers container
        headerStackView.axis = .horizontal
        headerStackView.distribution = .fillEqually
        headerStackView.spacing = 1
        headerStackView.translatesAutoresizingMaskIntoConstraints = false
        scrollContentView.addSubview(headerStackView)

        // Setup separator
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Scroll view constraints (starts after poster column)
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

            // Show header (frozen left column)
            showHeaderLabel.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            showHeaderLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            showHeaderLabel.widthAnchor.constraint(equalToConstant: showPosterWidth - 8),
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
        scrollContentView.widthAnchor.constraint(equalToConstant: CGFloat(dateColumns.count) * dateCellWidth).isActive = true
    }

    private func createDateHeaderView(for dateColumn: TVGuide2DateColumn) -> UIView {
        let dateHeaderView = UIView()
        dateHeaderView.backgroundColor = .systemGray6
        dateHeaderView.layer.cornerRadius = 8
        dateHeaderView.clipsToBounds = true
        dateHeaderView.translatesAutoresizingMaskIntoConstraints = false

        // Add right border
        let borderView = UIView()
        borderView.backgroundColor = .separator
        borderView.translatesAutoresizingMaskIntoConstraints = false
        dateHeaderView.addSubview(borderView)

        // Date label
        let dateLabel = UILabel()

        // Parse date and format nicely
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: dateColumn.date) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "MMM d"
            dateLabel.text = displayFormatter.string(from: date)

            // Highlight today
            if Calendar.current.isDateInToday(date) {
                dateHeaderView.backgroundColor = .systemBlue.withAlphaComponent(0.2)
                dateLabel.textColor = .systemBlue
                dateLabel.font = .systemFont(ofSize: 12, weight: .bold)
            } else {
                dateLabel.textColor = .label
                dateLabel.font = .systemFont(ofSize: 12, weight: .medium)
            }
        } else {
            dateLabel.text = dateColumn.date
            dateLabel.textColor = .label
            dateLabel.font = .systemFont(ofSize: 12, weight: .medium)
        }

        dateLabel.textAlignment = .center
        dateLabel.translatesAutoresizingMaskIntoConstraints = false
        dateHeaderView.addSubview(dateLabel)

        NSLayoutConstraint.activate([
            dateHeaderView.widthAnchor.constraint(equalToConstant: dateCellWidth),

            borderView.trailingAnchor.constraint(equalTo: dateHeaderView.trailingAnchor),
            borderView.topAnchor.constraint(equalTo: dateHeaderView.topAnchor),
            borderView.bottomAnchor.constraint(equalTo: dateHeaderView.bottomAnchor),
            borderView.widthAnchor.constraint(equalToConstant: 1),

            dateLabel.centerXAnchor.constraint(equalTo: dateHeaderView.centerXAnchor),
            dateLabel.centerYAnchor.constraint(equalTo: dateHeaderView.centerYAnchor),
            dateLabel.leadingAnchor.constraint(greaterThanOrEqualTo: dateHeaderView.leadingAnchor, constant: 4),
            dateLabel.trailingAnchor.constraint(lessThanOrEqualTo: dateHeaderView.trailingAnchor, constant: -4)
        ])

        return dateHeaderView
    }
}