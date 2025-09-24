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

        context.setStrokeColor(TVGuideVertLayout.gridLineColor.cgColor)
        context.setLineWidth(TVGuideVertLayout.gridLineWidth)

        let columnWidth = TVGuideVertLayout.columnWidth
        let rowHeight = TVGuideVertLayout.rowHeight

        // Draw vertical lines (column separators)
        let columnCount = Int(rect.width / columnWidth)
        for i in 1...columnCount {
            let x = CGFloat(i) * columnWidth
            context.move(to: CGPoint(x: x, y: 0))
            context.addLine(to: CGPoint(x: x, y: rect.height))
        }

        // Draw horizontal lines (row separators)
        let rowCount = Int(rect.height / rowHeight)
        for i in 1...rowCount {
            let y = CGFloat(i) * rowHeight
            context.move(to: CGPoint(x: 0, y: y))
            context.addLine(to: CGPoint(x: rect.width, y: y))
        }

        context.strokePath()
    }
}