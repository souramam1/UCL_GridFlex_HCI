import { Link } from 'react-router-dom'
import './NavBar.css'

/**
 * NavBar — Navigation bar used on every page.
 *
 * Props:
 *   backTo  (string, optional) — route for the ← back arrow.
 *                                 If omitted, no back arrow is shown
 *                                 and links are centered.
 *
 * Usage:
 *   <NavBar />                        // centered, no back arrow
 *   <NavBar backTo="/" />             // with back arrow linking to home
 */
function NavBar({ backTo }) {
  const showBack = Boolean(backTo)

  return (
    <nav className={`navbar ${showBack ? 'navbar--with-back' : 'navbar--centered'}`}>
      {showBack && (
        <Link to={backTo} className="navbar__back" aria-label="Go back">
          ←
        </Link>
      )}
      <Link to="/about" className="navbar__link">About</Link>
      <Link to="/models" className="navbar__link">Simulation Models</Link>
    </nav>
  )
}

export default NavBar
