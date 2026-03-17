import './PageLayout.css'

/**
 * PageLayout — The two-column grid wrapper used on every page.
 *
 * Props:
 *   variant  ("default" | "sidebar")
 *     - "default": equal 50/50 columns (Homepage)
 *     - "sidebar": narrower fixed right panel, scrollable left
 */
function PageLayout({ children, variant = 'default' }) {
  const gridClass = variant === 'sidebar'
    ? 'page-layout__grid page-layout__grid--sidebar'
    : 'page-layout__grid'

  return (
    <div className="page-layout">
      <div className={gridClass}>
        {children}
      </div>
    </div>
  )
}

/**
 * LeftPanel — Cream-coloured left column.
 *
 * Props:
 *   scrollable  (boolean) — enables scrolling, leaves room for fixed sidebar
 *   compact     (boolean) — pairs with a compact (thinner) sidebar
 */
function LeftPanel({ children, scrollable = false, compact = false }) {
  let className = 'left-panel'
  if (scrollable && compact) {
    className = 'left-panel left-panel--scrollable-compact'
  } else if (scrollable) {
    className = 'left-panel left-panel--scrollable'
  }

  return (
    <div className={className}>
      {children}
    </div>
  )
}

export { PageLayout, LeftPanel }
