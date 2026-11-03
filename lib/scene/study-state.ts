// Input and timing are independent of the renderer and hosting platform.
export type StudyStage = 'overview' | 'walking' | 'entering';
export const WALK_SECONDS = 10.5;
export const ENTER_SECONDS = 2.6;
export function easeStudy(t: number) { const p = Math.min(1, Math.max(0, t)); return p * p * (3 - 2 * p); }
export const overviewPosition = [0.65, 2.73, 2.55] as const;
export const overviewTarget = [0, 1.05, -0.5] as const;
export const deskPosition = [0, 1.56, 0.18] as const;
export const deskTarget = [0, 1.25, -1.85] as const;
export const screenPosition = [0, 1.47, -2.11] as const;
export const screenSize = [1.28, 0.8] as const;
export function screenFillDistance(aspect: number, fov: number) {
  return Math.min(screenSize[1], screenSize[0] / aspect) / (2 * Math.tan(fov * Math.PI / 360));
}
