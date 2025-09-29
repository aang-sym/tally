import UIKit

final class MonthHeaderView: UICollectionReusableView {
    static let elementKind = "MonthHeaderElementKind"
    static let reuseID = "MonthHeaderView"

    private let label = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        preservesSuperviewLayoutMargins = false
        layoutMargins = .zero
        directionalLayoutMargins = .zero
        backgroundColor = .systemBackground

        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = UIFont.systemFont(ofSize: 18, weight: .bold)
        label.textAlignment = .center
        label.textColor = .label
        addSubview(label)

        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: topAnchor, constant: 0),
            label.bottomAnchor.constraint(equalTo: bottomAnchor, constant: 0),
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 0),
            label.trailingAnchor.constraint(equalTo: trailingAnchor, constant: 0)
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(monthText: String) {
        label.text = monthText.uppercased()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Debug borders for month header alignment
        layer.borderColor = UIColor.magenta.cgColor
        layer.borderWidth = 1

        // Debug border for the label itself
        label.layer.borderColor = UIColor.orange.cgColor
        label.layer.borderWidth = 1

        // Debug frame logging
        print("🟣 MonthHeaderView frame: \(frame), height: \(frame.height)")
        print("🟣 MonthHeaderView bottom Y: \(frame.maxY)")
    }
}
