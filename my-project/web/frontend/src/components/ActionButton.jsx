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
 *   disabled (boolean, optional)    — if true, button is faded and not clickable
 *
 * Usage:
 *   <ActionButton type="forward" to="/next-page" />
 *   <ActionButton type="forward" to="/next" disabled={!isValid} />
 *   <ActionButton type="stop" onClick={handleStop} label="Stop" />
 */
function ActionButton({ type = 'forward', to, onClick, label, disabled = false }) {
  const icon = type === 'stop' ? '□' : '→'
  const ariaLabel = type === 'stop' ? 'Stop' : 'Continue'

  const buttonContent = (
    <span className="action-button__icon">{icon}</span>
  )

  const className = `action-button${disabled ? ' action-button--disabled' : ''}`

  let button

  if (disabled) {
    // When disabled, render a span instead of Link/button so it's not clickable
    button = (
      <span className={className} aria-label={ariaLabel} aria-disabled="true">
        {buttonContent}
      </span>
    )
  } else if (to) {
    button = (
      <Link to={to} className={className} aria-label={ariaLabel}>
        {buttonContent}
      </Link>
    )
  } else {
    button = (
      <button className={className} onClick={onClick} aria-label={ariaLabel}>
        {buttonContent}
      </button>
    )
  }

  return (
    <div className="action-button__wrapper">
      {button}
      {label && <span className={`action-button__label${disabled ? ' action-button__label--disabled' : ''}`}>{label}</span>}
    </div>
  )
}

export default ActionButton
