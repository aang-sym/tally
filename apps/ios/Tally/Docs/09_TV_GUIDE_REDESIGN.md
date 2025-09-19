TVGuide2 — Align to img 2 (desired) from img 1 (current)

Goal: Update the existing TVGuide2 implementation so it matches img 2 (and the dark-theme mock, later called img 3):

One global date header row (NOT repeated per provider).

A frozen left column consisting of:

a merged provider rail — one logo per provider, centered vertically across that provider’s stacked show rows;

frozen posters — one poster per show row that does not scroll horizontally.

The episodes matrix scrolls horizontally under the global header and vertically across shows.

Keep existing interactions (episode tap → expand details aligned to the tapped day; long press/tooltips; poster zoom) working.

We are editing (not rewriting) the current TVGuide2 code.

Architecture change (minimal, additive)

To achieve the Excel-like frozen panes and avoid per-section date headers, we use three synchronized collection views inside TVGuide2View:

View

Purpose

Scrolling

TopHeaderCV

Renders the global day/date header row once

Horizontal (programmatic)

LeftFrozenCV

Renders the provider rail (merged) + posters

Vertical (user)

MainGridCV

Renders the episodes matrix (show × day cells)

Both (user)

Synchronization:

MainGridCV.contentOffset.x → drives TopHeaderCV.contentOffset.x (header slides with columns).

MainGridCV.contentOffset.y ↔ drives LeftFrozenCV.contentOffset.y (left column follows vertical scroll).

This removes the repeated date header per provider and lets us truly “merge” the provider cell per section.

Shared layout constants

Create a single source of truth (or verify it already exists) — used by all three views to keep perfect alignment:

enum GuideMetrics {
static let railWidth: CGFloat = 88 // provider rail width (merged logo column)
static let posterWidth: CGFloat = 72 // frozen poster strip width
static let posterHeight: CGFloat = 108 // 2:3
static let rowHeight: CGFloat = 132 // one show row (poster+gutter)
static let columnWidth: CGFloat = 120 // one day column width
static let headerHeight: CGFloat = 56 // global header (weekday+date)
}

extension GuideMetrics {
static var frozenLeadingWidth: CGFloat { railWidth + posterWidth }
}

Important: columnWidth must be shared by TopHeaderCV and MainGridCV.

frozenLeadingWidth is used as the leading content inset for the header and grid to align columns with the frozen left strip.

File-by-file changes

Filenames mentioned are the ones you attached. If a file already contains parts of this, adjust rather than duplicate.

1. TVGuide2Kinds.swift

Add/confirm element kinds (only used inside compositional layouts if needed later):

enum TVGuide2Kinds {
static let providerRail = "provider-rail" // section-leading supplementary (LeftFrozenCV alt: we’ll use a header)
}

Note: With the three-view approach we don’t need a provider-rail supplementary in MainGridCV. The rail lives in LeftFrozenCV.

2. ProviderRailView.swift

Use this as the section header of LeftFrozenCV. It should center the provider logo vertically and draw the trailing 1px separator line to match the guide.

Key points:

No assumptions about height; it must stretch with the number of shows in the provider section.

Place the logo in a container that centers with centerYAnchor of the header.

Add a trailing thin separator: width 1 / UIScreen.main.scale.

(Your existing file likely already has this; keep it and connect it in LeftFrozenCV’s layout below.)

3. DateHeaderView.swift + DateHeaderCell.swift

These power TopHeaderCV. The cell should render weekday (MON/TUE…) and day number stacked. The whole header section must have a leading inset equal to GuideMetrics.frozenLeadingWidth.

(If you previously created a boundary supplementary in the grid for dates — remove it.)

4. ShowPosterCell.swift

This is the item in LeftFrozenCV under each provider section. One cell per show row; size must be posterWidth × rowHeight with the 2:3 poster image centered horizontally and vertically in its lane.

No horizontal scroll here. It’s the frozen strip that lines up with each grid row.

Optional: add a subtle divider at the bottom to match the grid’s horizontal separators.

5. EpisodeCell.swift + EmptyCell.swift

These remain in MainGridCV. An EpisodeCell renders the • SxEy marker (and handles tap/long-press). EmptyCell is a blank day cell.

Ensure their height is GuideMetrics.rowHeight and width is GuideMetrics.columnWidth.

6. ShowRowCell.swift / ProviderCell.swift

If these were used to try to fake merged provider cells inside the grid, stop using them inside MainGridCV. The grid should only render episode/empty cells.

If you still want text labels or provider names, keep them in the LeftFrozenCV header (ProviderRailView).

7. TVGuide2View.swift (core changes)

7.1 Add three collection views

