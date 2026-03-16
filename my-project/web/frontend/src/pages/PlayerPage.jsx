import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'

function PlayerPage() {
  const { gameId, playerId } = useParams()
  const [phase, setPhase] = useState('loading') // loading | input | submitted | running | finished
  const [inputs, setInputs] = useState({})
  const [updates, setUpdates] = useState([])
  const [playerInfo, setPlayerInfo] = useState(null)

  const socket = useSocket(gameId, playerId)

  // Fetch initial player state
  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/player/${playerId}`)
        const data = await res.json()
        setPlayerInfo(data)
        if (data.has_submitted) {
          setPhase('submitted')
        } else if (data.game_status === 'waiting') {
          setPhase('input')
        } else {
          setPhase(data.game_status)
        }
      } catch (err) {
        console.error('Failed to fetch player info:', err)
      }
    }
    fetchPlayer()
  }, [gameId, playerId])

  // Listen for live updates via WebSocket
  useEffect(() => {
    if (!socket) return

    socket.on('simulation_update', (data) => {
      setUpdates((prev) => [...prev, data])
    })

    socket.on('phase_change', (data) => {
      setPhase(data.phase)
    })

    return () => {
      socket.off('simulation_update')
      socket.off('phase_change')
    }
  }, [socket])

  const handleSubmit = async () => {
    try {
      await fetch(`/api/games/${gameId}/player/${playerId}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      })
      setPhase('submitted')
    } catch (err) {
      console.error('Failed to submit inputs:', err)
    }
  }

  // ── Render based on current phase ──

  if (phase === 'loading') {
    return <div className="page"><p>Loading...</p></div>
  }

  if (phase === 'input' || phase === 'submitted') {
    return (
      <div className="page">
        <h1>Player {playerInfo?.number}</h1>

        {phase === 'submitted' ? (
          <p style={{ marginTop: '1rem' }}>
            Your inputs have been submitted. Waiting for other players...
          </p>
        ) : (
          <section style={{ marginTop: '1rem' }}>
            <h2>Enter your inputs</h2>

            {/*
              TODO: Replace this placeholder with your actual input fields.
              Each input updates the `inputs` state object, which gets sent
              to the backend and written to simulation_inputs/<game_id>/player_<n>.json
            */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', maxWidth: '400px' }}>
              <label>
                Example parameter:
                <input
                  type="number"
                  value={inputs.exampleParam || ''}
                  onChange={(e) => setInputs({ ...inputs, exampleParam: e.target.value })}
                  style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
                />
              </label>

              <button onClick={handleSubmit}>Submit Inputs</button>
            </div>
          </section>
        )}
      </div>
    )
  }

  if (phase === 'running' || phase === 'finished') {
    return (
      <div className="page">
        <h1>Player {playerInfo?.number} — {phase === 'running' ? 'Simulation Running' : 'Results'}</h1>

        <section style={{ marginTop: '1rem' }}>
          {updates.length === 0 ? (
            <p>Waiting for simulation data...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {updates.map((update, i) => (
                <div key={i} style={{
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '8px',
                }}>
                  {/* TODO: Replace with your actual result rendering */}
                  <pre style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(update, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }
}

export default PlayerPage
