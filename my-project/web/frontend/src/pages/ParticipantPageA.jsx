import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
 * Static household data — maps player number (1-4) to metadata.
 */
const HOUSEHOLDS = {
  1: { name: 'Household A', letter: 'A', color: 'blue',    type: 'Detached', epc: 'C' },
  2: { name: 'Household B', letter: 'B', color: 'magenta', type: 'Detached', epc: 'C' },
  3: { name: 'Household C', letter: 'C', color: 'green',   type: 'Detached', epc: 'C' },
  4: { name: 'Household D', letter: 'D', color: 'gold',    type: 'Detached', epc: 'C' },
}

function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

/**
 * ParticipantPageA — Step 1 of participant setup.
 *
 * Fetches player info from the backend to determine player number,
 * then maps that to a household. Collects EV settings and stores
 * them in sessionStorage for ParticipantPageB.
 *
 * Route: /game/:gameId/player/:playerId/setup
 */
function ParticipantPageA() {
  const { gameId, playerId } = useParams()
  const navigate = useNavigate()

  const [playerNumber, setPlayerNumber] = useState(null)
  const [batterySize, setBatterySize] = useState(5)
  const [carAwayFrom, setCarAwayFrom] = useState(8)
  const [carAwayUntil, setCarAwayUntil] = useState(17)
  const [targetSoc, setTargetSoc] = useState('')

  // Fetch player info to get the player number
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

  const handleForward = () => {
    sessionStorage.setItem(`gridflex_inputs_${gameId}_${playerId}`, JSON.stringify({
      ev_battery_kwh: batterySize,
      car_away_from: formatHour(carAwayFrom),
      car_away_until: formatHour(carAwayUntil),
      target_soc_pct: Number(targetSoc) || 60,
      initial_soc_pct: 20.0,
    }))
    navigate(`/game/${gameId}/player/${playerId}/preferences`)
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

          <div>
            <div className="participant-a__control">
              <FormLabel>EV Battery Size:</FormLabel>
              <RangeSlider
                min={0} max={7} step={0.5}
                value={batterySize} onChange={setBatterySize}
                unit="kW"
              />
            </div>

            <div className="participant-a__control" style={{ marginTop: '1.5rem' }}>
              <FormLabel>Time of Use:</FormLabel>
              <DualRangeSlider
                min={0} max={24} step={1}
                valueLow={carAwayFrom} valueHigh={carAwayUntil}
                onChangeLow={setCarAwayFrom} onChangeHigh={setCarAwayUntil}
                formatLabel={formatHour}
              />
            </div>

            <div className="participant-a__control" style={{ marginTop: '1.5rem' }}>
              <FormLabel>Target State of Charge:</FormLabel>
              <PercentInput value={targetSoc} onChange={setTargetSoc} />
            </div>
          </div>
        </div>
      </LeftPanel>

      <RightPanel variant="action" color={household.color} compact>
        <ActionButton
          type="forward"
          onClick={handleForward}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default ParticipantPageA
