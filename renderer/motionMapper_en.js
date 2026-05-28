/**
 * Map Cinematic Direction to Animation Spec (English).
 * @param {{ pacing: string, camera: string, energy: string, transition: string, mood: string, isClimax: boolean }} direction 
 * @param {number} duration - Scene duration in ms
 * @returns {any}
 */
export function mapVisualToAnimation(direction, duration) {
  const pacing = direction.pacing || 'medium';
  const camera = direction.camera || 'subtle_zoom';
  const energy = direction.energy || 'steady';
  const transition = direction.transition || 'fade';
  const mood = direction.mood || 'cinematic';
  const isClimax = !!direction.isClimax;

  let cameraScale = 1.06;
  let cameraDuration = duration / 1000;
  let cameraEase = 'none';

  if (camera === 'aggressive_zoom') {
    cameraScale = 1.15;
  } else if (camera === 'subtle_zoom') {
    cameraScale = 1.05;
  } else if (camera === 'slow_pan') {
    cameraScale = 1.04;
  } else if (camera === 'dramatic_pan') {
    cameraScale = 1.08;
  }

  let transitionDuration = 0.4;
  if (pacing === 'fast') {
    transitionDuration = 0.25;
  } else if (pacing === 'slow') {
    transitionDuration = 0.7;
  }

  return {
    pacing,
    camera,
    energy,
    transition,
    mood,
    isClimax,
    duration,
    cameraScale,
    cameraDuration,
    cameraEase,
    transitionDuration
  };
}

/**
 * Serialize animSpec into a prompt guidance block (English).
 * @param {any} animSpec 
 * @returns {string}
 */
export function specToPromptBlock(animSpec) {
  return [
    `ANIMATION SPECIFICATION:`,
    `• Target Duration: ${animSpec.duration}ms (DUR = ${(animSpec.duration / 1000).toFixed(2)}s)`,
    `• Energy & Pacing: ${animSpec.energy} energy level with ${animSpec.pacing} pacing. Animations must align with this tempo.`,
    `• Camera Simulation: ${animSpec.camera} (Apply tween on stage or main container scale to ${animSpec.cameraScale} over ${animSpec.cameraDuration.toFixed(1)}s, ease: "${animSpec.cameraEase}").`,
    `• Transition Style: ${animSpec.transition} (entrance/exit timing around ${animSpec.transitionDuration}s).`,
    `• Visual Theme & Mood: ${animSpec.mood} colors and lighting styles.`,
    `• Climax State: ${animSpec.isClimax ? 'TRUE (Inject high intensity, larger scale elements, bright glows, and dramatic speed variations)' : 'FALSE'}`
  ].join('\n');
}