final class TVGuide2View: UIViewController, UIScrollViewDelegate {
private lazy var headerCV: UICollectionView = {
UICollectionView(frame: .zero, collectionViewLayout: makeHeaderLayout())
}()

private lazy var leftCV: UICollectionView = {
UICollectionView(frame: .zero, collectionViewLayout: makeLeftLayout())
}()

private lazy var gridCV: UICollectionView = {
UICollectionView(frame: .zero, collectionViewLayout: makeGridLayout())
}()

// diffable data sources
private var headerDS: UICollectionViewDiffableDataSource<Int, GuideDay>!
private var leftDS: UICollectionViewDiffableDataSource<Int, AnyHashable>! // section = provider index, items = GuideShow
private var gridDS: UICollectionViewDiffableDataSource<Int, AnyHashable>! // section = provider index, items = (showId, dayIndex)

override func viewDidLoad() {
super.viewDidLoad()
view.addSubview(headerCV)
view.addSubview(leftCV)
view.addSubview(gridCV)

    // registers (DateHeaderCell, ProviderRailView, ShowPosterCell, EpisodeCell, EmptyCell) …

    gridCV.delegate = self

}

override func viewDidLayoutSubviews() {
super.viewDidLayoutSubviews()

    let top = view.safeAreaInsets.top
    let headerH = GuideMetrics.headerHeight
    headerCV.frame = CGRect(x: 0, y: top, width: view.bounds.width, height: headerH)

    // left column occupies the frozen strip under the header
    leftCV.frame   = CGRect(x: 0, y: top + headerH, width: GuideMetrics.frozenLeadingWidth,
                            height: view.bounds.height - (top + headerH))

    // grid fills the rest
    gridCV.frame   = CGRect(x: GuideMetrics.frozenLeadingWidth, y: top + headerH,
                            width: view.bounds.width - GuideMetrics.frozenLeadingWidth,
                            height: view.bounds.height - (top + headerH))

}

// sync scroll
func scrollViewDidScroll(\_ scrollView: UIScrollView) {
if scrollView === gridCV {
// horizontal → header
headerCV.contentOffset.x = scrollView.contentOffset.x
// vertical ↔ left
leftCV.contentOffset.y = scrollView.contentOffset.y
}
}
}

7.2 Layout builders

Keep them inside TVGuide2View or move to a Layout helper. The important part is shared constants and matching dimensions.

private func makeHeaderLayout() -> UICollectionViewCompositionalLayout {
let item = NSCollectionLayoutItem(layoutSize: .init(
widthDimension: .absolute(GuideMetrics.columnWidth),
heightDimension: .absolute(GuideMetrics.headerHeight)
))
let group = NSCollectionLayoutGroup.horizontal(layoutSize: item.layoutSize, subitems: [item])
let section = NSCollectionLayoutSection(group: group)
section.orthogonalScrollingBehavior = .none // header scroll is driven externally
section.contentInsets = .init(top: 0, leading: GuideMetrics.frozenLeadingWidth, bottom: 0, trailing: 0)
return UICollectionViewCompositionalLayout(section: section)
}

private func makeLeftLayout() -> UICollectionViewCompositionalLayout {
// Section = provider
let posterItem = NSCollectionLayoutItem(layoutSize: .init(
widthDimension: .absolute(GuideMetrics.posterWidth),
heightDimension: .absolute(GuideMetrics.rowHeight)
))

// vertical group stacks posters per provider
let vGroup = NSCollectionLayoutGroup.vertical(layoutSize: .init(
widthDimension: .absolute(GuideMetrics.posterWidth),
heightDimension: .estimated(GuideMetrics.rowHeight \* 12)
), subitems: [posterItem])

let section = NSCollectionLayoutSection(group: vGroup)
section.interGroupSpacing = 0

// provider rail as a section header spanning full height
let headerSize = NSCollectionLayoutSize(
widthDimension: .absolute(GuideMetrics.railWidth),
heightDimension: .fractionalHeight(1.0)
)
let providerHeader = NSCollectionLayoutBoundarySupplementaryItem(
layoutSize: headerSize,
elementKind: UICollectionView.elementKindSectionHeader, // use header kind here
alignment: .leading
)
providerHeader.zIndex = -1 // behind posters
section.boundarySupplementaryItems = [providerHeader]

// Add a leading content inset to leave space for the rail header
section.contentInsets = .init(top: 0, leading: GuideMetrics.railWidth, bottom: 0, trailing: 0)
return UICollectionViewCompositionalLayout(section: section)
}

private func makeGridLayout() -> UICollectionViewCompositionalLayout {
// cell = one (show × day)
let cell = NSCollectionLayoutItem(layoutSize: .init(
widthDimension: .absolute(GuideMetrics.columnWidth),
heightDimension: .absolute(GuideMetrics.rowHeight)
))

// row = horizontal run of day cells for one show
let row = NSCollectionLayoutGroup.horizontal(layoutSize: .init(
widthDimension: .estimated(GuideMetrics.columnWidth \* 21),
heightDimension: .absolute(GuideMetrics.rowHeight)
), subitems: [cell])

// section = vertical stack of rows for this provider
let sectionGroup = NSCollectionLayoutGroup.vertical(layoutSize: .init(
widthDimension: .estimated(GuideMetrics.columnWidth _ 21),
heightDimension: .estimated(GuideMetrics.rowHeight _ 12)
), subitems: [row])

let section = NSCollectionLayoutSection(group: sectionGroup)
section.interGroupSpacing = 0

// leave space for the entire frozen-left stri
