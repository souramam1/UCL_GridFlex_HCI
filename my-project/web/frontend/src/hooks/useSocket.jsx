import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

/**
 * Custom hook to manage a Socket.IO connection for a game.
 *
 * @param {string} gameId - The game to connect to
 * @param {string|null} playerId - The player ID, or null for the main screen
 * @returns {object|null} The socket instance, or null if not yet connected
 */
export function useSocket(gameId, playerId) {
  const [socket, setSocket] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!gameId) return

    const newSocket = io({
      query: {
        game_id: gameId,
        player_id: playerId || 'main',
      },
      transports: ['websocket'],
    })

    newSocket.on('connect', () => {
      console.log(`Connected to game ${gameId} as ${playerId || 'main screen'}`)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [gameId, playerId])

  return socket
}

/**
 * Hook for subscribing to simulation events from the backend.
 * Used by both GM dashboard and participant dashboards.
 *
 * @param {object|null} socket - Socket.IO instance from useSocket
 * @returns {object} Simulation state: currentStep, totalSteps, simStatus, gridData, agentSpeeches, stepEvents, playerData
 */
export function useSimEvents(socket) {
  const [currentStep, setCurrentStep] = useState(-1)
  const [totalSteps, setTotalSteps] = useState(8)
  const [simStatus, setSimStatus] = useState('waiting')
  const [gridData, setGridData] = useState([])
  const [agentSpeeches, setAgentSpeeches] = useState([])
  const [stepEvents, setStepEvents] = useState([])
  const [playerData, setPlayerData] = useState(null)

  useEffect(() => {
    if (!socket) return

    const handlers = {
      simulation_started: (data) => {
        setSimStatus('running')
        setTotalSteps(data.total_steps || 8)
      },
      step_started: (data) => {
        setCurrentStep(data.step)
        setStepEvents(prev => [...prev, data])
      },
      decisions_made: (data) => {
        setStepEvents(prev => [...prev, data])
      },
      grid_violation: (data) => {
        setStepEvents(prev => [...prev, data])
      },
      negotiation_started: (data) => {
        setStepEvents(prev => [...prev, data])
      },
      agent_speech: (data) => {
        setAgentSpeeches(prev => [...prev, data])
        setStepEvents(prev => [...prev, data])
      },
      step_complete: (data) => {
        if (data.grid_data) {
          setGridData(prev => [...prev, data.grid_data])
        }
        setStepEvents(prev => [...prev, data])
      },
      player_step_data: (data) => {
        setPlayerData(data.agent_data)
      },
      simulation_complete: () => {
        setSimStatus('completed')
      },
      simulation_stopped: () => {
        setSimStatus('stopped')
      },
      simulation_error: () => {
        setSimStatus('error')
      },
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.keys(handlers).forEach(event => socket.off(event))
    }
  }, [socket])

  return {
    currentStep,
    totalSteps,
    simStatus,
    gridData,
    agentSpeeches,
    stepEvents,
    playerData,
  }
}
