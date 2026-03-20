import { Navigate } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import PageTitle from '../components/PageTitle'
import './InstructionsPage.css'

function InstructionsPage() {
  if (sessionStorage.getItem('simulateDisabled') === 'true') {
    return <Navigate to="/" replace />
  }

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar backTo="/" />
        <PageTitle>Instructions --</PageTitle>
        <p className="instructions__intro">
          Using the GridFlex Simulation tool allows you to observe both grid-side and household effects of LLM powered AIs joining the grid. <br />
          This is a tool for speculation. You configure the inputs, and can discuss the simulated outputs. <br />
          
        </p>
        <ol className="instructions__steps">
          <li>Choose specific context to simulate</li>
          <li>Define your Agent behaviour</li>
          <li>Simulate! And discuss...</li>
        </ol>
      </LeftPanel>
      <RightPanel variant="action" color="blue" compact>
        <ActionButton type="exit" to="/" label="Exit Simulation" />
        <ActionButton type="forward" to="/simulate/scenarios" />
      </RightPanel>
    </PageLayout>
  )
}

export default InstructionsPage
