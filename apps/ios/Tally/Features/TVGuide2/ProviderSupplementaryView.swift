import UIKit

final class ProviderSupplementaryView: UICollectionReusableView {
    static let reuseIdentifier = "ProviderSupplementaryView"

    private let backgroundView = UIView()
    private let logoImageView = UIImageView()
    private var loadTask: Task<Void, Never>?
    private var preferredHeight: CGFloat = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        loadTask?.cancel()
        loadTask = nil
        logoImageView.image = nil
        preferredHeight = 0
    }

    func configure(with provider: TVGuide2Provider, preferredHeight: CGFloat) {
        self.preferredHeight = preferredHeight
        loadTask?.cancel()
        logoImageView.image = placeholderImage(for: provider.name)

        guard let logoPath = provider.logoPath, !logoPath.isEmpty,
              let url = URL(string: "https://image.tmdb.org/t/p/w92\(logoPath)") else {
            return
        }

        loadTask = Task { [weak self] in
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        self?.logoImageView.image = image
                    }
                }
            } catch {
                // Keep placeholder if request fails
            }
        }
    }

    func updatePreferredHeight(_ height: CGFloat) {
        preferredHeight = height
        invalidateIntrinsicContentSize()
        setNeedsLayout()
    }

    override func preferredLayoutAttributesFitting(_ layoutAttributes: UICollectionViewLayoutAttributes) -> UICollectionViewLayoutAttributes {
        let attributes = super.preferredLayoutAttributesFitting(layoutAttributes)
        if preferredHeight > 0 {
            attributes.size.height = preferredHeight
        }
        return attributes
    }

    override var intrinsicContentSize: CGSize {
        guard preferredHeight > 0 else { return super.intrinsicContentSize }
        return CGSize(width: UIView.noIntrinsicMetric, height: preferredHeight)
    }

    private func setupUI() {
        // Lower z-position and transparent background to avoid masking date header
        layer.zPosition = 0
        backgroundColor = .clear
        // Red debug border to outline the provider column
        if TVGV.debugBordersEnabled {
            layer.borderWidth = 2
            layer.borderColor = UIColor.red.cgColor
        } else {
            layer.borderWidth = 0
        }

        backgroundView.translatesAutoresizingMaskIntoConstraints = false
        backgroundView.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.3)
        backgroundView.layer.cornerRadius = 18
        backgroundView.layer.masksToBounds = true
        addSubview(backgroundView)

        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.backgroundColor = .secondarySystemBackground
        logoImageView.layer.cornerRadius = 22
        logoImageView.layer.masksToBounds = true
        addSubview(logoImageView)

        let separator = UIView()
        separator.translatesAutoresizingMaskIntoConstraints = false
        separator.backgroundColor = .separator
        addSubview(separator)

        NSLayoutConstraint.activate([
            backgroundView.leadingAnchor.constraint(equalTo: leadingAnchor),
            backgroundView.trailingAnchor.constraint(equalTo: trailingAnchor),
            backgroundView.topAnchor.constraint(equalTo: topAnchor),
            backgroundView.bottomAnchor.constraint(equalTo: bottomAnchor),

            logoImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            logoImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            logoImageView.widthAnchor.constraint(equalToConstant: 44),
            logoImageView.heightAnchor.constraint(equalToConstant: 44),

            separator.leadingAnchor.constraint(equalTo: leadingAnchor),
            separator.trailingAnchor.constraint(equalTo: trailingAnchor),
            separator.bottomAnchor.constraint(equalTo: bottomAnchor),
            separator.heightAnchor.constraint(equalToConstant: 1)
        ])
    }

    private func placeholderImage(for name: String) -> UIImage? {
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
            let rect = CGRect(x: (size.width - textSize.width) / 2,
                              y: (size.height - textSize.height) / 2,
                              width: textSize.width,
                              height: textSize.height)
            initial.draw(in: rect, withAttributes: attributes)
        }
    }
}
