import UIKit

class TVG2DayCell: UICollectionViewCell {
    static let identifier = "TVG2DayCell"

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
        backgroundColor = .systemBackground // Light theme
        contentView.backgroundColor = .clear // Avoid painting over the header
        layer.cornerRadius = 0

        // Remove all hidden offsets
        contentView.layoutMargins = .zero
        contentView.directionalLayoutMargins = .zero
        contentView.insetsLayoutMarginsFromSafeArea = false
        contentView.preservesSuperviewLayoutMargins = false
        preservesSuperviewLayoutMargins = false
        directionalLayoutMargins = .zero
        layoutMargins = .zero

        // Day number label
        dayNumberLabel.font = .systemFont(ofSize: 24, weight: .semibold)
        dayNumberLabel.textColor = .label // Light theme
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
            // Day number - positioned at top of cell without offset
            dayNumberLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            dayNumberLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 0),

            // Episode dot - below day number
            episodeDot.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            episodeDot.topAnchor.constraint(equalTo: dayNumberLabel.bottomAnchor, constant: 0),
            episodeDot.widthAnchor.constraint(equalToConstant: 6),
            episodeDot.heightAnchor.constraint(equalToConstant: 6),

            // Episode count - below dot
            episodeCountLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            episodeCountLabel.topAnchor.constraint(equalTo: episodeDot.bottomAnchor, constant: 0)
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
            backgroundColor = .systemBlue.withAlphaComponent(0.1) // Light theme highlight
        } else {
            dayNumberLabel.textColor = .label // Light theme
            dayNumberLabel.font = .systemFont(ofSize: 24, weight: .semibold)
            backgroundColor = .systemBackground // Light theme
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        if TVGV.debugBordersEnabled {
            layer.borderColor = TVGV.debugHeaderColor
            layer.borderWidth = 0.5
        } else {
            layer.borderWidth = 0.0
        }

        // Debug border for day rail cell alignment
        contentView.layer.borderColor = UIColor.blue.cgColor
        contentView.layer.borderWidth = 1

    }

    override func prepareForReuse() {
        super.prepareForReuse()
        episodeDot.isHidden = true
        episodeCountLabel.isHidden = true
        dayNumberLabel.textColor = .label // Light theme
        dayNumberLabel.font = .systemFont(ofSize: 24, weight: .semibold)
        backgroundColor = .systemBackground // Light theme
    }
}
