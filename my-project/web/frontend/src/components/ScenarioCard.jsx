import { Link } from 'react-router-dom'
import './ScenarioCard.css'

/**
 * ScenarioCard — Selectable card for the scenario grid.
 *
 * Props:
 *   label  (string)  — display text (e.g. "Scenario I")
 *   to     (string)  — route to navigate to on click
 */
function ScenarioCard({ label, to }) {
  return (
    <Link to={to} className="scenario-card">
      <span className="scenario-card__label">{label}</span>
    </Link>
  )
}

export default ScenarioCard
