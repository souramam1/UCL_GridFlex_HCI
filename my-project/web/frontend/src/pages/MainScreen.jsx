import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'

function MainScreen() {
  const { gameId } = useParams()
  const [status, setStatus] = useState('loading')
  const [updates, setUpdates] = useState([])
  const [progress, setProgress] = useState(0)
  const [outputFiles, setOutputFiles] = useState([])

  const socket = useSocket(gameId, null)

  // Fetch initial game state
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`)
        const data = await res.json()
        setStatus(data.status)
      } catch (err) {
        console.error('Failed to fetch game:', err)
      }
    }
    fetchGame()
  }, [gameId])

  // Listen for live updates
  useEffect(() => {
    if (!socket) return

    socket.on('general_update', (data) => {
      setUpdates((prev) => [...prev, data])
    })

    socket.on('progress', (data) => {
      setProgress(data.percent)
    })

    socket.on('phase_change', (data) => {
      setStatus(data.phase)
      // When simulation finishes, fetch output files
      if (data.phase === 'finished') {
        fetchOutputFiles()
      }
    })

    return () => {
      socket.off('general_update')
      socket.off('progress')
      socket.off('phase_change')
    }
  }, [socket])

  // Fetch output files (called when simulation finishes, or on load if already finished)
  const fetchOutputFiles = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/files`)
      const data = await res.json()
      setOutputFiles(data.files)
    } catch (err) {
      console.error('Failed to fetch output files:', err)
    }
  }

  useEffect(() => {
    if (status === 'finished') {
      fetchOutputFiles()
    }
  }, [status])

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="page">
      <h1>Simulation — Main View</h1>
      <p>Game: <code>{gameId}</code> | Status: {status}</p>

      {/* Progress bar */}
      {status === 'running' && (
        <div style={{
          marginTop: '1rem',
          background: '#e5e7eb',
          borderRadius: '999px',
          height: '1.5rem',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#2563eb',
            borderRadius: '999px',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}>
            {progress > 10 && `${progress}%`}
          </div>
        </div>
      )}

      {/* Live updates feed */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Live Updates</h2>
        {updates.length === 0 ? (
          <p style={{ marginTop: '0.5rem' }}>Waiting for simulation data...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {updates.map((update, i) => (
              <div key={i} style={{
                padding: '0.75rem',
                background: 'white',
                borderRadius: '8px',
              }}>
                {/* TODO: Replace with your actual update rendering */}
                <pre style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(update, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Output files browser */}
      {outputFiles.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Output Files</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
            {outputFiles.map((file) => (
              <a
                key={file.path}
                href={`/api/files/${file.path}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{file.name}</span>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {formatFileSize(file.size)}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default MainScreen
