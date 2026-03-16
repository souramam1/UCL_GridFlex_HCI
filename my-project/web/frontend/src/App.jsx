import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Home from './pages/Home'
import Results from './pages/Results'
import Lobby from './pages/Lobby'
import MainScreen from './pages/MainScreen'
import PlayerPage from './pages/PlayerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulate" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/game/:gameId/lobby" element={<Lobby />} />
        <Route path="/game/:gameId" element={<MainScreen />} />
        <Route path="/game/:gameId/player/:playerId" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

// --- Previous App contents ---
// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import Home from './pages/Home'
// import Results from './pages/Results'
// import Lobby from './pages/Lobby'
// import MainScreen from './pages/MainScreen'
// import PlayerPage from './pages/PlayerPage'
//
// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/results" element={<Results />} />
//         <Route path="/game/:gameId/lobby" element={<Lobby />} />
//         <Route path="/game/:gameId" element={<MainScreen />} />
//         <Route path="/game/:gameId/player/:playerId" element={<PlayerPage />} />
//       </Routes>
//     </BrowserRouter>
//   )
// }
//
// export default App

export default App
