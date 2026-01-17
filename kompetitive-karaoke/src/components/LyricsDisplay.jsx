import { useEffect, useRef } from "react";

/**
 * LyricsDisplay - Display karaoke lyrics synchronized with battle timing
 * 
 * CURRENT IMPLEMENTATION (Mock):
 *   - Lines progress every 4 seconds (fixed interval)
 *   - Scores increment randomly on each line
 *   - Uses local client time (Date.now())
 *   - NOT synchronized across players
 * 
 * REQUIRED FOR BACKEND INTEGRATION:
 * 
 *   Props (NEW):
 *   - battleStartTime: number (unix ms from server)
 *   - lineDurations: number[] (duration of each lyric in ms)
 *   - currentTime: number (server time or Date.now())
 *   - lyrics: string[] (lyric lines)
 * 
 *   Calculation (NEW):
 *   const elapsedMs = currentTime - battleStartTime;
 *   const lineIndex = Math.floor(elapsedMs / avgLineDurationMs);
 *   displayedLyric = lyrics[lineIndex];
 * 
 *   This approach ensures:
 *   - All clients show same lyric at same moment
 *   - No manual progression needed
 *   - Server's battleStartTime is anchor
 *   - Client system clock variance doesn't matter (< 100ms)
 * 
 * SCORE UPDATES (NEW):
 *   Current: setScore() called in this component (WRONG!)
 *   Backend: Server sends PLAYER_SCORE_UPDATE messages (CORRECT)
 *   
 *   Flow:
 *   1. Client sends audio chunk with timestamp
 *   2. Server analyzes + calculates score
 *   3. Server broadcasts: PLAYER_SCORE_UPDATE
 *   4. All clients receive and update store
 *   5. Components re-render with new scores
 *   6. This component only DISPLAYS lyrics, doesn't calculate score
 * 
 * TODO: BACKEND INTEGRATION POINTS:
 * 
 *   1. Replace fixed 4-second interval with timestamp calculation
 *      FROM:  const interval = setInterval(() => { ... }, 4000);
 *      TO:    useEffect(() => {
 *               const updateLoop = () => {
 *                 const elapsed = Date.now() - battleStartTime;
 *                 const newLineIndex = Math.floor(elapsed / avgLineDuration);
 *                 setCurrentLine(newLineIndex);
 *                 requestAnimationFrame(updateLoop);
 *               };
 *               updateLoop();
 *             }, [battleStartTime]);
 * 
 *   2. Remove score calculation from this component
 *      DELETE:  setScoreRef.current(prevScore => prevScore + Math.floor(Math.random() * 100));
 *      REASON:  Server is source of truth for scores
 * 
 *   3. Remove random final score
 *      FROM:  onEndRef.current && onEndRef.current({ score: Math.floor(Math.random() * 1000) });
 *      TO:    onEndRef.current && onEndRef.current();
 *      NOTE:  Server will send BATTLE_RESULTS with final scores
 * 
 *   4. Add battle timeout handling
 *      - Monitor for FINISH_BATTLE message from server
 *      - Call onEnd() when received
 *      - Or use song duration from server
 * 
 * TIMING CONSIDERATIONS:
 * 
 *   Sync requirement: All 4 players must show same lyric within ±100ms
 *   
 *   With server time anchor:
 *   - Client A: (Date.now() - battleStartTime) = 5240ms
 *   - Client B: (Date.now() - battleStartTime) = 5245ms (≈same)
 *   - Difference: 5ms (acceptable!)
 *   - Both show same lyric
 *   
 *   Time skew doesn't matter:
 *   - Client A clock: 100ms fast
 *   - Client B clock: 100ms slow
 *   - But battleStartTime already accounts for this
 *   - (fastClock - (battleStartTime + 100)) ≈ (slowClock - (battleStartTime - 100))
 *   - Both calculate same elapsed time!
 */

export default function LyricsDisplay({
  lyrics,
  currentLine,
  setCurrentLine,
  setScore,
  onEnd,
}) {
  const setScoreRef = useRef(setScore);
  const onEndRef = useRef(onEnd);

  // Update refs when they change, without causing effects to reset
  useEffect(() => {
    setScoreRef.current = setScore;
  }, [setScore]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // CURRENT: Fixed 4-second interval progression
  // TODO: BACKEND - Replace with timestamp-based calculation using battleStartTime
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev < lyrics.length - 1) {
          // TODO: BACKEND - DELETE THIS LINE
          // Score should NEVER be calculated in this component
          // Server analyzes audio + sends score updates via PLAYER_SCORE_UPDATE
          setScoreRef.current((prevScore) =>
            prevScore + Math.floor(Math.random() * 100)
          );
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
        // TODO: BACKEND - DELETE THIS
        // Final score comes from server via BATTLE_RESULTS message
        // Client should NOT calculate or guess final score
        onEndRef.current && onEndRef.current({
          score: Math.floor(Math.random() * 1000),
        });
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