import { useState } from 'react'
import { useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import HouseScene from '../components/HouseScene'
import './ParticipantDashboardPage.css'

/**
 * Static household data — maps playerId (1-4) to metadata and colour.
 * Will eventually come from the backend.
 */
const HOUSEHOLDS = {
  1: { name: 'Household A', letter: 'A', color: 'blue',    hex: '#7B9BD6' },
  2: { name: 'Household B', letter: 'B', color: 'magenta', hex: '#C07BAE' },
  3: { name: 'Household C', letter: 'C', color: 'green',   hex: '#A0B44C' },
  4: { name: 'Household D', letter: 'D', color: 'gold',    hex: '#C4A04A' },
}

/**
 * ParticipantDashboardPage — Individual participant's view during the
 * running simulation.
 *
 * Layout (from Figma):
 *   - Top cream area: disabled NavBar + household title
 *   - Coloured status band: timeline bar, charging status, goal,
 *     progress, agent type
 *   - Bottom cream area: animated HouseScene SVG
 *
 * Route: /game/:gameId/player/:playerId/dashboard
 */
function ParticipantDashboardPage() {
  const { gameId, playerId } = useParams()
  const hh = HOUSEHOLDS[playerId] || HOUSEHOLDS[1]

  // Placeholder simulation data — will come from backend via WebSocket
  const sim = {
    currentTime: '08:15',
    goalTime: '9:30',
    goalPercent: 70,
    isCharging: true,
    progressPercent: 50,
    agentMode: 'Cooperative',
    // Timeline positions as percentages (0–100) for the progress bar
    currentPos: 35,   // current time position on the bar
    chargeStart: 30,  // where the gold charging section starts
    chargeEnd: 55,    // where the gold charging section ends
  }

  // --- Debug toggles (for testing without backend) ---
  const [dbgCarPresent, setDbgCarPresent] = useState(true)
  const [dbgCharging, setDbgCharging] = useState(true)
  const [dbgGridOverloaded, setDbgGridOverloaded] = useState(false)

  return (
    <div className="participant-dashboard">
      {/* --- Top cream section --- */}
      <div className="participant-dashboard__header">
        <NavBar disabled />
        <h1
          className="participant-dashboard__title"
          style={{ color: hh.hex }}
        >
          {hh.name}
        </h1>
      </div>

      {/* --- Coloured status band --- */}
      <div
        className="participant-dashboard__status-band"
        style={{ backgroundColor: hh.hex }}
      >
        {/* Timeline bar */}
        <div className="participant-dashboard__timeline">
          <div className="participant-dashboard__timeline-bar">
            {/* Gold charging section */}
            <div
              className="participant-dashboard__timeline-charge"
              style={{
                left: `${sim.chargeStart}%`,
                width: `${sim.chargeEnd - sim.chargeStart}%`,
              }}
            />
            {/* Current time marker */}
            <div
              className="participant-dashboard__timeline-marker"
              style={{ left: `${sim.currentPos}%` }}
            >
              <div className="participant-dashboard__timeline-arrow" />
            </div>
          </div>

          {/* Timeline labels */}
          <div className="participant-dashboard__timeline-labels">
            <span
              className="participant-dashboard__timeline-label"
              style={{ left: `${sim.currentPos}%` }}
            >
              {sim.currentTime}
            </span>
            <span
              className="participant-dashboard__timeline-label participant-dashboard__timeline-label--goal"
              style={{ left: `${sim.chargeEnd}%` }}
            >
              Goal: {sim.goalTime} @ {sim.goalPercent}%
            </span>
          </div>
        </div>

        {/* Info row */}
        <div className="participant-dashboard__info-row">
          {/* Charging status */}
          <div className="participant-dashboard__info-item">
            <span className="participant-dashboard__status-dot participant-dashboard__status-dot--charging" />
            <span>{sim.isCharging ? 'Charging' : 'Not Charging'}</span>
          </div>

          {/* Progress */}
          <div className="participant-dashboard__info-item participant-dashboard__info-item--center">
            <span className="participant-dashboard__progress-bar">
              <span
                className="participant-dashboard__progress-fill"
                style={{ width: `${sim.progressPercent}%` }}
              />
            </span>
            <span>{sim.progressPercent}% of target</span>
          </div>

          {/* Agent mode */}
          <div className="participant-dashboard__info-item participant-dashboard__info-item--right">
            <span>Agent: {sim.agentMode}</span>
          </div>
        </div>
      </div>

      {/* --- Bottom cream section (animated SVG scene) --- */}
      <div className="participant-dashboard__scene">
        <HouseScene
          carPresent={dbgCarPresent}
          charging={dbgCharging}
          gridOverloaded={dbgGridOverloaded}
        />
      </div>

      {/* --- Debug toggle panel (dev only — remove when backend connected) --- */}
      <div className="participant-dashboard__debug">
        <span className="participant-dashboard__debug-title">Debug</span>
        <label className="participant-dashboard__debug-toggle">
          <input
            type="checkbox"
            checked={dbgCarPresent}
            onChange={e => setDbgCarPresent(e.target.checked)}
          />
          Car Present
        </label>
        <label className="participant-dashboard__debug-toggle">
          <input
            type="checkbox"
            checked={dbgCharging}
            onChange={e => setDbgCharging(e.target.checked)}
          />
          Charging
        </label>
        <label className="participant-dashboard__debug-toggle">
          <input
            type="checkbox"
            checked={dbgGridOverloaded}
            onChange={e => setDbgGridOverloaded(e.target.checked)}
          />
          Grid Overloaded
        </label>
      </div>
    </div>
  )
}

export default ParticipantDashboardPage
