import UIKit

// MARK: - Layout Constants
enum TVGV {
    static let dateRailWidth: CGFloat = 60
    static let rowHeight: CGFloat = 80
    static var posterWidth: CGFloat = 70
    static let posterAspect: CGFloat = 1.5 // 2:3
    static var columnHPad: CGFloat = 1
    static var posterHPadding: CGFloat = 6
    static var posterVPadding: CGFloat = 6
    static var columnWidth: CGFloat { posterWidth + (2 * columnHPad) }
    static let providerHeaderHeight: CGFloat = 56
    static let postersVerticalPadding: CGFloat = 0 // No extra padding
    static let providerLogoDiameter: CGFloat = 35

    // Single source of truth for posters row height - exact hardcoded value
    static var postersRowHeight: CGFloat { posterWidth * posterAspect }

    // Month header height (only used for old references, use postersRowHeight directly)
    static var monthHeaderHeight: CGFloat {
        providerHeaderHeight + postersRowHeight
    }

    // Grid decoration
    static let gridLineWidth: CGFloat = 0.5
    static let gridLineColor = UIColor.separator.withAlphaComponent(0.3)

    // DEBUG borders
    static let debugBordersEnabled: Bool = true // set false to hide
    static let debugGridColor = UIColor.systemRed.cgColor
    static let debugHeaderColor = UIColor.systemBlue.cgColor
    static let debugPosterColor = UIColor.systemGreen.cgColor
}

// MARK: - Debug Decoration View
final class DebugGridDecorationView: UICollectionReusableView {
    static let elementKind = "DebugGridDecoration"

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        layer.borderColor = TVGV.debugGridColor
        layer.borderWidth = TVGV.debugBordersEnabled ? 0.5 : 0.0
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

// MARK: - ProviderSpan Struct
struct ProviderSpan {
    let startColumn: Int
    let endColumn: Int
}

// MARK: - Backward Compatibility
struct TVGuideVertLayout {
    static var columnWidth: CGFloat { TVGV.columnWidth }
    static var rowHeight: CGFloat { TVGV.rowHeight }
    static let gridInteritem: CGFloat = 12
    static var providerHeaderHeight: CGFloat { TVGV.providerHeaderHeight }
    static var postersRowHeight: CGFloat { TVGV.postersRowHeight }
    static var dayRailWidth: CGFloat { TVGV.dateRailWidth }
    static var monthLabelHeight: CGFloat { 30 } // Legacy compatibility
    static var gridLineWidth: CGFloat { TVGV.gridLineWidth }
    static var gridLineColor: UIColor { TVGV.gridLineColor }

    // MARK: - Layout Builders

    /// Creates the main grid layout with both-axis scrolling
    static func createGridLayout(columnCount: Int, rowCount: Int) -> UICollectionViewCompositionalLayout {
        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            // Item size - fixed dimensions
            let itemSize = NSCollectionLayoutSize(
                widthDimension: .absolute(columnWidth),
                heightDimension: .absolute(rowHeight)
            )
            let item = NSCollectionLayoutItem(layoutSize: itemSize)
            item.contentInsets = .zero

            // Group - horizontal row of all providers for one day
            let groupSize = NSCollectionLayoutSize(
                widthDimension: .absolute(CGFloat(columnCount) * columnWidth),
                heightDimension: .absolute(rowHeight)
            )
            let group: NSCollectionLayoutGroup
            if #available(iOS 16.0, *) {
                group = NSCollectionLayoutGroup.horizontal(
                    layoutSize: groupSize,
                    repeatingSubitem: item,
                    count: columnCount
                )
            } else {
                group = NSCollectionLayoutGroup.horizontal(
                    layoutSize: groupSize,
                    subitem: item,
                    count: columnCount
                )
            }
            group.interItemSpacing = .fixed(0) // No spacing between columns

            // Section - vertical stack of all days
            let section = NSCollectionLayoutSection(group: group)
            section.interGroupSpacing = 0 // No spacing between rows
section.contentInsets = .zero
if #available(iOS 16.0, *) {
    // No-op on iOS 16+: use boundary supplementary configuration instead.
} else {
    section.supplementariesFollowContentInsets = false
}

