import './App.css'
import Welcome from './pages/welcome'
import NavBar from './components/navbar'
import CreateTeams from './pages/CreateTeam';
import JoinTeams from './pages/joinTeams';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LobbyScreen from './pages/LobbyScreen';
import BattlePage from './pages/BattlePage';
import ResultsPage from './pages/ResultsPage';
import { useWebSocket } from './hooks/useWebSocket';
import { initializeGameSync } from './services/GameSync';
import { useEffect } from 'react';

function GlobalErrorToast() {
  const { error } = useWebSocket();
  if (!error) return null;

  return (
    <div className="absolute bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in-up z-50 transition-opacity duration-300">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="font-bold text-sm">Connection Error</p>
          <p className="text-xs opacity-90">{error.message || "Lost connection to server"}</p>
        </div>
      </div>
    </div>
  );
}


function App() {
  const currentUser = { id: "1", name: "Jarren" };

  // Initialize Game Synchronization (WebSocket <-> Store)
  useEffect(() => {
    const cleanup = initializeGameSync();
    return cleanup;
  }, []);

  return (
    <Router>
      <div className="h-screen w-screen flex flex-col bg-gray-900 no-scrollbar relative">
        <NavBar />
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/joinTeams" element={<JoinTeams />} />
          <Route path="/createTeams" element={<CreateTeams />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route
            path="/battle"
            element={<BattlePage />}
          />
          {/* Helper route for testing results manually */}
          <Route path="/results" element={<ResultsPage onBack={() => window.history.back()} />} />
        </Routes>

        {/* Global WebSocket Error Toast */}
        <GlobalErrorToast />
      </div>
    </Router>
  )
}

export default App
