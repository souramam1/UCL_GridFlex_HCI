import { Link } from 'react-router-dom'
import './ActionButton.css'

/**
 * ActionButton — Circle button with icon, used in the right panel.
 *
 * Props:
 *   type     ("forward" | "stop")   — which icon to show
 *   to       (string, optional)     — if provided, renders as a Link
 *   onClick  (function, optional)   — click handler (for non-link usage)
 *   label    (string, optional)     — text below the button (e.g. "Run Simulation")
 *
 * Usage:
 *   <ActionButton type="forward" to="/next-page" />
 *   <ActionButton type="stop" onClick={handleStop} label="Stop" />
 */
function ActionButton({ type = 'forward', to, onClick, label }) {
  const icon = type === 'stop' ? '□' : '→'
  const ariaLabel = type === 'stop' ? 'Stop' : 'Continue'

  const buttonContent = (
    <span className="action-button__icon">{icon}</span>
  )

  const button = to ? (
    <Link to={to} className="action-button" aria-label={ariaLabel}>
      {buttonContent}
    </Link>
  ) : (
    <button className="action-button" onClick={onClick} aria-label={ariaLabel}>
      {buttonContent}
    </button>
  )

  return (
    <div className="action-button__wrapper">
      {button}
      {label && <span className="action-button__label">{label}</span>}
    </div>
  )
}

export default ActionButton
