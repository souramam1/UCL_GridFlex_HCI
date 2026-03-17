import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import ActionButton from '../components/ActionButton'
import PageTitle from '../components/PageTitle'
import './InstructionsPage.css'

function InstructionsPage() {
  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar backTo="/" />
        <PageTitle>Instructions --</PageTitle>
        <p className="instructions__intro">
          Use this tool to participate as one or several
          households enabled with Agentic HEMS under a
          secondary substation.
        </p>
        <ol className="instructions__steps">
          <li>Choose specific context to simulate</li>
          <li>Define your Agent behaviour</li>
          <li>Simulate! And discuss...</li>
        </ol>
      </LeftPanel>
      <RightPanel variant="action" color="blue" compact>
        <ActionButton type="forward" to="/simulate/scenarios" />
      </RightPanel>
    </PageLayout>
  )
}

export default InstructionsPage
