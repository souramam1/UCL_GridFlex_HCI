import { Link } from 'react-router-dom'
import './NavBar.css'

/**
 * NavBar — Navigation bar used on every page.
 *
 * Props:
 *   backTo    (string, optional) — route for the ← back arrow.
 *                                   If omitted, no back arrow is shown
 *                                   and links are centered.
 *   disabled  (boolean, optional) — when true, About and Simulation Models
 *                                   links are visually greyed out and
 *                                   non-clickable.
 *
 * Usage:
 *   <NavBar />                        // centered, no back arrow
 *   <NavBar backTo="/" />             // with back arrow linking to home
 *   <NavBar disabled />               // links disabled (e.g. during simulation)
 */
function NavBar({ backTo, disabled = false }) {
  const showBack = Boolean(backTo)

  return (
    <nav className={`navbar ${showBack ? 'navbar--with-back' : 'navbar--centered'}`}>
      {showBack && (
        <Link to={backTo} className="navbar__back" aria-label="Go back">
          ←
        </Link>
      )}
      {disabled ? (
        <>
          <span className="navbar__link navbar__link--disabled">About</span>
          <span className="navbar__link navbar__link--disabled">Simulation Models</span>
        </>
      ) : (
        <>
          <Link to="/about" className="navbar__link">About</Link>
          <Link to="/models" className="navbar__link">Simulation Models</Link>
        </>
      )}
    </nav>
  )
}

export default NavBar
