export default function SongSelect({ selectedSong, onChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Song Select</h2>
      <select
        value={selectedSong}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 rounded bg-gray-600 text-white"
      >
        <option value="">Select a song</option>
        <option value="song1">Song 1</option>
        <option value="song2">Song 2</option>
        <option value="song3">Song 3</option>
      </select>
    </div>
  );
}