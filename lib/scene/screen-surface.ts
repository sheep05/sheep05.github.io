import { Matrix4, Vector3, type PerspectiveCamera } from 'three';

/** A display plane measured from three named corners in the authored model. */
export function screenSurface(topLeft: Vector3, topRight: Vector3, bottomLeft: Vector3) {
  const right = topRight.clone().sub(topLeft);
  const up = topLeft.clone().sub(bottomLeft);
  const width = right.length();
  const height = up.length();
  if (width < .01 || height < .01) throw new Error('The laptop display corners are invalid.');
  right.normalize();
  up.normalize();
  const normal = right.clone().cross(up).normalize();
  const center = topLeft.clone().addScaledVector(right, width / 2).addScaledVector(up, -height / 2);
  return { right, up, normal, center, width, height };
}

export type ScreenSurface = ReturnType<typeof screenSurface>;

export function displayContentSize(surface: ScreenSurface, aspect: number) {
  const height = Math.min(surface.height, surface.width / aspect);
  return { width: height * aspect, height };
}

export function displayFillDistance(surface: ScreenSurface, aspect: number, verticalFov: number) {
  return displayContentSize(surface, aspect).height / (2 * Math.tan(verticalFov * Math.PI / 360));
}

export function projectDisplay(surface: ScreenSurface, camera: PerspectiveCamera, width: number, height: number) {
  const content = displayContentSize(surface, width / height);
  const origin = surface.center.clone()
    .addScaledVector(surface.right, -content.width / 2)
    .addScaledVector(surface.up, content.height / 2);
  const x = surface.right.clone().multiplyScalar(content.width / width);
  const y = surface.up.clone().multiplyScalar(-content.height / height);
  const plane = new Matrix4().set(
    x.x, y.x, surface.normal.x, origin.x,
    x.y, y.y, surface.normal.y, origin.y,
    x.z, y.z, surface.normal.z, origin.z,
    0, 0, 0, 1,
  );
  camera.updateMatrixWorld(true);
  const viewport = new Matrix4().set(width / 2, 0, 0, width / 2, 0, -height / 2, 0, height / 2, 0, 0, 1, 0, 0, 0, 0, 1);
  const matrix = viewport.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(plane);
  const values = matrix.elements;
  const scale = values[15];
  for (let i = 0; i < values.length; i++) values[i] /= scale;
  // Preserve the screen's 2D homography without CSS depth clipping.
  values[2] = values[6] = values[8] = values[9] = values[11] = values[14] = 0;
  values[10] = 1;
  return matrix;
}
