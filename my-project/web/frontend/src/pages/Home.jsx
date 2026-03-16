import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()
  const [numPlayers, setNumPlayers] = useState(2)
  const [creating, setCreating] = useState(false)

  const handleNewGame = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_players: numPlayers }),
      })
      const data = await response.json()
      navigate(`/game/${data.game_id}/lobby`)
    } catch (err) {
      console.error('Failed to create game:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page">
      <h1>Simulation App</h1>

      <section style={{ marginTop: '2rem' }}>
        <h2>Run a new simulation</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <label htmlFor="numPlayers">Number of players:</label>
          <select
            id="numPlayers"
            value={numPlayers}
            onChange={(e) => setNumPlayers(Number(e.target.value))}
          >
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button onClick={handleNewGame} disabled={creating}>
            {creating ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Past results</h2>
        <Link to="/results">View previous simulation results</Link>
      </section>
    </div>
  )
}

export default Home
