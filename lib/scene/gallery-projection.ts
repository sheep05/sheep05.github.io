import { Matrix4, type PerspectiveCamera } from 'three';
import { screenPosition, screenSize } from './study-state';

// Fit the visitor's real viewport inside the monitor, retaining its layout/aspect.
export function monitorContentSize(aspect: number): [number, number] {
  const height = Math.min(screenSize[1], screenSize[0] / aspect);
  return [height * aspect, height];
}
export function galleryProjection(camera: PerspectiveCamera, width: number, height: number) {
  const [w, h] = monitorContentSize(width / height);
  const plane = new Matrix4().set(
    w / width, 0, 0, screenPosition[0] - w / 2,
    0, -h / height, 0, screenPosition[1] + h / 2,
    0, 0, 1, screenPosition[2],
    0, 0, 0, 1,
  );
  camera.updateMatrixWorld(true);
  const viewport = new Matrix4().set(width / 2,0,0,width / 2, 0,-height / 2,0,height / 2, 0,0,1,0, 0,0,0,1);
  const matrix = viewport.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(plane);
  const e = matrix.elements;
  const scale = e[15];
  for (let i = 0; i < 16; i++) e[i] /= scale;
  // A 2D homography in an invertible CSS 3D matrix: no depth clipping or flattening.
  e[2]=e[6]=e[8]=e[9]=e[11]=e[14]=0;e[10]=1;
  return matrix;
}
