import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import HouseScene from '../components/HouseScene'
import { useSocket, useSimEvents } from '../hooks/useSocket'
import './ParticipantDashboardPage.css'

/**
 * Static household metadata — maps playerNumber (1-4) to display info.
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
 *   - Collapsible reasoning panel at the bottom
 *
 * Route: /game/:gameId/player/:playerId/dashboard
 */
function ParticipantDashboardPage() {
  const { gameId, playerId } = useParams()
  const navigate = useNavigate()
  const socket = useSocket(gameId, playerId)
  const {
    currentStep,
    totalSteps,
    simStatus,
    playerData,
  } = useSimEvents(socket)

  const [playerNumber, setPlayerNumber] = useState(null)
  const [shutdownCountdown, setShutdownCountdown] = useState(null)
  const [showReasoning, setShowReasoning] = useState(false)

  // Fetch player number from backend (hex playerId in URL)
  useEffect(() => {
    fetch(`/api/games/${gameId}/player/${playerId}`)
      .then(r => r.json())
      .then(data => setPlayerNumber(data.number))
      .catch(err => console.error('Failed to fetch player:', err))
  }, [gameId, playerId])

  // Trigger shutdown countdown when simulation ends
  useEffect(() => {
    if ((simStatus === 'stopped' || simStatus === 'completed') && shutdownCountdown === null) {
      setShutdownCountdown(5)
    }
  }, [simStatus, shutdownCountdown])

  // Countdown timer — ticks down from 5 to 0, then navigates to home
  useEffect(() => {
    if (shutdownCountdown === null) return
    if (shutdownCountdown <= 0) {
      sessionStorage.setItem('simulateDisabled', 'true')
      navigate('/')
      return
    }
    const timer = setTimeout(() => {
      setShutdownCountdown(shutdownCountdown - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [shutdownCountdown, navigate])

  if (!playerNumber) {
    return <div className="participant-dashboard"><p style={{ padding: '2rem' }}>Loading...</p></div>
  }

  const hh = HOUSEHOLDS[playerNumber] || HOUSEHOLDS[1]

  // Derive display values from real playerData (or show defaults)
  const sim = playerData ? {
    currentTime: playerData.sim_time || '--:--',
    goalTime: playerData.departure_time || '--:--',
    goalPercent: playerData.target_soc_pct != null ? playerData.target_soc_pct : '--',
    isCharging: playerData.charging || false,
    progressPercent: playerData.soc_pct != null
      ? Math.min(100, Math.round((playerData.soc_pct / (playerData.target_soc_pct || 100)) * 100))
      : 0,
    agentMode: playerData.agent_mode || '--',
    decision: playerData.decision || '--',
    reasoning: playerData.decision_reasoning || null,
    socKwh: playerData.soc_kwh != null ? playerData.soc_kwh.toFixed(1) : '--',
    // Timeline positions (approximate from step progress)
    currentPos: totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0,
    chargeStart: 20,
    chargeEnd: playerData.charging ? Math.min(90, 20 + (playerData.soc_pct || 0) * 0.7) : 20,
    gridOk: playerData.grid_ok !== false,
  } : {
    currentTime: '--:--',
    goalTime: '--:--',
    goalPercent: '--',
    isCharging: false,
    progressPercent: 0,
    agentMode: '--',
    decision: '--',
    reasoning: null,
    socKwh: '--',
    currentPos: 0,
    chargeStart: 20,
    chargeEnd: 20,
    gridOk: true,
  }

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
        {currentStep >= 0 && (
          <p className="participant-dashboard__step-info">
            Step {currentStep} / {totalSteps}
          </p>
        )}
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
            <span className={`participant-dashboard__status-dot participant-dashboard__status-dot--${sim.isCharging ? 'charging' : 'idle'}`} />
            <span>{sim.isCharging ? 'Charging' : 'Not Charging'}</span>
          </div>

          {/* Decision */}
          <div className="participant-dashboard__info-item">
            <span>Decision: {sim.decision}</span>
          </div>

          {/* Progress */}
          <div className="participant-dashboard__info-item participant-dashboard__info-item--center">
            <span className="participant-dashboard__progress-bar">
              <span
                className="participant-dashboard__progress-fill"
                style={{ width: `${sim.progressPercent}%` }}
              />
            </span>
            <span>{sim.socKwh} kWh ({sim.progressPercent}%)</span>
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
          carPresent={true}
          charging={sim.isCharging}
          gridOverloaded={!sim.gridOk}
        />
      </div>

      {/* --- Collapsible Reasoning Panel --- */}
      {sim.reasoning && (
        <div className="participant-dashboard__reasoning">
          <button
            className="participant-dashboard__reasoning-toggle"
            onClick={() => setShowReasoning(!showReasoning)}
          >
            {showReasoning ? '\u25BC' : '\u25B6'} Agent Reasoning
          </button>
          {showReasoning && (
            <div className="participant-dashboard__reasoning-content">
              {sim.reasoning}
            </div>
          )}
        </div>
      )}

      {/* --- Shutdown countdown overlay --- */}
      {shutdownCountdown !== null && (
        <div className="participant-dashboard__shutdown-overlay">
          <p className="participant-dashboard__shutdown-text">
            Simulation {simStatus === 'completed' ? 'complete' : 'stopped'}. This page will close in {shutdownCountdown}s...
          </p>
        </div>
      )}
    </div>
  )
}

export default ParticipantDashboardPage
