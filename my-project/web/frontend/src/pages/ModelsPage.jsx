import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import PageTitle from '../components/PageTitle'
import './ModelsPage.css'

function ModelsPage() {
  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable>
        <NavBar backTo="/" />
        <PageTitle>Models --</PageTitle>
        <p className="models__description">
          The simulation is designed in x way ....
        </p>
        <p className="models__description">
          We have used y and z data sources
        </p>
      </LeftPanel>
      <RightPanel variant="split" fixed />
    </PageLayout>
  )
}

export default ModelsPage
