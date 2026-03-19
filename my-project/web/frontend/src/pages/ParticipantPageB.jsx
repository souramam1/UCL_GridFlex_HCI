import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

const HOUSEHOLDS = {
  1: { name: 'Household A', letter: 'A', color: 'blue' },
  2: { name: 'Household B', letter: 'B', color: 'magenta' },
  3: { name: 'Household C', letter: 'C', color: 'green' },
  4: { name: 'Household D', letter: 'D', color: 'gold' },
}

function ParticipantPageB() {
  const { gameId, playerId } = useParams()
  const navigate = useNavigate()
  const [playerNumber, setPlayerNumber] = useState(null)
  const [cooperation, setCooperation] = useState(null)
  const [agentText, setAgentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/games/${gameId}/player/${playerId}`)
      .then(r => r.json())
      .then(data => setPlayerNumber(data.number))
      .catch(err => console.error('Failed to fetch player:', err))
  }, [gameId, playerId])

  if (!playerNumber) {
    return <div className="left-panel"><p>Loading...</p></div>
  }

  const household = HOUSEHOLDS[playerNumber]
  if (!household) {
    return <div className="left-panel"><p>Household not found.</p></div>
  }

  const titleColorClass = `participant-b__title--${household.color}`
  const isValid = cooperation !== null && agentText.trim().length > 0

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return
    setIsSubmitting(true)

    try {
      const pageAData = JSON.parse(
        sessionStorage.getItem(`gridflex_inputs_${gameId}_${playerId}`) || '{}'
      )

      const fullInputs = {
        ...pageAData,
        cooperative: cooperation === 'cooperative',
        agent_behaviour: agentText,
      }

      await fetch(`/api/games/${gameId}/player/${playerId}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: fullInputs }),
      })

      sessionStorage.removeItem(`gridflex_inputs_${gameId}_${playerId}`)
      navigate(`/game/${gameId}/player/${playerId}/waiting`)
    } catch (err) {
      console.error('Failed to submit inputs:', err)
      setIsSubmitting(false)
    }
  }

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
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default ParticipantPageB
