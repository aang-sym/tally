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
    private(set) var postersRowCollectionView: UICollectionView!
    private(set) var dayRailCollectionView: UICollectionView!

    // MARK: - Month Text
    public private(set) var monthText: String = "SEP"

    // MARK: - Today Indicator
    private let todayIndicator = UIView()

    // MARK: - Debug Guide Line
    private let debugGuideLine = UIView()

    // MARK: - Layout Properties
    private var columnCount: Int = 0
    private var rowCount: Int = 0
    private var providerSpans: [ProviderSpan] = []

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }

    private func setupUI() {
        backgroundColor = .systemBackground // Light theme
        setupTodayIndicator()
        setupDebugGuideLine()
        setupCollectionViews()
        setupConstraints()
    }


    private func setupTodayIndicator() {
        todayIndicator.backgroundColor = .systemBlue
        todayIndicator.alpha = 0.6
        todayIndicator.isHidden = true
        todayIndicator.translatesAutoresizingMaskIntoConstraints = false
        addSubview(todayIndicator)
    }

    private func setupDebugGuideLine() {
        debugGuideLine.backgroundColor = .systemGreen
        debugGuideLine.translatesAutoresizingMaskIntoConstraints = false
        addSubview(debugGuideLine)
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
        gridCollectionView.backgroundColor = .systemBackground // Light theme
        gridCollectionView.translatesAutoresizingMaskIntoConstraints = false
        gridCollectionView.showsVerticalScrollIndicator = false
        gridCollectionView.showsHorizontalScrollIndicator = false
        addSubview(gridCollectionView)

        // Provider header collection view
        providerHeaderCollectionView = UICollectionView(frame: .zero, collectionViewLayout: placeholderLayout)
        providerHeaderCollectionView.backgroundColor = .systemBackground // Light theme
        providerHeaderCollectionView.translatesAutoresizingMaskIntoConstraints = false
        providerHeaderCollectionView.showsVerticalScrollIndicator = false
        providerHeaderCollectionView.showsHorizontalScrollIndicator = false
        providerHeaderCollectionView.isScrollEnabled = true // Enable horizontal scrolling
        addSubview(providerHeaderCollectionView)
        providerHeaderCollectionView.register(ProviderSpanCell.self, forCellWithReuseIdentifier: "ProviderSpanCell")
        providerHeaderCollectionView.register(ProviderCell.self, forCellWithReuseIdentifier: "ProviderCell")

        // Static posters row collection view
        postersRowCollectionView = UICollectionView(frame: .zero, collectionViewLayout: placeholderLayout)
        postersRowCollectionView.backgroundColor = .systemBackground // Light theme
        postersRowCollectionView.translatesAutoresizingMaskIntoConstraints = false
        postersRowCollectionView.showsVerticalScrollIndicator = false
        postersRowCollectionView.showsHorizontalScrollIndicator = false
        postersRowCollectionView.isScrollEnabled = true // Enable horizontal scrolling
        addSubview(postersRowCollectionView)

        // Day rail collection view
        dayRailCollectionView = UICollectionView(frame: .zero, collectionViewLayout: placeholderLayout)
        dayRailCollectionView.backgroundColor = .systemGray6 // Debug background
        dayRailCollectionView.translatesAutoresizingMaskIntoConstraints = false
        dayRailCollectionView.showsVerticalScrollIndicator = false
        dayRailCollectionView.showsHorizontalScrollIndicator = false
        dayRailCollectionView.isScrollEnabled = true // Enable vertical scrolling
        dayRailCollectionView.contentInsetAdjustmentBehavior = .never
        dayRailCollectionView.automaticallyAdjustsScrollIndicatorInsets = false
        addSubview(dayRailCollectionView)

        // Register month header supplementary view
        dayRailCollectionView.register(
            MonthHeaderView.self,
            forSupplementaryViewOfKind: MonthHeaderView.elementKind,
            withReuseIdentifier: MonthHeaderView.reuseID
        )
    }

    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Provider header - top right, horizontal strip (Row 1)
            providerHeaderCollectionView.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor),
            providerHeaderCollectionView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: TVGuideVertLayout.dayRailWidth),
            providerHeaderCollectionView.trailingAnchor.constraint(equalTo: trailingAnchor),
            providerHeaderCollectionView.heightAnchor.constraint(equalToConstant: TVGuideVertLayout.providerHeaderHeight),

            // Static posters row - under provider header (Row 2)
            postersRowCollectionView.topAnchor.constraint(equalTo: providerHeaderCollectionView.bottomAnchor),
            postersRowCollectionView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: TVGuideVertLayout.dayRailWidth),
            postersRowCollectionView.trailingAnchor.constraint(equalTo: trailingAnchor),
            postersRowCollectionView.heightAnchor.constraint(equalToConstant: TVGuideVertLayout.postersRowHeight),

            // Day rail - left side, vertical strip (aligned with provider row bottom)
            dayRailCollectionView.topAnchor.constraint(equalTo: providerHeaderCollectionView.bottomAnchor),
            dayRailCollectionView.leadingAnchor.constraint(equalTo: leadingAnchor),
            dayRailCollectionView.widthAnchor.constraint(equalToConstant: TVGuideVertLayout.dayRailWidth),
            dayRailCollectionView.bottomAnchor.constraint(equalTo: bottomAnchor),

            // Main grid - fills remaining area (below posters row)
            gridCollectionView.topAnchor.constraint(equalTo: postersRowCollectionView.bottomAnchor),
            gridCollectionView.leadingAnchor.constraint(equalTo: dayRailCollectionView.trailingAnchor),
            gridCollectionView.trailingAnchor.constraint(equalTo: trailingAnchor),
            gridCollectionView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])

        // Debug guide line - positioned at provider header bottom + posters row height
        NSLayoutConstraint.activate([
            debugGuideLine.leadingAnchor.constraint(equalTo: leadingAnchor),
            debugGuideLine.trailingAnchor.constraint(equalTo: trailingAnchor),
            debugGuideLine.topAnchor.constraint(equalTo: providerHeaderCollectionView.bottomAnchor, constant: TVGV.postersRowHeight),
            debugGuideLine.heightAnchor.constraint(equalToConstant: 1)
        ])

        bringSubviewToFront(providerHeaderCollectionView)
        bringSubviewToFront(debugGuideLine)
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
            providerSpans: providerSpans
        )

        postersRowCollectionView.collectionViewLayout = TVGuideVertLayout.createPostersRowLayout(
            columnCount: columnCount
        )

        dayRailCollectionView.collectionViewLayout = TVGuideVertLayout.createDayRailLayout(
            rowCount: rowCount
        )

        // Force layout before setting content insets
        dayRailCollectionView.layoutIfNeeded()

        // Clear content insets - positioning handled by layout constraints and section insets
        dayRailCollectionView.contentInset = .zero
        dayRailCollectionView.scrollIndicatorInsets = .zero

        // Grid still needs content inset to align with day rail
        gridCollectionView.contentInset = .zero

        // Force final layout calculations
        dayRailCollectionView.layoutIfNeeded()
        gridCollectionView.layoutIfNeeded()
    }

    // Inject provider spans and rebuild the header layout
    func setProviderSpans(_ spans: [ProviderSpan]) {
        self.providerSpans = spans
        providerHeaderCollectionView.collectionViewLayout = TVGuideVertLayout.createProviderHeaderLayout(providerSpans: spans)
        providerHeaderCollectionView.setNeedsLayout()
        providerHeaderCollectionView.layoutIfNeeded()
    }

    func updateMonthLabel(_ text: String) {
        monthText = text
        dayRailCollectionView.reloadData() // Refresh the month header
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