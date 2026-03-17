import { useState } from 'react'
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
 * for describing agent behaviour. Both must be filled
 * before the user can continue.
 *
 * Route: /game/:gameId/player/:playerId/preferences
 */
function ParticipantPageB() {
  const { gameId, playerId } = useParams()
  const household = HOUSEHOLDS[playerId]
  const [cooperation, setCooperation] = useState(null)
  const [agentText, setAgentText] = useState('')

  if (!household) {
    return <div className="left-panel"><p>Household not found.</p></div>
  }

  const titleColorClass = `participant-b__title--${household.color}`
  const isValid = cooperation !== null && agentText.trim().length > 0

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar />

        <h1 className={`participant-b__title ${titleColorClass}`}>
          {household.name}
        </h1>

        <div className="participant-b__section">
          <FormLabel>Level of Cooperation:</FormLabel>
          <CooperationToggle value={cooperation} onChange={setCooperation} />
        </div>

        <div className="participant-b__section">
          <FormLabel>Describe in more detail, to your agent how it should behave:</FormLabel>
          <AgentTextArea value={agentText} onChange={setAgentText} />
        </div>
      </LeftPanel>

      <RightPanel variant="action" color={household.color} compact>
        <ActionButton
          type="forward"
          to={`/game/${gameId}/player/${playerId}/waiting`}
          disabled={!isValid}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default ParticipantPageB
