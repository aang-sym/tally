import UIKit
import SwiftUI

protocol TVGuideVertViewDelegate: AnyObject {
    func tvGuideVertView(_ view: TVGuideVertView, didSelectShow show: TVGuide2Show, episode: TVGuide2Episode?)
}

class TVGuideVertView: UIView {

    // MARK: - Properties
    weak var delegate: TVGuideVertViewDelegate?

    // MARK: - Collection Views
    private(set) var gridCollectionView: UICollectionView!
    private(set) var providerHeaderCollectionView: UICollectionView!
    private(set) var dayRailCollectionView: UICollectionView!

    // MARK: - Month Label
    private let monthLabel = UILabel()

    // MARK: - Today Indicator
    private let todayIndicator = UIView()

    // MARK: - Layout Properties
    private var columnCount: Int = 0
    private var rowCount: Int = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func setupUI() {
        backgroundColor = .black // Match reference image dark theme
        setupMonthLabel()
        setupTodayIndicator()
        setupCollectionViews()
        setupConstraints()
    }

    private func setupMonthLabel() {
        monthLabel.font = .systemFont(ofSize: 18, weight: .bold)
        monthLabel.textColor = .white // Dark theme
        monthLabel.text = "SEP" // Default, will be updated
        monthLabel.textAlignment = .center
        monthLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(monthLabel)
    }

    private func setupTodayIndicator() {
        todayIndicator.backgroundColor = .systemBlue
        todayIndicator.alpha = 0.6
        todayIndicator.isHidden = true
        todayIndicator.translatesAutoresizingMaskIntoConstraints = false
        addSubview(todayIndicator)
    }

