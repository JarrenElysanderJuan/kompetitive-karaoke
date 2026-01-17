// components/Spinner.jsx
export default function Spinner({ size = 48 }) {
  return (
    <div
      className="border-4 border-gray-600 border-t-green-400 rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  );
}
