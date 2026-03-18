import './ScenarioCard.css'

/**
 * ScenarioCard — Selectable card for the scenario grid.
 *
 * Props:
 *   label     (string)    — display text (e.g. "Scenario I")
 *   selected  (boolean)   — whether this card is currently selected
 *   onClick   (function)  — called when the card is clicked
 *   disabled  (boolean)   — when true, card is greyed out and not clickable
 */
function ScenarioCard({ label, selected = false, onClick, disabled = false }) {
  const className = [
    'scenario-card',
    selected ? 'scenario-card--selected' : '',
    disabled ? 'scenario-card--disabled' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={className}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="scenario-card__label">{label}</span>
    </button>
  )
}

export default ScenarioCard
