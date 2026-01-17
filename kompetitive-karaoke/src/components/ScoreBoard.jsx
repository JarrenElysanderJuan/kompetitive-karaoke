export default function ScoreBoard({ score, currentLine, totalLines }) {
  return (
    <div className="mt-6 flex justify-between w-full max-w-2xl px-4">
      <span>Score: {score}</span>
      <span>Line {currentLine + 1} / {totalLines}</span>
    </div>
  );
}