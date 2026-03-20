import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import { useSocket, useSimEvents } from '../hooks/useSocket'
import SimCharts from '../components/SimCharts'
import './GameDashboardPage.css'

/** Default open height as a fraction of the viewport */
const DEFAULT_OPEN_RATIO = 0.45
/** Minimum panel height in pixels */
const MIN_HEIGHT = 100
/** Maximum panel height as a fraction of the viewport */
const MAX_HEIGHT_RATIO = 0.85

/**
 * GameDashboardPage - Game Master's simulation dashboard.
 *
 * Layout:
 *   - Scrollable data area (tables for SoC + grid status, event log)
 *   - Fixed negotiation bar at the bottom (expands UPWARD, draggable)
 *   - Right sidebar with live status info + Save/Stop/Step buttons
 *
 * Route: /game/:gameId/dashboard
 */
function GameDashboardPage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const socket = useSocket(gameId, null)
  const {
    currentStep,
    totalSteps,
    simStatus,
    gridData,
    agentSpeeches,
    stepEvents,
    pendingAgents,
    negotiationActive,
    targetSoc,
    timeLabels,
    violatedLoads,
    loadLimitKw,
  } = useSimEvents(socket)

  const [showNegotiation, setShowNegotiation] = useState(false)
  const [panelHeight, setPanelHeight] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [shutdownCountdown, setShutdownCountdown] = useState(null)
  const toggleRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Auto-open negotiation panel when a new negotiation round starts
  const prevNegotiationActive = useRef(false)
  useEffect(() => {
    if (negotiationActive && !prevNegotiationActive.current) {
      setShowNegotiation(true)
      setPanelHeight(window.innerHeight * DEFAULT_OPEN_RATIO)
    }
    prevNegotiationActive.current = negotiationActive
  }, [negotiationActive])

  // Auto-scroll negotiation panel when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && showNegotiation) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [agentSpeeches.length, pendingAgents.length, showNegotiation])

  // Countdown timer — ticks down then navigates home
  useEffect(() => {
    if (shutdownCountdown === null) return
    if (shutdownCountdown <= 0) {
      navigate('/')
      return
    }
    const timer = setTimeout(() => {
      setShutdownCountdown(shutdownCountdown - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [shutdownCountdown, navigate])

  // Derive status from latest grid data
  const latestGrid = gridData.length > 0 ? gridData[gridData.length - 1] : null
  const status = {
    time: latestGrid?.date || '--:--',
    timeStep: currentStep >= 0 ? `${currentStep}/${totalSteps}` : '--/--',
    gridConstrained: latestGrid?.grid_ok === false,
    networkLoad: latestGrid?.total_load_kw
      ? `${latestGrid.total_load_kw.toFixed(1)} kW`
      : '-- kW',
    status: simStatus,
  }

  const isStopped = simStatus === 'stopped' || simStatus === 'completed'

  const handleToggle = () => {
    if (showNegotiation) {
      setShowNegotiation(false)
      setPanelHeight(null)
    } else {
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

  const handleStep = () => {
    if (socket) {
      socket.emit('request_step', { game_id: gameId })
    }
  }

  const handleStop = () => {
    if (socket) {
      socket.emit('request_stop', { game_id: gameId })
    }
  }

  const handleSave = () => {
    // TODO: trigger PDF generation via backend
    // For now, start the shutdown countdown
    setShutdownCountdown(5)
  }

  // Build inline style for the panel when open
  const panelStyle = showNegotiation && panelHeight != null
    ? { height: `${panelHeight}px` }
    : {}

  // Format event log entries
  const formatEvent = (evt) => {
    switch (evt.event) {
      case 'step_started':
        return `Step ${evt.step} started${evt.sim_time ? ` (${evt.sim_time})` : ''}`
      case 'decisions_made':
        return `Step ${evt.step} R${evt.round} decisions ${evt.grid_ok ? '(OK)' : '(VIOLATION)'}`
      case 'grid_violation':
        return `Grid violation at step ${evt.step}: ${evt.total_load_kw || '?'} kW`
      case 'negotiation_started':
        return `Negotiation started (step ${evt.step}, round ${evt.round})`
      case 'agent_speech':
        return `${evt.agent}: ${(evt.message || '').substring(0, 60)}${(evt.message || '').length > 60 ? '...' : ''}`
      case 'step_complete':
        return `Step ${evt.step} complete`
      case 'simulation_complete':
        return 'Simulation complete'
      case 'simulation_stopped':
        return 'Simulation stopped'
      default:
        return evt.event || 'unknown event'
    }
  }

  return (
    <>
      <PageLayout variant="sidebar">
        <LeftPanel scrollable compact>
          <NavBar disabled />

          {/* Status banner */}
          <div className="dashboard__status-banner">
            <span className={`dashboard__sim-status dashboard__sim-status--${simStatus}`}>
              {simStatus.toUpperCase()}
            </span>
            {simStatus === 'running' && (
              <span className={`dashboard__sim-status dashboard__sim-status--${negotiationActive ? 'negotiation' : 'operation'}`}>
                {negotiationActive ? 'NEGOTIATION' : 'OPERATION'}
              </span>
            )}
            {currentStep >= 0 && (
              <span className="dashboard__step-label">
                Step {currentStep} / {totalSteps}
              </span>
            )}
          </div>

          {/* Scrollable data area — charts + event log (tabbed) */}
          <div className="dashboard__charts">
            <SimCharts
              gridData={gridData}
              stepEvents={stepEvents}
              formatEvent={formatEvent}
              targetSoc={targetSoc}
              timeLabels={timeLabels}
              totalSteps={totalSteps}
              violatedLoads={violatedLoads}
              loadLimitKw={loadLimitKw}
            />
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
              <li>Status: {status.status}</li>
            </ul>
          </div>

          {/* Save, Stop and Step action buttons */}
          <div className="dashboard__actions">
            <ActionButton
              type="save"
              label="Save"
              onClick={handleSave}
              disabled={!isStopped}
            />
            <ActionButton
              type="stop"
              label="Stop"
              onClick={handleStop}
              disabled={isStopped}
            />
            <ActionButton
              type="forward"
              label="Step"
              onClick={handleStep}
              disabled={simStatus !== 'running'}
            />
          </div>
        </RightPanel>
      </PageLayout>

      {/* Negotiation bar - fixed at bottom, expands upward, draggable */}
      <div className={`dashboard__negotiation${showNegotiation ? ' dashboard__negotiation--open' : ''}`}>
        {/* Title bar - click to open/close */}
        <button
          ref={toggleRef}
          className="dashboard__negotiation-toggle"
          onClick={handleToggle}
        >
          {'< Negotiation Dashboard >'}
          {agentSpeeches.length > 0 && (
            <span className="dashboard__speech-count">
              {` (${agentSpeeches.length} messages)`}
            </span>
          )}
        </button>

        {/* Drag handle - visible when panel is open */}
        {showNegotiation && (
          <div
            className="dashboard__negotiation-drag"
            onMouseDown={handleDragStart}
          >
            <div className="dashboard__negotiation-drag-line" />
          </div>
        )}

        {/* Messages area - agent speeches + typing indicators */}
        <div
          className={`dashboard__negotiation-panel${showNegotiation ? ' dashboard__negotiation-panel--open' : ''}${isDragging ? ' dashboard__negotiation-panel--dragging' : ''}`}
          style={panelStyle}
        >
          {agentSpeeches.length === 0 && pendingAgents.length === 0 ? (
            <div className="dashboard__chat-empty">
              No negotiations yet. Speeches will appear here when grid violations trigger negotiation rounds.
            </div>
          ) : (
            <>
              {/* Delivered speech bubbles */}
              {agentSpeeches.map((msg, i) => (
                <div
                  key={`speech-${i}`}
                  className={`dashboard__chat-bubble dashboard__chat-bubble--${i % 2 === 0 ? 'left' : 'right'}`}
                >
                  <span className="dashboard__chat-sender">{msg.agent}: </span>
                  <span className="dashboard__chat-text">{msg.message}</span>
                  <span className="dashboard__chat-meta">
                    {` (Step ${msg.step}, R${msg.round})`}
                  </span>
                </div>
              ))}

              {/* Typing indicators for agents who haven't spoken yet */}
              {pendingAgents.map((agentName) => (
                <div
                  key={`typing-${agentName}`}
                  className="dashboard__chat-bubble dashboard__chat-bubble--typing"
                >
                  <span className="dashboard__chat-sender">{agentName}</span>
                  <span className="dashboard__typing-dots">
                    <span className="dashboard__typing-dot" />
                    <span className="dashboard__typing-dot" />
                    <span className="dashboard__typing-dot" />
                  </span>
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Shutdown countdown overlay */}
      {shutdownCountdown !== null && (
        <div className="dashboard__shutdown-overlay">
          <p className="dashboard__shutdown-text">
            Data saved. Returning to home in {shutdownCountdown}s...
          </p>
        </div>
      )}

      {/* Overlay to prevent text selection while dragging */}
      {isDragging && <div className="dashboard__drag-overlay" />}
    </>
  )
}

export default GameDashboardPage
