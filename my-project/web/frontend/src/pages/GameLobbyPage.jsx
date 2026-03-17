import { useParams } from 'react-router-dom'
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
 *
 * Route: /game/:gameId/lobby
 * (This will eventually replace or wrap the original Lobby component.)
 */
function GameLobbyPage() {
  const { gameId } = useParams()

  // Placeholder: all 4 participants shown as joined.
  // In production this will come from the backend via WebSocket.
  const participantCount = 4
  const participants = Array.from({ length: participantCount }, (_, i) => ({
    id: i + 1,
    color: PARTICIPANT_COLORS[i],
    joined: true,
    link: `https://gridflex_participant_${i + 1}`,
  }))

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
          to={`/game/${gameId}`}
          label="Run Simulation"
        />
      </RightPanel>
    </PageLayout>
  )
}

export default GameLobbyPage
