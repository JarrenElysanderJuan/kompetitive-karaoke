
import type { Song } from '../types/state.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parse UltraStar .txt file into Game Song format
 */
export function parseUltraStar(filePath: string): Song | null {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);

        const headers: Record<string, string> = {};
        const rawNoteLines: string[] = [];

        // First pass: Parse headers and collect note lines
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('#')) {
                // Split only at the first colon to handle URLs in values
                const match = trimmed.substring(1).match(/^([^:]+):(.*)$/);
                if (match) {
                    const key = match[1].toUpperCase();
                    const value = match[2].trim();
                    headers[key] = value;
                }
            } else if (trimmed === 'E') {
                break;
            } else {
                // CRITICAL: Preserve trailing spaces for notes/breaks!
                rawNoteLines.push(line);
            }
        }

        // Required headers
        if (!headers['TITLE'] || !headers['BPM']) {
            console.error(`[UltraStar] Missing required headers in ${filePath}`);
            return null;
        }

        const bpm = parseFloat(headers['BPM'].replace(',', '.'));
        const gap = parseFloat(headers['GAP']?.replace(',', '.') || '0');
        // Standard UltraStar resolution: beatDuration = 60000 / (BPM * 4)
        const msPerBeat = 60000 / (bpm * 4);

        const parsedNotes: Array<{ pitch: number, start: number, duration: number, lyric: string }> = [];
        const songLines: string[] = [];
        const lineDurations: number[] = [];
        const lineTimings: number[] = [];

        let currentLineNotes: any[] = [];

        // Process note lines
        for (const line of rawNoteLines) {
            // Line Break: "- [StartBeat]"
            if (line.startsWith('-')) {
                if (currentLineNotes.length > 0) {
                    const lineText = currentLineNotes.map(n => n.lyric).join('');
                    songLines.push(lineText);

                    // Calculate duration and push timing
                    const firstNoteStart = currentLineNotes[0].start;
                    const lastNoteEnd = currentLineNotes[currentLineNotes.length - 1].start +
                        currentLineNotes[currentLineNotes.length - 1].duration;

                    lineTimings.push(firstNoteStart);
                    lineDurations.push((lastNoteEnd - firstNoteStart) + 1000); // Pad for display

                    parsedNotes.push(...currentLineNotes);
                    currentLineNotes = [];
                }
            }
            // Note: ": [Start] [Dur] [Pitch] [Lyric]"
            // Types: : (normal), * (golden), F (freestyle), R (relative), G (golden-freestyle)
            else if (/^\s*[:*FRG]/.test(line)) {
                // Regex: Type Start Beats Pitch <sep> Lyric
                // We use \s for the separator space. 
                // Everything after that first separator space is the lyric.
                const match = line.match(/^\s*[:*FRG]\s+(\d+)\s+(\d+)\s+(-?\d+)\s(.*)$/);

                if (match) {
                    const startRaw = parseInt(match[1]);
                    const durationRaw = parseInt(match[2]);
                    const pitchRaw = parseInt(match[3]);
                    const lyric = match[4] || "";

                    const startTime = gap + (startRaw * msPerBeat);
                    const durationMs = durationRaw * msPerBeat;

                    // Pitch calculation: 0 = C4 (261.63Hz)
                    const pitchHz = 261.63 * Math.pow(2, pitchRaw / 12);

                    currentLineNotes.push({
                        pitch: pitchHz,
                        start: startTime,
                        duration: durationMs,
                        lyric: lyric
                    });
                }
            }
        }

        // Flush last line
        if (currentLineNotes.length > 0) {
            const lineText = currentLineNotes.map(n => n.lyric).join('');
            songLines.push(lineText);

            const firstNoteStart = currentLineNotes[0].start;
            lineTimings.push(firstNoteStart);
            lineDurations.push(5000); // Default for last line

            parsedNotes.push(...currentLineNotes);
        }

        return {
            id: headers['TITLE'].replace(/\s+/g, '_').toLowerCase(),
            name: headers['TITLE'],
            artist: headers['ARTIST'] || 'Unknown',
            bpm: bpm,
            gap: gap,
            mp3: headers['MP3'],
            cover: headers['COVER'] || headers['BACKGROUND'],
            lyrics: songLines,
            lineDurations: lineDurations,
            lineTimings: lineTimings,
            duration: parsedNotes.length > 0 ? (parsedNotes[parsedNotes.length - 1].start + 5000) : 0,
            notes: parsedNotes
        } as any;
    } catch (err) {
        console.error(`[UltraStar] Error parsing ${filePath}:`, err);
        return null;
    }
}
