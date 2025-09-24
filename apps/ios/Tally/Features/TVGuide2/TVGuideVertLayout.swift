import UIKit

// MARK: - Layout Constants
struct TVGuideVertLayout {
    // Grid dimensions
    static let columnWidth: CGFloat = 110
    static let rowHeight: CGFloat = 140
    static let gridInteritem: CGFloat = 12

    // Rail dimensions
    static let providerHeaderHeight: CGFloat = 60
    static let dayRailWidth: CGFloat = 56

    // Month label
    static let monthLabelHeight: CGFloat = 30

    // Grid decoration
    static let gridLineWidth: CGFloat = 0.5
    static let gridLineColor = UIColor.separator.withAlphaComponent(0.3)

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

            // Group - horizontal row of all providers for one day
            let groupSize = NSCollectionLayoutSize(
                widthDimension: .absolute(CGFloat(columnCount) * columnWidth),
                heightDimension: .absolute(rowHeight)
            )
            let group = NSCollectionLayoutGroup.horizontal(
                layoutSize: groupSize,
                subitem: item,
                count: columnCount
            )
            group.interItemSpacing = .fixed(0) // No spacing between columns

            // Section - vertical stack of all days
            let section = NSCollectionLayoutSection(group: group)
            section.interGroupSpacing = 0 // No spacing between rows
            section.contentInsets = .zero

            // Optional: Add grid line decoration
            let gridDecoration = NSCollectionLayoutDecorationItem.background(
                elementKind: "GridDecoration"
            )
            section.decorationItems = [gridDecoration]

            return section
        }

        // Register decoration view
        layout.register(
            GridDecorationView.self,
            forDecorationViewOfKind: "GridDecoration"
        )

        return layout
    }

    /// Creates the provider header layout (horizontal scrolling only)
    static func createProviderHeaderLayout(columnCount: Int) -> UICollectionViewCompositionalLayout {
        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            // Item size - matches grid column width
            let itemSize = NSCollectionLayoutSize(
                widthDimension: .absolute(columnWidth),
                heightDimension: .absolute(providerHeaderHeight)
            )
            let item = NSCollectionLayoutItem(layoutSize: itemSize)

            // Group - horizontal row of all providers
            let groupSize = NSCollectionLayoutSize(
                widthDimension: .absolute(CGFloat(columnCount) * columnWidth),
                heightDimension: .absolute(providerHeaderHeight)
            )
            let group = NSCollectionLayoutGroup.horizontal(
                layoutSize: groupSize,
                subitem: item,
                count: columnCount
            )
            group.interItemSpacing = .fixed(0)

            // Section
            let section = NSCollectionLayoutSection(group: group)
            section.contentInsets = .zero

            return section
        }

        return layout
    }

    /// Creates the day rail layout (vertical scrolling only)
    static func createDayRailLayout(rowCount: Int) -> UICollectionViewCompositionalLayout {
        let layout = UICollectionViewCompositionalLayout { sectionIndex, environment in
            // Item size - matches grid row height
            let itemSize = NSCollectionLayoutSize(
                widthDimension: .absolute(dayRailWidth),
                heightDimension: .absolute(rowHeight)
            )
            let item = NSCollectionLayoutItem(layoutSize: itemSize)

            // Group - vertical column of all days
            let groupSize = NSCollectionLayoutSize(
                widthDimension: .absolute(dayRailWidth),
                heightDimension: .absolute(CGFloat(rowCount) * rowHeight)
            )
            let group = NSCollectionLayoutGroup.vertical(
                layoutSize: groupSize,
                subitem: item,
                count: rowCount
            )
            group.interItemSpacing = .fixed(0)

            // Section
            let section = NSCollectionLayoutSection(group: group)
            section.contentInsets = .zero

            return section
        }

        return layout
    }
}