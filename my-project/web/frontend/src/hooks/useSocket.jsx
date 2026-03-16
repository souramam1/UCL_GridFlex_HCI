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
