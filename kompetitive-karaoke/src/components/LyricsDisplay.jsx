import { useEffect, useRef } from "react";

export default function LyricsDisplay({ lyrics, currentLine, setCurrentLine, setScore, onEnd }) {
  const setScoreRef = useRef(setScore);
  const onEndRef = useRef(onEnd);

  // Update refs when they change, without causing effects to reset
  useEffect(() => {
    setScoreRef.current = setScore;
  }, [setScore]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine(prev => {
        if (prev < lyrics.length - 1) {
          setScoreRef.current(prevScore => prevScore + Math.floor(Math.random() * 100));
          return prev + 1;
        }
        return prev;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [lyrics, setCurrentLine]);

  // Trigger onEnd when the last line finishes
  useEffect(() => {
    if (currentLine >= lyrics.length - 1) {
      const timeout = setTimeout(() => {
        onEndRef.current && onEndRef.current({ score: Math.floor(Math.random() * 1000) }); // optional random final score
      }, 4000); // delay to display last line
      return () => clearTimeout(timeout);
    }
  }, [currentLine, lyrics.length]);

  return (
    <div className="h-48 w-full max-w-2xl overflow-hidden relative">
      <div
        className="flex flex-col transition-transform duration-700 ease-in-out"
        style={{ transform: `translateY(-${currentLine * 2.6}rem)` }}
      >
        {lyrics.map((line, index) => (
          <h3
            key={index}
            className={`text-center text-4xl ${
              index === currentLine
                ? "text-green-400 font-bold"
                : "text-white opacity-70"
            }`}
          >
            {line}
          </h3>
        ))}
      </div>
    </div>
  );
}