            // Optional: Add grid line decoration
            let gridDecoration = NSCollectionLayoutDecorationItem.background(
                elementKind: "GridDecoration"
            )
            var decorationItems = [gridDecoration]

            // Add debug decoration if enabled
            if TVGV.debugBordersEnabled {
                let debugDecoration = NSCollectionLayoutDecorationItem.background(
                    elementKind: DebugGridDecorationView.elementKind
                )
                decorationItems.append(debugDecoration)
            }

            section.decorationItems = decorationItems

            return section
        }

        // Register decoration view
        layout.register(
            GridDecorationView.self,
            forDecorationViewOfKind: "GridDecoration"
        )

        // Register debug decoration view
        if TVGV.debugBordersEnabled {
            layout.register(
                DebugGridDecorationView.self,
                forDecorationViewOfKind: DebugGridDecorationView.elementKind
            )
        }

        return layout
    }

    /// Creates the provider header layout with merged cells for providers with multiple shows
    static func createProviderHeaderLayout(providerSpans: [ProviderSpan]) -> UICollectionViewCompositionalLayout {
        if providerSpans.isEmpty {
            let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
                let itemSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(1),
                    heightDimension: .absolute(providerHeaderHeight)
                )
                let item = NSCollectionLayoutItem(layoutSize: itemSize)

                let groupSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(1),
                    heightDimension: .absolute(providerHeaderHeight)
                )
                let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])

                let section = NSCollectionLayoutSection(group: group)
                section.interGroupSpacing = 0
                section.contentInsets = .zero
                section.orthogonalScrollingBehavior = .none

                return section
            }
            return layout
        }

        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            var items: [NSCollectionLayoutItem] = []

            for span in providerSpans {
                let rawSpanLength = CGFloat(span.endColumn - span.startColumn + 1)
                let spanLength = max(1, rawSpanLength)
                let itemSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(spanLength * columnWidth),
                    heightDimension: .absolute(providerHeaderHeight)
                )
                let item = NSCollectionLayoutItem(layoutSize: itemSize)
                items.append(item)
            }

            let totalWidth = providerSpans.reduce(0) { total, span in
                total + CGFloat(span.endColumn - span.startColumn + 1) * columnWidth
            }

            let groupSize = NSCollectionLayoutSize(
                widthDimension: .absolute(totalWidth),
                heightDimension: .absolute(providerHeaderHeight)
            )
            let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: items)
            group.interItemSpacing = .fixed(0)

            let section = NSCollectionLayoutSection(group: group)
            section.interGroupSpacing = 0
            section.contentInsets = .zero
            section.orthogonalScrollingBehavior = .none

            return section
        }

        return layout
    }

    /// Creates the static posters row layout (horizontal scrolling only)
    static func createPostersRowLayout(columnCount: Int) -> UICollectionViewCompositionalLayout {
        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            // Item size - absolute dimensions using TVGV constants
            let itemSize = NSCollectionLayoutSize(
                widthDimension: .absolute(columnWidth),
                heightDimension: .absolute(TVGV.postersRowHeight)
            )
            let item = NSCollectionLayoutItem(layoutSize: itemSize)

            // Group - horizontal row of all shows with absolute height
            let groupSize = NSCollectionLayoutSize(
                widthDimension: .absolute(CGFloat(columnCount) * columnWidth),
                heightDimension: .absolute(TVGV.postersRowHeight)
            )
            let group: NSCollectionLayoutGroup
            if #available(iOS 16.0, *) {
                group = NSCollectionLayoutGroup.horizontal(
                    layoutSize: groupSize,
                    repeatingSubitem: item,
                    count: columnCount
                )
            } else {
                group = NSCollectionLayoutGroup.horizontal(
                    layoutSize: groupSize,
                    subitem: item,
                    count: columnCount
                )
            }
            group.interItemSpacing = .fixed(0)

            // Section
            let section = NSCollectionLayoutSection(group: group)
            section.interGroupSpacing = 0
            section.contentInsets = .zero

            return section
        }

        return layout
    }

    /// Creates the day rail layout (vertical scrolling only)
    static func createDayRailLayout(rowCount: Int) -> UICollectionViewCompositionalLayout {
        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            // Create spacer group for month header space
            // Build date-row groups (no spacer). Each row is absolute height.
            var rowGroups: [NSCollectionLayoutGroup] = []
            for _ in 0..<rowCount {
                let itemSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(dayRailWidth),
                    heightDimension: .absolute(TVGV.rowHeight)
                )
                let item = NSCollectionLayoutItem(layoutSize: itemSize)
                item.contentInsets = .zero

                let groupSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(dayRailWidth),
                    heightDimension: .absolute(TVGV.rowHeight)
                )
                let group = NSCollectionLayoutGroup.horizontal(
                    layoutSize: groupSize,
                    subitems: [item]
                )
                rowGroups.append(group)
            }

            // Container group comprised only of the date rows
            let totalHeight = CGFloat(rowCount) * TVGV.rowHeight
            let containerSize = NSCollectionLayoutSize(
                widthDimension: .absolute(dayRailWidth),
                heightDimension: .absolute(totalHeight)
            )
            let containerGroup = NSCollectionLayoutGroup.vertical(
                layoutSize: containerSize,
                subitems: rowGroups
            )

            // Section - no spacing between rows; no top inset (header height provides the offset)
            let section = NSCollectionLayoutSection(group: containerGroup)
            section.interGroupSpacing = 0
            section.contentInsets = .zero
            section.contentInsetsReference = .none
            if #available(iOS 16.0, *) {
                // No-op on iOS 16+: rely on boundary supplementary configuration instead of section API.
            } else {
                section.supplementariesFollowContentInsets = false
            }

            // Month header - boundary supplementary (exact posters row height)
            let headerSize = NSCollectionLayoutSize(
                widthDimension: .absolute(TVGV.dateRailWidth),
                heightDimension: .absolute(TVGV.postersRowHeight)
            )
            let header = NSCollectionLayoutBoundarySupplementaryItem(
                layoutSize: headerSize,
                elementKind: "MonthHeaderElementKind",
                alignment: .top
            )
            header.contentInsets = .zero
            header.pinToVisibleBounds = true
            header.extendsBoundary = true

            // Set z-index for iOS 17+
            if #available(iOS 17.0, *) {
                header.zIndex = 1024
            }

            section.boundarySupplementaryItems = [header]

            return section
        }

        return layout
    }

    /// Creates the main grid layout with variable row heights for expansion
    static func createGridLayoutWithExpansion(
        columnCount: Int,
        rowCount: Int,
        expandedRowIndex: Int?,
        normalRowHeight: CGFloat,
        expandedRowHeight: CGFloat
    ) -> UICollectionViewCompositionalLayout {
        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            var groups: [NSCollectionLayoutGroup] = []

            for rowIndex in 0..<rowCount {
                let rowHeight = (expandedRowIndex == rowIndex) ? expandedRowHeight : normalRowHeight

                // Item size for this row
                let itemSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(columnWidth),
                    heightDimension: .absolute(rowHeight)
                )
                let item = NSCollectionLayoutItem(layoutSize: itemSize)
                item.contentInsets = .zero

                // Group for this row
                let groupSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(CGFloat(columnCount) * columnWidth),
                    heightDimension: .absolute(rowHeight)
                )
                let group: NSCollectionLayoutGroup
                if #available(iOS 16.0, *) {
                    group = NSCollectionLayoutGroup.horizontal(
                        layoutSize: groupSize,
                        repeatingSubitem: item,
                        count: columnCount
                    )
                } else {
                    group = NSCollectionLayoutGroup.horizontal(
                        layoutSize: groupSize,
                        subitem: item,
                        count: columnCount
                    )
                }
                group.interItemSpacing = .fixed(0)
                groups.append(group)
            }

            // Create a custom group that contains all row groups
            let totalHeight = groups.reduce(CGFloat(0)) { total, group in
                total + group.layoutSize.heightDimension.dimension
            }

            let containerSize = NSCollectionLayoutSize(
                widthDimension: .absolute(CGFloat(columnCount) * columnWidth),
                heightDimension: .absolute(totalHeight)
            )
            let containerGroup = NSCollectionLayoutGroup.vertical(
                layoutSize: containerSize,
                subitems: groups
            )

            let section = NSCollectionLayoutSection(group: containerGroup)
            section.interGroupSpacing = 0
