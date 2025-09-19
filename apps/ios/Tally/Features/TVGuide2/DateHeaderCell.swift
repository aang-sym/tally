//
//  DateHeaderCell.swift
//  Tally
//
//  Created by Angus Symons on 12/9/2025.
//

import UIKit

class DateHeaderCell: UICollectionViewCell {
    static let identifier = "DateHeaderCell"

    private let dayOfWeekLabel = UILabel()
    private let dayNumberLabel = UILabel()
    private let separatorView = UIView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .systemBackground

        // Day of week label (MON, TUE, etc.)
        dayOfWeekLabel.font = .systemFont(ofSize: 12, weight: .semibold)
        dayOfWeekLabel.textColor = .secondaryLabel
        dayOfWeekLabel.textAlignment = .center
        dayOfWeekLabel.translatesAutoresizingMaskIntoConstraints = false

        // Day number label (01, 02, etc.)
        dayNumberLabel.font = .systemFont(ofSize: 16, weight: .medium)
        dayNumberLabel.textColor = .label
        dayNumberLabel.textAlignment = .center
        dayNumberLabel.translatesAutoresizingMaskIntoConstraints = false

        // Separator line
        separatorView.backgroundColor = .separator
        separatorView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(dayOfWeekLabel)
        addSubview(dayNumberLabel)
        addSubview(separatorView)

        NSLayoutConstraint.activate([
            // Day of week at top
            dayOfWeekLabel.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            dayOfWeekLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            dayOfWeekLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),

            // Day number below
            dayNumberLabel.topAnchor.constraint(equalTo: dayOfWeekLabel.bottomAnchor, constant: 2),
            dayNumberLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            dayNumberLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),
            dayNumberLabel.bottomAnchor.constraint(lessThanOrEqualTo: separatorView.topAnchor, constant: -4),

            // Separator at bottom
            separatorView.leadingAnchor.constraint(equalTo: leadingAnchor),
            separatorView.trailingAnchor.constraint(equalTo: trailingAnchor),
            separatorView.bottomAnchor.constraint(equalTo: bottomAnchor),
            separatorView.heightAnchor.constraint(equalToConstant: 1)
        ])
    }

    func configure(with dateColumn: TVGuide2DateColumn) {
        dayOfWeekLabel.text = dateColumn.dayOfWeek
        dayNumberLabel.text = dateColumn.dayNumber

        // Highlight today
        let today = Date()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayString = dateFormatter.string(from: today)

        if dateColumn.date == todayString {
            backgroundColor = .systemBlue.withAlphaComponent(0.1)
            dayOfWeekLabel.textColor = .systemBlue
            dayNumberLabel.textColor = .systemBlue
        } else {
            backgroundColor = .systemBackground
            dayOfWeekLabel.textColor = .secondaryLabel
            dayNumberLabel.textColor = .label
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        dayOfWeekLabel.text = nil
        dayNumberLabel.text = nil
        backgroundColor = .systemBackground
    }
}