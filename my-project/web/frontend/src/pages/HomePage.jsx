import { Link } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  return (
    <div className="home">
      <div className="home__layout">
        <div className="home__left">
          <nav className="home__nav">
            <Link to="/about" className="home__nav-link">About</Link>
            <Link to="/models" className="home__nav-link">Simulation Models</Link>
          </nav>

          <h1 className="home__title">GridFlex --</h1>

          <p className="home__subtitle">
            Agentic HEMS<br />
            x<br />
            The Grid
          </p>
        </div>

        <div className="home__right">
          <Link to="/simulate" className="home__simulate">
            <span className="home__simulate-text">Simulate</span>
          </Link>

          <Link to="/results" className="home__datalog">
            <span className="home__datalog-text">Data Log</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HomePage
