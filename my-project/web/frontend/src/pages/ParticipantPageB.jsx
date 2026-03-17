import { useParams } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import {
  FormLabel,
  CooperationToggle,
  AgentTextArea,
} from '../components/FormControls'
import './ParticipantPageB.css'

/**
 * Static household data — mirrors ParticipantPageA.
 */
const HOUSEHOLDS = {
  1: { name: 'Household A', letter: 'A', color: 'blue' },
  2: { name: 'Household B', letter: 'B', color: 'magenta' },
  3: { name: 'Household C', letter: 'C', color: 'green' },
  4: { name: 'Household D', letter: 'D', color: 'gold' },
}

/**
 * ParticipantPageB — Step 2 of participant setup.
 *
 * Displays cooperation level toggle and a text area
 * for describing agent behaviour.
 *
 * Route: /game/:gameId/player/:playerId/preferences
 */
function ParticipantPageB() {
  const { gameId, playerId } = useParams()
  const household = HOUSEHOLDS[playerId]

  if (!household) {
    return <div className="left-panel"><p>Household not found.</p></div>
  }

  const titleColorClass = `participant-b__title--${household.color}`

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar />

        <h1 className={`participant-b__title ${titleColorClass}`}>
          {household.name}
        </h1>

        <div className="participant-b__section">
          <FormLabel>Level of Cooperation:</FormLabel>
          <CooperationToggle />
        </div>

        <div className="participant-b__section">
          <FormLabel>Describe in more detail, to your agent how it should behave:</FormLabel>
          <AgentTextArea />
        </div>
      </LeftPanel>

      <RightPanel variant="action" color={household.color} compact>
        <ActionButton
          type="forward"
          to={`/game/${gameId}/player/${playerId}`}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default ParticipantPageB
