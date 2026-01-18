import { useEffect, useState, useRef } from "react";

/**
 * LyricsDisplay - Display karaoke lyrics synchronized with battle timing
 * 
 * Synchronizes lyric lines based on:
 * - battleStartTime: The absolute unix ms when the music starts.
 * - lineTimings: Array of relative ms offset for each lyric line.
 */

export default function LyricsDisplay({
  lyrics,
  lineTimings = [],
  battleStartTime,
  audioRef,
  onEnd,
}) {
  const [currentLine, setCurrentLine] = useState(0);
  const lineRefs = useRef([]);
  const containerRef = useRef(null);
  const onEndRef = useRef(onEnd);

  // Sync onEnd ref
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // SYNC LOOP
  useEffect(() => {
    if (!battleStartTime || !lineTimings.length) return;

    let isRunning = true;

    const updateLoop = () => {
      if (!isRunning) return;

      let elapsed = 0;
      if (audioRef?.current && audioRef.current.currentTime > 0) {
        elapsed = audioRef.current.currentTime * 1000;
      } else {
        elapsed = Date.now() - battleStartTime;
      }

      // Find the current line index by looking at timings
      // Find the last timing that is <= elapsed
      let foundIndex = -1;
      for (let i = 0; i < lineTimings.length; i++) {
        if (lineTimings[i] <= elapsed) {
          foundIndex = i;
        } else {
          break;
        }
      }

      setCurrentLine(foundIndex);

      // Check if song ended (last line + some buffer or based on total duration if we had it)
      // For now, if we are past the last line and it's been > 4s
      if (foundIndex === lineTimings.length - 1 && elapsed > lineTimings[foundIndex] + 5000) {
        onEndRef.current && onEndRef.current();
        isRunning = false;
        return;
      }

      requestAnimationFrame(updateLoop);
    };

    updateLoop();

    return () => {
      isRunning = false;
    };
  }, [battleStartTime, lineTimings]);

  // Calculate dynamic scroll offset
  const getScrollOffset = () => {
    if (currentLine <= 0) return 0;
    const currentEl = lineRefs.current[currentLine];
    if (currentEl) {
      // We want to scroll so the current line is at the top (or near top)
      return currentEl.offsetTop;
    }
    return 0;
  };

  return (
    <div className="h-48 w-full max-w-2xl overflow-hidden relative" ref={containerRef}>
      <div
        className="flex flex-col transition-transform duration-700 ease-in-out"
        style={{ transform: `translateY(-${getScrollOffset()}px)` }}
      >
        {lyrics.map((line, index) => (
          <h3
            key={index}
            ref={(el) => (lineRefs.current[index] = el)}
            className={`text-center text-4xl leading-[2.6rem] ${index === currentLine
              ? "text-green-400 font-bold scale-110 transition-transform"
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