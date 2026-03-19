import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import { useSocket } from '../hooks/useSocket'
import './GameLobbyPage.css'

const PARTICIPANT_COLORS = ['blue', 'magenta', 'green', 'gold']

function GameLobbyPage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const socket = useSocket(gameId, null)

  const [gameData, setGameData] = useState(null)
  const [isStarting, setIsStarting] = useState(false)

  const refreshGameData = () => {
    fetch(`/api/games/${gameId}`)
      .then(r => r.json())
      .then(setGameData)
      .catch(err => console.error('Failed to fetch game:', err))
  }

  // Fetch game data on mount + poll every 3s as fallback
  useEffect(() => {
    refreshGameData()
    const interval = setInterval(refreshGameData, 3000)
    return () => clearInterval(interval)
  }, [gameId])

  // Also refresh immediately on WebSocket player_joined event
  useEffect(() => {
    if (!socket) return
    socket.on('player_joined', refreshGameData)
    return () => socket.off('player_joined', refreshGameData)
  }, [socket, gameId])

  const handleStart = async () => {
    if (isStarting) return
    setIsStarting(true)

    try {
      await fetch(`/api/games/${gameId}/start`, { method: 'POST' })
      navigate(`/game/${gameId}/dashboard`)
    } catch (err) {
      console.error('Failed to start simulation:', err)
      setIsStarting(false)
    }
  }

  if (!gameData) {
    return <div className="left-panel"><p>Loading...</p></div>
  }

  const participants = gameData.players.map((p, i) => ({
    id: p.id,
    number: p.number,
    color: PARTICIPANT_COLORS[i] || 'gray',
    joined: p.has_submitted,
    link: `gridflex_participant_${p.number}`,
  }))

  const allJoined = participants.every(p => p.joined)

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar />

        <h1 className="game-lobby__title">Join the Simulation --</h1>

        <div className="game-lobby__links">
          {participants.map(p => (
            <div key={p.id} className="game-lobby__link-row">
              <span className="game-lobby__link-label">Link: </span>
              <a
                href={`/game/${gameId}/player/${p.id}/setup`}
                className="game-lobby__link-url"
              >
                {p.link}
              </a>
            </div>
          ))}
        </div>

        <p className="game-lobby__participants-heading">Participants Ready :</p>

        <div className="game-lobby__status-bars">
          {participants.map(p => (
            <div
              key={p.id}
              className={`game-lobby__status-bar game-lobby__status-bar--${p.color}${p.joined ? '' : ' game-lobby__status-bar--inactive'}`}
            />
          ))}
        </div>
      </LeftPanel>

      <RightPanel variant="action" color="blue" compact>
        <ActionButton type="exit" to="/" label="Exit Simulation" />
        <ActionButton
          type="forward"
          onClick={handleStart}
          label="Run Simulation"
          disabled={!allJoined || isStarting}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default GameLobbyPage
