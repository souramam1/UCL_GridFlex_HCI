import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import PageTitle from '../components/PageTitle'
import ScenarioCard from '../components/ScenarioCard'
import './ScenariosPage.css'

function ScenariosPage() {
  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar backTo="/simulate" />
        <PageTitle>Scenarios --</PageTitle>
        <div className="scenarios__grid">
          <ScenarioCard label="Scenario I" to="/simulate/scenario/1" />
          <ScenarioCard label="Scenario II" to="/simulate/scenario/2" />
          <ScenarioCard label="Scenario III" to="/simulate/scenario/3" />
          <ScenarioCard label="Scenario IV" to="/simulate/scenario/4" />
        </div>
      </LeftPanel>
      <RightPanel variant="action" color="blue" compact>
        <ActionButton type="forward" to="/simulate/scenario/1" />
      </RightPanel>
    </PageLayout>
  )
}

export default ScenariosPage
