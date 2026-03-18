import { useState } from 'react'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import PageTitle from '../components/PageTitle'
import ScenarioCard from '../components/ScenarioCard'
import './ScenariosPage.css'

const SCENARIOS = [
  { id: 1, label: 'Scenario I',   disabled: false },
  { id: 2, label: 'Scenario II',  disabled: true },
  { id: 3, label: 'Scenario III', disabled: true },
  { id: 4, label: 'Scenario IV',  disabled: true },
]

function ScenariosPage() {
  const [selected, setSelected] = useState(null)

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar backTo="/simulate" />
        <PageTitle>Scenarios --</PageTitle>
        <div className="scenarios__grid">
          {SCENARIOS.map(s => (
            <ScenarioCard
              key={s.id}
              label={s.label}
              selected={selected === s.id}
              onClick={() => setSelected(s.id)}
              disabled={s.disabled}
            />
          ))}
        </div>
      </LeftPanel>
      <RightPanel variant="action" color="blue" compact>
        <ActionButton
          type="forward"
          to={selected ? `/simulate/scenario/${selected}` : '/simulate/scenarios'}
          disabled={selected === null}
        />
      </RightPanel>
    </PageLayout>
  )
}

export default ScenariosPage
