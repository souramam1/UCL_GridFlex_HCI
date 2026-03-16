import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function Lobby() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const [game, setGame] = useState(null)
  const [error, setError] = useState(null)

  const baseUrl = `${window.location.protocol}//${window.location.host}`

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`)
        if (!res.ok) throw new Error('Game not found')
        const data = await res.json()
        setGame(data)
      } catch (err) {
        setError(err.message)
      }
    }
    fetchGame()
    const interval = setInterval(fetchGame, 2000)
    return () => clearInterval(interval)
  }, [gameId])

  const handleStart = async () => {
    try {
      await fetch(`/api/games/${gameId}/start`, { method: 'POST' })
      navigate(`/game/${gameId}`)
    } catch (err) {
      console.error('Failed to start:', err)
    }
  }

  if (error) return <div className="page"><p>Error: {error}</p></div>
  if (!game) return <div className="page"><p>Loading...</p></div>

  const allReady = game.players.every((p) => p.has_submitted)

  return (
    <div className="page">
      <h1>Game Lobby</h1>
      <p>Game ID: <code>{gameId}</code></p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Share these links with your players</h2>
        <ul style={{ listStyle: 'none', marginTop: '1rem' }}>
          {game.players.map((player) => {
            const link = `${baseUrl}/game/${gameId}/player/${player.id}`
            return (
              <li key={player.id} style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                background: 'white',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <strong>Player {player.number}</strong>
                  <br />
                  <a href={link} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {link}
                  </a>
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  background: player.has_submitted ? '#dcfce7' : '#fef3c7',
                  color: player.has_submitted ? '#166534' : '#92400e',
                  whiteSpace: 'nowrap',
                  marginLeft: '1rem',
                }}>
                  {player.has_submitted ? 'Ready' : 'Waiting'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <button onClick={handleStart} disabled={!allReady}>
          {allReady ? 'Start Simulation' : 'Waiting for all players...'}
        </button>
      </section>
    </div>
  )
}

export default Lobby
