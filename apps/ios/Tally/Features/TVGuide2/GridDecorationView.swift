import UIKit

class GridDecorationView: UICollectionReusableView {

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }

        // Ensure crisp 1px lines on any scale
        let scale = window?.screen.scale ?? UIScreen.main.scale
        context.interpolationQuality = .none
        context.setAllowsAntialiasing(false)

        context.setStrokeColor(TVGuideVertLayout.gridLineColor.cgColor)
        context.setLineWidth(TVGuideVertLayout.gridLineWidth)

        let columnWidth = TVGuideVertLayout.columnWidth
        let rowHeight = TVGuideVertLayout.rowHeight

        // We must compute line positions from absolute grid indexes, not just rect.width/height.
        // Convert absolute grid coordinates to this view’s local coordinates by offsetting with bounds.origin.
        let absMinX = bounds.minX
        let absMaxX = bounds.maxX
        let absMinY = bounds.minY
        let absMaxY = bounds.maxY

        // Determine which vertical indexes intersect this slice
        let firstColIndex = Int(floor(absMinX / columnWidth))
        // We add +1 to ensure the rightmost border is included
        let lastColIndex = Int(ceil(absMaxX / columnWidth)) + 1

        // Determine which horizontal indexes intersect this slice
        let firstRowIndex = Int(floor(absMinY / rowHeight))
        let lastRowIndex = Int(ceil(absMaxY / rowHeight)) + 1

        // Helper to align to the pixel grid for sharp lines
        func pixelAligned(_ value: CGFloat) -> CGFloat {
            // offset by half the line width to center strokes on pixel boundaries
            let lw = TVGuideVertLayout.gridLineWidth
            return (floor((value * scale)) / scale) + (lw / 2.0)
        }

        // Draw vertical lines (column separators)
        if lastColIndex >= firstColIndex {
            for i in firstColIndex...lastColIndex {
                let absX = CGFloat(i) * columnWidth
                let localX = absX - absMinX
                let x = pixelAligned(localX)
                context.move(to: CGPoint(x: x, y: 0))
                context.addLine(to: CGPoint(x: x, y: rect.height))
            }
        }

        // Draw horizontal lines (row separators)
        if lastRowIndex >= firstRowIndex {
            for i in firstRowIndex...lastRowIndex {
                let absY = CGFloat(i) * rowHeight
                let localY = absY - absMinY
                let y = pixelAligned(localY)
                context.move(to: CGPoint(x: 0, y: y))
                context.addLine(to: CGPoint(x: rect.width, y: y))
            }
        }

        // Outer border of this slice, to ensure edges stay visible between tiles
        let left = pixelAligned(0)
        let right = pixelAligned(rect.width)
        let top = pixelAligned(0)
        let bottom = pixelAligned(rect.height)

        context.move(to: CGPoint(x: left, y: top))
        context.addLine(to: CGPoint(x: right, y: top))
        context.addLine(to: CGPoint(x: right, y: bottom))
        context.addLine(to: CGPoint(x: left, y: bottom))
        context.closePath()

        context.strokePath()
    }
}
