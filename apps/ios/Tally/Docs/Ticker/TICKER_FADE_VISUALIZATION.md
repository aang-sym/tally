# Ticker Fade Effect Visualization

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [LIQUID GLASS TICKER]                                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Icon]  ░░▓▓████ Text Content Here ████▓▓░░          │  │
│  │          ↑                           ↑                │  │
│  │      Fade In                     Fade Out            │  │
│  │      (40pt)                       (40pt)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Gradient Mask Applied

```
Opacity:    0%    →    100%    →    100%    →    0%
Position:  Left        Mid         Mid        Right
Width:     40pt       Center      Center      40pt

░░░░░░░  = 0% opacity (transparent)
░░░▓▓▓  = 0-50% opacity (fading in)
▓▓▓███  = 50-100% opacity (fading to full)
███████  = 100% opacity (fully visible)
███▓▓▓  = 100-50% opacity (fading out)
▓▓▓░░░  = 50-0% opacity (fading to transparent)
░░░░░░░  = 0% opacity (transparent)
```

## Shadow Overlays

### Left Shadow (appearance effect)

```
┌───────────────────────
│████
│███▓
│██▓▓
│█▓▓░
│▓▓░░
│▓░░░
│░░░░  ← Text visible zone
│
└───────────────────────
  0pt         40pt
```

Gradient: `black.opacity(0.3)` → `clear`

### Right Shadow (disappearance effect)

```
───────────────────────┐
                  ████│
                  ▓███│
                  ▓▓██│
                  ░▓▓█│
                  ░░▓▓│
                  ░░░▓│
Text visible zone →  ░░░░│
                      │
───────────────────────┘
         40pt         0pt
```

Gradient: `clear` → `black.opacity(0.3)`

## Scrolling Behavior

### Before Scroll (text overflows)

```
┌─────────────────────────────────────────────────┐
│ [🔵]  This is a very long news item...          │
│         ↑ Start position (offset = 0)           │
│         Text extends beyond visible area →      │
└─────────────────────────────────────────────────┘
```

### During Scroll (animated)

```
┌─────────────────────────────────────────────────┐
│ [🔵]    long news item about som...             │
│              ↑ Scrolling left (offset negative) │
│              ← Text moving left                 │
└─────────────────────────────────────────────────┘
```

### After Scroll (shows end)

```
┌─────────────────────────────────────────────────┐
│ [🔵]         ...item about something important  │
│                        ↑ End visible + 20pt pad │
│                        Scroll stops here        │
└─────────────────────────────────────────────────┘
```

## Calculation Example

```
Container Width:  300pt
Text Width:       450pt
Icon + Padding:    64pt
Available Width:  236pt (300 - 64)

Overflow = 450 - 236 = 214pt
Scroll Distance = -(214 + 20) = -234pt

Animation: linear, 3.5 seconds
Result: Text scrolls left 234pt to show the end
```

## Phase Timing

```
Static Phase    Scrolling Phase    Pause Phase    Next Item
    2.0s            3.5s              1.0s         →
┌──────────┐   ┌──────────────┐   ┌────────┐   ┌──────────
│ Start    │   │   ←←←←←←←    │   │  End   │   │ Next
│ Position │→  │   Animated   │→  │ Pause  │→  │ Item
│ (static) │   │   Movement   │   │        │   │
└──────────┘   └──────────────┘   └────────┘   └──────────
```

Total cycle per item: 6.5 seconds (if scrolling needed)
Total cycle (no scroll): 3.0 seconds (2s static + 1s pause)

## Combined Effect

The mask and shadows work together:

1. **Mask**: Controls text opacity (makes it fade)
2. **Left Shadow**: Adds depth as text appears
3. **Right Shadow**: Adds depth as text disappears
4. **Result**: Text elegantly fades in/out at edges with subtle 3D depth

```
Visual Stack (bottom to top):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Layer 4: Right Shadow (clear → dark)
Layer 3: Left Shadow (dark → clear)
Layer 2: Gradient Mask (controls opacity)
Layer 1: Text Content (scrolling)
Layer 0: Glass Background
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Benefits

✅ **No hard cuts** - text smoothly appears/disappears
✅ **Depth perception** - shadows add dimensionality
✅ **Professional polish** - matches iOS system design
✅ **Readable** - clear middle zone, subtle edges
✅ **Performant** - GPU-accelerated gradients
