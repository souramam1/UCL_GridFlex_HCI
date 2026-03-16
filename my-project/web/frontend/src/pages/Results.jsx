import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Results() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch('/api/games?status=finished')
        const data = await res.json()
        setGames(data.games)
      } catch (err) {
        console.error('Failed to fetch results:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [])

  if (loading) return <div className="page"><p>Loading...</p></div>

  return (
    <div className="page">
      <h1>Past Results</h1>
      <Link to="/" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>&larr; Back to Home</Link>

      {games.length === 0 ? (
        <p>No completed simulations yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {games.map((game) => (
            <div key={game.id} style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <strong>Game {game.id}</strong>
                <br />
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  {game.num_players} players &middot; {game.created_at}
                </span>
              </div>
              <Link to={`/game/${game.id}`}>View</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Results