section.contentInsets = .zero
if #available(iOS 16.0, *) {
    // No-op on iOS 16+: use boundary supplementary configuration instead.
} else {
    section.supplementariesFollowContentInsets = false
}

            // Optional: Add grid line decoration
            let gridDecoration = NSCollectionLayoutDecorationItem.background(
                elementKind: "GridDecoration"
            )
            var decorationItems = [gridDecoration]

            // Add debug decoration if enabled
            if TVGV.debugBordersEnabled {
                let debugDecoration = NSCollectionLayoutDecorationItem.background(
                    elementKind: DebugGridDecorationView.elementKind
                )
                decorationItems.append(debugDecoration)
            }

            section.decorationItems = decorationItems

            return section
        }

        // Register decoration view
        layout.register(
            GridDecorationView.self,
            forDecorationViewOfKind: "GridDecoration"
        )

        // Register debug decoration view
        if TVGV.debugBordersEnabled {
            layout.register(
                DebugGridDecorationView.self,
                forDecorationViewOfKind: DebugGridDecorationView.elementKind
            )
        }

        return layout
    }

    /// Creates the day rail layout with variable row heights for expansion
    static func createDayRailLayoutWithExpansion(
        rowCount: Int,
        expandedRowIndex: Int?,
        normalRowHeight: CGFloat,
        expandedRowHeight: CGFloat
    ) -> UICollectionViewCompositionalLayout {
        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            // Build variable-height date-row groups (no spacer)
            var rowGroups: [NSCollectionLayoutGroup] = []
            for rowIndex in 0..<rowCount {
                let rowHeight = (expandedRowIndex == rowIndex) ? expandedRowHeight : normalRowHeight

                let itemSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(dayRailWidth),
                    heightDimension: .absolute(rowHeight)
                )
                let item = NSCollectionLayoutItem(layoutSize: itemSize)
                item.contentInsets = .zero

                let groupSize = NSCollectionLayoutSize(
                    widthDimension: .absolute(dayRailWidth),
                    heightDimension: .absolute(rowHeight)
                )
                let group = NSCollectionLayoutGroup.horizontal(
                    layoutSize: groupSize,
                    subitems: [item]
                )
                rowGroups.append(group)
            }

            // Container for all date rows
            let totalHeight = rowGroups.reduce(CGFloat(0)) { $0 + $1.layoutSize.heightDimension.dimension }
            let containerSize = NSCollectionLayoutSize(
                widthDimension: .absolute(dayRailWidth),
                heightDimension: .absolute(totalHeight)
            )
            let containerGroup = NSCollectionLayoutGroup.vertical(
                layoutSize: containerSize,
                subitems: rowGroups
            )

            // Section - no content insets
            let section = NSCollectionLayoutSection(group: containerGroup)
            section.interGroupSpacing = 0
            section.contentInsets = .zero
            section.contentInsetsReference = .none
            if #available(iOS 16.0, *) {
                // No-op on iOS 16+: use boundary supplementary configuration instead.
            } else {
                section.supplementariesFollowContentInsets = false
            }

            // Month header - boundary supplementary (exact posters row height)
            let headerSize = NSCollectionLayoutSize(
                widthDimension: .absolute(TVGV.dateRailWidth),
                heightDimension: .absolute(TVGV.postersRowHeight)
            )
            let header = NSCollectionLayoutBoundarySupplementaryItem(
                layoutSize: headerSize,
                elementKind: "MonthHeaderElementKind",
                alignment: .top
            )
            header.contentInsets = .zero
            header.pinToVisibleBounds = true
            header.extendsBoundary = true

            // Set z-index for iOS 17+
            if #available(iOS 17.0, *) {
                header.zIndex = 1024
            }

            section.boundarySupplementaryItems = [header]

            return section
        }

        return layout
    }
}
