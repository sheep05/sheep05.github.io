// Input and timing are independent of the renderer and hosting platform.
export type StudyStage = 'overview' | 'walking' | 'entering';
export const WALK_SECONDS = 8.2;
export const ENTER_SECONDS = 2.3;
export function easeStudy(t: number) { const p = Math.min(1, Math.max(0, t)); return p * p * (3 - 2 * p); }
export const overviewPosition = [0, 1.85, 2.55] as const;
export const overviewTarget = [0, 1.3, -1.85] as const;
export const deskPosition = [0, 1.56, 0.18] as const;
export const deskTarget = [0, 1.25, -1.85] as const;
export const screenPosition = [0, 1.47, -2.11] as const;
export const screenSize = [1.28, 0.8] as const;
export function screenFillDistance(aspect: number, fov: number) {
  return Math.min(screenSize[1], screenSize[0] / aspect) / (2 * Math.tan(fov * Math.PI / 360));
}

// A straight centre aisle; footsteps fade to zero at both ends of the journey.
export function studyWalkPosition(progress: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, progress)), e = easeStudy(t);
  const gait = Math.sin(Math.PI * t), phase = t * Math.PI * 12;
  return [
    Math.sin(phase) * .014 * gait,
    overviewPosition[1] + (deskPosition[1] - overviewPosition[1]) * e + Math.sin(phase * 2) * .009 * gait,
    overviewPosition[2] + (deskPosition[2] - overviewPosition[2]) * e,
  ];
}
