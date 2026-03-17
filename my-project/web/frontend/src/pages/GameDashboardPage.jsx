import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import './GameDashboardPage.css'

/**
 * Placeholder negotiation messages — will come from backend.
 */
const DEMO_MESSAGES = [
  { id: 1, sender: 'Household 1', text: 'Hey! Stop charging your cars everyone, we have to go first.', side: 'left' },
  { id: 2, sender: 'Household 2', text: "I don't think I can today, sorry.", side: 'right' },
  { id: 3, sender: 'Household 3', text: "I'll stop now, but I want to be prioritised the next two rounds...", side: 'left' },
]

/**
 * GameDashboardPage — Game Master's simulation dashboard.
 *
 * Shows live charts (EV State of Charge, Total Grid Load),
 * status info, Stop/Step controls, and a toggleable
 * negotiation panel with agent chat messages.
 *
 * Route: /game/:gameId  (replaces the original MainScreen
 * when the new design is active)
 */
function GameDashboardPage() {
  const { gameId } = useParams()
  const [showNegotiation, setShowNegotiation] = useState(false)

  // Placeholder status data — will come from backend via WebSocket
  const status = {
    time: '12:25am',
    timeStep: '4/8',
    gridConstrained: false,
    networkLoad: '44kW',
  }

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar />

        {/* EV State of Charge chart */}
        <div className="dashboard__chart-section">
          <h2 className="dashboard__chart-heading">EV State of Charge</h2>
          <div className="dashboard__chart-placeholder">
            Chart placeholder — EV State of Charge
          </div>
        </div>

        {/* Total Grid Load chart */}
        <div className="dashboard__chart-section">
          <h2 className="dashboard__chart-heading">Total Grid Load</h2>
          <div className="dashboard__chart-placeholder">
            Chart placeholder — Total Grid Load
          </div>
        </div>

        {/* Negotiation Panel (toggle) */}
        <button
          className="dashboard__negotiation-toggle"
          onClick={() => setShowNegotiation(!showNegotiation)}
        >
          {'< Negotiation Dashboard >'}
        </button>

        {showNegotiation && (
          <div className="dashboard__negotiation-panel">
            {DEMO_MESSAGES.map(msg => (
              <div
                key={msg.id}
                className={`dashboard__chat-bubble dashboard__chat-bubble--${msg.side}`}
              >
                <span className="dashboard__chat-sender">{msg.sender}: </span>
                <span className="dashboard__chat-text">{msg.text}</span>
              </div>
            ))}
          </div>
        )}
      </LeftPanel>

      <RightPanel variant="action" color="blue" compact>
        {/* Status info at the top of the right panel */}
        <div className="dashboard__status-info">
          <ul className="dashboard__status-list">
            <li>Time: {status.time}</li>
            <li>Time step: {status.timeStep}</li>
            <li>Grid constrained: {status.gridConstrained ? 'True' : 'False'}</li>
            <li>Network Load: {status.networkLoad}</li>
          </ul>
        </div>

        {/* Stop and Step action buttons */}
        <div className="dashboard__actions">
          <ActionButton type="stop" label="Stop" />
          <ActionButton type="forward" label="Step" />
        </div>
      </RightPanel>
    </PageLayout>
  )
}

export default GameDashboardPage
