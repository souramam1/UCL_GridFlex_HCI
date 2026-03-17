import { PageLayout, LeftPanel } from '../components/PageLayout'
import NavBar from '../components/NavBar'
import RightPanel from '../components/RightPanel'
import PageTitle from '../components/PageTitle'
import './AboutPage.css'

function AboutPage() {
  return (
    <PageLayout variant="sidebar">
      <LeftPanel scrollable>
        <NavBar backTo="/" />
        <PageTitle>About --</PageTitle>
        <p className="about__description">
          GridFlex is a ....
        </p>

        {/* Placeholder content to demonstrate scrolling.
            Remove this when real content is added. */}
        <div className="about__placeholder">
          <p className="about__description">
            This section demonstrates that the left panel scrolls
            independently while the right sidebar stays fixed.
          </p>
          <p className="about__description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p className="about__description">
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
            nisi ut aliquip ex ea commodo consequat.
          </p>
          <p className="about__description">
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur.
          </p>
          <p className="about__description">
            Excepteur sint occaecat cupidatat non proident, sunt in culpa
            qui officia deserunt mollit anim id est laborum.
          </p>
          <p className="about__description">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem
            accusantium doloremque laudantium.
          </p>
          <p className="about__description">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit
            aut fugit, sed quia consequuntur magni dolores.
          </p>
          <p className="about__description">
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
            consectetur, adipisci velit.
          </p>
                    <p className="about__description">
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
            consectetur, adipisci velit.
          </p>
                    <p className="about__description">
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
            consectetur, adipisci velit.
          </p>
                    <p className="about__description">
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
            consectetur, adipisci velit.
          </p>
        </div>
      </LeftPanel>
      <RightPanel variant="split" fixed />
    </PageLayout>
  )
}

export default AboutPage
