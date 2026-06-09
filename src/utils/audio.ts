/**
 * Synthesizes a high-fidelity, elegant, chime audio notification 
 * strictly using the browser's native Web Audio API. 
 * This enables responsive, immersive feedback for real-time alerts.
 */
export function playChimeNotification() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Play a dual-tone warm chime
    const playTone = (freq: number, start: number, duration: number, type: OscillatorType = "sine") => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(0, start);
      // Fast attack
      gainNode.gain.linearRampToValueAtTime(0.15, start + 0.05);
      // Exponential decay
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    
    // Play an upward arpeggio chime (C5 -> E5 -> G5)
    playTone(523.25, now, 0.4, "sine"); // C5
    playTone(659.25, now + 0.08, 0.4, "sine"); // E5
    playTone(783.99, now + 0.16, 0.6, "sine"); // G5
    
  } catch (err) {
    console.warn("Feedback audio chiming could not be played:", err);
  }
}

export function playAlarmNotification() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(0.12, start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // Urgency chime (High E5 pitch pulsing twice)
    playTone(880, now, 0.25);
    playTone(880, now + 0.15, 0.35);
  } catch (err) {
    console.warn("Alarm chime could not be played:", err);
  }
}
