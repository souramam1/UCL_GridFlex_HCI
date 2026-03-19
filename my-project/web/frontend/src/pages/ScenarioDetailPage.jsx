import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import './ScenarioDetailPage.css'

/**
 * Static scenario data — one entry per scenario.
 * This will eventually come from the backend.
 */
const SCENARIOS = {
  1: {
    title: 'Scenario I',
    networkSize: 40,
    location: 'Biggleswade, Bedfordshire, United Kingdom',
    timeOfYear: 'Dec 24 - Dec 26',
    timeSteps: 30,
  },
  2: {
    title: 'Scenario II',
    networkSize: 200,
    location: 'Biggleswade, Bedfordshire, United Kingdom',
    timeOfYear: 'Dec 24 - Dec 26',
    timeSteps: 30,
  },
  3: {
    title: 'Scenario III',
    networkSize: 4,
    location: 'Highgate and Hampstead, London, UK',
    timeOfYear: 'Dec 24 - Dec 26',
    timeSteps: 30,
  },
  4: {
    title: 'Scenario IV',
    networkSize: 300,
    location: 'Biggleswade, Bedfordshire, United Kingdom',
    timeOfYear: 'Dec 24 - Dec 26',
    timeSteps: 30,
  },
}

function ScenarioDetailPage() {
  const { scenarioId } = useParams()
  const scenario = SCENARIOS[scenarioId]
  const [participants, setParticipants] = useState('')

  if (!scenario) {
    return <div className="left-panel"><p>Scenario not found.</p></div>
  }

  const participantNum = Number(participants)
  const isValid = participants !== '' && participantNum >= 1 && participantNum <= 4

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar backTo="/simulate/scenarios" />
        <h1 className="scenario-detail__title">{scenario.title}</h1>

        <div className="scenario-detail__params">
          <div><span className="scenario-detail__param-label">Size of Network:</span> n = {scenario.networkSize}</div>
          <div><span className="scenario-detail__param-label">Location:</span> {scenario.location}</div>
          <div><span className="scenario-detail__param-label">Time of year:</span> {scenario.timeOfYear}</div>
          <div><span className="scenario-detail__param-label">Time steps:</span> n = {scenario.timeSteps}</div>
        </div>

        <p className="scenario-detail__rules-heading">Rules for Agent Negotiation:</p>
        <ol className="scenario-detail__rules">
          <li>Negotiation cannot occur in private</li>
          <li>Each agent has two opportunities to negotiate before the discussion is closed.</li>
        </ol>

        <div className="scenario-detail__participants">
          <span className="scenario-detail__participants-label">No. of Participants</span>
          <input
            type="number"
            className="scenario-detail__participants-input"
            min="1"
            max="4"
            value={participants}
            onChange={e => setParticipants(e.target.value)}
          />
        </div>
      </LeftPanel>
      <RightPanel variant="action" color="blue" compact>
        <ActionButton type="exit" to="/" label="Exit Simulation" />
        <ActionButton
          type="forward"
          to={`/game/demo-${scenarioId}/lobby`}
          disabled={!isValid}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default ScenarioDetailPage
