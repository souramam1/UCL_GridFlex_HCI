import { useParams } from 'react-router-dom'
import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import PageTitle from '../components/PageTitle'
import './DataLogDetailPage.css'

/**
 * DataLogDetailPage — Summary view for a single test run.
 *
 * Will eventually load and display a PDF summary generated
 * by the simulator. For now shows placeholder content.
 *
 * Route: /datalog/:runId
 */
function DataLogDetailPage() {
  const { runId } = useParams()

  const handleDownload = () => {
    // Placeholder — will eventually trigger a real PDF download
    alert(`Download PDF for Test Run ${runId} (not yet connected to data)`)
  }

  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable compact>
        <NavBar backTo="/datalog" />
        <PageTitle>Test Run {runId} --</PageTitle>

        <div className="datalog-detail__content">
          {/* Placeholder summary — will be replaced by PDF content */}
          <div className="datalog-detail__section">
            <h2 className="datalog-detail__heading">Simulation Summary</h2>
            <div className="datalog-detail__placeholder">
              PDF summary content will be displayed here.
            </div>
          </div>

          <div className="datalog-detail__section">
            <h2 className="datalog-detail__heading">Households</h2>
            <div className="datalog-detail__placeholder datalog-detail__placeholder--wide">
              Household configuration and results table placeholder.
            </div>
          </div>

          <div className="datalog-detail__section">
            <h2 className="datalog-detail__heading">Grid Performance</h2>
            <div className="datalog-detail__placeholder datalog-detail__placeholder--wide">
              Grid load and constraint data placeholder.
            </div>
          </div>

          <div className="datalog-detail__section">
            <h2 className="datalog-detail__heading">Negotiation Log</h2>
            <div className="datalog-detail__placeholder datalog-detail__placeholder--tall">
              Negotiation transcript placeholder.
            </div>
          </div>
        </div>
      </LeftPanel>
      <RightPanel variant="action" color="gray" compact>
        <div className="datalog-detail__download-wrapper">
          <button
            className="datalog-detail__download-btn"
            onClick={handleDownload}
            aria-label="Download PDF"
          >
            <span className="datalog-detail__download-icon">&darr;</span>
          </button>
          <span className="datalog-detail__download-label">Download</span>
        </div>
      </RightPanel>
    </PageLayout>
  )
}

export default DataLogDetailPage
