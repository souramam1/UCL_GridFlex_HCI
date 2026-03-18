import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import './ParticipantWaitingPage.css'

const HOUSEHOLDS = {
  1: { name: 'Household A', color: 'blue' },
  2: { name: 'Household B', color: 'magenta' },
  3: { name: 'Household C', color: 'green' },
  4: { name: 'Household D', color: 'gold' },
}

/**
 * ParticipantWaitingPage — Shown after a participant completes setup.
 *
 * On mount, registers this participant as "joined" in localStorage
 * so the Game Master lobby can see them. In production this would
 * be handled via WebSocket.
 *
 * Route: /game/:gameId/player/:playerId/waiting
 */
function ParticipantWaitingPage() {
  const { gameId, playerId } = useParams()
  const navigate = useNavigate()
  const household = HOUSEHOLDS[playerId]

  // Register this participant as joined in localStorage
  useEffect(() => {
    if (!gameId || !playerId) return
    const key = `gridflex_joined_${gameId}`
    const current = JSON.parse(localStorage.getItem(key) || '[]')
    const pid = Number(playerId)
    if (!current.includes(pid)) {
      current.push(pid)
      localStorage.setItem(key, JSON.stringify(current))
    }
  }, [gameId, playerId])

  // Poll for game started flag — navigate to dashboard when set
  // (Will be replaced by WebSocket event in production)
  useEffect(() => {
    const interval = setInterval(() => {
      const started = localStorage.getItem(`gridflex_started_${gameId}`)
      if (started === 'true') {
        navigate(`/game/${gameId}/player/${playerId}/dashboard`)
      }
    }, 1000)

    const handleStorage = (e) => {
      if (e.key === `gridflex_started_${gameId}` && e.newValue === 'true') {
        navigate(`/game/${gameId}/player/${playerId}/dashboard`)
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorage)
    }
  }, [gameId, playerId, navigate])

  if (!household) {
    return <div className="left-panel"><p>Household not found.</p></div>
  }

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar />

        <h1 className={`waiting__title waiting__title--${household.color}`}>
          {household.name}
        </h1>

        <p className="waiting__message">
          Your setup is complete. Waiting for the Game Master to start the simulation...
        </p>

        <div className="waiting__status">
          <span className={`waiting__dot waiting__dot--${household.color}`} />
          Waiting to begin
        </div>
      </LeftPanel>

      <RightPanel variant="action" color={household.color} compact />
    </PageLayout>
  )
}

export default ParticipantWaitingPage
