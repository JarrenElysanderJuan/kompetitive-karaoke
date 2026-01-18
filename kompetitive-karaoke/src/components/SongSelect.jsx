import { useLobbyStore } from "../store/lobbyStore";

export default function SongSelect({ selectedSong, onChange, isHost }) {
  const availableSongs = useLobbyStore((state) => state.lobby.availableSongs || []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Song Select</h2>
      <select
        value={selectedSong}
        onChange={(e) => onChange(e.target.value)}
        disabled={!isHost}
        className="w-full p-2 rounded bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select a song</option>
        {availableSongs.map((song) => (
          <option key={song.id} value={song.id}>
            {song.name}
          </option>
        ))}
      </select>
    </div>
  );
}