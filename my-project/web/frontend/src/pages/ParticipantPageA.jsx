import { useParams } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import {
  FormLabel,
  FormAttr,
  RangeSlider,
  DualRangeSlider,
  PercentInput,
  ChartPlaceholder,
} from '../components/FormControls'
import './ParticipantPageA.css'

/**
 * Static household data — will eventually come from the backend.
 * Maps playerId (1-4) to household metadata and colour.
 */
const HOUSEHOLDS = {
  1: { name: 'Household A', letter: 'A', color: 'blue',    type: 'Detached', epc: 'C' },
  2: { name: 'Household B', letter: 'B', color: 'magenta', type: 'Detached', epc: 'C' },
  3: { name: 'Household C', letter: 'C', color: 'green',   type: 'Detached', epc: 'C' },
  4: { name: 'Household D', letter: 'D', color: 'gold',    type: 'Detached', epc: 'C' },
}

/**
 * Format hour integer to HH:00 string.
 */
function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

/**
 * ParticipantPageA — Step 1 of participant setup.
 *
 * Displays household cluster attributes on the left
 * and EV battery / time-of-use controls on the right.
 *
 * Route: /game/:gameId/player/:playerId/setup
 */
function ParticipantPageA() {
  const { gameId, playerId } = useParams()
  const household = HOUSEHOLDS[playerId]

  if (!household) {
    return <div className="left-panel"><p>Household not found.</p></div>
  }

  const titleColorClass = `participant-a__title--${household.color}`

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar />

        <h1 className={`participant-a__title ${titleColorClass}`}>
          {household.name} : n = 1
        </h1>

        <div className="participant-a__form">
          {/* Left column — Cluster attributes */}
          <div>
            <div className="participant-a__section">
              <FormLabel>Your cluster attributes:</FormLabel>
              <FormAttr label="Type" value={household.type} />
              <FormAttr label="EPC Rating" value={household.epc} />
            </div>

            <div className="participant-a__section" style={{ marginTop: '1.5rem' }}>
              <FormLabel>Energy Demand Profile:</FormLabel>
              <ChartPlaceholder />
            </div>
          </div>

          {/* Right column — EV controls */}
          <div>
            <div className="participant-a__control">
              <FormLabel>EV Battery Size:</FormLabel>
              <RangeSlider min={0} max={7} step={0.5} defaultValue={5} unit="kW" />
            </div>

            <div className="participant-a__control" style={{ marginTop: '1.5rem' }}>
              <FormLabel>Time of Use:</FormLabel>
              <DualRangeSlider
                min={0}
                max={24}
                step={1}
                defaultLow={8}
                defaultHigh={17}
                formatLabel={formatHour}
              />
            </div>

            <div className="participant-a__control" style={{ marginTop: '1.5rem' }}>
              <FormLabel>Target State of Charge:</FormLabel>
              <PercentInput />
            </div>
          </div>
        </div>
      </LeftPanel>

      <RightPanel variant="action" color={household.color} compact>
        <ActionButton
          type="forward"
          to={`/game/${gameId}/player/${playerId}/preferences`}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default ParticipantPageA
