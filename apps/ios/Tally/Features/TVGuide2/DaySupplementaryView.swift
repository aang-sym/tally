import UIKit

class DaySupplementaryView: UICollectionViewCell {
    static let identifier = "DaySupplementaryView"

    // MARK: - UI Elements
    private let dayNumberLabel = UILabel()
    private let episodeCountLabel = UILabel()
    private let episodeDot = UIView()

    // MARK: - Properties
    private var episodeCount: Int = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .black // Dark theme
        layer.cornerRadius = 0

        // Day number label
        dayNumberLabel.font = .systemFont(ofSize: 24, weight: .semibold)
        dayNumberLabel.textColor = .white // Dark theme
        dayNumberLabel.textAlignment = .center
        dayNumberLabel.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(dayNumberLabel)

        // Episode dot indicator
        episodeDot.backgroundColor = .systemBlue
        episodeDot.layer.cornerRadius = 3
        episodeDot.isHidden = true
        episodeDot.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(episodeDot)

        // Episode count label
        episodeCountLabel.font = .systemFont(ofSize: 10, weight: .medium)
        episodeCountLabel.textColor = .systemBlue
        episodeCountLabel.textAlignment = .center
        episodeCountLabel.isHidden = true
        episodeCountLabel.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(episodeCountLabel)

        NSLayoutConstraint.activate([
            // Day number - centered
            dayNumberLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            dayNumberLabel.centerYAnchor.constraint(equalTo: contentView.centerYAnchor, constant: -8),

            // Episode dot - below day number
            episodeDot.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            episodeDot.topAnchor.constraint(equalTo: dayNumberLabel.bottomAnchor, constant: 4),
            episodeDot.widthAnchor.constraint(equalToConstant: 6),
            episodeDot.heightAnchor.constraint(equalToConstant: 6),

            // Episode count - below dot
            episodeCountLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            episodeCountLabel.topAnchor.constraint(equalTo: episodeDot.bottomAnchor, constant: 2)
        ])
    }

    func configure(with dateColumn: TVGuide2DateColumn, episodeCount: Int = 0, isToday: Bool = false) {
        dayNumberLabel.text = dateColumn.dayNumber
        self.episodeCount = episodeCount

        // Update episode indicator
        if episodeCount > 0 {
            episodeDot.isHidden = false
            episodeCountLabel.isHidden = false
            episodeCountLabel.text = "\(episodeCount)"
        } else {
            episodeDot.isHidden = true
            episodeCountLabel.isHidden = true
        }

        // Today styling
        if isToday {
            dayNumberLabel.textColor = .systemBlue
            dayNumberLabel.font = .systemFont(ofSize: 24, weight: .bold)
            backgroundColor = .systemBlue.withAlphaComponent(0.2) // More visible on dark
        } else {
            dayNumberLabel.textColor = .white // Dark theme
            dayNumberLabel.font = .systemFont(ofSize: 24, weight: .semibold)
            backgroundColor = .black // Dark theme
        }
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        episodeDot.isHidden = true
        episodeCountLabel.isHidden = true
        dayNumberLabel.textColor = .white // Dark theme
        dayNumberLabel.font = .systemFont(ofSize: 24, weight: .semibold)
        backgroundColor = .black // Dark theme
    }
}