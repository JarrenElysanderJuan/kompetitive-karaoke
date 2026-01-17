import './App.css' 
import Welcome from './pages/welcome'
import NavBar from './components/navbar'
import CreateTeams from './pages/CreateTeam';
import JoinTeams from './pages/joinTeams';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LobbyScreen from './pages/LobbyScreen';
import LobbyTestPage from './pages/LobbyTestPage';
import BattlePage from './pages/BattlePage';


function App() {

  const currentUser = { id: "1", name: "Jarren" };

  return (
  <Router>
    <div className="h-screen w-screen flex flex-col bg-gray-900 no-scrollbar">
    <NavBar />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/joinTeams" element={<JoinTeams />} />
        <Route path="/createTeams" element={<CreateTeams />} />
        <Route path="/lobby" element={<LobbyTestPage/>} />
        <Route
          path="/battle"
          element={<BattlePage playerName={currentUser.name} />}
        />
      </Routes>
    </div>
  </Router>
  )
}

export default App
