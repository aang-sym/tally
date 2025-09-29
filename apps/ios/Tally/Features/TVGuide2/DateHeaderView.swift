//
//  DateHeaderView.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class DateHeaderView: UICollectionReusableView {
    static let identifier = "DateHeaderView"

    static var providerColumnWidth: CGFloat = 0

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
    private var scrollLeadingConstraint: NSLayoutConstraint?
    private var showHeaderWidthConstraint: NSLayoutConstraint?

    // MARK: - Properties
    weak var viewController: TVGuide2ViewController?

    // MARK: - Layout Constants
    private var leadingFrozenWidth: CGFloat {
        ShowRowCell.frozenLeadingWidth + DateHeaderView.providerColumnWidth
    }
    private let dateCellWidth: CGFloat = ShowRowCell.episodeColumnWidth
    private let headerHeight: CGFloat = 60

    override init(frame: CGRect) {
        super.init(frame: frame)
        print("[TVGuide2] DateHeaderView.init(frame:) called")
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        print("[TVGuide2] DateHeaderView.init(coder:) called")
        setupUI()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        updateLeadingConstraints()
    }

    private func setupUI() {
        backgroundColor = .systemBackground
        layer.zPosition = 1000

        // Setup scroll view for horizontal scrolling (matches row cells)
        scrollView.showsHorizontalScrollIndicator = false
        if #available(iOS 11.0, *) { scrollView.contentInsetAdjustmentBehavior = .never }
        scrollView.isUserInteractionEnabled = false // header mirrors content scroll; touch passes to grid
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        // Setup content view
        scrollContentView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(scrollContentView)

        // Setup show header (frozen left column - only poster column now)
        showHeaderLabel.text = ""
        showHeaderLabel.font = .systemFont(ofSize: 16, weight: .bold)
        showHeaderLabel.textAlignment = .center
        showHeaderLabel.backgroundColor = .clear
        showHeaderLabel.isHidden = true
        showHeaderLabel.numberOfLines = 0
        showHeaderLabel.adjustsFontSizeToFitWidth = true
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
        heightAnchor.constraint(greaterThanOrEqualToConstant: headerHeight).isActive = true

        scrollLeadingConstraint = scrollView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: leadingFrozenWidth)
        scrollLeadingConstraint?.isActive = true

        showHeaderWidthConstraint = showHeaderLabel.widthAnchor.constraint(equalToConstant: leadingFrozenWidth - 8)
        showHeaderWidthConstraint?.isActive = true

        scrollContentWidthConstraint = scrollContentView.widthAnchor.constraint(equalToConstant: 0)
        scrollContentWidthConstraint?.isActive = true
    }

    func configure(with dateColumns: [TVGuide2DateColumn], monthText: String?, viewController: TVGuide2ViewController? = nil) {
        self.viewController = viewController

        updateLeadingConstraints()
        updateMonthLabel(monthText)

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
        let width = CGFloat(columnCount) * dateCellWidth
        scrollContentWidthConstraint?.constant = width
        // Also size the scroll view’s content to ensure it renders immediately
        scrollView.contentSize = CGSize(width: width, height: headerHeight)
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
            dateHeaderView.heightAnchor.constraint(equalToConstant: headerHeight),

            dayLabel.centerXAnchor.constraint(equalTo: dateHeaderView.centerXAnchor),
            dayLabel.centerYAnchor.constraint(equalTo: dateHeaderView.centerYAnchor),

            borderView.trailingAnchor.constraint(equalTo: dateHeaderView.trailingAnchor),
            borderView.topAnchor.constraint(equalTo: dateHeaderView.topAnchor),
            borderView.bottomAnchor.constraint(equalTo: dateHeaderView.bottomAnchor),
            borderView.widthAnchor.constraint(equalToConstant: 1)
        ])

        return dateHeaderView
    }

    func updateMonthLabel(_ text: String?) {
        let hasText = (text?.isEmpty == false)
        showHeaderLabel.text = hasText ? text : nil
        showHeaderLabel.isHidden = !hasText
        // If provider column width is zero, still reserve some space so month label shows
        let minLeading: CGFloat = leadingFrozenWidth > 0 ? leadingFrozenWidth - 8 : 64
        showHeaderWidthConstraint?.constant = max(minLeading, 64)
        layoutIfNeeded()
    }

    private func updateLeadingConstraints() {
        let base = ShowRowCell.frozenLeadingWidth
        let extra = DateHeaderView.providerColumnWidth
        let constant = max(0, base + extra)
        scrollLeadingConstraint?.constant = constant
        showHeaderWidthConstraint?.constant = max(constant - 8, 64)
    }

    override func preferredLayoutAttributesFitting(_ layoutAttributes: UICollectionViewLayoutAttributes) -> UICollectionViewLayoutAttributes {
        let attrs = super.preferredLayoutAttributesFitting(layoutAttributes)
        attrs.size.height = headerHeight
        return attrs
    }
}
