import Button from './button'
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/lobbyStore';
import '../App.css' 

function NavBar() {
  const navigate = useNavigate();
  const currentUser = useLobbyStore((state) => state.currentUserName);

  const handleNavigate = (path) => {
    console.log("Current user:", currentUser); // debug
    if (!currentUser || currentUser.trim() === "") {
      alert("Please choose a username first!");
      return;
    }
    navigate(path);
  };

  return (
    <div className="rounded-lg m-10 p-12 h-20 bg-gray-800 flex items-center justify-between px-4">
      {/* Left: Join/Create */}
      <div className="flex gap-4">
        <Button text="Join Team" onClick={() => handleNavigate('/joinTeams')} />
        <Button text="Create Team" onClick={() => handleNavigate('/createTeams')} />
      </div>

      {/* Center */}
      <div className="text-3xl font-bold">Welcome to Karaoke</div>

      {/* Right: User / Secret Lobby */}
      <div className="flex gap-4 items-center">
        <span className="text-white font-semibold">{currentUser || "No username"}</span>
        <Button text="superSecretLobbyButton" onClick={() => handleNavigate('/lobby')} />
      </div>
    </div>
  )
}

export default NavBar;