import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ModelsPage from './pages/ModelsPage'
import InstructionsPage from './pages/InstructionsPage'
import ScenariosPage from './pages/ScenariosPage'
import ScenarioDetailPage from './pages/ScenarioDetailPage'
import ParticipantPageA from './pages/ParticipantPageA'
import ParticipantPageB from './pages/ParticipantPageB'
import ParticipantWaitingPage from './pages/ParticipantWaitingPage'
import GameLobbyPage from './pages/GameLobbyPage'
import GameDashboardPage from './pages/GameDashboardPage'
import ParticipantDashboardPage from './pages/ParticipantDashboardPage'
import Home from './pages/Home'
import Results from './pages/Results'
import Lobby from './pages/Lobby'
import MainScreen from './pages/MainScreen'
import PlayerPage from './pages/PlayerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Homepage group */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/models" element={<ModelsPage />} />

        {/* Simulation setup flow */}
        <Route path="/simulate" element={<InstructionsPage />} />
        <Route path="/simulate/scenarios" element={<ScenariosPage />} />
        <Route path="/simulate/scenario/:scenarioId" element={<ScenarioDetailPage />} />

        {/* Participant setup flow */}
        <Route path="/game/:gameId/player/:playerId/setup" element={<ParticipantPageA />} />
        <Route path="/game/:gameId/player/:playerId/preferences" element={<ParticipantPageB />} />
        <Route path="/game/:gameId/player/:playerId/waiting" element={<ParticipantWaitingPage />} />
        <Route path="/game/:gameId/player/:playerId/dashboard" element={<ParticipantDashboardPage />} />

        {/* Game Master pages (new Figma designs) */}
        <Route path="/game/:gameId/lobby" element={<GameLobbyPage />} />
        <Route path="/game/:gameId/dashboard" element={<GameDashboardPage />} />

        {/* Game session (original framework pages — kept as fallbacks) */}
        <Route path="/results" element={<Results />} />
        <Route path="/game/:gameId" element={<MainScreen />} />
        <Route path="/game/:gameId/player/:playerId" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

// --- Previous App contents ---
// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import Home from './pages/Home'
// ...
// <Route path="/" element={<Home />} />
// <Route path="/results" element={<Results />} />
// <Route path="/game/:gameId/lobby" element={<Lobby />} />
// <Route path="/game/:gameId" element={<MainScreen />} />
// <Route path="/game/:gameId/player/:playerId" element={<PlayerPage />} />
// export default App

export default App