    private func setupCollectionViews() {
        // Create placeholder layouts (will be updated when data is available)
        let placeholderLayout = UICollectionViewCompositionalLayout { _, _ in
            let itemSize = NSCollectionLayoutSize(
                widthDimension: .fractionalWidth(1.0),
                heightDimension: .fractionalHeight(1.0)
            )
            let item = NSCollectionLayoutItem(layoutSize: itemSize)
            let groupSize = NSCollectionLayoutSize(
                widthDimension: .fractionalWidth(1.0),
                heightDimension: .fractionalHeight(1.0)
            )
            let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])
            return NSCollectionLayoutSection(group: group)
        }

        // Main grid collection view
        gridCollectionView = UICollectionView(frame: .zero, collectionViewLayout: placeholderLayout)
        gridCollectionView.backgroundColor = .black // Dark theme
        gridCollectionView.translatesAutoresizingMaskIntoConstraints = false
        gridCollectionView.showsVerticalScrollIndicator = false
        gridCollectionView.showsHorizontalScrollIndicator = false
        addSubview(gridCollectionView)

        // Provider header collection view
        providerHeaderCollectionView = UICollectionView(frame: .zero, collectionViewLayout: placeholderLayout)
        providerHeaderCollectionView.backgroundColor = .black // Dark theme
        providerHeaderCollectionView.translatesAutoresizingMaskIntoConstraints = false
        providerHeaderCollectionView.showsVerticalScrollIndicator = false
        providerHeaderCollectionView.showsHorizontalScrollIndicator = false
        providerHeaderCollectionView.isScrollEnabled = true // Enable horizontal scrolling
        addSubview(providerHeaderCollectionView)

        // Day rail collection view
        dayRailCollectionView = UICollectionView(frame: .zero, collectionViewLayout: placeholderLayout)
        dayRailCollectionView.backgroundColor = .black // Dark theme
        dayRailCollectionView.translatesAutoresizingMaskIntoConstraints = false
        dayRailCollectionView.showsVerticalScrollIndicator = false
        dayRailCollectionView.showsHorizontalScrollIndicator = false
        dayRailCollectionView.isScrollEnabled = true // Enable vertical scrolling
        addSubview(dayRailCollectionView)
    }

    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Month label - top left, above day rail
            monthLabel.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor),
            monthLabel.leadingAnchor.constraint(equalTo: leadingAnchor),
            monthLabel.widthAnchor.constraint(equalToConstant: TVGuideVertLayout.dayRailWidth),
            monthLabel.heightAnchor.constraint(equalToConstant: TVGuideVertLayout.monthLabelHeight),

            // Provider header - top right, horizontal strip
            providerHeaderCollectionView.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor),
            providerHeaderCollectionView.leadingAnchor.constraint(equalTo: monthLabel.trailingAnchor),
            providerHeaderCollectionView.trailingAnchor.constraint(equalTo: trailingAnchor),
            providerHeaderCollectionView.heightAnchor.constraint(equalToConstant: TVGuideVertLayout.providerHeaderHeight),

            // Day rail - left side, vertical strip
            dayRailCollectionView.topAnchor.constraint(equalTo: monthLabel.bottomAnchor),
            dayRailCollectionView.leadingAnchor.constraint(equalTo: leadingAnchor),
            dayRailCollectionView.widthAnchor.constraint(equalToConstant: TVGuideVertLayout.dayRailWidth),
            dayRailCollectionView.bottomAnchor.constraint(equalTo: bottomAnchor),

            // Main grid - fills remaining area
            gridCollectionView.topAnchor.constraint(equalTo: providerHeaderCollectionView.bottomAnchor),
            gridCollectionView.leadingAnchor.constraint(equalTo: dayRailCollectionView.trailingAnchor),
            gridCollectionView.trailingAnchor.constraint(equalTo: trailingAnchor),
            gridCollectionView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
    }

    // MARK: - Layout Updates

    func updateLayouts(columnCount: Int, rowCount: Int) {
        self.columnCount = columnCount
        self.rowCount = rowCount

        // Update collection view layouts
        gridCollectionView.collectionViewLayout = TVGuideVertLayout.createGridLayout(
            columnCount: columnCount,
            rowCount: rowCount
        )

        providerHeaderCollectionView.collectionViewLayout = TVGuideVertLayout.createProviderHeaderLayout(
            columnCount: columnCount
        )

        dayRailCollectionView.collectionViewLayout = TVGuideVertLayout.createDayRailLayout(
            rowCount: rowCount
        )
    }

    func updateMonthLabel(_ text: String) {
        monthLabel.text = text
    }

    func showTodayIndicator(at rowIndex: Int) {
        guard rowIndex >= 0 && rowIndex < rowCount else {
            todayIndicator.isHidden = true
            return
        }

        let rowHeight = TVGuideVertLayout.rowHeight
        let yPosition = CGFloat(rowIndex) * rowHeight + (rowHeight / 2) - 1

        todayIndicator.isHidden = false

        // Update constraints for today indicator
        todayIndicator.removeFromSuperview()
        addSubview(todayIndicator)

        NSLayoutConstraint.activate([
            // Horizontal line across both day rail and grid
            todayIndicator.leadingAnchor.constraint(equalTo: leadingAnchor),
            todayIndicator.trailingAnchor.constraint(equalTo: trailingAnchor),
            todayIndicator.topAnchor.constraint(equalTo: gridCollectionView.topAnchor, constant: yPosition),
            todayIndicator.heightAnchor.constraint(equalToConstant: 2)
        ])

        // Bring to front
        bringSubviewToFront(todayIndicator)
    }

    func hideTodayIndicator() {
        todayIndicator.isHidden = true
    }
}

// MARK: - SwiftUI Wrapper

struct TVGuideVertSwiftUIView: UIViewControllerRepresentable {
    let apiClient: ApiClient

    func makeUIViewController(context: Context) -> TVGuideVertViewController {
        return TVGuideVertViewController(apiClient: apiClient)
    }

    func updateUIViewController(_ uiViewController: TVGuideVertViewController, context: Context) {
        // No updates needed for now
    }
}

#if DEBUG
// MARK: - SwiftUI Preview
struct TVGuideVertView_Previews: PreviewProvider {
    final class PreviewApiClient: ApiClient {
        init(previewToken: String = PreviewSecrets.token) {
            super.init()
            self.setTokenForPreview(previewToken)
        }
    }

    static var previews: some View {
        TVGuideVertSwiftUIView(apiClient: PreviewApiClient())
    }
}
#endif