import { Link } from 'react-router-dom'
import './RightPanel.css'

/**
 * RightPanel — The right column of the page layout.
 *
 * Props:
 *   variant   ("split" | "action")  — which layout to render
 *   color     (string, optional)    — CSS colour for the action variant
 *   fixed     (boolean, optional)   — fixed-position, 33vw → 50vw on hover
 *   compact   (boolean, optional)   — fixed-position, 22vw → 33vw on hover
 *                                      (thinner, for simulation flow pages)
 *   children  (nodes, optional)     — content for the action variant
 *
 * Usage:
 *   <RightPanel variant="split" />
 *   <RightPanel variant="split" fixed />
 *   <RightPanel variant="action" color="blue" compact>
 *     <ActionButton type="forward" />
 *   </RightPanel>
 */

const COLOR_MAP = {
  blue:    'var(--color-blue)',
  magenta: 'var(--color-magenta)',
  green:   'var(--color-green)',
  gold:    'var(--color-gold)',
  gray:    'var(--color-gray)',
}

function RightPanel({ variant = 'split', color = 'blue', fixed = false, compact = false, children }) {
  let panelClass = 'right-panel'
  if (compact) {
    panelClass = 'right-panel right-panel--compact'
  } else if (fixed) {
    panelClass = 'right-panel right-panel--fixed'
  }

  if (variant === 'split') {
    return (
      <div className={panelClass}>
        <Link to="/simulate" className="right-panel__simulate">
          <span className="right-panel__simulate-text">Simulate</span>
        </Link>
        <Link to="/datalog" className="right-panel__datalog">
          <span className="right-panel__datalog-text">Data Log</span>
        </Link>
      </div>
    )
  }

  // Action variant
  const bgColor = COLOR_MAP[color] || color

  return (
    <div className={panelClass} style={{ backgroundColor: bgColor }}>
      <div className="right-panel__action">
        {children}
      </div>
    </div>
  )
}

export default RightPanel
