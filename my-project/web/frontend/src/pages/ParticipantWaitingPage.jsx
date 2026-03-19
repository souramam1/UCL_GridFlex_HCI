import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import { useSocket } from '../hooks/useSocket'
import './ParticipantWaitingPage.css'

const HOUSEHOLDS = {
  1: { name: 'Household A', color: 'blue' },
  2: { name: 'Household B', color: 'magenta' },
  3: { name: 'Household C', color: 'green' },
  4: { name: 'Household D', color: 'gold' },
}

function ParticipantWaitingPage() {
  const { gameId, playerId } = useParams()
  const navigate = useNavigate()
  const socket = useSocket(gameId, playerId)
  const [playerNumber, setPlayerNumber] = useState(null)

  useEffect(() => {
    fetch(`/api/games/${gameId}/player/${playerId}`)
      .then(r => r.json())
      .then(data => setPlayerNumber(data.number))
      .catch(err => console.error('Failed to fetch player:', err))
  }, [gameId, playerId])

  useEffect(() => {
    if (!socket) return

    const handleStarted = () => {
      navigate(`/game/${gameId}/player/${playerId}/dashboard`)
    }

    socket.on('simulation_started', handleStarted)
    return () => socket.off('simulation_started', handleStarted)
  }, [socket, gameId, playerId, navigate])

  if (!playerNumber) {
    return <div className="left-panel"><p>Loading...</p></div>
  }

  const household = HOUSEHOLDS[playerNumber]
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
