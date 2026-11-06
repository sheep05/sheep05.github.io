// Input and timing are independent of the renderer and hosting platform.
export type StudyStage = 'overview' | 'entering' | 'inspecting' | 'returning';
export const ENTER_SECONDS = 2.3;
export function easeStudy(t: number) { const p = Math.min(1, Math.max(0, t)); return p * p * (3 - 2 * p); }
export const overviewPosition = [0, 1.85, 2.55] as const;
export const overviewTarget = [0, 1.3, -1.85] as const;
export const screenPosition = [0, 1.47, -2.11] as const;
export const screenSize = [1.28, 0.8] as const;
export function screenFillDistance(aspect: number, fov: number) {
  return Math.min(screenSize[1], screenSize[0] / aspect) / (2 * Math.tan(fov * Math.PI / 360));
}
