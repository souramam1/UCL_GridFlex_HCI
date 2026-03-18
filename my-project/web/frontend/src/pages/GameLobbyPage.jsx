import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import './GameLobbyPage.css'

/**
 * Participant colour order — maps to the four households.
 */
const PARTICIPANT_COLORS = ['blue', 'magenta', 'green', 'gold']

/**
 * GameLobbyPage — Game Master's lobby screen.
 *
 * Shows join links for each participant, coloured status bars
 * indicating who has joined, and a "Run Simulation" button.
 * The button is disabled until all participants have joined.
 *
 * Reads joined participants from localStorage (temporary —
 * will be replaced by WebSocket in production).
 *
 * Route: /game/:gameId/lobby
 */
function GameLobbyPage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const participantCount = 4

  const getJoined = useCallback(() => {
    const key = `gridflex_joined_${gameId}`
    return JSON.parse(localStorage.getItem(key) || '[]')
  }, [gameId])

  const [joinedIds, setJoinedIds] = useState([])

  // Reset join state and game flags when lobby loads (fresh start each time)
  useEffect(() => {
    localStorage.setItem(`gridflex_joined_${gameId}`, '[]')
    localStorage.removeItem(`gridflex_started_${gameId}`)
    localStorage.removeItem(`gridflex_stopped_${gameId}`)
    setJoinedIds([])
  }, [gameId])

  // Handle Run Simulation click — set started flag then navigate
  const handleStart = () => {
    localStorage.setItem(`gridflex_started_${gameId}`, 'true')
    navigate(`/game/${gameId}/dashboard`)
  }

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === `gridflex_joined_${gameId}`) {
        setJoinedIds(JSON.parse(e.newValue || '[]'))
      }
    }
    window.addEventListener('storage', handleStorage)

    // Also poll every 2s for same-tab updates
    const interval = setInterval(() => {
      setJoinedIds(getJoined())
    }, 2000)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [gameId, getJoined])

  const participants = Array.from({ length: participantCount }, (_, i) => ({
    id: i + 1,
    color: PARTICIPANT_COLORS[i],
    joined: joinedIds.includes(i + 1),
    link: `https://gridflex_participant_${i + 1}`,
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

        <p className="game-lobby__participants-heading">Participants Joined :</p>

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
        <ActionButton
          type="forward"
          onClick={handleStart}
          label="Run Simulation"
          disabled={!allJoined}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default GameLobbyPage
