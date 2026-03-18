import { useState, useRef, useEffect, useCallback } from 'react'
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
  { id: 4, sender: 'Household 1', text: "That's fine, but we need priority this round.", side: 'left' },
  { id: 5, sender: 'Household 4', text: "I can reduce my charging rate by 50% if that helps.", side: 'right' },
  { id: 6, sender: 'Household 2', text: "OK, I'll defer to next round then.", side: 'right' },
]

/** Default open height as a fraction of the viewport */
const DEFAULT_OPEN_RATIO = 0.45
/** Minimum panel height in pixels */
const MIN_HEIGHT = 100
/** Maximum panel height as a fraction of the viewport */
const MAX_HEIGHT_RATIO = 0.85

/**
 * GameDashboardPage — Game Master's simulation dashboard.
 *
 * Layout:
 *   - Scrollable charts area (centered, large)
 *   - Fixed negotiation bar at the bottom (left edge to sidebar)
 *     that toggles open, expanding UPWARD to ~45vh.
 *     The panel is draggable to resize after opening.
 *     Click the toggle bar again to close.
 *   - Right sidebar with status info + Stop/Step buttons
 *
 * Route: /game/:gameId/dashboard
 */
function GameDashboardPage() {
  const { gameId } = useParams()
  const [showNegotiation, setShowNegotiation] = useState(false)
  const [panelHeight, setPanelHeight] = useState(null) // px, null = use default
  const [isDragging, setIsDragging] = useState(false)
  const toggleRef = useRef(null)

  // Placeholder status data — will come from backend via WebSocket
  const status = {
    time: '12:25am',
    timeStep: '4/8',
    gridConstrained: false,
    networkLoad: '44kW',
  }

  const handleToggle = () => {
    if (showNegotiation) {
      // Closing — reset height
      setShowNegotiation(false)
      setPanelHeight(null)
    } else {
      // Opening — set default height
      setShowNegotiation(true)
      setPanelHeight(window.innerHeight * DEFAULT_OPEN_RATIO)
    }
  }

  const handleDragStart = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const toggleHeight = toggleRef.current
      ? toggleRef.current.offsetHeight
      : 40

    const handleMouseMove = (e) => {
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO
      // Panel height = distance from mouse to bottom, minus the toggle bar
      const newHeight = window.innerHeight - e.clientY - toggleHeight
      setPanelHeight(Math.max(MIN_HEIGHT, Math.min(newHeight, maxHeight)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Build inline style for the panel when open
  const panelStyle = showNegotiation && panelHeight != null
    ? { height: `${panelHeight}px` }
    : {}

  return (
    <>
      <PageLayout variant="sidebar">
        <LeftPanel scrollable compact>
          <NavBar disabled />

          {/* Scrollable charts area */}
          <div className="dashboard__charts">
            <div className="dashboard__chart-section">
              <h2 className="dashboard__chart-heading">EV State of Charge</h2>
              <div className="dashboard__chart-placeholder">
                Chart placeholder — EV State of Charge
              </div>
            </div>

            <div className="dashboard__chart-section">
              <h2 className="dashboard__chart-heading">Total Grid Load</h2>
              <div className="dashboard__chart-placeholder">
                Chart placeholder — Total Grid Load
              </div>
            </div>
          </div>
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
            <ActionButton type="stop" label="Stop" onClick={() => {
              localStorage.setItem(`gridflex_stopped_${gameId}`, 'true')
            }} />
            <ActionButton type="forward" label="Step" />
          </div>
        </RightPanel>
      </PageLayout>

      {/* Negotiation bar — fixed at bottom, expands upward, draggable */}
      <div className={`dashboard__negotiation${showNegotiation ? ' dashboard__negotiation--open' : ''}`}>
        {/* Title bar — click to open/close */}
        <button
          ref={toggleRef}
          className="dashboard__negotiation-toggle"
          onClick={handleToggle}
        >
          {'< Negotiation Dashboard >'}
        </button>

        {/* Drag handle — visible when panel is open */}
        {showNegotiation && (
          <div
            className="dashboard__negotiation-drag"
            onMouseDown={handleDragStart}
          >
            <div className="dashboard__negotiation-drag-line" />
          </div>
        )}

        {/* Messages area — expands below the title */}
        <div
          className={`dashboard__negotiation-panel${showNegotiation ? ' dashboard__negotiation-panel--open' : ''}${isDragging ? ' dashboard__negotiation-panel--dragging' : ''}`}
          style={panelStyle}
        >
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
      </div>

      {/* Overlay to prevent text selection while dragging */}
      {isDragging && <div className="dashboard__drag-overlay" />}
    </>
  )
}

export default GameDashboardPage
