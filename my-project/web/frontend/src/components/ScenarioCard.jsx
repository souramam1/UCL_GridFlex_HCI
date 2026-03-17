import './ScenarioCard.css'

/**
 * ScenarioCard — Selectable card for the scenario grid.
 *
 * Props:
 *   label     (string)    — display text (e.g. "Scenario I")
 *   selected  (boolean)   — whether this card is currently selected
 *   onClick   (function)  — called when the card is clicked
 */
function ScenarioCard({ label, selected = false, onClick }) {
  return (
    <button
      type="button"
      className={`scenario-card${selected ? ' scenario-card--selected' : ''}`}
      onClick={onClick}
    >
      <span className="scenario-card__label">{label}</span>
    </button>
  )
}

export default ScenarioCard
