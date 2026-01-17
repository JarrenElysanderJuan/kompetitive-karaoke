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
  <div className="relative rounded-lg m-10 p-12 h-20 bg-gray-800 flex items-center px-4">
    {/* Left */}
    <div className="flex gap-4">
      <Button text="Join Team" onClick={() => handleNavigate('/joinTeams')} />
      <Button text="Create Team" onClick={() => handleNavigate('/createTeams')} />
    </div>

    {/* True center */}
    <div className="absolute left-1/2 -translate-x-1/2 text-3xl font-bold">
      Welcome to Karaoke
    </div>

    {/* Right */}
    <div className="ml-auto flex gap-4 items-center">
      <span className="text-white font-semibold">
        {currentUser || "No username"}
      </span>
    </div>
  </div>
);
}

export default NavBar;